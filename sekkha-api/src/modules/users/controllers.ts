import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { userServices } from "./services"

export const UpdateProfileSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username maximum 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, dots, or underscores")
    .optional()
    .nullable(),
  school: z.string().trim().max(100).optional().nullable(),
  school_id: z.string().optional().nullable(),
  class_grade: z.string().trim().max(50).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  birth_date: z
    .string()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Format birth_date tidak valid, gunakan format tanggal ISO (YYYY-MM-DD)")
    .optional()
    .nullable(),
  gender: z.string().trim().max(20).optional().nullable(),
})

export const ChangePasswordSchema = z.object({
  current_password: z.string().min(1, "Current password is required"),
  new_password: z.string().min(8, "New password must be at least 8 characters"),
})

export const DeleteAccountSchema = z.object({
  password: z.string().min(1, "Konfirmasi kata sandi diperlukan"),
})

export const userControllers = {
  async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId
      const profile = await userServices.getProfile(userId)
      if (!profile) {
        res.status(404).json({ error: "User not found" })
        return
      }
      res.json(profile)
    } catch (err) {
      next(err)
    }
  },

  async getBadges(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId
      const badges = await userServices.getBadges(userId)
      res.json(badges)
    } catch (err) {
      next(err)
    }
  },

  async getAttendances(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId
      const attendances = await userServices.getAttendances(userId)
      res.json(attendances)
    } catch (err) {
      next(err)
    }
  },

  async updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = UpdateProfileSchema.parse(req.body)
      const userId = req.user!.userId
      const authHeader = req.headers.authorization
      const updated = await userServices.updateProfile(userId, body, authHeader)
      res.json(updated)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async getStreak(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId
      const streak = await userServices.getStreak(userId)
      res.json(streak)
    } catch (err) {
      next(err)
    }
  },

  async getLevel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId
      const level = await userServices.getLevel(userId)
      res.json(level)
    } catch (err) {
      next(err)
    }
  },

  async getPointTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId
      const transactions = await userServices.getPointTransactions(userId)
      res.json(transactions)
    } catch (err) {
      next(err)
    }
  },

  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = ChangePasswordSchema.parse(req.body)
      const userId = req.user!.userId
      const result = await userServices.changePassword(userId, body.current_password, body.new_password)
      res.json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId
      const data = await userServices.exportUserData(userId)
      if (!data) {
        res.status(404).json({ error: "Pengguna tidak ditemukan" })
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
      res.json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },
}
