import { cached, CacheKeys } from "../../lib/cache"
import { calculateWeeklyStreak } from "../users/internal/utils"
import { homeModels } from "./models"
import type { EventVisibility } from "@prisma/client"

function eventVisibility(role: string): EventVisibility[] {
  if (role === "organizer" || role === "admin") return ["all", "member", "activist", "organizer"]
  if (role === "activist") return ["all", "member", "activist"]
  return ["all", "member"]
}

export const homeServices = {
  async getDashboard(userId: string, role: string) {
    return cached(CacheKeys.home(userId, role), 5, async () => {
      const now = new Date()
      const [profile, events, activity, attendanceWeeks] = await Promise.all([
        homeModels.findProfile(userId),
        homeModels.findUpcomingEvents({
          status: { in: ["scheduled", "active"] },
          visibility: { in: eventVisibility(role) },
          eventDate: { gte: now },
        }),
        homeModels.findRecentActivity(userId),
        homeModels.findAttendanceWeeks(userId),
      ])

      if (!profile) return null

      const streak = calculateWeeklyStreak(
        attendanceWeeks
          .filter(({ week }) => week instanceof Date && !Number.isNaN(week.getTime()))
          .map(({ week }) => ({ scannedAt: week }))
      )
      const level = profile.stats?.level ?? { level: 1, label: "Beginner" }

      return {
        profile: {
          id: profile.id,
          name: profile.profile?.name || profile.username || "Anggota",
          avatar_url: null,
          role: profile.role,
          user_number: profile.userNumber,
          points: profile.stats?.points ?? 0,
          level: level.level,
          level_label: level.label,
        },
        streak: {
          ...streak,
          last_attended: attendanceWeeks[0]?.last_attended?.toISOString() ?? null,
        },
        events: events.map((event) => ({
          id: event.id,
          title: event.title,
          location: event.location,
          event_date: event.eventDate.toISOString(),
          event_type: event.type?.code === "special" ? "special" : "rutin",
        })),
        activities: activity.map((item) => ({
          event_id: item.eventId,
          event_title: item.event.title,
          event_date: item.event.eventDate.toISOString(),
          method: item.method,
          scanned_at: item.scannedAt.toISOString(),
        })),
      }
    })
  },
}
