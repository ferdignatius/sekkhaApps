import { schoolModels } from "./models"
import { cached, invalidatePattern, CacheKeys } from "../../lib/cache"
import { eventbus, DomainEvents } from "../../core/eventbus"

import { AppError } from "../../lib/AppError"

async function invalidateSchoolRelatedCaches(schoolId?: string, action?: string): Promise<void> {
  await Promise.all([
    invalidatePattern("schools:stats:*"),
    invalidatePattern("schools:list:*"),
    invalidatePattern("user:*:profile"),
    invalidatePattern("user:*:home:*"),
    invalidatePattern("people:list:*"),
    invalidatePattern("pengurus:insight:*"),
  ])
  eventbus.publish(DomainEvents.SCHOOL_UPDATED, { schoolId, action })
}

export function normalizeSchoolType(type?: string): "SMP" | "SMA/SMK" | "Universitas" | "Umum" {
  if (!type) return "Umum"
  const upper = type.trim().toUpperCase()
  if (upper === "SMP") return "SMP"
  if (upper === "SMA" || upper === "SMK" || upper === "SMA/SMK") return "SMA/SMK"
  if (upper === "UNIVERSITAS" || upper === "COLLEGE" || upper === "UNIVERSITY") return "Universitas"
  return "Umum"
}

