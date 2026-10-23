import { schoolModels } from "./models"
import { INITIAL_SCHOOLS } from "./internal/schoolsData"
import { cached } from "../../lib/cache"
import { decrypt } from "../../lib/crypto"

export const schoolServices = {
  async ensureMasterSchoolsSeeded() {
    try {
      const count = await schoolModels.countSchools()
      if (count === 0) {
        console.log("🏫 Seeding initial master schools data...")
        for (const item of INITIAL_SCHOOLS) {
          await schoolModels.upsertSchool(item.name, item.type)
        }
        console.log(`✅ Seeded ${INITIAL_SCHOOLS.length} master schools successfully.`)
      }
    } catch (err) {
      console.error("⚠️ Failed to ensure master schools seeded:", err)
    }
  },

  async getSchools(search: string = "", limit: number = 100) {
    await this.ensureMasterSchoolsSeeded()

    const validLimit = Math.min(Number(limit) || 100, 200)
    const trimmedSearch = search.trim()

    const whereClause: any = {
      status: "approved",
      isActive: true,
      ...(trimmedSearch
        ? {
            OR: [
              { name: { contains: trimmedSearch, mode: "insensitive" as const } },
              { type: { contains: trimmedSearch, mode: "insensitive" as const } },
            ],
          }
        : {}),
    }

    const schools = await schoolModels.findSchools(whereClause, validLimit)
    const result = schools.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type || "Umum",
      city: "Nasional",
      userCount: s._count.profiles,
    }))

    return {
      total: result.length,
      schools: result,
    }
  },

  async getSchoolStats(schoolName: string, classGrade: string = "") {
    const trimmedSchool = schoolName.trim()
    const trimmedGrade = classGrade.trim()

    if (!trimmedSchool) {
      return {
        school: "",
        class_grade: trimmedGrade,
        totalInSchool: 0,
        totalInClass: 0,
      }
    }

    const cacheKey = `schools:stats:${trimmedSchool.toLowerCase()}:${trimmedGrade.toLowerCase()}`
    return cached(cacheKey, 300, async () => {
      const totalInSchool = await schoolModels.countProfilesBySchoolName(trimmedSchool)

      let totalInClass = 0
      if (trimmedGrade) {
        const profiles = await schoolModels.findClassGradesBySchoolName(trimmedSchool)
        totalInClass = profiles.filter(
          (p) => p.classGrade && (decrypt(p.classGrade) || "").toLowerCase() === trimmedGrade.toLowerCase()
        ).length
      }

      return {
        school: trimmedSchool,
        class_grade: trimmedGrade,
        totalInSchool,
        totalInClass,
      }
    })
  },

  async createSchool(data: { name: string; type?: string }) {
    const trimmedName = data.name.trim()
    const existing = await schoolModels.findSchoolByName(trimmedName)
    if (existing) {
      const error = new Error(`Sekolah "${trimmedName}" sudah terdaftar.`) as any
      error.statusCode = 409
      throw error
    }

    const school = await schoolModels.createSchool({
      name: trimmedName,
      type: data.type || "Umum",
    })

    return {
      id: school.id,
      name: school.name,
      type: school.type,
      userCount: 0,
    }
  },

  async requestSchool(userId: string, data: { name: string; type?: string }) {
    const trimmedName = data.name.trim()
    const existing = await schoolModels.findSchoolByName(trimmedName)
    if (existing) {
      const error = new Error(`Sekolah "${trimmedName}" sudah terdaftar atau sedang diajukan.`) as any
      error.statusCode = 409
      throw error
    }

    const school = await schoolModels.createSchoolRequest({
      name: trimmedName,
      type: data.type || "Umum",
      requestedBy: userId,
    })

    return {
      id: school.id,
      name: school.name,
      type: school.type || "Umum",
      status: school.status,
    }
  },

  async updateSchool(id: string, data: { name?: string; type?: string }) {
    const existing = await schoolModels.findSchoolById(id)
    if (!existing) {
      const error = new Error("Sekolah tidak ditemukan.") as any
      error.statusCode = 404
      throw error
    }

    if (data.name && data.name.trim() !== existing.name) {
      const duplicate = await schoolModels.findSchoolByName(data.name.trim())
      if (duplicate) {
        const error = new Error(`Sekolah "${data.name.trim()}" sudah terdaftar.`) as any
        error.statusCode = 409
        throw error
      }
    }

    const updated = await schoolModels.updateSchool(id, {
      ...(data.name && { name: data.name.trim() }),
      ...(data.type && { type: data.type }),
    })

    return {
      id: updated.id,
      name: updated.name,
      type: updated.type || "Umum",
      userCount: updated._count.profiles,
    }
  },

  async deleteSchool(id: string) {
    const existing = await schoolModels.findSchoolById(id)
    if (!existing) {
      const error = new Error("Sekolah tidak ditemukan.") as any
      error.statusCode = 404
      throw error
    }

    const count = await schoolModels.countProfilesBySchoolId(id)
    if (count > 0) {
      const error = new Error(
        `Tidak dapat menghapus sekolah "${existing.name}" karena masih ada ${count} umat terdaftar dengan sekolah ini.`
      ) as any
      error.statusCode = 400
      throw error
    }

    await schoolModels.deleteSchool(id)
    return { success: true, message: `Sekolah "${existing.name}" berhasil dihapus.` }
  },
}
