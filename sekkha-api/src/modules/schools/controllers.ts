import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { schoolServices } from "./services"

export const CreateSchoolSchema = z.object({
  name: z.string().min(2, "Nama sekolah minimal 2 karakter").max(100, "Maksimal 100 karakter"),
  type: z.enum(["SMP", "SMA", "SMK", "Universitas", "Lainnya"]).optional(),
})

export const UpdateSchoolSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.enum(["SMP", "SMA", "SMK", "Universitas", "Lainnya"]).optional(),
})

export const RequestSchoolSchema = z
  .object({
    name: z.string().trim().min(2, "Nama sekolah minimal 2 karakter").max(100).optional(),
    requested_name: z.string().trim().min(2, "Nama sekolah minimal 2 karakter").max(100).optional(),
    type: z.string().trim().max(50).optional(),
    requested_type: z.string().trim().max(50).optional(),
  })
  .refine((data) => data.name || data.requested_name, {
    message: "Nama sekolah wajib diisi",
    path: ["name"],
  })

export const schoolControllers = {
  async getSchools(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : ""
      const limit = Number(req.query.limit) || Number(req.query.page_size) || 100
      const result = await schoolServices.getSchools(search, limit)
      res.json({
        status: "success",
        code: 200,
        message: "Schools retrieved successfully",
        data: result.schools,
        schools: result.schools,
        total: result.total,
      })
    } catch (err) {
      next(err)
    }
  },

  async requestSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RequestSchoolSchema.parse(req.body)
      const name = (parsed.name || parsed.requested_name)!.trim()
      const type = (parsed.type || parsed.requested_type || "Umum").trim()
      const userId = req.user!.userId
      const result = await schoolServices.requestSchool(userId, { name, type })
      res.status(201).json({
        status: "success",
        code: 201,
        message: "Pengajuan sekolah berhasil dikirim dan menunggu persetujuan",
        data: result,
      })
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async getSchoolStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const school = typeof req.query.school === "string" ? req.query.school : ""
      const classGrade = typeof req.query.class_grade === "string" ? req.query.class_grade : ""
      const result = await schoolServices.getSchoolStats(school, classGrade)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async createSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = CreateSchoolSchema.parse(req.body)
      const result = await schoolServices.createSchool(body)
      res.status(201).json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async updateSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      if (!id) {
        res.status(400).json({ error: "ID parameter is required" })
        return
      }

      const body = UpdateSchoolSchema.parse(req.body)
      const result = await schoolServices.updateSchool(id, body)
      res.json(result)
    } catch (err: any) {
      if (err.statusCode) {
        res.status(err.statusCode).json({ error: err.message })
        return
      }
      next(err)
    }
  },

  async deleteSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      if (!id) {
        res.status(400).json({ error: "ID parameter is required" })
        return
      }

      const result = await schoolServices.deleteSchool(id)
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
