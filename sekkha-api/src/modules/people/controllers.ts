import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { peopleServices } from "./services"

export const ListMembersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  q: z.string().trim().max(100).optional(),
  claimed_status: z.enum(["all", "claimed", "unclaimed"]).default("all"),
  status: z.enum(["all", "claimed", "unclaimed"]).optional(),
  role: z
    .enum(["all", "member", "activist", "organizer", "admin", "umat", "aktivis", "pengurus"])
    .default("all"),
  school_id: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const CreateMemberSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  role: z.enum(["member", "activist"]).default("member"),
  school_id: z.string().trim().optional().nullable().or(z.literal("")),
  school: z.string().trim().max(100).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(20).optional().nullable().or(z.literal("")),
  gender: z.enum(["male", "female"]).optional().nullable().or(z.literal("")),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .nullable()
    .or(z.literal("")),
  birth_date: z
    .string()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date format")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z.string().max(255).optional().nullable().or(z.literal("")),
  email: z.string().trim().email("Invalid email format").max(255).optional().nullable().or(z.literal("")),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username maximum 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, dots, or underscores")
    .optional()
    .nullable()
    .or(z.literal("")),
})

export const UpdateMemberSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100).optional(),
  role: z.enum(["member", "activist", "organizer", "admin"]).optional(),
  school_id: z.string().trim().optional().nullable().or(z.literal("")),
  school: z.string().trim().max(100).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(20).optional().nullable().or(z.literal("")),
  gender: z.enum(["male", "female"]).optional().nullable().or(z.literal("")),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .nullable()
    .or(z.literal("")),
  birth_date: z
    .string()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Invalid date format")
    .optional()
    .nullable()
    .or(z.literal("")),
  address: z.string().max(255).optional().nullable().or(z.literal("")),
  email: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username maximum 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, dots, or underscores")
    .optional()
    .nullable()
    .or(z.literal("")),
})

export const peopleControllers = {
  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = ListMembersQuerySchema.parse(req.query)
      const query = {
        ...parsed,
        search: parsed.search || parsed.q,
        claimed_status: parsed.claimed_status || parsed.status || "all",
      }
      const result = await peopleServices.getMembers(query, req.user)
      res.json({
        status: "success",
        code: 200,
        message: "People list retrieved successfully",
        data: result,
        ...result, // Backward-compat for legacy unwrap
      })
    } catch (err) {
      next(err)
    }
  },

  async getMemberDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const member = await peopleServices.getMemberDetail(id, req.user)
      res.json({
        status: "success",
        code: 200,
        message: "Member detail retrieved successfully",
        data: member,
        ...member, // Backward-compat
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message, message: err.message })
        return
      }
      next(err)
    }
  },

  async createMember(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreateMemberSchema.parse(req.body)
      const result = await peopleServices.createMember(data, req.user)
      res.status(201).json({
        status: "success",
        code: 201,
        message: "Member registered successfully with temporary credentials",
        data: result,
        ...result, // Backward-compat
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message, message: err.message })
        return
      }
      next(err)
    }
  },

  async updateMember(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const data = UpdateMemberSchema.parse(req.body)
      const result = await peopleServices.updateMember(id, data, req.user)
      res.json({
        status: "success",
        code: 200,
        message: "Member updated successfully",
        data: result,
        ...result, // Backward-compat
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message, message: err.message })
        return
      }
      next(err)
    }
  },

  async deleteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const result = await peopleServices.deleteMember(id, req.user)
      res.json({
        ...result,
        status: "success",
        code: 200,
        message: result.message || "Member deleted successfully",
        data: result,
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message, message: err.message })
        return
      }
      next(err)
    }
  },

  async resetTemporaryPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const result = await peopleServices.resetTemporaryPassword(id, req.user!)
      res.json({
        ...result,
        status: "success",
        code: 200,
        message: result.message || "Temporary password reset successfully",
        data: result,
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message, message: err.message })
        return
      }
      next(err)
    }
  },
}
