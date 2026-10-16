import { Router } from "express"
import { requireAuth, requireRole } from "../../middleware/auth"
import { pengurusControllers } from "./controllers"

export const pengurusRouter: Router = Router()

// GET /recency-alerts
pengurusRouter.get(
  "/recency-alerts",
  requireAuth,
  requireRole("organizer", "admin"),
  pengurusControllers.getRecencyAlerts
)

// GET /recency-alerts/:userId
pengurusRouter.get(
  "/recency-alerts/:userId",
  requireAuth,
  requireRole("organizer", "admin"),
  pengurusControllers.getUserRecencyAlertDetail
)

// GET /insight
pengurusRouter.get(
  "/insight",
  requireAuth,
  requireRole("organizer", "admin"),
  pengurusControllers.getInsights
)
