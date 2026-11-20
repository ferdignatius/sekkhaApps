import { Router } from "express"
import { requireAuth, requireRole } from "../../middleware/auth"
import { configureControllers } from "./controllers"
import { AppError } from "../../lib/AppError"

export const configureRouter: Router = Router()

// All configure routes require auth
configureRouter.use(requireAuth)

// Master data catalogs (Accessible to all authenticated members)
configureRouter.get("/event-types", configureControllers.getEventTypes)
configureRouter.get("/badge-activities", configureControllers.getBadgeActivities)

// Delegate /schools* and /school-requests* to configureSchoolsRouter (mounted by schoolsModule with per-route guards)
configureRouter.use((req, res, next) => {
  if (req.path === "/schools" || req.path.startsWith("/schools/") || req.path === "/school-requests" || req.path.startsWith("/school-requests/")) {
    next("router")
    return
  }
  requireRole("organizer", "admin")(req, res, next)
})

// Read-only for organizer: all other mutating methods (POST, PUT, PATCH, DELETE) require admin role
configureRouter.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    if (req.user?.role !== "admin") {
      next(new AppError("Only admin can modify configuration settings", 403, "FORBIDDEN"))
      return
    }
  }
  next()
})

// Event Types
configureRouter.post("/event-types", configureControllers.createEventType)
configureRouter.put("/event-types/:id", configureControllers.updateEventType)
configureRouter.patch("/event-types/:id", configureControllers.updateEventType)
configureRouter.delete("/event-types/:id", configureControllers.deleteEventType)

// Threshold
configureRouter.get("/threshold", configureControllers.getThresholds)
configureRouter.put("/threshold", configureControllers.updateThresholds)

// Seasons
configureRouter.get("/seasons", configureControllers.getSeasons)
configureRouter.post("/seasons", configureControllers.createSeason)
configureRouter.put("/seasons/:id", configureControllers.updateSeason)
configureRouter.patch("/seasons/:id", configureControllers.updateSeason)
configureRouter.delete("/seasons/:id", configureControllers.deleteSeason)
configureRouter.post("/seasons/:id/activate", configureControllers.activateSeason)
configureRouter.patch("/seasons/:id/activate", configureControllers.activateSeason)

// Point Rules (Fixed System Engine Policies - Tuning only)
configureRouter.get("/point-rules", configureControllers.getPointRules)
configureRouter.get("/point-rules/:id", configureControllers.getPointRuleById)
configureRouter.put("/point-rules/:id", configureControllers.updatePointRule)
configureRouter.patch("/point-rules/:id", configureControllers.updatePointRule)

// Badge Activities (Master Data)
configureRouter.get("/badge-activities/:id", configureControllers.getBadgeActivityById)
configureRouter.post("/badge-activities", configureControllers.createBadgeActivity)
configureRouter.put("/badge-activities/:id", configureControllers.updateBadgeActivity)
configureRouter.patch("/badge-activities/:id", configureControllers.updateBadgeActivity)
configureRouter.delete("/badge-activities/:id", configureControllers.deleteBadgeActivity)
