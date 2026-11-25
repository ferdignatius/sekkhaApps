import { userModels } from "./models"
import type { Prisma } from "@prisma/client"
import { cached, invalidate, invalidatePattern, CacheKeys } from "../../lib/cache"
import { encrypt, safeDecrypt, generateBlindIndex } from "../../lib/crypto"
import { hashPassword, verifyPassword, DEFAULT_BCRYPT_COST } from "../../lib/password"
import { prisma } from "../../lib/prisma"
import { revokeToken, generateToken, revokeAllUserRefreshTokens } from "../auth"
import { calculateWeeklyStreak, toWeekKey } from "./internal/utils"
import { emailVerificationStore } from "./internal/emailVerificationStore"
import { passwordChangeOtpStore } from "./internal/passwordChangeOtpStore"
import { sendEmailVerificationOtpEmail, sendChangePasswordOtpEmail } from "../../lib/email"
import { isValidGmailEmail, GMAIL_ERROR_MESSAGE } from "../../lib/emailValidation"
import { AppError } from "../../lib/AppError"
import { auditLogger } from "../../lib/auditLogger"
import {
  buildYearlyWeeklyHeatmap,
  getHeatmapQueryRange,
} from "../../lib/activityHeatmap"
import { eventbus, DomainEvents } from "../../core/eventbus"
import crypto from "crypto"

async function invalidateUserDerivedCaches(userId: string): Promise<void> {
  await Promise.all([
    invalidate(CacheKeys.userProfile(userId)).catch(() => {}),
    invalidate(CacheKeys.userStreak(userId)).catch(() => {}),
    invalidatePattern(`user:${userId}:home:*`).catch(() => {}),
    invalidatePattern("leaderboard:*").catch(() => {}),
    invalidatePattern("pengurus:insight:*").catch(() => {}),
    invalidatePattern("schools:stats:*").catch(() => {}),
    invalidatePattern("schools:list:*").catch(() => {}),
    invalidatePattern("people:list:*").catch(() => {}),
  ])
}

function maskEmail(email: string): string {
  const atIndex = email.indexOf("@")
  if (atIndex <= 1) return "***"
  const local = email.slice(0, atIndex)
  const domain = email.slice(atIndex)
  const visible = local.length > 3 ? `${local.slice(0, 2)}***` : `${local.slice(0, 1)}***`
  return `${visible}${domain}`
}

export interface UpdateProfileInput {
  username?: string
  name?: string
  school?: string | null
  school_id?: string | null
}

