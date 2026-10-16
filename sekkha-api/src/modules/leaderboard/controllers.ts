import type { Request, Response, NextFunction } from "express"
import { z } from "zod"
import { getLeaderboardSnapshot, MetricType } from "./services"
import { leaderboardModels } from "./models"
import { decrypt } from "../../lib/crypto"

export const leaderboardControllers = {
  async getDebug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await leaderboardModels.findDebugUsers()
      const snapshot = await getLeaderboardSnapshot("points", true)
      res.json({
        db_users_count: users.length,
        db_users: users.map((u) => ({
          id: u.id,
          name: u.profile?.name ?? "",
          email: decrypt(u.email) || u.email,
          role: u.role,
          points: u.stats?.points ?? 0,
          isClaimed: u.isClaimed,
          userNumber: u.userNumber,
        })),
        computed_snapshot_entries: snapshot.entries,
      })
    } catch (err) {
      next(err)
    }
  },

  async getLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { metric = "points", refresh, roles, limit = 10 } = z
        .object({
          metric: z.enum(["points", "streak", "attendance"]).optional(),
          refresh: z.enum(["true", "false", "1", "0"]).optional(),
          roles: z.string().optional(),
          limit: z.coerce.number().int().min(1).max(100).default(10),
        })
        .parse(req.query)

      const userId = req.user?.userId
      const isPrivileged = req.user?.role === "organizer" || req.user?.role === "admin"
      const forceRefresh = isPrivileged && (refresh === "true" || refresh === "1")
      const snapshot = await getLeaderboardSnapshot(metric as MetricType, forceRefresh)

      const requestedRoles = new Set(
        (roles || "")
          .split(",")
          .map((role) => role.trim().toLowerCase())
          .map((role) =>
            role === "umat"
              ? "member"
              : role === "aktivis"
                ? "activist"
                : role === "pengurus"
                  ? "organizer"
                  : role
          )
          .filter(Boolean)
      )

      const scopedEntries = (snapshot.entries || [])
        .filter((entry) => {
          if (requestedRoles.size === 0) return true
          const normalizedRole =
            entry.role === "admin" || entry.role === "organizer" || entry.role === "pengurus"
              ? "organizer"
              : entry.role === "activist" || entry.role === "aktivis"
                ? "activist"
                : "member"
          return requestedRoles.has(normalizedRole)
        })
        .map((entry, index) => ({
          ...entry,
          rank: index + 1,
        }))

      const visibleEntries = scopedEntries.slice(0, limit)
      const myIdx = userId ? scopedEntries.findIndex((e) => e.user_id === userId) : -1
      const myRank =
        myIdx >= 0
          ? {
              rank: scopedEntries[myIdx].rank ?? myIdx + 1,
              value: scopedEntries[myIdx].value ?? 0,
              is_in_top: myIdx < 20,
              name: scopedEntries[myIdx].name,
              initials: scopedEntries[myIdx].initials,
            }
          : userId
            ? {
                rank: scopedEntries.length + 1,
                value: 0,
                is_in_top: false,
                name: "Kamu",
                initials: "KM",
              }
            : null

      res.json({
        entries: visibleEntries,
        my_rank: myRank,
        season: snapshot.season,
        community_goal: {
          current: snapshot.community_total ?? 0,
          target: snapshot.season?.target_attendance ?? 500,
          label: "Target Absensi Komunitas Vihara",
        },
        calculated_at: snapshot.calculated_at,
      })
    } catch (err) {
      next(err)
    }
  },
}
