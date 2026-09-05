import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../../lib/prisma"
import { requireAuth, requireRole } from "../../../middleware/auth"
import { INITIAL_SCHOOLS } from "./schoolsData"

export const schoolsRouter: Router = Router()

/**
 * Ensure master schools exist in database. Auto-populates if empty.
 */
export async function ensureMasterSchoolsSeeded() {
  try {
    const count = await prisma.school.count()
    if (count === 0) {
      console.log("🏫 Seeding initial master schools data...")
      for (const item of INITIAL_SCHOOLS) {
        await prisma.school.upsert({
          where: { name: item.name },
          update: { type: item.type, city: item.city },
          create: { name: item.name, type: item.type, city: item.city },
        })
      }
      console.log(`✅ Seeded ${INITIAL_SCHOOLS.length} master schools successfully.`)
    }
  } catch (err) {
    console.error("⚠️ Failed to ensure master schools seeded:", err)
  }
}

/**
 * GET /api/schools
 * Searchable master list of schools with user count.
 */
schoolsRouter.get("/", async (req, res, next) => {
  try {
    await ensureMasterSchoolsSeeded()

    const search = typeof req.query.search === "string" ? req.query.search.trim() : ""
    const limit = Math.min(Number(req.query.limit) || 100, 200)

    const whereClause = search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
            { type: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}

    const schools = await prisma.school.findMany({
      where: whereClause,
      orderBy: [{ name: "asc" }],
      take: limit,
    })

    // Get user counts grouped by school for social proof
    const schoolNames = schools.map((s) => s.name)
    const usersCount = await prisma.user.groupBy({
      by: ["school"],
      where: {
        school: { in: schoolNames },
      },
      _count: { id: true },
    })

    const countMap = new Map<string, number>()
    usersCount.forEach((item) => {
      if (item.school) {
        countMap.set(item.school.toLowerCase(), item._count.id)
      }
    })

    const result = schools.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type || "Umum",
      city: s.city || "Indonesia",
      userCount: countMap.get(s.name.toLowerCase()) || 0,
    }))

    res.json({
      total: result.length,
      schools: result,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * GET /api/schools/stats
 * Return matching user count for social proof in onboarding.
 * Query: school (required), class_grade (optional)
 */
schoolsRouter.get("/stats", async (req, res, next) => {
  try {
    const schoolName = typeof req.query.school === "string" ? req.query.school.trim() : ""
    const classGrade = typeof req.query.class_grade === "string" ? req.query.class_grade.trim() : ""

    if (!schoolName) {
      res.json({
        school: "",
        class_grade: classGrade,
        totalInSchool: 0,
        totalInClass: 0,
      })
      return
    }

    // Count users in the same school
    const totalInSchool = await prisma.user.count({
      where: {
        school: { equals: schoolName, mode: "insensitive" },
      },
    })

    // If class grade provided, count users in same school AND class grade
    let totalInClass = 0
    if (classGrade) {
      totalInClass = await prisma.user.count({
        where: {
          school: { equals: schoolName, mode: "insensitive" },
          classGrade: { equals: classGrade, mode: "insensitive" },
        },
      })
    }

    res.json({
      school: schoolName,
      class_grade: classGrade,
      totalInSchool,
      totalInClass,
    })
  } catch (err) {
    next(err)
  }
})

// ─── CRUD Endpoints for Pengurus & Admin ─────────────────────────────────────

const SchoolSchema = z.object({
  name: z.string().trim().min(2, "Nama sekolah minimal 2 karakter"),
  type: z.enum(["SMP", "SMA", "SMK", "Universitas", "Umum"]).default("SMA"),
  city: z.string().trim().min(2, "Kota minimal 2 karakter"),
})

/**
 * POST /api/schools
 * Tambah sekolah baru ke master data (Pengurus / Admin)
 */
schoolsRouter.post("/", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const body = SchoolSchema.parse(req.body)

    const existing = await prisma.school.findFirst({
      where: { name: { equals: body.name, mode: "insensitive" } },
    })

    if (existing) {
      res.status(409).json({ error: `Sekolah "${body.name}" sudah terdaftar dalam master data.` })
      return
    }

    const created = await prisma.school.create({
      data: {
        name: body.name,
        type: body.type,
        city: body.city,
      },
    })

    res.status(201).json({
      id: created.id,
      name: created.name,
      type: created.type || "Umum",
      city: created.city || "Indonesia",
      userCount: 0,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /api/schools/:id
 * Edit sekolah master data (Pengurus / Admin)
 */
schoolsRouter.put("/:id", requireAuth, requireRole("pengurus", "admin"), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      res.status(400).json({ error: "ID parameter is required" })
      return
    }
    const body = SchoolSchema.partial().parse(req.body)

    const existing = await prisma.school.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: "Sekolah tidak ditemukan." })
      return
    }

    if (body.name && body.name.toLowerCase() !== existing.name.toLowerCase()) {
      const duplicate = await prisma.school.findFirst({
        where: { name: { equals: body.name, mode: "insensitive" }, id: { not: id } },
      })
      if (duplicate) {
        res.status(409).json({ error: `Sekolah "${body.name}" sudah terdaftar.` })
        return
      }
    }

    const updated = await prisma.school.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.type && { type: body.type }),
        ...(body.city && { city: body.city }),
      },
    })

    // If school name changed, update existing users with old school name
    if (body.name && body.name !== existing.name) {
      await prisma.user.updateMany({
        where: { school: existing.name },
        data: { school: body.name },
      })
    }

    const userCount = await prisma.user.count({
      where: { school: { equals: updated.name, mode: "insensitive" } },
    })

    res.json({
      id: updated.id,
      name: updated.name,
      type: updated.type || "Umum",
      city: updated.city || "Indonesia",
      userCount,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * DELETE /api/schools/:id
 * Hapus sekolah dari master data (Admin only)
 */
schoolsRouter.delete("/:id", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      res.status(400).json({ error: "ID parameter is required" })
      return
    }

    const existing = await prisma.school.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: "Sekolah tidak ditemukan." })
      return
    }

    const count = await prisma.user.count({
      where: { school: { equals: existing.name, mode: "insensitive" } },
    })

    if (count > 0) {
      res.status(400).json({
        error: `Tidak dapat menghapus sekolah "${existing.name}" karena masih ada ${count} umat terdaftar dengan sekolah ini.`,
      })
      return
    }

    await prisma.school.delete({ where: { id } })
    res.json({ success: true, message: `Sekolah "${existing.name}" berhasil dihapus.` })
  } catch (err) {
    next(err)
  }
})
