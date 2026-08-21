import { Router } from "express"
import { z } from "zod"
import { requireAuth } from "../../../middleware/auth"
import { getLeaderboardSnapshot, MetricType } from "./service"

export const leaderboardRouter = Router()

// GET /api/leaderboard?metric=points|streak|attendance — serves pre-calculated weekly snapshot
leaderboardRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const { metric = "points" } = z.object({
      metric: z.enum(["points", "streak", "attendance"]).optional(),
    }).parse(req.query)

    const userId = req.user!.userId
    const snapshot = await getLeaderboardSnapshot(metric as MetricType)
    const safeEntries = snapshot.entries || []

    const myIdx = safeEntries.findIndex((e) => e.user_id === userId)
    const myRank =
      myIdx >= 0
        ? {
            rank: safeEntries[myIdx].rank ?? myIdx + 1,
            value: safeEntries[myIdx].value ?? 0,
            is_in_top: myIdx < 20,
            name: safeEntries[myIdx].name,
            initials: safeEntries[myIdx].initials,
          }
        : {
            rank: safeEntries.length + 1,
            value: 0,
            is_in_top: false,
            name: req.user?.userId ? "Kamu" : "Anggota Sekkha",
            initials: "KM",
          }

    res.json({
      entries: safeEntries,
      my_rank: myRank,
      community_goal: {
        current: snapshot.community_total ?? 0,
        target: 500,
        label: "Target Absensi Komunitas Vihara",
      },
      calculated_at: snapshot.calculated_at,
    })
  } catch (err) { next(err) }
})