export const userServices = {
  async completeOnboarding(userId: string, skipped: boolean = false) {
    await userModels.completeOnboarding(userId)
    await invalidateUserDerivedCaches(userId)
    eventbus.publish(DomainEvents.USER_UPDATED, {
      userId,
      fields: ["onboardingCompleted"],
    })
    return { onboarding_completed: true, skipped }
  },

  async getProfile(userId: string) {
    const user = await cached(CacheKeys.userProfile(userId), 120, async () => {
      return userModels.findUserWithProfileAndStats(userId)
    })
    if (!user) {
      return null
    }

    let uNum: bigint | null = user.userNumber != null ? BigInt(user.userNumber) : null
    if (!uNum) {
      uNum = await userModels.generateUserNumber(prisma, new Date(user.createdAt))
      const backfilled = await userModels
        .updateUser(user.id, { userNumber: uNum })
        .then(() => true)
        .catch(() => false)
      if (backfilled) {
        await invalidate(CacheKeys.userProfile(userId))
      }
    }

    const decryptedEmail = safeDecrypt(user.email, "") || ""
    return {
      id: user.id,
      user_number: Number(uNum),
      username: user.username || "",
      name: user.profile?.name || "",
      email: decryptedEmail,
      email_verified: Boolean(user.emailVerifiedAt),
      role: user.role,
      is_claimed: user.isClaimed,
      onboarding_completed: user.onboardingCompleted,
      school_id: user.profile?.schoolId || null,
      school: user.profile?.school?.name || null,
      school_status: user.profile?.school?.status || null,
      stats: {
        total_points: user.stats?.points ?? 0,
        current_streak: user.stats?.currentStreak ?? 0,
        total_attendances: user.stats?.totalAttendances ?? user._count?.attendances ?? 0,
      },
      joined_at: new Date(user.createdAt).toISOString(),
    }
  },

  async updateProfile(userId: string, body: UpdateProfileInput, _authHeader?: string) {
    const existing = await userModels.findUserWithProfileAndStats(userId)
    if (!existing) {
      const err = new Error("User not found") as any
      err.statusCode = 404
      throw err
    }

    let resolvedSchoolId: string | null | undefined = undefined
    if (body.school_id !== undefined) {
      if (body.school_id) {
        const school = await prisma.school.findUnique({ where: { id: body.school_id } })
        if (!school || (school.status !== "active" && school.status !== "pending") || (school.status === "active" && !school.isActive)) {
          const error = new Error("Selected school is invalid or inactive.") as any
          error.statusCode = 400
          throw error
        }
        resolvedSchoolId = school.id
      } else {
        resolvedSchoolId = null
      }
    } else if (body.school) {
      const trimmedSchool = body.school.trim()
      const existingSchool = await userModels.findSchoolByName(trimmedSchool)
      if (
        existingSchool &&
        (existingSchool.status === "active" || existingSchool.status === "pending") &&
        (existingSchool.status === "pending" || existingSchool.isActive)
      ) {
        resolvedSchoolId = existingSchool.id
      } else {
        resolvedSchoolId = null
      }
    } else if (body.school === null) {
      resolvedSchoolId = null
    }

    const userData: Prisma.UserUpdateInput = {}

    if (body.username !== undefined) {
      const cleanUsername = body.username.trim().toLowerCase()
      if (cleanUsername !== existing.username) {
        const taken = await userModels.findUserByUsername(cleanUsername)
        if (taken && taken.id !== userId) {
          throw new AppError("Username is already taken", 409, "USERNAME_TAKEN")
        }
        userData.username = cleanUsername
      }
    }

    const profileUpdateData = {
      ...(body.name && { name: body.name.trim() }),
      ...(resolvedSchoolId !== undefined && { schoolId: resolvedSchoolId }),
    }

    const profileCreateData = {
      userId,
      name: body.name ? body.name.trim() : (userData.username as string) || existing.username || "Member",
      schoolId: resolvedSchoolId || null,
    }

    await userModels.updateUserAndProfile(
      userId,
      userData,
      profileUpdateData,
      profileCreateData
    )

    // Invalidate caches & notify subscribers
    await invalidateUserDerivedCaches(userId)
    eventbus.publish(DomainEvents.USER_UPDATED, {
      userId,
      fields: Object.keys(body),
    })

    return this.getProfile(userId)
  },

  async requestEmailVerification(userId: string, targetEmail: string) {
    const normalizedEmail = targetEmail.trim().toLowerCase()
    if (!isValidGmailEmail(normalizedEmail)) {
      const err = new Error(GMAIL_ERROR_MESSAGE) as any
      err.statusCode = 400
      throw err
    }

    // Check cooldown (60 seconds)
    const cooldownRemaining = await emailVerificationStore.getCooldownRemaining(userId)
    if (cooldownRemaining > 0) {
      throw new AppError(
        `Please wait ${cooldownRemaining} seconds before requesting a new verification code.`,
        429,
        "OTP_COOLDOWN"
      )
    }

    // O(1) Blind Index check: is email already used by another user?
    const bindex = generateBlindIndex(normalizedEmail)
    const existingWithEmail = bindex ? await userModels.findUserByEmailBindex(bindex) : null

    if (existingWithEmail && existingWithEmail.id !== userId) {
      // Anti-enumeration protection: return generic 200 without sending code
      return {
        expires_in_seconds: 600,
        resend_after_seconds: 60,
      }
    }

    // Generate secure 6-digit OTP
    const otp = crypto.randomInt(100000, 1000000).toString()

    // Save challenge
    await emailVerificationStore.saveChallenge(userId, normalizedEmail, otp)

    // Fetch user name for polite email greeting
    const user = await userModels.findUserWithProfileAndStats(userId)
    const userName = user?.profile?.name || user?.username || "Member"

    // Dispatch email and roll back challenge/cooldown on delivery failure
    const mailResult = await sendEmailVerificationOtpEmail({
      to: normalizedEmail,
      otp,
      name: userName,
    })
    if (!mailResult.success) {
      await emailVerificationStore.clearChallenge(userId)
      throw new AppError(
        "Failed to send verification code email. Please try again later.",
        503,
        "EMAIL_SEND_FAILED"
      )
    }

    return {
      expires_in_seconds: 600,
      resend_after_seconds: 60,
    }
  },

  async confirmEmailVerification(userId: string, otpCode: string) {
    if (!otpCode || otpCode.trim().length !== 6) {
      throw new AppError("Verification code must be 6 digits", 400, "INVALID_OTP_FORMAT")
    }

    const result = await emailVerificationStore.verifyAndConsume(userId, otpCode)
    if (!result.success || !result.newEmail) {
      const status = result.remainingAttempts === 0 ? 429 : 400
      throw new AppError(
        result.error || "Invalid verification code",
        status,
        status === 429 ? "OTP_MAX_ATTEMPTS" : "INVALID_OTP"
      )
    }

    const newEmail = result.newEmail
    const emailCipher = encrypt(newEmail)
    const bindex = generateBlindIndex(newEmail)
    if (!emailCipher || !bindex) {
      throw new AppError(
        "Failed to process email encryption and blind index",
        500,
        "ENCRYPTION_ERROR"
      )
    }

    const taken = await userModels.findUserByEmailBindex(bindex)
    if (taken && taken.id !== userId) {
      throw new AppError("Email is already registered to another account", 409, "EMAIL_ALREADY_EXISTS")
    }

    const updatedUser = await userModels.updateUserEmail(userId, emailCipher, bindex)
    await invalidateUserDerivedCaches(userId)

    auditLogger.log({
      actorId: userId,
      action: "SYSTEM_SECURITY_ALERT",
      targetId: userId,
      status: "SUCCESS",
      details: {
        subAction: "EMAIL_VERIFIED",
        isClaimed: updatedUser.isClaimed,
      },
    })
    eventbus.publish(DomainEvents.USER_UPDATED, {
      userId,
      fields: ["email", "emailVerifiedAt", "isClaimed"],
    })

    return {
      email: newEmail,
      email_verified: true,
      is_claimed: updatedUser.isClaimed,
    }
  },

  async getAttendances(userId: string, limit: number = 10, cursor?: string) {
    const take = Math.min(Math.max(limit, 1), 50)
    const [attendances, total] = await Promise.all([
      userModels.findUserAttendances(userId, take, cursor),
      userModels.countUserAttendances(userId),
    ])

    const items = attendances.map((a) => ({
      id: a.id,
      event_id: a.eventId,
      event_title: a.event.title,
      event_date: a.event.eventDate
        ? new Date(a.event.eventDate).toISOString()
        : new Date().toISOString(),
      method: a.method,
      points_earned: a.pointsEarned ?? 0,
      scanned_at: a.scannedAt
        ? new Date(a.scannedAt).toISOString()
        : new Date().toISOString(),
    }))

    const nextCursor = items.length === take ? items[items.length - 1].id : null

    return {
      items,
      pagination: {
        next_cursor: nextCursor,
        total,
      },
    }
  },

  async getStreak(userId: string) {
    return cached(CacheKeys.userStreak(userId), 30, async () => {
      const [attendances, closedEvents] = await Promise.all([
        userModels.findUserAttendancesForStreak(userId),
        userModels.findClosedEventDates?.().catch(() => []) ?? Promise.resolve([]),
      ])
      const activeWeeks =
        closedEvents.length > 0
          ? closedEvents.map((e) => toWeekKey(new Date(e.eventDate)))
          : undefined
      const streak = calculateWeeklyStreak(attendances, new Date(), activeWeeks)
      const lastAttended =
        attendances.length > 0 && attendances[0].scannedAt
          ? new Date(attendances[0].scannedAt).toISOString()
          : null

      return {
        current_streak: streak.current_streak,
        longest_streak: streak.longest_streak,
        status: streak.status,
        last_attended: lastAttended,
      }
    })
  },

  async getWeeklyActivityHeatmap(userId: string, requestedYear?: number) {
    const now = new Date()
    const targetYear =
      requestedYear && Number.isInteger(requestedYear) && requestedYear >= 2020 && requestedYear <= 2100
        ? requestedYear
        : now.getUTCFullYear()

    const { queryStart, queryEnd } = getHeatmapQueryRange(targetYear)
    const records = await userModels.findUserAttendancesByDateRange(
      userId,
      queryStart,
      queryEnd
    )

    return buildYearlyWeeklyHeatmap(records, targetYear, now)
  },

  async getPointTransactions(userId: string, limit: number = 15, cursor?: string) {
    const safeLimit = Math.min(Math.max(limit, 1), 50)
    const raw = await userModels.findUserPointTransactions(userId, safeLimit + 1, cursor)
    const hasMore = raw.length > safeLimit
    const pageRows = hasMore ? raw.slice(0, safeLimit) : raw
    const stats = cursor ? null : await prisma.userStats.findUnique({ where: { userId } })
    let currentBalance = stats?.points ?? 0

    const items = pageRows.map((pt) => {
      const balance = cursor ? undefined : currentBalance
      if (!cursor) {
        currentBalance -= pt.amount
      }
      return {
        id: pt.id,
        points: pt.amount,
        points_delta: pt.amount,
        type: pt.type,
        description: pt.description || "",
        ...(balance !== undefined ? { running_balance: balance } : {}),
        created_at: new Date(pt.createdAt).toISOString(),
      }
    })
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].id : null
    return { items, has_more: hasMore, next_cursor: nextCursor }
  },

  async requestChangePasswordOtp(userId: string, currentPass?: string) {
    const user = await userModels.findUserWithProfileAndStats(userId)
    const userAccount = await userModels.findUserById(userId)
    if (!userAccount || !userAccount.password) {
      const error = new Error("This account does not have an active password set") as any
      error.statusCode = 400
      throw error
    }

    if (currentPass) {
      let isValid = await verifyPassword(currentPass, userAccount.password)
      if (!isValid && currentPass.trim() !== currentPass) {
        isValid = await verifyPassword(currentPass.trim(), userAccount.password)
      }
      if (!isValid) {
        const error = new Error("Current password does not match") as any
        error.statusCode = 400
        throw error
      }
    }

    const rawEmail = user?.email || userAccount.email
    const targetEmail = safeDecrypt(rawEmail, "") || ""
    if (!targetEmail && !userAccount.passwordChangedByUser) {
      return {
        otp_required: false,
        expires_in_seconds: 0,
        resend_after_seconds: 0,
        masked_email: null,
      }
    }

    const cooldownRemaining = await passwordChangeOtpStore.getCooldownRemaining(userId)
    if (cooldownRemaining > 0) {
      const err = new Error(`Please wait ${cooldownRemaining} seconds before requesting a new verification code.`) as any
      err.statusCode = 429
      throw err
    }

    if (!targetEmail) {
      const error = new Error("Your account does not have a registered email address to receive verification codes.") as any
      error.statusCode = 400
      throw error
    }

    const otp = crypto.randomInt(100000, 1000000).toString()
    await passwordChangeOtpStore.saveChallenge(userId, otp)

    const userName = user?.profile?.name || userAccount.username || "Member"
    const mailResult = await sendChangePasswordOtpEmail({
      to: targetEmail,
      otp,
      name: userName,
    })
    if (!mailResult.success) {
      await passwordChangeOtpStore.clearChallenge(userId)
      throw new AppError(
        "Failed to send verification code email. Please try again later.",
        503,
        "EMAIL_SEND_FAILED"
      )
    }

    return {
      expires_in_seconds: 600,
      resend_after_seconds: 60,
      masked_email: maskEmail(targetEmail),
    }
  },

  async changePassword(userId: string, currentPass: string, newPass: string, otpCode?: string) {
    const user = await userModels.findUserWithProfileAndStats(userId)
    const userAccount = await userModels.findUserById(userId)
    if (!userAccount || !userAccount.password) {
      const error = new Error("Account does not have a valid password set") as any
      error.statusCode = 400
      throw error
    }

    const rawEmail = user?.email || userAccount.email
    const hasEmail = Boolean(safeDecrypt(rawEmail, ""))
    const isInitialPreProvisionedPasswordChange = !hasEmail && !userAccount.passwordChangedByUser

    if (!isInitialPreProvisionedPasswordChange) {
      if (!otpCode || otpCode.trim().length !== 6) {
        const err = new Error("Verification code must be 6 digits") as any
        err.statusCode = 400
        throw err
      }

      const otpResult = await passwordChangeOtpStore.verifyAndConsume(userId, otpCode)
      if (!otpResult.success) {
        const err = new Error(otpResult.error || "Verification code is invalid or expired") as any
        err.statusCode = otpResult.remainingAttempts === 0 ? 429 : 400
        throw err
      }
    }

    let isValid = await verifyPassword(currentPass, userAccount.password)
    if (!isValid && currentPass.trim() !== currentPass) {
      isValid = await verifyPassword(currentPass.trim(), userAccount.password)
    }

    if (!isValid) {
      const error = new Error("Current password does not match") as any
      error.statusCode = 400
      throw error
    }

    if (newPass.length < 8) {
      const error = new Error("New password must be at least 8 characters") as any
      error.statusCode = 400
      throw error
    }

    if (newPass.length > 128) {
      const error = new Error("New password maximum 128 characters") as any
      error.statusCode = 400
      throw error
    }

    const hashedPassword = await hashPassword(newPass, DEFAULT_BCRYPT_COST)
    const passwordChangedAt = new Date()
    const isClaimed = Boolean(
      userAccount.isClaimed || userAccount.emailVerifiedAt || (userAccount as any).emailVerified
    )
    await userModels.updateUser(userId, {
      password: hashedPassword,
      passwordChangedByUser: true,
      passwordChangedAt,
      isClaimed,
      ...(isClaimed && !userAccount.isClaimed ? { claimedAt: passwordChangedAt } : {}),
    })
    await revokeAllUserRefreshTokens(userId)

    // Invalidate caches, record audit trail, and notify subscribers
    await invalidateUserDerivedCaches(userId)

    auditLogger.log({
      actorId: userId,
      actorRole: userAccount.role,
      action: "AUTH_PASSWORD_CHANGED",
      targetId: userId,
      status: "SUCCESS",
    })
    eventbus.publish(DomainEvents.USER_UPDATED, {
      userId,
      fields: ["passwordChangedAt", "isClaimed"],
    })

    // Issue fresh access token so the active session is not prematurely rejected with 401
    const displayName = user?.profile?.name || userAccount.username || "Member"
    const freshAccessToken = generateToken(
      userAccount.id,
      userAccount.role,
      displayName,
      passwordChangedAt
    )

    return {
      accessToken: freshAccessToken,
      password_changed_by_user: true,
      is_claimed: isClaimed,
    }
  },

  async exportUserData(userId: string) {
    const user = await userModels.findUserFullExport(userId)
    if (!user) {
      return null
    }

    return {
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        user_number: user.userNumber ? Number(user.userNumber) : null,
        username: user.username,
        email: safeDecrypt(user.email, null),
        role: user.role,
        is_claimed: user.isClaimed,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
      profile: {
        name: user.profile?.name ?? null,
        school: user.profile?.school?.name ?? null,
        school_id: user.profile?.schoolId ?? null,
        school_status: user.profile?.school?.status ?? null,
      },
      stats: {
        points: user.stats?.points ?? 0,
        total_attendances: user.stats?.totalAttendances ?? user.attendances?.length ?? 0,
        current_streak: user.stats?.currentStreak ?? 0,
        last_activity_at: user.stats?.lastActivityAt ?? null,
      },
      attendances: user.attendances.map((a) => ({
        event_title: a.event.title,
        event_date: a.event.eventDate,
        location: a.event.location,
        method: a.method,
        points_earned: a.pointsEarned,
        scanned_at: a.scannedAt,
      })),
      point_transactions: user.pointTransactions.map((pt) => ({
        type: pt.type,
        points: pt.amount,
        description: pt.description,
        created_at: pt.createdAt,
      })),
    }
  },

  async deleteAccount(userId: string, passwordConfirm: string, authHeader?: string) {
    const user = await userModels.findUserById(userId)
    if (!user || !user.password) {
      throw new AppError(
        "Invalid account or account does not have a password set",
        400,
        "INVALID_ACCOUNT"
      )
    }

    const isValid = await verifyPassword(passwordConfirm, user.password)
    if (!isValid) {
      throw new AppError("Confirmation password is incorrect", 403, "INVALID_PASSWORD")
    }

    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null
    if (token) {
      await revokeToken(token).catch(() => {})
    }
    await revokeAllUserRefreshTokens(userId)

    await userModels.deleteUserById(userId)
    await invalidateUserDerivedCaches(userId)

    auditLogger.log({
      actorId: userId,
      actorRole: user.role,
      action: "USER_DELETED",
      targetId: userId,
      status: "SUCCESS",
    })
    eventbus.publish(DomainEvents.USER_DELETED, { userId, reason: "self_delete" })

    return {
      message: "Your account and all personal data have been permanently deleted.",
    }
  },
}
