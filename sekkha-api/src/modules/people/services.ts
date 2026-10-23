import { randomBytes, randomInt } from "crypto"
import { peopleModels } from "./models"
import { hashPassword, verifyPassword, DEFAULT_BCRYPT_COST } from "../../lib/password"
import { generateUniqueUsername, sendTemporaryPasswordEmail } from "../auth"
import { invalidate, CacheKeys } from "../../lib/cache"
import { generateUniqueUserNumber } from "../../lib/userNumber"
import { encrypt, decrypt, generateBlindIndex } from "../../lib/crypto"
import { auditLogger } from "../../lib/auditLogger"
import { prisma } from "../../lib/prisma"

export function generateDefaultPassword(): string {
  const randHex = randomBytes(6).toString("hex")
  return `Sekkha-${randHex}-Puggala`
}

type ListMembersQuery = {
  search?: string
  claimed_status: "all" | "claimed" | "unclaimed"
  role: "all" | "member" | "activist" | "organizer" | "admin" | "umat" | "aktivis" | "pengurus"
  page: number
  limit: number
}

type CurrentUser = { userId: string; role: string }

export const peopleServices = {
  async getMembers(
    queryParams: ListMembersQuery,
    currentUser?: CurrentUser
  ) {
    const searchQuery = (queryParams.search || "").toLowerCase().trim()
    const claimedStatus = queryParams.claimed_status
    const roleFilter = queryParams.role

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

    if (searchQuery) {
      const searchNum = /^\d+$/.test(searchQuery) ? parseInt(searchQuery, 10) : null
      const searchConditions: any[] = [
        { profile: { name: { contains: searchQuery, mode: "insensitive" } } },
        { username: { contains: searchQuery, mode: "insensitive" } },
        ...(searchNum !== null ? [{ userNumber: searchNum }] : []),
        { profile: { school: { name: { contains: searchQuery, mode: "insensitive" } } } },
      ]
      where.OR = searchConditions
    }

    const { page, limit } = queryParams
    const skip = (page - 1) * limit

    const [totalMatching, rawMembers, roleCounts] = await Promise.all([
      peopleModels.count(where),
      peopleModels.findMany(where, limit, skip),
      peopleModels.countByRole(),
    ])

    const counts = roleCounts.reduce(
      (result, row) => {
        result.total += row._count._all
        if (row.role === "member") result.member = row._count._all
        if (row.role === "activist") result.activist = row._count._all
        if (row.role === "organizer" || row.role === "admin") result.organizer += row._count._all
        return result
      },
      { total: 0, member: 0, activist: 0, organizer: 0 }
    )

    const members = rawMembers.map((m) => {
      return {
        id: m.id,
        name: m.profile?.name || m.username || "Anggota",
        username: m.username || null,
        email: null,
        phone: null,
        school: m.profile?.school?.name || null,
        school_id: m.profile?.schoolId || null,
        birth_date: null,
        gender: null,
        role: m.role,
        avatar_url: null,
        user_number: m.userNumber || null,
        is_claimed: m.isClaimed ?? true,
        total_attendance: m._count?.attendances ?? 0,
        points: m.stats?.points ?? 0,
        created_at: new Date(m.createdAt).toISOString(),
      }
    })

    return {
      items: members,
      page,
      limit,
      total: totalMatching,
      totalPages: Math.max(1, Math.ceil(totalMatching / limit)),
      stats: {
        total: counts.total,
        member: counts.member,
        activist: counts.activist,
        organizer: counts.organizer,
      },
    }
  },

  async getMemberDetail(id: string, currentUser?: { userId: string; role: string }) {
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
      name: member.profile?.name || member.username || "Anggota",
      username: member.username,
      email: canViewSensitive ? (decrypt(member.email) || member.email) : null,
      phone: canViewSensitive ? (decrypt(member.profile?.phone) || null) : null,
      school: member.profile?.school?.name || null,
      school_id: member.profile?.schoolId || null,
      birth_date: canViewSensitive ? (decrypt(member.profile?.birthDate) || null) : null,
      gender: canViewSensitive ? (decrypt(member.profile?.gender) || null) : null,
      role: member.role,
      avatar_url: null,
      user_number: member.userNumber,
      is_claimed: member.isClaimed ?? true,
      points: canViewSensitive ? (member.stats?.points ?? 0) : 0,
      created_at: new Date(member.createdAt).toISOString(),
      attendances: (member.attendances || []).map((a: any) => ({
        id: a.id,
        event_title: a.event?.title || "Event",
        event_date: a.event?.eventDate ? new Date(a.event.eventDate).toISOString() : new Date().toISOString(),
        location: a.event?.location || "—",
        method: a.method,
        points_earned: canViewSensitive ? (a.pointsEarned || 50) : 0,
        scanned_at: new Date(a.scannedAt).toISOString(),
      })),
    }
  },

  async createMember(data: any) {
    if (data.email) {
      const emailBindex = generateBlindIndex(data.email)
      if (emailBindex) {
        const existingEmail = await peopleModels.findUserByEmailBindex(emailBindex)
        if (existingEmail) {
          const error = new Error("Email is already registered with another user.") as any
          error.statusCode = 400
          throw error
        }
      }
    }

    const username = data.username ? data.username.toLowerCase().trim() : await generateUniqueUsername(data.name)
    const existingUsername = await peopleModels.findUserByUsername(username)
    if (existingUsername) {
      const error = new Error(`Username @${username} is already taken. Please choose another username.`) as any
      error.statusCode = 400
      throw error
    }

    const defaultPassword = generateDefaultPassword()
    const hashedPassword = await hashPassword(defaultPassword, DEFAULT_BCRYPT_COST)

    let resolvedSchoolId = data.school_id
    if (!resolvedSchoolId && data.school) {
      const s = await peopleModels.findSchoolByName(data.school.trim())
      if (s) {
        resolvedSchoolId = s.id
      } else {
        const createdS = await peopleModels.upsertSchool(data.school.trim(), "Lainnya")
        resolvedSchoolId = createdS.id
      }
    }

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
            role: data.role,
            userNumber,
            isClaimed: true,
            profile: {
              create: {
                name: data.name.trim(),
                phone: data.phone ? encrypt(data.phone.trim()) : null,
                schoolId: resolvedSchoolId || null,
                birthDate: data.birth_date ? encrypt(new Date(data.birth_date).toISOString()) : null,
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

    const memberProfileName = (newMember.profile as any)?.name || data.name.trim()

    if (data.email) {
      try {
        await sendTemporaryPasswordEmail({
          to: data.email.toLowerCase().trim(),
          tempPassword: defaultPassword,
          name: memberProfileName,
        })
      } catch (emailErr) {
        console.error("Failed to send welcome email with temporary password:", emailErr)
      }
    }

    const responsePayload: Record<string, any> = {
      id: newMember.id,
      name: memberProfileName,
      username: newMember.username,
      email: data.email || null,
      phone: data.phone || null,
      school: (newMember.profile as any)?.school?.name || null,
      birth_date: data.birth_date || null,
      gender: data.gender || null,
      role: newMember.role,
      user_number: newMember.userNumber,
      is_claimed: true,
      created_at: new Date(newMember.createdAt).toISOString(),
    }

    if (data.email) {
      responsePayload.email_sent = true
      responsePayload.message = `Anggota ${memberProfileName} berhasil didaftarkan. Informasi kata sandi sementara telah dikirimkan ke email terdaftar.`
    } else {
      responsePayload.email_sent = false
      responsePayload.requires_change_on_login = true
      responsePayload.message = `Anggota ${memberProfileName} berhasil didaftarkan.`
    }

    return responsePayload
  },

  async updateMember(id: string, data: any, currentUser?: { userId: string; role: string }) {
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

    if (data.email) {
      const cleanEmail = data.email.toLowerCase().trim()
      const emailBindex = generateBlindIndex(cleanEmail)
      if (emailBindex) {
        const emailInUse = await peopleModels.findUserByEmailBindex(emailBindex)
        if (emailInUse && emailInUse.id !== id) {
          const error = new Error("Email is already used by another member.") as any
          error.statusCode = 400
          throw error
        }
      }
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
      } else {
        const createdS = await peopleModels.upsertSchool(data.school.trim(), "Lainnya")
        resolvedSchoolId = createdS.id
      }
    }

    const userData = {
      ...(data.username !== undefined && { username: data.username ? data.username.toLowerCase().trim() : null }),
      ...(data.email !== undefined && {
        email: data.email ? encrypt(data.email.toLowerCase().trim()) : null,
        emailBindex: data.email ? generateBlindIndex(data.email.toLowerCase().trim()) : null,
      }),
      ...(data.role && { role: data.role }),
    }
    const profileData = {
      ...(data.name && { name: data.name.trim() }),
      ...(data.phone !== undefined && { phone: data.phone ? encrypt(data.phone.trim()) : null }),
      ...(resolvedSchoolId !== undefined && { schoolId: resolvedSchoolId }),
      ...(data.birth_date !== undefined && {
        birthDate: data.birth_date ? encrypt(new Date(data.birth_date).toISOString()) : null,
      }),
      ...(data.gender !== undefined && { gender: data.gender ? encrypt(data.gender.trim()) : null }),
    }

    const { updatedUser, updatedProfile } = await peopleModels.transaction(async (tx) => {
      const updatedUser = await tx.user.update({ where: { id }, data: userData })
      const updatedProfile = await tx.userProfile.upsert({
        where: { userId: id },
        update: profileData,
        create: {
          userId: id,
          name: data.name ? data.name.trim() : existing.profile?.name || existing.username || "Anggota",
          phone: data.phone ? encrypt(data.phone.trim()) : null,
          schoolId: resolvedSchoolId || null,
          birthDate: data.birth_date ? encrypt(new Date(data.birth_date).toISOString()) : null,
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
      email: data.email !== undefined ? data.email : (decrypt(updatedUser.email) || updatedUser.email),
      phone: data.phone !== undefined ? data.phone : (decrypt(updatedProfile.phone) || null),
      school: (updatedProfile as any).school?.name || null,
      birth_date: data.birth_date !== undefined ? data.birth_date : (decrypt(updatedProfile.birthDate) || null),
      gender: data.gender !== undefined ? data.gender : (decrypt(updatedProfile.gender) || null),
      role: updatedUser.role,
      user_number: updatedUser.userNumber,
      is_claimed: updatedUser.isClaimed,
      updated_at: new Date(updatedUser.updatedAt).toISOString(),
    }
  },

  async deleteMember(id: string, currentUser?: { userId: string; role: string }) {
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

    return { success: true, message: "Member deleted successfully." }
  },

  async resetPassword(id: string, actor: CurrentUser) {
    const targetUser = await peopleModels.findUserWithProfile(id)
    if (!targetUser) {
      const error = new Error("Member not found.") as any
      error.statusCode = 404
      throw error
    }

    if (targetUser.passwordChangedByUser) {
      const error = new Error(
        "Akun ini telah mengubah kata sandi sendiri. Admin tidak dapat mereset kata sandi demi keamanan dan privasi pengguna."
      ) as any
      error.statusCode = 403
      throw error
    }

    const defaultPassword = generateDefaultPassword()
    const hashedPassword = await hashPassword(defaultPassword, DEFAULT_BCRYPT_COST)

    await peopleModels.update(id, {
      password: hashedPassword,
      passwordChangedByUser: false,
      passwordChangedAt: new Date(),
    })

    auditLogger.log({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "USER_PASSWORD_RESET",
      targetId: id,
      status: "SUCCESS",
    })

    await invalidate(CacheKeys.userProfile(id))

    const memberName = targetUser.profile?.name || targetUser.username || "member"
    const decryptedEmail = decrypt(targetUser.email) || targetUser.email

    if (decryptedEmail) {
      await sendTemporaryPasswordEmail({
        to: decryptedEmail,
        tempPassword: defaultPassword,
        name: memberName,
      })

      return {
        success: true,
        user_number: targetUser.userNumber,
        username: targetUser.username,
        name: memberName,
        email_sent: true,
        message: `Kata sandi sementara untuk ${memberName} berhasil dibuat dan dikirimkan ke email terdaftar.`,
      }
    }

    return {
      success: true,
      user_number: targetUser.userNumber,
      username: targetUser.username,
      name: memberName,
      email_sent: false,
      requires_change_on_login: true,
      message: `Kata sandi sementara untuk ${memberName} berhasil diatur. Harap minta member segera mengubah kata sandi saat masuk.`,
    }
  },

  async generateClaimPin(id: string, actor: CurrentUser) {
    const targetUser = await peopleModels.findUserWithProfile(id)
    if (!targetUser) {
      const error = new Error("Anggota tidak ditemukan.") as any
      error.statusCode = 404
      throw error
    }

    if (targetUser.isClaimed) {
      const error = new Error("Akun anggota ini sudah diklaim / aktif.") as any
      error.statusCode = 400
      throw error
    }

    const rawPin = randomInt(100000, 1000000).toString()
    const hashedPin = await hashPassword(rawPin, DEFAULT_BCRYPT_COST)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await peopleModels.update(id, {
      claimPin: hashedPin,
      claimPinExpiresAt: expiresAt,
    })

    await invalidate(CacheKeys.userProfile(id))

    auditLogger.log({
      actorId: actor.userId,
      actorRole: actor.role,
      action: "USER_CLAIM_PIN_GENERATED",
      targetId: id,
      status: "SUCCESS",
    })

    const memberName = targetUser.profile?.name || targetUser.username || "Anggota"

    return {
      success: true,
      user_number: targetUser.userNumber,
      name: memberName,
      expires_at: expiresAt.toISOString(),
      message: `PIN klaim 6-digit untuk ${memberName} berhasil dibuat. Distribusikan PIN melalui kanal aman.`,
    }
  },

  async linkLegacyAccount(
    data: { user_number: string; claim_pin: string },
    currentUser: { userId: string; role?: string }
  ) {
    const { user_number, claim_pin } = data
    const cleanPin = claim_pin.replace(/[^0-9]/g, "").trim()
    const currentUserId = currentUser.userId

    const targetUser = await peopleModels.findUnclaimedMemberForLinking(user_number.trim())

    if (!targetUser || !targetUser.claimPin) {
      const error = new Error("Akun dengan nomor anggota tersebut tidak ditemukan atau sudah diklaim.") as any
      error.statusCode = 404
      throw error
    }

    if (targetUser.id === currentUserId) {
      const error = new Error("Tidak dapat menautkan akun ke diri sendiri.") as any
      error.statusCode = 400
      throw error
    }

    if (targetUser.failedClaimAttempts >= 5) {
      const error = new Error(
        "Akun ini telah dikunci karena 5 kali percobaan PIN yang salah. Silakan minta PIN baru ke pengurus."
      ) as any
      error.statusCode = 403
      throw error
    }

    if (targetUser.claimPinExpiresAt && targetUser.claimPinExpiresAt < new Date()) {
      const error = new Error("PIN aktivasi sudah kedaluwarsa. Silakan minta PIN baru ke pengurus.") as any
      error.statusCode = 400
      throw error
    }

    const isPinValid = await verifyPassword(cleanPin, targetUser.claimPin)
    if (!isPinValid) {
      await peopleModels.update(targetUser.id, {
        failedClaimAttempts: { increment: 1 },
      })
      const remaining = 5 - (targetUser.failedClaimAttempts + 1)
      const error = new Error(`PIN aktivasi salah. Sisa percobaan: ${Math.max(0, remaining)} kali.`) as any
      error.statusCode = 400
      throw error
    }

    const legacyPoints = (targetUser as any).stats?.points || 0

    await peopleModels.transaction(async (tx) => {
      // 1. Transfer attendances
      const existingAttendances = await tx.attendance.findMany({
        where: { userId: currentUserId },
        select: { eventId: true },
      })
      const existingEventIds = new Set(existingAttendances.map((a: any) => a.eventId))

      const targetAttendances = await tx.attendance.findMany({
        where: { userId: targetUser.id },
      })

      for (const att of targetAttendances) {
        if (!existingEventIds.has(att.eventId)) {
          await tx.attendance.update({
            where: { id: att.id },
            data: { userId: currentUserId },
          })
        }
      }


      // 3. Merge points
      if (legacyPoints > 0) {
        await tx.userStats.upsert({
          where: { userId: currentUserId },
          update: { points: { increment: legacyPoints } },
          create: { userId: currentUserId, points: legacyPoints },
        })

        await tx.pointTransaction.create({
          data: {
            userId: currentUserId,
            amount: legacyPoints,
            type: "system",
            description: `Penggabungan data akun lama (${targetUser.userNumber}) via PIN Aktivasi`,
          },
        })
      }

      // 4. Mark pre-provisioned user as claimed, link to claimer, and clear sensitive PIN
      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          isClaimed: true,
          claimedAt: new Date(),
          claimedByUserId: currentUserId,
          claimPin: null,
          claimPinExpiresAt: null,
          failedClaimAttempts: 0,
        },
      })
    })

    auditLogger.log({
      actorId: currentUserId,
      actorRole: currentUser.role,
      action: "USER_ACCOUNT_LINKED",
      targetId: targetUser.id,
      status: "SUCCESS",
      details: {
        targetUserNumber: targetUser.userNumber,
        pointsMerged: legacyPoints,
      },
    })

    await invalidate(CacheKeys.userProfile(currentUserId))
    await invalidate(CacheKeys.userProfile(targetUser.id))

    return {
      success: true,
      message: `Akun lama (${targetUser.userNumber}) berhasil ditautkan. Riwayat absensi dan poin telah digabungkan.`,
    }
  },
}
