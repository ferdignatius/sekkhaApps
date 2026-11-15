import { Router } from "express"
import { requireAuth, requireRole } from "../../middleware/auth"
import { schoolControllers } from "./controllers"

export const schoolsRouter: Router = Router()

// GET /api/schools — Searchable list of schools with user count
schoolsRouter.get("/", requireAuth, schoolControllers.getSchools)

// GET /api/schools/stats — Social proof user count in onboarding
schoolsRouter.get("/stats", requireAuth, schoolControllers.getSchoolStats)

// Pending requests queue & reviews (Organizer & Admin per PRD)
schoolsRouter.get("/pending", requireAuth, requireRole("organizer", "admin"), schoolControllers.getPendingRequests)
schoolsRouter.post("/:id/approve", requireAuth, requireRole("organizer", "admin"), schoolControllers.approveSchool)
schoolsRouter.post("/:id/reject", requireAuth, requireRole("organizer", "admin"), schoolControllers.rejectSchool)

// GET /api/schools/:id — Get single school detail
schoolsRouter.get("/:id", requireAuth, schoolControllers.getSchoolById)

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

/**
 * Legacy/configure-mounted school routes (/api/configure/schools*, /api/configure/school-requests*).
 * Mounted by schoolsModule so configure module stays decoupled from schools internals.
 * Uses per-route auth/role guards so other /api/configure/* endpoints are never intercepted.
 */
export const configureSchoolsRouter: Router = Router()

// School master data & user requests (All authenticated members for onboarding)
configureSchoolsRouter.get("/schools", requireAuth, schoolControllers.getSchools)
configureSchoolsRouter.post("/school-requests", requireAuth, schoolControllers.requestSchool)

// School request review workflow (Organizer & Admin per PRD)
configureSchoolsRouter.get("/schools/pending", requireAuth, requireRole("organizer", "admin"), schoolControllers.getPendingRequests)
configureSchoolsRouter.get("/school-requests", requireAuth, requireRole("organizer", "admin"), schoolControllers.getPendingRequests)
configureSchoolsRouter.get("/schools/:id", requireAuth, requireRole("organizer", "admin"), schoolControllers.getSchoolById)
configureSchoolsRouter.post("/schools/:id/approve", requireAuth, requireRole("organizer", "admin"), schoolControllers.approveSchool)
configureSchoolsRouter.post("/schools/:id/reject", requireAuth, requireRole("organizer", "admin"), schoolControllers.rejectSchool)
configureSchoolsRouter.post("/school-requests/:id/accept", requireAuth, requireRole("organizer", "admin"), schoolControllers.approveSchool)
configureSchoolsRouter.post("/school-requests/:id/reject", requireAuth, requireRole("organizer", "admin"), schoolControllers.rejectSchool)

// School master data direct CRUD (Admin only)
configureSchoolsRouter.post("/schools", requireAuth, requireRole("admin"), schoolControllers.createSchool)
configureSchoolsRouter.put("/schools/:id", requireAuth, requireRole("admin"), schoolControllers.updateSchool)
configureSchoolsRouter.patch("/schools/:id", requireAuth, requireRole("admin"), schoolControllers.updateSchool)
configureSchoolsRouter.delete("/schools/:id", requireAuth, requireRole("admin"), schoolControllers.deleteSchool)
