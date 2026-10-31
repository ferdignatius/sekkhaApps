import { Router } from "express"
import { optionalAuth } from "../../middleware/auth"
import { leaderboardControllers } from "./controllers"

export const leaderboardRouter: Router = Router()

// GET /api/leaderboard?metric=points|streak|attendance — Pre-calculated weekly snapshot
leaderboardRouter.get("/", optionalAuth, leaderboardControllers.getLeaderboard)
