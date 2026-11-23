import { cached, CacheKeys } from "../../lib/cache"
import { calculateWeeklyStreak, toWeekKey } from "../../lib/streak"
import { homeModels } from "./models"
import type { EventVisibility, Prisma } from "@prisma/client"

function eventVisibility(role: string): EventVisibility[] {
  if (role === "organizer" || role === "admin") return ["all", "member", "activist", "organizer"]
  if (role === "activist") return ["all", "activist"]
  return ["all", "member"]
}

function buildUpcomingEventsWhere(role: string, now: Date): Prisma.EventWhereInput {
  if (role === "organizer" || role === "admin") {
    return {
      status: { in: ["scheduled", "active"] },
      visibility: { in: eventVisibility(role) },
      eventDate: { gte: now },
    }
  }
  const audienceRole = role === "activist" ? "activist" : "member"
  return {
    status: { in: ["scheduled", "active"] },
    OR: [
      { targetRoles: { has: audienceRole } } as Prisma.EventWhereInput,
      {
        targetRoles: { isEmpty: true } as Prisma.EventWhereInput,
        visibility: { in: eventVisibility(role) },
      } as Prisma.EventWhereInput,
    ],
    eventDate: { gte: now },
  }
}

export const homeServices = {
  async getDashboard(userId: string, role: string) {
    const result = await cached(CacheKeys.home(userId, role), 5, async () => {
      const now = new Date()
      const [profile, events, activity, attendanceWeeks, closedStreakEvents, activeSeason] = await Promise.all([
        homeModels.findProfile(userId),
        homeModels.findUpcomingEvents(buildUpcomingEventsWhere(role, now)),
        homeModels.findRecentActivity(userId),
        homeModels.findAttendanceWeeks(userId),
        homeModels.findClosedStreakEventDates().catch(() => []),
        homeModels.findActiveSeason(),
      ])

      if (!profile) return null

      const activeWeeks =
        closedStreakEvents.length > 0
          ? closedStreakEvents.map((e) => toWeekKey(new Date(e.eventDate)))
          : undefined

      const streak = calculateWeeklyStreak(
        attendanceWeeks
          .filter(({ week }) => week instanceof Date && !Number.isNaN(week.getTime()))
          .map(({ week }) => ({ scannedAt: week })),
        now,
        activeWeeks
      )

      const activeCustom = activeSeason && activeSeason.endDate >= now ? activeSeason : null
      const year = now.getFullYear()
      const sem = now.getMonth() < 6 ? 1 : 2
      const semEnd = new Date(year, sem === 1 ? 5 : 11, sem === 1 ? 30 : 31, 23, 59, 59, 999)
      const semStart = new Date(year, sem === 1 ? 0 : 6, 1, 0, 0, 0, 0)
      const semDaysLeft = Math.max(0, Math.ceil((semEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))

      const season = activeCustom
        ? {
            id: activeCustom.id,
            name: activeCustom.name,
            code: activeCustom.code,
            start_date: activeCustom.startDate.toISOString(),
            end_date: activeCustom.endDate.toISOString(),
            target_attendance: activeCustom.targetAttendance,
            days_left: Math.max(
              0,
              Math.ceil((activeCustom.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            ),
          }
        : {
            id: `sem-${year}-${sem}`,
            name: `Semester ${sem} · ${year}`,
            code: `S${year}-SEM${sem}`,
            start_date: semStart.toISOString(),
            end_date: semEnd.toISOString(),
            target_attendance: 500,
            days_left: semDaysLeft,
          }

      return {
        profile: {
          id: profile.id,
          name: profile.profile?.name || profile.username || "Member",
          avatar_url: null,
          role: profile.role,
          user_number:
            profile.userNumber !== null && profile.userNumber !== undefined
              ? (String(profile.userNumber) as unknown as bigint)
              : profile.userNumber,
          points: profile.stats?.points ?? 0,
        },
        streak: {
          ...streak,
          last_attended: attendanceWeeks[0]?.last_attended?.toISOString() ?? null,
        },
        season,
        events: events.map((event) => ({
          id: event.id,
          title: event.title,
          location: event.location,
          event_date: event.eventDate.toISOString(),
          event_type: event.type?.code === "special" ? "special" : "routine",
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

    if (
      result?.profile &&
      result.profile.user_number !== null &&
      result.profile.user_number !== undefined
    ) {
      result.profile.user_number = BigInt(result.profile.user_number)
    }

    return result
  },
}
