import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { schoolServices } from "./services"

export const SchoolTypeSchema = z.enum(["SMP", "SMA/SMK", "Universitas", "Umum"])

export const CreateSchoolSchema = z.object({
  name: z.string().trim().min(2, "School name must be at least 2 characters").max(100, "Maximum 100 characters"),
  type: SchoolTypeSchema.optional(),
  is_active: z.boolean().optional(),
})

export const UpdateSchoolSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  type: SchoolTypeSchema.optional(),
  is_active: z.boolean().optional(),
})

export const RequestSchoolSchema = z.object({
  name: z.string().trim().min(2, "School name must be at least 2 characters").max(100, "Maximum 100 characters"),
  type: SchoolTypeSchema.optional(),
})

export const schoolControllers = {
  async getSchools(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = typeof req.query.search === "string" ? req.query.search : ""
      const type = typeof req.query.type === "string" ? req.query.type : undefined
      const isActiveParam = req.query.is_active
      let isActive: boolean | undefined = undefined
      if (isActiveParam === "true") isActive = true
      else if (isActiveParam === "false") isActive = false

      const limit = Number(req.query.limit) || Number(req.query.page_size) || 100
      const result = await schoolServices.getSchools({ search, type, isActive, limit })
      res.json({
        status: "success",
        code: 200,
        message: "Schools retrieved successfully",
        data: result.schools,
        schools: result.schools,
        items: result.schools,
        total: result.total,
      })
    } catch (err) {
      next(err)
    }
  },

  async getSchoolById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      if (!id) {
        res.status(400).json({ error: "ID parameter is required" })
        return
      }
      const school = await schoolServices.getSchoolById(id)
      res.json({
        status: "success",
        code: 200,
        message: "School retrieved successfully",
        data: school,
      })
    } catch (err) {
      next(err)
    }
  },

  async getPendingRequests(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requests = await schoolServices.getPendingRequests()
      res.json({
        status: "success",
        code: 200,
        message: "Pending school requests retrieved successfully",
        data: requests,
        items: requests,
        total: requests.length,
      })
    } catch (err) {
      next(err)
    }
  },

  async approveSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      if (!id) {
        res.status(400).json({ error: "ID parameter is required" })
        return
      }
      const reviewerId = req.user!.userId
      const result = await schoolServices.approveSchoolRequest(id, reviewerId)
      res.json({
        status: "success",
        code: 200,
        message: "School request approved successfully",
        data: result,
      })
    } catch (err) {
      next(err)
    }
  },

  async rejectSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id
      if (!id) {
        res.status(400).json({ error: "ID parameter is required" })
        return
      }
      const reviewerId = req.user!.userId
      const result = await schoolServices.rejectSchoolRequest(id, reviewerId)
      res.json({
        status: "success",
        code: 200,
        message: "School request rejected",
        data: result,
      })
    } catch (err) {
      next(err)
    }
  },

  async requestSchool(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = RequestSchoolSchema.parse(req.body)
      const name = parsed.name.trim()
      const type = (parsed.type || "Umum").trim()
      const userId = req.user!.userId
      const result = await schoolServices.requestSchool(userId, { name, type })
      res.status(201).json({
        status: "success",
        code: 201,
        message: "Pengajuan sekolah berhasil dikirim dan menunggu persetujuan",
        data: result,
      })
    } catch (err) {
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
      res.status(201).json({
        status: "success",
        code: 201,
        message: "School created successfully",
        data: result,
        id: result.id,
        name: result.name,
        type: result.type,
      })
    } catch (err) {
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
      res.json({
        status: "success",
        code: 200,
        message: "School updated successfully",
        data: result,
        id: result.id,
        name: result.name,
        type: result.type,
      })
    } catch (err) {
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
      res.json({
        status: "success",
        code: 200,
        ...result,
      })
    } catch (err) {
      next(err)
    }
  },
}
