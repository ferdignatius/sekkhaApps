import { Router } from "express"
import { requireAuth, requireRole } from "../../middleware/auth"
import { configureControllers } from "./controllers"

import { schoolControllers } from "../schools/controllers"

export const configureRouter: Router = Router()

// All configure routes require auth
configureRouter.use(requireAuth)

// School master data and user requests (Accessible to all authenticated members for onboarding)
configureRouter.get("/schools", schoolControllers.getSchools)
configureRouter.post("/school-requests", schoolControllers.requestSchool)

// Other configure routes require organizer/admin role
configureRouter.use(requireRole("organizer", "admin"))

// School request review workflow (Accessible to Organizer & Admin per PRD)
configureRouter.get("/schools/pending", schoolControllers.getPendingRequests)
configureRouter.get("/school-requests", schoolControllers.getPendingRequests)
configureRouter.get("/schools/:id", schoolControllers.getSchoolById)
configureRouter.post("/schools/:id/approve", schoolControllers.approveSchool)
configureRouter.post("/schools/:id/reject", schoolControllers.rejectSchool)
configureRouter.post("/school-requests/:id/accept", schoolControllers.approveSchool)
configureRouter.post("/school-requests/:id/reject", schoolControllers.rejectSchool)

// Read-only for organizer: all other mutating methods (POST, PUT, PATCH, DELETE) require admin role
configureRouter.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Only admin can modify configuration settings" })
      return
    }
  }
  next()
})

// School Master Data Direct CRUD (Admin only)
configureRouter.post("/schools", schoolControllers.createSchool)
configureRouter.put("/schools/:id", schoolControllers.updateSchool)
configureRouter.patch("/schools/:id", schoolControllers.updateSchool)
configureRouter.delete("/schools/:id", schoolControllers.deleteSchool)

// Event Types
configureRouter.get("/event-types", configureControllers.getEventTypes)
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
configureRouter.delete("/seasons/:id", configureControllers.deleteSeason)
configureRouter.post("/seasons/:id/activate", configureControllers.activateSeason)

// Point Rules
configureRouter.get("/point-rules", configureControllers.getPointRules)
configureRouter.put("/point-rules/:id", configureControllers.updatePointRule)
