import { Router } from "express"
import { requireAuth, requireRole, optionalAuth } from "../../middleware/auth"
import { leaderboardControllers } from "./controllers"

export const leaderboardRouter: Router = Router()

// GET /api/leaderboard/debug — Debug DB users and cache (Admin only)
leaderboardRouter.get("/debug", requireAuth, requireRole("admin"), leaderboardControllers.getDebug)

// GET /api/leaderboard?metric=points|streak|attendance — Pre-calculated weekly snapshot
leaderboardRouter.get("/", optionalAuth, leaderboardControllers.getLeaderboard)
