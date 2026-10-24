import { Router } from "express"
import { requireAuth, requireRole } from "../../middleware/auth"
import { pengurusControllers } from "./controllers"

export const pengurusRouter: Router = Router()

// GET /insight & /insights (alias)
pengurusRouter.get(
  "/insight",
  requireAuth,
  requireRole("organizer", "admin"),
  pengurusControllers.getInsights
)
pengurusRouter.get(
  "/insights",
  requireAuth,
  requireRole("organizer", "admin"),
  pengurusControllers.getInsights
)
