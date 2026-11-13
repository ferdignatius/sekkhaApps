import { randomInt } from "crypto"
import { peopleModels } from "./models"
import { hashPassword, DEFAULT_BCRYPT_COST } from "../../lib/password"
import { invalidate, CacheKeys } from "../../lib/cache"
import { generateUniqueUserNumber } from "../../lib/userNumber"
import { encrypt, decrypt, generateBlindIndex } from "../../lib/crypto"
import { auditLogger } from "../../lib/auditLogger"
import { prisma } from "../../lib/prisma"
import { AppError } from "../../lib/AppError"
import {
  MIN_NAME_SIMILARITY,
  buildNameSearchProbes,
  computeNameSimilarityScore,
} from "./utils/nameSimilarity"

function safeDecrypt(val: string | null | undefined, fallback: string | null = null): string | null {
  if (!val) return fallback
  const decrypted = decrypt(val)
  if (!decrypted || /^[0-9a-fA-F]+:[0-9a-fA-F]+:[0-9a-fA-F]+$/.test(decrypted)) {
    return fallback
  }
  return decrypted
}

export function generateTemporaryPassword(): string {
  const digits = randomInt(10000, 100000) // 5 random digits: 10000..99999
  return `sekkha${digits}puggala`
}

export const generateDefaultPassword = generateTemporaryPassword

export async function generateUniqueUsername(fullName: string): Promise<string> {
  const words = fullName.trim().split(/\s+/)
  const firstName = words[0]?.toLowerCase().replace(/[^a-z0-9]/g, "") || "member"
  const base =
    firstName.length >= 3
      ? firstName
      : fullName.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15) || "member"

  let attempts = 0
  while (attempts < 20) {
    attempts++
    const randomDigits = randomInt(1000, 10000) // 4 digits: 1000..9999
    const candidate = `${base}${randomDigits}`
    const existing = await peopleModels.findUserByUsername(candidate)
    if (!existing) {
      return candidate
    }
  }

  // Fallback timestamp-based suffix
  return `${base}${Date.now() % 10000}`
}

export function generateWhatsAppInviteMessage(data: {
  name: string
  userNumber: string | number | bigint
  username: string
  tempPassword: string
}): string {
  return [
    `Namaste ${data.name},`,
    `Akun Sekkha Apps Anda telah dibuat oleh pengurus vihara.`,
    ``,
    `Berikut kredensial login sementara Anda:`,
    `• Member ID: ${data.userNumber}`,
    `• Username: ${data.username}`,
    `• Password Sementara: ${data.tempPassword}`,
    ``,
    `Silakan login di https://sekkha.app/login untuk menyelesaikan aktivasi akun dan membuat password pribadi Anda. Terima kasih!`,
  ].join("\n")
}

export type ListMembersQuery = {
  search?: string
  claimed_status?: "all" | "claimed" | "unclaimed"
  status?: "all" | "claimed" | "unclaimed"
  role?: "all" | "member" | "activist" | "organizer" | "admin" | "umat" | "aktivis" | "pengurus"
  school_id?: string
  page: number
  limit: number
}

export type CurrentUser = { userId: string; role: string }

