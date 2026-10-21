import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { peopleServices } from "./services"

export const ListMembersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  claimed_status: z.enum(["all", "claimed", "unclaimed"]).default("all"),
  role: z
    .enum(["all", "member", "activist", "organizer", "admin", "umat", "aktivis", "pengurus"])
    .default("all"),
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export const CreateMemberSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name maximum 100 characters"),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username maximum 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, dots, or underscores")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Invalid email format").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  school: z.string().trim().max(100).optional().or(z.literal("")),
  school_id: z.string().optional().or(z.literal("")),
  birth_date: z
    .string()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Format birth_date tidak valid, gunakan format tanggal ISO")
    .optional()
    .or(z.literal("")),
  gender: z.string().trim().max(20).optional().or(z.literal("")),
  role: z.enum(["member", "activist", "organizer", "admin"]).default("member"),
})

export const UpdateMemberSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username maximum 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, dots, or underscores")
    .optional()
    .nullable()
    .or(z.literal("")),
  email: z.string().trim().email().max(255).optional().nullable().or(z.literal("")),
  phone: z.string().trim().max(20).optional().nullable(),
  school: z.string().trim().max(100).optional().nullable(),
  school_id: z.string().optional().nullable(),
  birth_date: z
    .string()
    .refine((v) => !v || !isNaN(Date.parse(v)), "Format birth_date tidak valid, gunakan format tanggal ISO")
    .optional()
    .nullable(),
  gender: z.string().trim().max(20).optional().nullable(),
  role: z.enum(["member", "activist", "organizer", "admin"]).optional(),
})

export const LinkLegacyAccountSchema = z.object({
  user_number: z.string().trim().min(1, "Nomor anggota target wajib diisi").max(50),
  claim_pin: z.string().trim().min(6, "PIN aktivasi minimal 6 karakter").max(20),
})

export const peopleControllers = {
  async getMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const query = ListMembersQuerySchema.parse(req.query)
      const result = await peopleServices.getMembers(query, req.user)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async getMemberDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const member = await peopleServices.getMemberDetail(id, req.user)
      res.json(member)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async createMember(req: Request, res: Response, next: NextFunction) {
    try {
      const data = CreateMemberSchema.parse(req.body)
      const result = await peopleServices.createMember(data)
      res.status(201).json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
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
      res.json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async deleteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const result = await peopleServices.deleteMember(id, req.user)
      res.json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const result = await peopleServices.resetPassword(id, req.user!)
      res.json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async generateClaimPin(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string
      const result = await peopleServices.generateClaimPin(id, req.user!)
      res.json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async linkLegacyAccount(req: Request, res: Response, next: NextFunction) {
    try {
      const body = LinkLegacyAccountSchema.parse(req.body)
      const result = await peopleServices.linkLegacyAccount(body, req.user!)
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
