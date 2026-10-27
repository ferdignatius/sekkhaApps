import { Router } from "express"
import { requireAuth } from "../../middleware/auth"
import { userControllers } from "./controllers"

export const usersRouter: Router = Router()

// GET /api/users/me — Current authenticated user profile
usersRouter.get("/me", requireAuth, userControllers.getProfile)

// PATCH & PUT /api/users/me and PUT /api/users/me/profile — Update personal profile details
usersRouter.patch("/me", requireAuth, userControllers.updateProfile)
usersRouter.put("/me", requireAuth, userControllers.updateProfile)
usersRouter.put("/me/profile", requireAuth, userControllers.updateProfile)

// PATCH /api/users/me/onboarding — Mark onboarding completed
usersRouter.patch("/me/onboarding", requireAuth, userControllers.completeOnboarding)

// POST /api/users/email-verification/request & /request-otp — Request 6-digit OTP for email change
usersRouter.post("/email-verification/request", requireAuth, userControllers.requestEmailVerification)
usersRouter.post("/email-verification/request-otp", requireAuth, userControllers.requestEmailVerification)

// POST /api/users/email-verification/confirm & /verify & /verify-otp — Confirm 6-digit OTP code
usersRouter.post("/email-verification/confirm", requireAuth, userControllers.confirmEmailVerification)
usersRouter.post("/email-verification/verify", requireAuth, userControllers.confirmEmailVerification)
usersRouter.post("/email-verification/verify-otp", requireAuth, userControllers.confirmEmailVerification)

// POST /api/users/change-password/request-otp — Request 6-digit OTP for password change
usersRouter.post("/change-password/request-otp", requireAuth, userControllers.requestChangePasswordOtp)
usersRouter.post("/change-password/otp", requireAuth, userControllers.requestChangePasswordOtp)

// POST & PUT /api/users/change-password — Update password (requires OTP verification)
usersRouter.post("/change-password", requireAuth, userControllers.changePassword)
usersRouter.put("/change-password", requireAuth, userControllers.changePassword)

// GET /api/users/me/attendances — Recent event attendances
usersRouter.get("/me/attendances", requireAuth, userControllers.getAttendances)

// GET /api/users/me/streak — Current & longest weekly streak
usersRouter.get("/me/streak", requireAuth, userControllers.getStreak)

// GET /api/users/me/point-transactions & /api/users/me/points-history — Point mutation history
usersRouter.get("/me/point-transactions", requireAuth, userControllers.getPointTransactions)
usersRouter.get("/me/points-history", requireAuth, userControllers.getPointTransactions)

// GET /api/users/me/export — Data privacy export (GDPR / UU PDP)
usersRouter.get("/me/export", requireAuth, userControllers.exportData)

// POST /api/users/me/delete-account — Permanently delete account
usersRouter.post("/me/delete-account", requireAuth, userControllers.deleteAccount)

// AC-USR-09: Explicitly return 404 for removed badge & level endpoints
usersRouter.get("/me/badges", userControllers.getBadgesDisabled)
usersRouter.get("/me/level", userControllers.getLevelDisabled)