export const peopleServices = {
  async getMembers(queryParams: ListMembersQuery, currentUser?: CurrentUser) {
    const rawSearch = (queryParams.search || "").trim()
    const claimedStatus = queryParams.claimed_status || queryParams.status || "all"
    const roleFilter = queryParams.role || "all"
    const isPrivileged = currentUser?.role === "organizer" || currentUser?.role === "admin"

    const where: any = { anonymizedAt: null }

    if (claimedStatus === "claimed") {
      where.isClaimed = true
    } else if (claimedStatus === "unclaimed") {
      where.isClaimed = false
    }

    if (roleFilter !== "all") {
      if (roleFilter === "organizer" || roleFilter === "pengurus") {
        where.role = { in: ["organizer", "admin"] }
      } else if (roleFilter === "activist" || roleFilter === "aktivis") {
        where.role = "activist"
      } else if (roleFilter === "member" || roleFilter === "umat") {
        where.role = "member"
      } else {
        where.role = roleFilter
      }
    }

    if (queryParams.school_id) {
      where.profile = { ...(where.profile || {}), schoolId: queryParams.school_id }
    }

    // Big-O Query Branching Strategy:
    // If input is purely numeric digits, do an instant B-Tree index scan on userNumber BigInt.
    // Otherwise, perform case-insensitive text search on profile.name or username.
    if (rawSearch) {
      if (/^\d+$/.test(rawSearch)) {
        where.userNumber = BigInt(rawSearch)
      } else {
        where.OR = [
          { profile: { name: { contains: rawSearch, mode: "insensitive" } } },
          { username: { contains: rawSearch, mode: "insensitive" } },
        ]
      }
    }

    const { page, limit } = queryParams
    const skip = (page - 1) * limit

    const [totalMatching, rawMembers, roleCounts, claimCounts] = await Promise.all([
      peopleModels.count(where),
      peopleModels.findMany(where, limit, skip),
      peopleModels.countByRole(),
      peopleModels.countByClaimStatus(),
    ])

    const stats = {
      total: 0,
      member: 0,
      activist: 0,
      organizer: 0,
      claimed: 0,
      unclaimed: 0,
    }

    roleCounts.forEach((row) => {
      stats.total += row._count._all
      if (row.role === "member") stats.member = row._count._all
      if (row.role === "activist") stats.activist = row._count._all
      if (row.role === "organizer" || row.role === "admin") stats.organizer += row._count._all
    })

    claimCounts.forEach((row) => {
      if (row.isClaimed) stats.claimed += row._count._all
      else stats.unclaimed += row._count._all
    })

    const items = rawMembers.map((m) => {
      return {
        id: m.id,
        user_number: m.userNumber ? Number(m.userNumber) : null,
        username: m.username || null,
        name: m.profile?.name || m.username || "Member",
        role: m.role,
        is_claimed: m.isClaimed ?? true,
        created_at: new Date(m.createdAt).toISOString(),
      }
    })

    const totalPages = Math.max(1, Math.ceil(totalMatching / limit))

    return {
      items,
      pagination: {
        page,
        limit,
        total: totalMatching,
        total_pages: totalPages,
      },
      page,
      limit,
      total: totalMatching,
      totalPages,
      stats,
    }
  },

  async findSimilarMembers(
    query: { name: string; limit?: number },
    actor?: CurrentUser
  ) {
    if (actor && actor.role !== "organizer" && actor.role !== "admin") {
      throw new AppError("Only organizers or admins can search similar members.", 403, "FORBIDDEN")
    }

    const rawName = (query.name || "").trim()
    const limit = Math.min(Math.max(Number(query.limit) || 5, 1), 5)
    const probes = buildNameSearchProbes(rawName)
    if (probes.length === 0) {
      return { items: [], total: 0 }
    }

    const candidates = await peopleModels.findSimilarNameCandidates(probes, 25)

    const scored = candidates
      .filter((candidate: any) => Boolean(candidate.profile?.name?.trim()))
      .map((candidate: any) => {
        const displayName = candidate.profile.name.trim()
        const score = computeNameSimilarityScore(rawName, displayName)

        return {
          id: candidate.id,
          user_number: candidate.userNumber ? Number(candidate.userNumber) : null,
          username: candidate.username || null,
          name: displayName,
          role: candidate.role,
          is_claimed: candidate.isClaimed ?? true,
          school: candidate.profile?.school?.name || null,
          similarity_score: Math.round(score * 100),
          _rawScore: score,
        }
      })
      .filter((item) => item._rawScore >= MIN_NAME_SIMILARITY)
      .sort((a, b) => {
        if (b._rawScore !== a._rawScore) return b._rawScore - a._rawScore
        return a.name.localeCompare(b.name)
      })

    const items = scored.slice(0, limit).map(({ _rawScore, ...rest }) => rest)

    return {
      items,
      total: items.length,
    }
  },

  async getMemberDetail(id: string, currentUser?: CurrentUser) {
    const isPrivileged = currentUser?.role === "organizer" || currentUser?.role === "admin"
    const isSelf = currentUser?.userId === id
    const canViewSensitive = isPrivileged || isSelf

    const member = await peopleModels.findMemberDetail(id)

    if (!member) {
      const error = new Error("Member not found") as any
      error.statusCode = 404
      throw error
    }

    return {
      id: member.id,
      user_number: member.userNumber ? Number(member.userNumber) : null,
      username: member.username,
      name: member.profile?.name || member.username || "Member",
      email: canViewSensitive && member.email ? safeDecrypt(member.email, null) : null,
      school: member.profile?.school?.name || null,
      school_id: member.profile?.schoolId || null,
      school_status: member.profile?.school?.status || null,
      role: member.role,
      is_claimed: member.isClaimed ?? true,
      points: canViewSensitive ? member.stats?.points ?? 0 : 0,
      total_attendances: canViewSensitive
        ? (member.stats?.totalAttendances ?? member._count?.attendances ?? (member.attendances?.length || 0))
        : 0,
      created_at: new Date(member.createdAt).toISOString(),
      attendances: (member.attendances || []).slice(0, 5).map((a: any) => ({
        id: a.id,
        event_title: a.event?.title || "Event",
        event_date: a.event?.eventDate ? new Date(a.event.eventDate).toISOString() : new Date().toISOString(),
        method: a.method,
        points_earned: canViewSensitive ? a.pointsEarned || 50 : 0,
        scanned_at: new Date(a.scannedAt).toISOString(),
      })),
    }
  },

  async createMember(data: {
    name: string
    school_id?: string | null
    school?: string | null
    email?: string | null
    username?: string | null
  }, actor?: CurrentUser) {
    if (actor && actor.role !== "organizer" && actor.role !== "admin") {
      throw new AppError("Only organizers or admins can pre-provision members.", 403, "FORBIDDEN")
    }

    // Pre-provisioned members always start with default role "member"
    const role = "member" as const

    let resolvedSchoolId = data.school_id?.trim() || null
    if (resolvedSchoolId) {
      const s = await peopleModels.findSchoolById(resolvedSchoolId)
      if (!s || !s.isActive || s.status !== "active") {
        throw new AppError("Selected school was not found in active master data.", 400, "INVALID_SCHOOL")
      }
    } else if (data.school?.trim()) {
      const s = await peopleModels.findSchoolByName(data.school.trim())
      if (!s || !s.isActive || s.status !== "active") {
        throw new AppError("Selected school was not found in active master data.", 400, "INVALID_SCHOOL")
      }
      resolvedSchoolId = s.id
    }

    // Auto-generate username per PRD formula: firstName + 4 random digits
    let username = data.username ? data.username.toLowerCase().trim() : null
    if (!username) {
      username = await generateUniqueUsername(data.name)
    }

    // Auto-generate temporary password: sekkha#####puggala
    const tempPassword = generateTemporaryPassword()
    const hashedPassword = await hashPassword(tempPassword, DEFAULT_BCRYPT_COST)

    let newMember: any = null
    let attempts = 0

    while (attempts < 5) {
      attempts++
      const userNumber = await peopleModels.generateUserNumber()
      try {
        newMember = await peopleModels.create(
          {
            username,
            password: hashedPassword,
            email: data.email ? encrypt(data.email.toLowerCase().trim()) : null,
            emailBindex: data.email ? generateBlindIndex(data.email.toLowerCase().trim()) : null,
            role,
            userNumber,
            isClaimed: false, // Pre-provisioned accounts start unclaimed
            passwordChangedByUser: false,
            profile: {
              create: {
                name: data.name.trim(),
                schoolId: resolvedSchoolId,
              },
            },
            stats: {
              create: {
                points: 0,
              },
            },
          },
          {
            profile: { include: { school: true } },
          }
        )
        break
      } catch (err: any) {
        const target = Array.isArray(err?.meta?.target)
          ? err.meta.target.join(",")
          : String(err?.meta?.target || "")
        if (
          err?.code === "P2002" &&
          (target.includes("user_number") || target.includes("userNumber") || target.includes("username")) &&
          attempts < 5
        ) {
          if (!data.username) {
            username = await generateUniqueUsername(data.name)
          }
          continue
        }
        throw err
      }
    }

    if (!newMember) {
      const error = new Error("Failed to generate unique user number after multiple attempts.") as any
      error.statusCode = 500
      throw error
    }

    await invalidate(CacheKeys.userProfile(newMember.id))

    if (actor) {
      auditLogger.log({
        actorId: actor.userId,
        actorRole: actor.role,
        action: "PEOPLE_CREATED",
        targetId: newMember.id,
        status: "SUCCESS",
      })
    }

    const memberName = (newMember.profile as any)?.name || data.name.trim()
    const userNumberInt = Number(newMember.userNumber)

    const whatsappInvite = generateWhatsAppInviteMessage({
      name: memberName,
      userNumber: userNumberInt,
      username: newMember.username,
      tempPassword,
    })

    return {
      id: newMember.id,
      user_number: userNumberInt,
      username: newMember.username,
      name: memberName,
      role: newMember.role,
      is_claimed: false,
      temporary_password: tempPassword,
      whatsapp_invite_message: whatsappInvite,
      copy_template: whatsappInvite,
      school: (newMember.profile as any)?.school?.name || null,
      school_id: (newMember.profile as any)?.schoolId || null,
      school_status: (newMember.profile as any)?.school?.status || null,
      created_at: new Date(newMember.createdAt).toISOString(),
    }
  },

  async updateMember(id: string, data: any, currentUser?: CurrentUser) {
    if (currentUser?.role !== "admin") {
      throw new AppError("Only admin can update member profiles or change roles.", 403, "FORBIDDEN")
    }

    if (id === currentUser.userId) {
      throw new AppError(
        "You cannot modify your own role or account data through People management.",
        403,
        "SELF_MODIFICATION_FORBIDDEN"
      )
    }

    const existing = await peopleModels.findUserWithProfile(id)
    if (!existing) {
      throw new AppError("Member not found", 404, "MEMBER_NOT_FOUND")
    }

    if (data.username && data.username !== existing.username) {
      const usernameInUse = await peopleModels.findUserByUsername(data.username.toLowerCase().trim())
      if (usernameInUse && usernameInUse.id !== id) {
        const error = new Error("Username is already used by another member.") as any
        error.statusCode = 400
        throw error
      }
    }

    let resolvedSchoolId = data.school_id
    if (!resolvedSchoolId && data.school) {
      const s = await peopleModels.findSchoolByName(data.school.trim())
      if (s) {
        resolvedSchoolId = s.id
      }
    }

    const userData: any = {}
    if (data.username !== undefined) {
      userData.username = data.username ? data.username.toLowerCase().trim() : null
    }
    if (data.role) {
      userData.role = data.role
    }

    const profileData: any = {}
    if (data.name) profileData.name = data.name.trim()
    if (resolvedSchoolId !== undefined) profileData.schoolId = resolvedSchoolId

    const { updatedUser, updatedProfile } = await peopleModels.transaction(async (tx) => {
      const updatedUser = await tx.user.update({ where: { id }, data: userData })
      const updatedProfile = await tx.userProfile.upsert({
        where: { userId: id },
        update: profileData,
        create: {
          userId: id,
          name: data.name ? data.name.trim() : existing.profile?.name || existing.username || "Member",
          schoolId: resolvedSchoolId || null,
        },
        include: { school: true },
      })
      return { updatedUser, updatedProfile }
    })

    await invalidate(CacheKeys.userProfile(id))

    if (data.role && data.role !== existing.role) {
      auditLogger.log({
        actorId: currentUser.userId,
        actorRole: currentUser.role,
        action: "USER_ROLE_CHANGED",
        targetId: id,
        status: "SUCCESS",
        details: { previousRole: existing.role, newRole: data.role },
      })
    }

    return {
      id: updatedUser.id,
      name: updatedProfile.name,
      username: updatedUser.username,
      school: (updatedProfile as any).school?.name || null,
      school_id: (updatedProfile as any).schoolId || null,
      school_status: (updatedProfile as any).school?.status || null,
      role: updatedUser.role,
      user_number: updatedUser.userNumber ? Number(updatedUser.userNumber) : null,
      is_claimed: updatedUser.isClaimed,
      updated_at: new Date(updatedUser.updatedAt).toISOString(),
    }
  },

  async deleteMember(id: string, currentUser?: CurrentUser) {
    if (currentUser?.role !== "admin") {
      throw new AppError("Only admin can delete member accounts.", 403, "FORBIDDEN")
    }

    if (id === currentUser.userId) {
      throw new AppError("You cannot delete your own account.", 400, "SELF_DELETION_FORBIDDEN")
    }

    const member = await peopleModels.findUserById(id)
    if (!member) {
      throw new AppError("Member not found", 404, "MEMBER_NOT_FOUND")
    }

    await peopleModels.delete(id)
    await invalidate(CacheKeys.userProfile(id))

    auditLogger.log({
      actorId: currentUser.userId,
      actorRole: currentUser.role,
      action: "USER_DELETED",
      targetId: id,
      status: "SUCCESS",
    })

    return { success: true, message: "Member deleted successfully." }
  },

  async resetTemporaryPassword(id: string, actor: CurrentUser) {
    if (!actor || (actor.role !== "organizer" && actor.role !== "admin")) {
      throw new AppError("Access denied.", 403, "FORBIDDEN")
    }

    if (id === actor.userId) {
      throw new AppError(
        "You cannot reset your own temporary password.",
        403,
        "SELF_RESET_FORBIDDEN"
      )
    }

    const targetUser = await peopleModels.findUserWithProfile(id)
    if (!targetUser) {
      throw new AppError("Member not found.", 404, "MEMBER_NOT_FOUND")
    }

    if (actor.role !== "admin" && (targetUser.role === "admin" || targetUser.role === "organizer")) {
      throw new AppError(
        "Organizers cannot reset temporary passwords for organizer or admin accounts.",
        403,
        "FORBIDDEN"
      )
    }

    // STRICT GUARD: If account is claimed, reject!
    if (targetUser.isClaimed === true || targetUser.passwordChangedByUser === true) {
      throw new AppError(
        "ACCOUNT_ALREADY_CLAIMED: This account has already been claimed by the member. For security and privacy, members must use the self-service forgot password feature.",
        400,
        "ACCOUNT_ALREADY_CLAIMED"
      )
    }

    // Generate new temporary password
    const newTempPassword = generateTemporaryPassword()
    const hashedPassword = await hashPassword(newTempPassword, DEFAULT_BCRYPT_COST)

    await peopleModels.update(id, {
      password: hashedPassword,
      passwordChangedByUser: false,
      passwordChangedAt: new Date(),
    })

    auditLogger.log({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "TEMPORARY_PASSWORD_RESET",
      targetId: id,
      status: "SUCCESS",
    })

    await invalidate(CacheKeys.userProfile(id))

    const memberName = targetUser.profile?.name || targetUser.username || "Member"
    const userNumberInt = targetUser.userNumber ? Number(targetUser.userNumber) : null

    const whatsappInvite = generateWhatsAppInviteMessage({
      name: memberName,
      userNumber: userNumberInt || "-",
      username: targetUser.username || "-",
      tempPassword: newTempPassword,
    })

    return {
      id: targetUser.id,
      user_number: userNumberInt,
      username: targetUser.username,
      name: memberName,
      temporary_password: newTempPassword,
      whatsapp_invite_message: whatsappInvite,
      copy_template: whatsappInvite,
      message: `Temporary password for ${memberName} has been regenerated successfully.`,
    }
  },
}
