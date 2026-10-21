import { Router } from "express"
import { requireAuth } from "../../middleware/auth"
import { userControllers } from "./controllers"

export const usersRouter: Router = Router()

// GET /api/users/me — Current authenticated user profile
usersRouter.get("/me", requireAuth, userControllers.getProfile)

// GET /api/users/me/badges — Badges earned by user
usersRouter.get("/me/badges", requireAuth, userControllers.getBadges)

// GET /api/users/me/attendances — Recent event attendances
usersRouter.get("/me/attendances", requireAuth, userControllers.getAttendances)

// PATCH /api/users/me — Update personal profile details
usersRouter.patch("/me", requireAuth, userControllers.updateProfile)
usersRouter.patch("/me/onboarding", requireAuth, userControllers.completeOnboarding)

// GET /api/users/me/streak — Current & longest weekly streak
usersRouter.get("/me/streak", requireAuth, userControllers.getStreak)

// GET /api/users/me/level — User gamification level & points
usersRouter.get("/me/level", requireAuth, userControllers.getLevel)

// GET /api/users/me/point-transactions — Point mutation history
usersRouter.get("/me/point-transactions", requireAuth, userControllers.getPointTransactions)

// POST /api/users/change-password — Update password
usersRouter.post("/change-password", requireAuth, userControllers.changePassword)

// GET /api/users/me/export — Data privacy export (GDPR / UU PDP)
usersRouter.get("/me/export", requireAuth, userControllers.exportData)

// POST /api/users/me/delete-account — Permanently delete account
usersRouter.post("/me/delete-account", requireAuth, userControllers.deleteAccount)
