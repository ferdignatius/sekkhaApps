import { randomInt } from "crypto"
import { peopleModels } from "./models"
import { hashPassword, DEFAULT_BCRYPT_COST } from "../../lib/password"
import { invalidate, CacheKeys } from "../../lib/cache"
import { generateUniqueUserNumber } from "../../lib/userNumber"
import { encrypt, decrypt, generateBlindIndex } from "../../lib/crypto"
import { auditLogger } from "../../lib/auditLogger"
import { prisma } from "../../lib/prisma"

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

    const where: any = {}

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
      const rawPhone = m.profile?.phone ? decrypt(m.profile.phone) : null
      return {
        id: m.id,
        user_number: m.userNumber ? Number(m.userNumber) : null,
        username: m.username || null,
        name: m.profile?.name || m.username || "Member",
        role: m.role,
        is_claimed: m.isClaimed ?? true,
        school: m.profile?.school?.name || null,
        school_id: m.profile?.schoolId || null,
        phone: isPrivileged ? rawPhone : null,
        created_at: new Date(m.createdAt).toISOString(),
        last_attended_at: m.stats?.lastActivityAt
          ? new Date(m.stats.lastActivityAt).toISOString()
          : null,
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
      email: canViewSensitive && member.email ? decrypt(member.email) || member.email : null,
      phone: canViewSensitive && member.profile?.phone ? decrypt(member.profile.phone) || null : null,
      school: member.profile?.school?.name || null,
      school_id: member.profile?.schoolId || null,
      birth_date:
        canViewSensitive && member.profile?.birthDate
          ? decrypt(member.profile.birthDate) || null
          : null,
      gender:
        canViewSensitive && member.profile?.gender
          ? decrypt(member.profile.gender) || null
          : null,
      role: member.role,
      is_claimed: member.isClaimed ?? true,
      points: canViewSensitive ? member.stats?.points ?? 0 : 0,
      created_at: new Date(member.createdAt).toISOString(),
      attendances: (member.attendances || []).map((a: any) => ({
        id: a.id,
        event_title: a.event?.title || "Event",
        event_date: a.event?.eventDate ? new Date(a.event.eventDate).toISOString() : new Date().toISOString(),
        location: a.event?.location || "—",
        method: a.method,
        points_earned: canViewSensitive ? a.pointsEarned || 50 : 0,
        scanned_at: new Date(a.scannedAt).toISOString(),
      })),
    }
  },

  async createMember(data: {
    name: string
    role?: "member" | "activist"
    school_id?: string | null
    school?: string | null
    phone?: string | null
    gender?: "male" | "female" | string | null
    date_of_birth?: string | null
    birth_date?: string | null
    address?: string | null
    email?: string | null
    username?: string | null
  }, actor?: CurrentUser) {
    const role = data.role === "activist" ? "activist" : "member"
    const birthDateVal = data.date_of_birth || data.birth_date || null

    let resolvedSchoolId = data.school_id || null
    if (!resolvedSchoolId && data.school) {
      const s = await peopleModels.findSchoolByName(data.school.trim())
      if (s) {
        resolvedSchoolId = s.id
      }
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
      const userNumber = await generateUniqueUserNumber(prisma)
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
                phone: data.phone ? encrypt(data.phone.trim()) : null,
                schoolId: resolvedSchoolId,
                birthDate: birthDateVal ? encrypt(new Date(birthDateVal).toISOString()) : null,
                gender: data.gender ? encrypt(data.gender.trim()) : null,
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
        if (err.code === "P2002" && err.meta?.target?.includes("user_number") && attempts < 5) {
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
      created_at: new Date(newMember.createdAt).toISOString(),
    }
  },

  async updateMember(id: string, data: any, currentUser?: CurrentUser) {
    if (data.role && currentUser?.role !== "admin") {
      const error = new Error("Only admin can change member role.") as any
      error.statusCode = 403
      throw error
    }

    const existing = await peopleModels.findUserWithProfile(id)
    if (!existing) {
      const error = new Error("Member not found") as any
      error.statusCode = 404
      throw error
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

    const birthDateVal = data.date_of_birth || data.birth_date

    const userData: any = {}
    if (data.username !== undefined) {
      userData.username = data.username ? data.username.toLowerCase().trim() : null
    }
    if (data.role) {
      userData.role = data.role
    }

    const profileData: any = {}
    if (data.name) profileData.name = data.name.trim()
    if (data.phone !== undefined) profileData.phone = data.phone ? encrypt(data.phone.trim()) : null
    if (resolvedSchoolId !== undefined) profileData.schoolId = resolvedSchoolId
    if (birthDateVal !== undefined) {
      profileData.birthDate = birthDateVal ? encrypt(new Date(birthDateVal).toISOString()) : null
    }
    if (data.gender !== undefined) profileData.gender = data.gender ? encrypt(data.gender.trim()) : null

    const { updatedUser, updatedProfile } = await peopleModels.transaction(async (tx) => {
      const updatedUser = await tx.user.update({ where: { id }, data: userData })
      const updatedProfile = await tx.userProfile.upsert({
        where: { userId: id },
        update: profileData,
        create: {
          userId: id,
          name: data.name ? data.name.trim() : existing.profile?.name || existing.username || "Member",
          phone: data.phone ? encrypt(data.phone.trim()) : null,
          schoolId: resolvedSchoolId || null,
          birthDate: birthDateVal ? encrypt(new Date(birthDateVal).toISOString()) : null,
          gender: data.gender ? encrypt(data.gender.trim()) : null,
        },
        include: { school: true },
      })
      return { updatedUser, updatedProfile }
    })

    await invalidate(CacheKeys.userProfile(id))

    return {
      id: updatedUser.id,
      name: updatedProfile.name,
      username: updatedUser.username,
      school: (updatedProfile as any).school?.name || null,
      school_id: (updatedProfile as any).schoolId || null,
      role: updatedUser.role,
      user_number: updatedUser.userNumber ? Number(updatedUser.userNumber) : null,
      is_claimed: updatedUser.isClaimed,
      updated_at: new Date(updatedUser.updatedAt).toISOString(),
    }
  },

  async deleteMember(id: string, currentUser?: CurrentUser) {
    if (id === currentUser?.userId) {
      const error = new Error("You cannot delete your own account.") as any
      error.statusCode = 400
      throw error
    }

    const member = await peopleModels.findUserById(id)
    if (!member) {
      const error = new Error("Member not found") as any
      error.statusCode = 404
      throw error
    }

    if (member.role === "admin" && currentUser?.role !== "admin") {
      const error = new Error("Only Admins can delete another Admin.") as any
      error.statusCode = 403
      throw error
    }

    await peopleModels.delete(id)
    await invalidate(CacheKeys.userProfile(id))

    if (currentUser) {
      auditLogger.log({
        actorId: currentUser.userId,
        actorRole: currentUser.role,
        action: "USER_DELETED",
        targetId: id,
        status: "SUCCESS",
      })
    }

    return { success: true, message: "Member deleted successfully." }
  },

  async resetTemporaryPassword(id: string, actor: CurrentUser) {
    const targetUser = await peopleModels.findUserWithProfile(id)
    if (!targetUser) {
      const error = new Error("Member not found.") as any
      error.statusCode = 404
      throw error
    }

    // STRICT GUARD: If account is claimed, reject!
    if (targetUser.isClaimed === true || targetUser.passwordChangedByUser === true) {
      const error = new Error(
        "ACCOUNT_ALREADY_CLAIMED: This account has already been claimed by the member. For security and privacy, members must use the self-service forgot password feature."
      ) as any
      error.statusCode = 400
      throw error
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