export const schoolServices = {
  async getSchools(params?: {
    search?: string
    type?: string
    isActive?: boolean
    includePending?: boolean
    status?: string
    page?: number
    limit?: number
    cursor?: string
    includeStats?: boolean
  }) {
    const search = params?.search?.trim() || ""
    const validLimit = Math.min(Math.max(Math.floor(Number(params?.limit) || 100), 1), 200)
    const validPage = Math.max(Math.floor(Number(params?.page) || 1), 1)
    const skip = (validPage - 1) * validLimit
    const cursor = params?.cursor?.trim() || undefined
    const includeStats = Boolean(params?.includeStats && !cursor)

    const baseWhere: any = {}

    if (params?.includePending) {
      baseWhere.status = { in: ["active", "pending"] }
      if (params?.isActive !== undefined) {
        baseWhere.isActive = params.isActive
      }
    } else {
      baseWhere.status = params?.status || "active"
      if (params?.isActive !== undefined) {
        baseWhere.isActive = params.isActive
      } else if (baseWhere.status === "active" && !includeStats) {
        baseWhere.isActive = true
      }
    }

    const whereClause: any = { ...baseWhere }

    if (params?.type && params.type !== "all") {
      whereClause.type = normalizeSchoolType(params.type)
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { type: { contains: search, mode: "insensitive" as const } },
      ]
    }

    const filter = {
      search,
      type: params?.type || "all",
      isActive: params?.isActive,
      includePending: Boolean(params?.includePending),
      status: params?.status,
      page: cursor ? undefined : validPage,
      limit: validLimit,
      cursor: cursor || "",
      includeStats,
    }

    return cached(CacheKeys.schoolsList(JSON.stringify(filter)), 120, async () => {
      let rawSchools: Awaited<ReturnType<typeof schoolModels.findSchools>>
      let total: number | undefined
      let stats:
        | { total: number; senior_high: number; university: number; linked_users: number }
        | undefined

      if (cursor) {
        rawSchools = await schoolModels.findSchools(whereClause, validLimit + 1, {
          cursorId: cursor,
        })
      } else if (includeStats) {
        const [schoolsRows, countRows, statsRows] = await Promise.all([
          schoolModels.findSchools(whereClause, validLimit + 1, skip),
          schoolModels.countSchoolsByWhere(whereClause),
          schoolModels.getSchoolDirectoryStats(baseWhere),
        ])
        rawSchools = schoolsRows
        total = countRows
        stats = statsRows
      } else {
        const [schoolsRows, countRows] = await Promise.all([
          schoolModels.findSchools(whereClause, validLimit, skip),
          schoolModels.countSchoolsByWhere(whereClause),
        ])
        rawSchools = schoolsRows
        total = countRows
      }

      const usesLookahead = Boolean(cursor || includeStats)
      const hasMore = usesLookahead
        ? rawSchools.length > validLimit
        : skip + rawSchools.length < (total ?? 0)
      const pageRows =
        usesLookahead && rawSchools.length > validLimit
          ? rawSchools.slice(0, validLimit)
          : rawSchools

      const result = pageRows.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type || "Umum",
        is_active: s.isActive,
        status: s.status,
        userCount: s._count.profiles,
        created_at: s.createdAt.toISOString(),
        updated_at: s.updatedAt.toISOString(),
      }))

      const nextCursor =
        hasMore && result.length > 0 ? result[result.length - 1].id : null
      const totalPages =
        total !== undefined ? Math.max(1, Math.ceil(total / validLimit)) : undefined
      return {
        total,
        page: cursor ? undefined : validPage,
        limit: validLimit,
        total_pages: totalPages,
        has_more: hasMore,
        next_cursor: nextCursor,
        stats,
        schools: result,
        items: result,
      }
    })
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
      userCount: r._count?.profiles ?? 0,
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
    if (existing.status !== "pending") {
      throw new AppError("School request has already been processed", 400, "SCHOOL_ALREADY_PROCESSED")
    }

    const updated = await schoolModels.approveSchool(id, reviewerId, existing.requestedBy)
    await invalidateSchoolRelatedCaches(id, "approve")
    return {
      id: updated.id,
      name: updated.name,
      type: updated.type || "Umum",
      status: updated.status,
      is_active: updated.isActive,
      userCount: updated._count.profiles,
    }
  },

  async rejectSchoolRequest(id: string, reviewerId: string, assignSchoolId?: string | null) {
    const existing = await schoolModels.findSchoolById(id)
    if (!existing) {
      throw new AppError("School not found", 404, "SCHOOL_NOT_FOUND")
    }
    if (existing.status !== "pending") {
      throw new AppError("School request has already been processed", 400, "SCHOOL_ALREADY_PROCESSED")
    }

    let targetSchool: { id: string; name: string } | null = null
    if (assignSchoolId) {
      if (assignSchoolId === id) {
        throw new AppError("Cannot assign users to the rejected school itself", 400, "INVALID_TARGET_SCHOOL")
      }
      const target = await schoolModels.findSchoolById(assignSchoolId)
      if (!target) {
        throw new AppError("Target school not found", 404, "SCHOOL_NOT_FOUND")
      }
      if (target.status !== "active" || !target.isActive) {
        throw new AppError("Target school must be active", 400, "TARGET_SCHOOL_NOT_ACTIVE")
      }
      targetSchool = { id: target.id, name: target.name }
    }

    const updated = await schoolModels.rejectSchool(
      id,
      reviewerId,
      targetSchool?.id ?? null,
      existing.requestedBy
    )
    await invalidateSchoolRelatedCaches(id, "reject")
    if (targetSchool) {
      await invalidateSchoolRelatedCaches(targetSchool.id, "update")
    }
    return {
      id: updated.id,
      name: updated.name,
      type: updated.type || "Umum",
      status: updated.status,
      is_active: updated.isActive,
      userCount: updated._count.profiles,
      reassigned_school: targetSchool,
    }
  },

  async getSchoolStats(schoolName: string) {
    const trimmedSchool = schoolName.trim()

    if (!trimmedSchool) {
      return {
        school: "",
        totalInSchool: 0,
      }
    }

    const cacheKey = CacheKeys.schoolStats(trimmedSchool)
    return cached(cacheKey, 300, async () => {
      const totalInSchool = await schoolModels.countProfilesBySchoolName(trimmedSchool)

      return {
        school: trimmedSchool,
        totalInSchool,
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

    await invalidateSchoolRelatedCaches(school.id, "create")

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
      if (existing.status === "pending" || existing.status === "active") {
        // School already registered or pending review; immediately link user profile!
        await schoolModels.linkUserProfileToSchool(userId, existing.id)
        await invalidateSchoolRelatedCaches(existing.id, "request_existing")
        return {
          id: existing.id,
          name: existing.name,
          type: existing.type || "Umum",
          status: existing.status,
          is_active: existing.isActive,
          userCount: (existing as any)._count?.profiles ?? 1,
          alreadyExisted: true,
        }
      }
      throw new AppError(
        `School "${trimmedName}" is already registered.`,
        409,
        "SCHOOL_ALREADY_EXISTS"
      )
    }

    const school = await schoolModels.createSchoolRequest({
      name: trimmedName,
      type: normalizeSchoolType(data.type),
      requestedBy: userId,
    })

    // Automatically link requester's profile to the pending school
    await schoolModels.linkUserProfileToSchool(userId, school.id)
    await invalidateSchoolRelatedCaches(school.id, "request")

    return {
      id: school.id,
      name: school.name,
      type: school.type || "Umum",
      status: school.status,
      is_active: school.isActive,
      userCount: 1,
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

    await invalidateSchoolRelatedCaches(id, "update")

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
    await invalidateSchoolRelatedCaches(id, "delete")
    return { success: true, message: `School "${existing.name}" deleted successfully.` }
  },
}
