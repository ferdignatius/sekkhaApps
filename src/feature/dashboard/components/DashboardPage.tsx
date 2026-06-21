// feature/dashboard/components/DashboardPage
// Dashboard home — 2-column layout on desktop (75:25).
// Left: Profile + Activity + Kegiatan Mendatang
// Right: Pengumuman, Jadwal Terdekat, Renungan Harian

import { useAuth } from "@/feature/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ProfileSummaryCard } from "./ProfileSummaryCard"
import { LatestActivityCard } from "./LatestActivityCard"
import { NextEventCard } from "./NextEventCard"
import { AnnouncementCard } from "./AnnouncementCard"
import { DhammaWidget } from "./DhammaWidget"
import type { AttendanceItem } from "./LatestActivityCard"
import type { UpcomingEvent } from "./NextEventCard"

// ─── Dummy data ────────────────────────────────────────────────────────────────

const DUMMY_STREAK = { current_streak: 5, longest_streak: 8 }
const DUMMY_LEVEL = { level: 3, total_points: 1240, level_label: "Umat Setia" }

const DUMMY_ACTIVITIES: AttendanceItem[] = [
  { event_id: "evt-3", event_title: "Kebaktian Minggu", event_date: "2025-07-06T08:00:00Z", method: "qr", scanned_at: "2025-07-06T08:15:00Z" },
  { event_id: "evt-2", event_title: "Kebaktian Minggu", event_date: "2025-06-29T08:00:00Z", method: "qr", scanned_at: "2025-06-29T08:12:00Z" },
  { event_id: "evt-1", event_title: "Workshop: Strategi Belajar", event_date: "2025-06-21T09:00:00Z", method: "manual", scanned_at: "2025-06-21T09:05:00Z" },
]

const DUMMY_NEXT_EVENT: UpcomingEvent = {
  id: "evt-next",
  title: "Kebaktian Minggu",
  location: "Vihara Dharma Bhakti",
  event_date: "2025-07-13T08:00:00Z",
  event_type: "rutin",
  rsvp_count: 23,
  my_rsvp: null,
}

const DUMMY_ANNOUNCEMENTS = [
  { id: "ann-1", title: "Pendaftaran Retreat Tahunan Dibuka", body: "Kuota terbatas, segera daftar sebelum 20 Juli.", date: "10 Jul 2025" },
  { id: "ann-2", title: "Jadwal Meditasi Berubah", body: "Mulai bulan Agustus, sesi meditasi pindah ke Sabtu pagi.", date: "8 Jul 2025" },
]

// ─── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { authState } = useAuth()

  const displayName =
    authState.status === "authenticated" && authState.userId === "admin-user-1"
      ? "Admin Sekkha"
      : "Pengguna"

  return (
    <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
      <div className="mx-auto max-w-8xl space-y-5">
        <PageBreadcrumb items={[{ label: "Beranda" }]} />
        <h1 className="text-heading-5 text-sekkha-ink">Beranda</h1>

        {/* ── Two-column layout (desktop 75:25) ────────────────────────── */}
        <div className="flex flex-col gap-5 lg:flex-row">

          {/* ── Left column (main) ─────────────────────────────────────── */}
          <div className="flex-1 space-y-4 lg:min-w-0">
            {/* Profile summary */}
            <ProfileSummaryCard
              name={displayName}
              currentStreak={DUMMY_STREAK.current_streak}
              totalPoints={DUMMY_LEVEL.total_points}
              level={DUMMY_LEVEL.level}
              levelLabel={DUMMY_LEVEL.level_label}
            />

            {/* Latest activity */}
            <LatestActivityCard activities={DUMMY_ACTIVITIES} />

            {/* Kegiatan Mendatang (renamed from "Quest") */}
            <NextEventCard event={DUMMY_NEXT_EVENT} />
          </div>

          {/* ── Right column (widgets) ─────────────────────────────────── */}
          <aside className="w-full space-y-4 lg:w-80 lg:shrink-0">
            {/* Pengumuman */}
            <AnnouncementCard announcements={DUMMY_ANNOUNCEMENTS} />

            {/* Renungan Dhamma Harian */}
            <DhammaWidget />
          </aside>
        </div>
      </div>
    </main>
  )
}
