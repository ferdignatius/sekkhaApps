import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import {
  getLeaderboardSnapshot,
  filterAndRankLeaderboardEntries,
  MetricType,
} from "./services"

export const leaderboardControllers = {
  async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { metric = "points", period, refresh, roles, limit = 10 } = z
        .object({
          metric: z.enum(["points", "attendance"]).optional(),
          period: z.string().optional(),
          refresh: z.enum(["true", "false", "1", "0"]).optional(),
          roles: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(10),
        })
        .parse(req.query)

      const userId = req.user?.userId
      const isPrivileged = req.user?.role === "organizer" || req.user?.role === "admin"
      const forceRefresh = isPrivileged && (refresh === "true" || refresh === "1")
      const snapshot = await getLeaderboardSnapshot(metric as MetricType, period, forceRefresh)

      const { visibleEntries, myRank } = filterAndRankLeaderboardEntries(
        snapshot.entries || [],
        roles,
        limit,
        userId
      )

      res.json({
        entries: visibleEntries,
        my_rank: myRank,
        season: snapshot.season,
        available_periods: snapshot.available_periods,
        archived_periods: snapshot.archived_periods ?? [],
        active_period: snapshot.active_period,
        community_goal: {
          current: snapshot.community_total ?? 0,
          target: snapshot.season?.target_attendance ?? 500,
          label: "Community Attendance Target",
        },
        calculated_at: snapshot.calculated_at,
      })
    } catch (err) {
      next(err)
    }
  },
}
