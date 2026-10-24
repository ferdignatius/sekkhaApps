import { Router } from "express"
import { requireAuth } from "../../middleware/auth"
import { userControllers } from "./controllers"

export const usersRouter: Router = Router()

// GET /api/users/me — Current authenticated user profile
usersRouter.get("/me", requireAuth, userControllers.getProfile)

// PATCH /api/users/me — Update personal profile details
usersRouter.patch("/me", requireAuth, userControllers.updateProfile)

// PATCH /api/users/me/onboarding — Mark onboarding completed
usersRouter.patch("/me/onboarding", requireAuth, userControllers.completeOnboarding)

// POST /api/users/email-verification/request — Request 6-digit OTP for email verification / change
usersRouter.post("/email-verification/request", requireAuth, userControllers.requestEmailVerification)

// POST /api/users/email-verification/confirm — Confirm 6-digit OTP code to verify new email
usersRouter.post("/email-verification/confirm", requireAuth, userControllers.confirmEmailVerification)

// POST /api/users/change-password — Update password
usersRouter.post("/change-password", requireAuth, userControllers.changePassword)

// GET /api/users/me/attendances — Recent event attendances
usersRouter.get("/me/attendances", requireAuth, userControllers.getAttendances)

// GET /api/users/me/streak — Current & longest weekly streak
usersRouter.get("/me/streak", requireAuth, userControllers.getStreak)

// GET /api/users/me/point-transactions — Point mutation history
usersRouter.get("/me/point-transactions", requireAuth, userControllers.getPointTransactions)

// GET /api/users/me/export — Data privacy export (GDPR / UU PDP)
usersRouter.get("/me/export", requireAuth, userControllers.exportData)

// POST /api/users/me/delete-account — Permanently delete account
usersRouter.post("/me/delete-account", requireAuth, userControllers.deleteAccount)

// AC-USR-09: Explicitly return 404 for removed badge & level endpoints
usersRouter.get("/me/badges", userControllers.getBadgesDisabled)
usersRouter.get("/me/level", userControllers.getLevelDisabled)
