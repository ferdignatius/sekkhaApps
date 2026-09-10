import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../../lib/prisma"
import { requireAuth, requireRole } from "../../../middleware/auth"
import { decrypt } from "../../../lib/crypto"
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
      include: {
        _count: {
          select: { profiles: true },
        },
      },
      orderBy: [{ name: "asc" }],
      take: limit,
    })

    const result = schools.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type || "Umum",
      city: s.city || "Indonesia",
      userCount: s._count.profiles,
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

    // Count profiles linked to the school
    const totalInSchool = await prisma.userProfile.count({
      where: {
        school: { name: { equals: schoolName, mode: "insensitive" } },
      },
    })

    let totalInClass = 0
    if (classGrade) {
      const profiles = await prisma.userProfile.findMany({
        where: {
          school: { name: { equals: schoolName, mode: "insensitive" } },
        },
        select: { classGrade: true },
      })
      totalInClass = profiles.filter(
        (p) => p.classGrade && (decrypt(p.classGrade) || "").toLowerCase() === classGrade.toLowerCase()
      ).length
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

/**
 * POST /api/schools
 * Tambah sekolah baru (Admin & Pengurus)
 */
const CreateSchoolSchema = z.object({
  name: z.string().min(2, "Nama sekolah minimal 2 karakter").max(100, "Maksimal 100 karakter"),
  type: z.enum(["SMP", "SMA", "SMK", "Universitas", "Lainnya"]).optional(),
  city: z.string().max(50).optional(),
})

schoolsRouter.post("/", requireAuth, requireRole("admin", "pengurus"), async (req, res, next) => {
  try {
    const body = CreateSchoolSchema.parse(req.body)

    const existing = await prisma.school.findUnique({
      where: { name: body.name.trim() },
    })
    if (existing) {
      res.status(409).json({ error: `Sekolah "${body.name}" sudah terdaftar.` })
      return
    }

    const school = await prisma.school.create({
      data: {
        name: body.name.trim(),
        type: body.type || "Umum",
        city: body.city?.trim() || "Indonesia",
      },
    })

    res.status(201).json({
      id: school.id,
      name: school.name,
      type: school.type,
      city: school.city,
      userCount: 0,
    })
  } catch (err) {
    next(err)
  }
})

/**
 * PUT /api/schools/:id
 * Edit sekolah (Admin & Pengurus)
 */
const UpdateSchoolSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.enum(["SMP", "SMA", "SMK", "Universitas", "Lainnya"]).optional(),
  city: z.string().max(50).optional(),
})

schoolsRouter.put("/:id", requireAuth, requireRole("admin", "pengurus"), async (req, res, next) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
    if (!id) {
      res.status(400).json({ error: "ID parameter is required" })
      return
    }

    const body = UpdateSchoolSchema.parse(req.body)

    const existing = await prisma.school.findUnique({ where: { id } })
    if (!existing) {
      res.status(404).json({ error: "Sekolah tidak ditemukan." })
      return
    }

    if (body.name && body.name !== existing.name) {
      const duplicate = await prisma.school.findUnique({ where: { name: body.name.trim() } })
      if (duplicate) {
        res.status(409).json({ error: `Sekolah "${body.name}" sudah terdaftar.` })
        return
      }
    }

    const updated = await prisma.school.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name.trim() }),
        ...(body.type && { type: body.type }),
        ...(body.city && { city: body.city.trim() }),
      },
      include: {
        _count: { select: { profiles: true } },
      },
    })

    res.json({
      id: updated.id,
      name: updated.name,
      type: updated.type || "Umum",
      city: updated.city || "Indonesia",
      userCount: updated._count.profiles,
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

    const count = await prisma.userProfile.count({
      where: { schoolId: id },
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
