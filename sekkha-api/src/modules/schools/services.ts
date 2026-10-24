import { schoolModels } from "./models"
import { cached } from "../../lib/cache"
import { decrypt } from "../../lib/crypto"
import { AppError } from "../../lib/AppError"

export function normalizeSchoolType(type?: string): "SMP" | "SMA/SMK" | "Universitas" | "Umum" {
  if (!type) return "Umum"
  const upper = type.trim().toUpperCase()
  if (upper === "SMP") return "SMP"
  if (upper === "SMA" || upper === "SMK" || upper === "SMA/SMK") return "SMA/SMK"
  if (upper === "UNIVERSITAS" || upper === "COLLEGE" || upper === "UNIVERSITY") return "Universitas"
  return "Umum"
}

export const schoolServices = {
  async getSchools(params?: { search?: string; type?: string; isActive?: boolean; limit?: number }) {
    const search = params?.search?.trim() || ""
    const validLimit = Math.min(Number(params?.limit) || 100, 200)

    const whereClause: any = {
      status: "active",
      ...(params?.isActive !== undefined ? { isActive: params.isActive } : { isActive: true }),
    }

    if (params?.type && params.type !== "all") {
      whereClause.type = normalizeSchoolType(params.type)
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { type: { contains: search, mode: "insensitive" as const } },
      ]
    }

    const schools = await schoolModels.findSchools(whereClause, validLimit)
    const result = schools.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type || "Umum",
      is_active: s.isActive,
      status: s.status,
      userCount: s._count.profiles,
      created_at: s.createdAt.toISOString(),
      updated_at: s.updatedAt.toISOString(),
    }))

    return {
      total: result.length,
      schools: result,
      items: result,
    }
  },

  async getSchoolById(id: string) {
    const school = await schoolModels.findSchoolById(id)
    if (!school) {
      throw new AppError("School not found.", 404, "SCHOOL_NOT_FOUND")
    }
    return {
      id: school.id,
      name: school.name,
      type: school.type || "Umum",
      is_active: school.isActive,
      status: school.status,
      userCount: school._count.profiles,
      created_at: school.createdAt.toISOString(),
      updated_at: school.updatedAt.toISOString(),
    }
  },

  async getPendingRequests() {
    const requests = await schoolModels.findPendingRequests()
    return requests.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type || "Umum",
      status: r.status,
      is_active: r.isActive,
      requester_name: r.requester?.profile?.name || r.requester?.username || "Member",
      created_at: r.createdAt.toISOString(),
      updated_at: r.updatedAt.toISOString(),
    }))
  },

  async approveSchoolRequest(id: string, reviewerId: string) {
    const existing = await schoolModels.findSchoolById(id)
    if (!existing) {
      throw new AppError("School not found", 404, "SCHOOL_NOT_FOUND")
    }

    const updated = await schoolModels.approveSchool(id, reviewerId)
    return {
      id: updated.id,
      name: updated.name,
      type: updated.type || "Umum",
      status: updated.status,
      is_active: updated.isActive,
      userCount: updated._count.profiles,
    }
  },

  async rejectSchoolRequest(id: string, reviewerId: string) {
    const existing = await schoolModels.findSchoolById(id)
    if (!existing) {
      throw new AppError("School not found", 404, "SCHOOL_NOT_FOUND")
    }

    const updated = await schoolModels.rejectSchool(id, reviewerId)
    return {
      id: updated.id,
      name: updated.name,
      type: updated.type || "Umum",
      status: updated.status,
      is_active: updated.isActive,
      userCount: updated._count.profiles,
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
      throw new AppError(`School "${trimmedName}" is already registered.`, 409, "SCHOOL_ALREADY_EXISTS")
    }

    const school = await schoolModels.createSchool({
      name: trimmedName,
      type: normalizeSchoolType(data.type),
    })

    return {
      id: school.id,
      name: school.name,
      type: school.type || "Umum",
      is_active: school.isActive,
      status: school.status,
      userCount: 0,
    }
  },

  async requestSchool(userId: string, data: { name: string; type?: string }) {
    const trimmedName = data.name.trim()
    const existing = await schoolModels.findSchoolByName(trimmedName)
    if (existing) {
      throw new AppError(
        `School "${trimmedName}" is already registered or currently pending review.`,
        409,
        "SCHOOL_ALREADY_EXISTS"
      )
    }

    const school = await schoolModels.createSchoolRequest({
      name: trimmedName,
      type: normalizeSchoolType(data.type),
      requestedBy: userId,
    })

    return {
      id: school.id,
      name: school.name,
      type: school.type || "Umum",
      status: school.status,
      is_active: school.isActive,
    }
  },

  async updateSchool(id: string, data: { name?: string; type?: string; is_active?: boolean; isActive?: boolean }) {
    const existing = await schoolModels.findSchoolById(id)
    if (!existing) {
      throw new AppError("School not found.", 404, "SCHOOL_NOT_FOUND")
    }

    if (data.name && data.name.trim() !== existing.name) {
      const duplicate = await schoolModels.findSchoolByName(data.name.trim())
      if (duplicate && duplicate.id !== id) {
        throw new AppError(`School "${data.name.trim()}" is already registered.`, 409, "SCHOOL_ALREADY_EXISTS")
      }
    }

    const activeVal = data.is_active !== undefined ? data.is_active : data.isActive
    const updated = await schoolModels.updateSchool(id, {
      ...(data.name && { name: data.name.trim() }),
      ...(data.type && { type: normalizeSchoolType(data.type) }),
      ...(activeVal !== undefined && { isActive: activeVal }),
    })

    return {
      id: updated.id,
      name: updated.name,
      type: updated.type || "Umum",
      is_active: updated.isActive,
      status: updated.status,
      userCount: updated._count.profiles,
    }
  },

  async deleteSchool(id: string) {
    const existing = await schoolModels.findSchoolById(id)
    if (!existing) {
      throw new AppError("School not found.", 404, "SCHOOL_NOT_FOUND")
    }

    const count = await schoolModels.countProfilesBySchoolId(id)
    if (count > 0) {
      throw new AppError(
        `Cannot delete school "${existing.name}" because it is currently linked to ${count} user(s). Please deactivate it instead.`,
        409,
        "SCHOOL_IN_USE"
      )
    }

    await schoolModels.deleteSchool(id)
    return { success: true, message: `School "${existing.name}" deleted successfully.` }
  },
}
