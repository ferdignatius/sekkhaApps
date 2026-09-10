import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../../lib/prisma"
import { requireAuth, requireRole } from "../../../middleware/auth"
import { getLeaderboardSnapshot, MetricType } from "./service"

export const leaderboardRouter: Router = Router()

// GET /api/leaderboard/debug — Debug DB users and cache (Admin only)
leaderboardRouter.get("/debug", requireAuth, requireRole("admin"), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        isClaimed: true,
        userNumber: true,
        profile: { select: { name: true } },
        stats: { select: { points: true } },
      },
    })
    const snapshot = await getLeaderboardSnapshot("points", true)
    res.json({
      db_users_count: users.length,
      db_users: users.map(u => ({
        id: u.id,
        name: u.profile?.name ?? "",
        email: u.email,
        role: u.role,
        points: u.stats?.points ?? 0,
        isClaimed: u.isClaimed,
        userNumber: u.userNumber,
      })),
      computed_snapshot_entries: snapshot.entries,
    })
  } catch (err) { next(err) }
})

// GET /api/leaderboard?metric=points|streak|attendance — serves pre-calculated weekly snapshot
leaderboardRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const { metric = "points", refresh } = z.object({
      metric: z.enum(["points", "streak", "attendance"]).optional(),
      refresh: z.enum(["true", "false", "1", "0"]).optional(),
    }).parse(req.query)

    const userId = req.user!.userId
    const forceRefresh = refresh === "true" || refresh === "1"
    const snapshot = await getLeaderboardSnapshot(metric as MetricType, forceRefresh)
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
      season: snapshot.season,
      community_goal: {
        current: snapshot.community_total ?? 0,
        target: snapshot.season?.target_attendance ?? 500,
        label: "Target Absensi Komunitas Vihara",
      },
      calculated_at: snapshot.calculated_at,
    })
  } catch (err) { next(err) }
})
