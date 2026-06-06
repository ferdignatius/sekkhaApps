// feature/dashboard/components/DashboardPage
// Main dashboard page: profile summary, announcements, next event.

import { useAuth } from "@/feature/auth"
import { ProfileSummaryCard } from "./ProfileSummaryCard"
import { AnnouncementCard } from "./AnnouncementCard"
import { NextEventCard } from "./NextEventCard"

// ─── Dummy data (replace with API data later) ──────────────────────────────────

const DUMMY_ANNOUNCEMENTS = [
  {
    id: "1",
    title: "Pendaftaran ujian semester dibuka",
    body: "Segera daftarkan dirimu sebelum 30 Juli 2025. Kuota terbatas!",
    date: "1 Juli 2025",
  },
  {
    id: "2",
    title: "Jadwal mentoring diperbarui",
    body: "Jadwal sesi mentoring untuk bulan Juli telah diperbarui. Cek kalender kamu.",
    date: "28 Juni 2025",
  },
]

const DUMMY_NEXT_EVENT = {
  id: "evt-1",
  title: "Workshop: Strategi Belajar Efektif",
  date: "Sabtu, 12 Juli 2025 · 09.00 – 12.00 WIB",
  location: "Zoom (link dikirim via email)",
  description: "Pelajari teknik belajar terbaik bersama mentor berpengalaman.",
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { authState } = useAuth()

  // Derive display name from userId or fall back to a friendly default
  const displayName =
    authState.status === "authenticated" && authState.userId === "admin-user-1"
      ? "Admin Sekkha"
      : "Pengguna"

  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-24 md:pb-8">
      <h1 className="text-heading-5 text-sekkha-ink">Beranda</h1>

      {/* Profile summary */}
      <ProfileSummaryCard
        name={displayName}
        streakDays={7}
        totalPoints={1240}
      />

      {/* Announcement */}
      <AnnouncementCard announcements={DUMMY_ANNOUNCEMENTS} />

      {/* Next event */}
      <NextEventCard event={DUMMY_NEXT_EVENT} />
    </main>
  )
}
