import { Router } from "express"
import { z } from "zod"
import { prisma } from "../../../lib/prisma"
import { cached, CacheKeys } from "../../../lib/cache"
import { requireAuth } from "../../../middleware/auth"

export const leaderboardRouter = Router()

// GET /api/leaderboard?metric=points|streak|attendance
leaderboardRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const { metric = "points" } = z.object({
      metric: z.enum(["points", "streak", "attendance"]).optional(),
    }).parse(req.query)

    const userId = req.user!.userId
    const cacheKey = CacheKeys.leaderboard(metric, "current")

    const entries = await cached(cacheKey, 30, async () => {
      // For MVP, compute based on attendance count as proxy for all metrics
      const users = await prisma.user.findMany({
        select: {
          id: true, name: true,
          _count: { select: { attendances: true } },
        },
        orderBy: { attendances: { _count: "desc" } },
        take: 20,
      })

      return users
        .map((u, idx) => {
          const safeName = u.name || "Anggota Sekkha"
          const initials = safeName.split(" ").slice(0, 2).map(w => (w && w[0] ? w[0].toUpperCase() : "")).join("") || "AS"
          const attendanceCount = u._count?.attendances ?? 0
          const val = attendanceCount * (metric === "points" ? 50 : 1)
          return {
            user_id: u.id,
            name: safeName,
            initials,
            rank: idx + 1,
            value: val,
          }
        })
        .filter(u => u.value > 0)
    })

    const safeEntries = (Array.isArray(entries) ? entries : []).filter(e => Boolean(e) && typeof e === "object")
    const myIdx = safeEntries.findIndex(e => e.user_id === userId)
    const myRank = myIdx >= 0
      ? { rank: safeEntries[myIdx].rank ?? (myIdx + 1), value: safeEntries[myIdx].value ?? 0, is_in_top: true }
      : { rank: safeEntries.length + 1, value: 0, is_in_top: false }

    res.json({ entries: safeEntries, my_rank: myRank })
  } catch (err) { next(err) }
})
