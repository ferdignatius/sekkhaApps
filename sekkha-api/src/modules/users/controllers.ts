import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { userServices } from "./services"

export const UpdateProfileSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username maximum 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, dots, or underscores")
    .optional(),
  name: z.string().trim().min(1, "Name must be at least 1 character").max(100).optional(),
  school: z.string().trim().max(100).optional().nullable(),
  school_id: z.string().optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  date_of_birth: z.string().optional().nullable(),
  birth_date: z.string().optional().nullable(),
  class_grade: z.string().trim().max(50).optional().nullable(),
  gender: z.string().trim().max(20).optional().nullable(),
})

export const RequestEmailVerificationSchema = z
  .object({
    email: z.string().trim().email("Invalid email format").optional(),
    new_email: z.string().trim().email("Invalid email format").optional(),
  })
  .refine((d) => Boolean(d.email || d.new_email), "Email address is required")

export const ConfirmEmailVerificationSchema = z
  .object({
    code: z.string().trim().length(6, "Verification code must be 6 digits").optional(),
    otp_code: z.string().trim().length(6, "Verification code must be 6 digits").optional(),
    otpCode: z.string().trim().length(6, "Verification code must be 6 digits").optional(),
    new_email: z.string().trim().email().optional(),
  })
  .refine(
    (d) => Boolean(d.code || d.otp_code || d.otpCode),
    "Verification code is required"
  )

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    current_password: z.string().optional(),
    newPassword: z.string().optional(),
    new_password: z.string().optional(),
  })
  .refine(
    (data) => Boolean(data.currentPassword || data.current_password),
    "Current password is required"
  )
  .refine(
    (data) => {
      const p = data.newPassword || data.new_password
      return Boolean(p && p.length >= 8)
    },
    "New password must be at least 8 characters"
  )

export const DeleteAccountSchema = z.object({
  password: z.string().min(1, "Konfirmasi kata sandi diperlukan"),
  confirmation: z.string().optional(),
})

function successEnvelope(
  res: Response,
  code: number = 200,
  message: string = "Request completed successfully",
  data: any = null
) {
  res.status(code).json({
    status: "success",
    code,
    message,
    data,
  })
}

export const userControllers = {
  async completeOnboarding(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const completed = z.object({ onboarding_completed: z.literal(true), skipped: z.boolean().optional() }).parse(req.body)
      const result = await userServices.completeOnboarding(req.user!.userId, completed.skipped === true)
      successEnvelope(res, 200, "Onboarding completed", result)
    } catch (err) {
      next(err)
    }
  },

  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId
      const profile = await userServices.getProfile(userId)
      if (!profile) {
        res.status(404).json({
          status: "fail",
          code: 404,
          message: "User not found",
          data: null,
        })
        return
      }
      successEnvelope(res, 200, "Request completed successfully", profile)
    } catch (err) {
      next(err)
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawBody = req.body || {}
      // AC-USR-05: Forbidden fields check
      const forbiddenKeys = ["email", "user_number", "userNumber", "role", "points"]
      const matchedForbidden = forbiddenKeys.filter((k) => k in rawBody)
      if (matchedForbidden.length > 0) {
        res.status(400).json({
          status: "fail",
          code: 400,
          message: `Field [${matchedForbidden.join(", ")}] tidak dapat diubah via PATCH /api/users/me. Gunakan endpoint khusus verifikasi email atau ganti password.`,
          data: null,
        })
        return
      }

      const body = UpdateProfileSchema.parse(rawBody)
      const userId = req.user!.userId
      const authHeader = req.headers.authorization
      const updated = await userServices.updateProfile(userId, body, authHeader)
      successEnvelope(res, 200, "Profile updated successfully", updated)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          status: "fail",
          code: err.statusCode,
          message: err.message,
          data: null,
        })
        return
      }
      next(err)
    }
  },

  async requestEmailVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RequestEmailVerificationSchema.parse(req.body)
      const targetEmail = parsed.new_email || parsed.email!
      const userId = req.user!.userId
      const result = await userServices.requestEmailVerification(userId, targetEmail)
      successEnvelope(res, 200, "Verification code sent if the email is available", result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          status: "fail",
          code: err.statusCode,
          message: err.message,
          data: null,
        })
        return
      }
      next(err)
    }
  },

  async confirmEmailVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = ConfirmEmailVerificationSchema.parse(req.body)
      const code = (parsed.code || parsed.otp_code || parsed.otpCode)!
      const userId = req.user!.userId
      const result = await userServices.confirmEmailVerification(userId, code)
      successEnvelope(res, 200, "Email verified successfully", result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          status: "fail",
          code: err.statusCode,
          message: err.message,
          data: null,
        })
        return
      }
      next(err)
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = ChangePasswordSchema.parse(req.body)
      const currentPassword = body.currentPassword || body.current_password!
      const newPassword = body.newPassword || body.new_password!
      const userId = req.user!.userId
      const result = await userServices.changePassword(userId, currentPassword, newPassword)
      successEnvelope(res, 200, "Password berhasil diubah. Seluruh sesi lain telah dikeluarkan.", result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          status: "fail",
          code: err.statusCode,
          message: err.message,
          data: null,
        })
        return
      }
      next(err)
    }
  },

  async getAttendances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10
      const cursor = req.query.cursor ? String(req.query.cursor) : undefined
      const result = await userServices.getAttendances(userId, limit, cursor)
      successEnvelope(res, 200, "Request completed successfully", result)
    } catch (err) {
      next(err)
    }
  },

  async getStreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId
      const streak = await userServices.getStreak(userId)
      successEnvelope(res, 200, "Request completed successfully", streak)
    } catch (err) {
      next(err)
    }
  },

  async getPointTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50
      const transactions = await userServices.getPointTransactions(userId, limit)
      res.json({
        status: "success",
        code: 200,
        message: "Points history retrieved successfully",
        data: transactions.items,
        items: transactions.items,
      })
    } catch (err) {
      next(err)
    }
  },

  async exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId
      const data = await userServices.exportUserData(userId)
      if (!data) {
        res.status(404).json({
          status: "fail",
          code: 404,
          message: "Pengguna tidak ditemukan",
          data: null,
        })
        return
      }
      res.setHeader("Content-Type", "application/json")
      res.setHeader("Content-Disposition", `attachment; filename="sekkha-data-${data.account.user_number || userId}.json"`)
      res.json(data)
    } catch (err) {
      next(err)
    }
  },

  async deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { password } = DeleteAccountSchema.parse(req.body)
      const userId = req.user!.userId
      const authHeader = req.headers.authorization
      const result = await userServices.deleteAccount(userId, password, authHeader)
      successEnvelope(res, 200, result.message, null)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({
          status: "fail",
          code: err.statusCode,
          message: err.message,
          data: null,
        })
        return
      }
      next(err)
    }
  },

  getBadgesDisabled(req: Request, res: Response): void {
    res.status(404).json({
      status: "fail",
      code: 404,
      message: "Endpoint tidak ditemukan. Sistem badge dan level telah ditiadakan.",
      data: null,
    })
  },

  getLevelDisabled(req: Request, res: Response): void {
    res.status(404).json({
      status: "fail",
      code: 404,
      message: "Endpoint tidak ditemukan. Sistem badge dan level telah ditiadakan.",
      data: null,
    })
  },
}
