import { Router } from "express"
import { requireAuth, requireRole } from "../../middleware/auth"
import { schoolControllers } from "./controllers"

export const schoolsRouter: Router = Router()

// GET /api/schools — Searchable list of schools with user count
schoolsRouter.get("/", schoolControllers.getSchools)

// GET /api/schools/stats — Social proof user count in onboarding
schoolsRouter.get("/stats", schoolControllers.getSchoolStats)

// Pending requests queue & reviews (Organizer & Admin per PRD)
schoolsRouter.get("/pending", requireAuth, requireRole("organizer", "admin"), schoolControllers.getPendingRequests)
schoolsRouter.post("/:id/approve", requireAuth, requireRole("organizer", "admin"), schoolControllers.approveSchool)
schoolsRouter.post("/:id/reject", requireAuth, requireRole("organizer", "admin"), schoolControllers.rejectSchool)

// GET /api/schools/:id — Get single school detail
schoolsRouter.get("/:id", schoolControllers.getSchoolById)

// POST /api/schools/requests — Request new school (Authenticated users)
schoolsRouter.post("/requests", requireAuth, schoolControllers.requestSchool)
schoolsRouter.post("/school-requests", requireAuth, schoolControllers.requestSchool)

// POST /api/schools — Create new school directly (Admin only)
schoolsRouter.post("/", requireAuth, requireRole("admin"), schoolControllers.createSchool)

// PUT & PATCH /api/schools/:id — Edit school (Admin only)
schoolsRouter.put("/:id", requireAuth, requireRole("admin"), schoolControllers.updateSchool)
schoolsRouter.patch("/:id", requireAuth, requireRole("admin"), schoolControllers.updateSchool)

// DELETE /api/schools/:id — Delete school from master data (Admin only)
schoolsRouter.delete("/:id", requireAuth, requireRole("admin"), schoolControllers.deleteSchool)
