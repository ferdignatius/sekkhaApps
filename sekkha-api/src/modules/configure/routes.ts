import { Router } from "express"
import { requireAuth, requireRole } from "../../middleware/auth"
import { configureControllers } from "./controllers"

export const configureRouter: Router = Router()

// All configure routes require auth and organizer/admin role
configureRouter.use(requireAuth)
configureRouter.use(requireRole("organizer", "admin"))

// Read-only for organizer: all mutating methods (POST, PUT, PATCH, DELETE) require admin role
configureRouter.use((req, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Only admin can modify configuration settings" })
      return
    }
  }
  next()
})

// Badges
configureRouter.get("/badges", configureControllers.getBadges)
configureRouter.post("/badges", configureControllers.createBadge)
configureRouter.put("/badges/:id", configureControllers.updateBadge)
configureRouter.delete("/badges/:id", configureControllers.deleteBadge)

// Levels
configureRouter.get("/levels", configureControllers.getLevels)
configureRouter.post("/levels", configureControllers.createLevel)
configureRouter.put("/levels/:id", configureControllers.updateLevel)
configureRouter.delete("/levels/:id", configureControllers.deleteLevel)

// Event Types
configureRouter.get("/event-types", configureControllers.getEventTypes)
configureRouter.post("/event-types", configureControllers.createEventType)
configureRouter.put("/event-types/:id", configureControllers.updateEventType)
configureRouter.delete("/event-types/:id", configureControllers.deleteEventType)

// Achievements
configureRouter.get("/achievements", configureControllers.getAchievements)
configureRouter.post("/achievements", configureControllers.createAchievement)
configureRouter.put("/achievements/:id", configureControllers.updateAchievement)
configureRouter.delete("/achievements/:id", configureControllers.deleteAchievement)

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
