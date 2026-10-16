import { Router } from "express"
import { requireAuth, requireRole } from "../../middleware/auth"
import { schoolControllers } from "./controllers"

export const schoolsRouter: Router = Router()

// GET /api/schools — Searchable list of schools with user count
schoolsRouter.get("/", schoolControllers.getSchools)

// GET /api/schools/stats — Social proof user count in onboarding
schoolsRouter.get("/stats", schoolControllers.getSchoolStats)

// POST /api/schools — Create new school (Admin & Organizer)
schoolsRouter.post("/", requireAuth, requireRole("admin", "organizer"), schoolControllers.createSchool)

// PUT /api/schools/:id — Edit school (Admin & Organizer)
schoolsRouter.put("/:id", requireAuth, requireRole("admin", "organizer"), schoolControllers.updateSchool)

// DELETE /api/schools/:id — Delete school from master data (Admin only)
schoolsRouter.delete("/:id", requireAuth, requireRole("admin"), schoolControllers.deleteSchool)
