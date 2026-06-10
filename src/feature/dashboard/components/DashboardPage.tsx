// feature/dashboard/components/DashboardPage
// Dashboard home: profile summary, latest activity, next quest.
// Dummy data shapes match the API contract in sekkha-api-contract.md.

import { useAuth } from "@/feature/auth"
import { ProfileSummaryCard } from "./ProfileSummaryCard"
import { LatestActivityCard } from "./LatestActivityCard"
import { NextQuestCard } from "./NextQuestCard"
import type { AttendanceItem } from "./LatestActivityCard"
import type { UpcomingEvent } from "./NextQuestCard"

// ─── Dummy data — shapes match API contract ────────────────────────────────────
// GET /users/me/streak  →  streak data
const DUMMY_STREAK = {
  current_streak: 5,
  longest_streak: 8,
}

// GET /users/me/level  →  level data
const DUMMY_LEVEL = {
  level: 3,
  total_points: 1240,
  level_label: "Umat Setia",
}

// GET /users/me/attendances (last 3)  →  latest activity
const DUMMY_ACTIVITIES: AttendanceItem[] = [
  {
    event_id: "evt-3",
    event_title: "Kebaktian Minggu",
    event_date: "2025-07-06T08:00:00Z",
    method: "qr",
    scanned_at: "2025-07-06T08:15:00Z",
  },
  {
    event_id: "evt-2",
    event_title: "Kebaktian Minggu",
    event_date: "2025-06-29T08:00:00Z",
    method: "qr",
    scanned_at: "2025-06-29T08:12:00Z",
  },
  {
    event_id: "evt-1",
    event_title: "Workshop: Strategi Belajar",
    event_date: "2025-06-21T09:00:00Z",
    method: "manual",
    scanned_at: "2025-06-21T09:05:00Z",
  },
]

// GET /events?status=published&from=today (first result)  →  next quest
const DUMMY_NEXT_EVENT: UpcomingEvent = {
  id: "evt-next",
  title: "Kebaktian Minggu",
  location: "Vihara Dharma Bhakti",
  event_date: "2025-07-13T08:00:00Z",
  event_type: "rutin",
  rsvp_count: 23,
  my_rsvp: null,
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { authState } = useAuth()

  const displayName =
    authState.status === "authenticated" && authState.userId === "admin-user-1"
      ? "Admin Sekkha"
      : "Pengguna"

  return (
    <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-heading-5 text-sekkha-ink">Beranda</h1>

        {/* Profile summary with tiered flame streak */}
        <ProfileSummaryCard
          name={displayName}
          currentStreak={DUMMY_STREAK.current_streak}
          totalPoints={DUMMY_LEVEL.total_points}
          level={DUMMY_LEVEL.level}
          levelLabel={DUMMY_LEVEL.level_label}
        />

        {/* Latest attendance activity */}
        <LatestActivityCard activities={DUMMY_ACTIVITIES} />

        {/* Next quest (upcoming event) */}
        <NextQuestCard event={DUMMY_NEXT_EVENT} />
      </div>
    </main>
  )
}
