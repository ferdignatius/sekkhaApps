// feature/dashboard/components/DashboardPage
// Gamification-focused home page for remaja vihara community.
// Features: level bar, animated stats, weekly missions, mini leaderboard.

import { useAuth } from "@/modules/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import {
  FlameIcon,
  StarIcon,
  TrophyIcon,
  ThumbsUpIcon,
  CalendarIcon,
  MapPinIcon,
  GiftIcon,
  CheckCircleIcon,
  CrownIcon,
} from "lucide-react"
import { useState } from "react"
import { AnnouncementCard } from "./AnnouncementCard"
import { DhammaWidget } from "./DhammaWidget"

// ─── Dummy data ────────────────────────────────────────────────────────────────

const DUMMY_USER = {
  name: "Admin Sekkha",
  level: 3,
  levelLabel: "Umat Setia",
  totalPoints: 1240,
  nextLevelPoints: 1500,
  currentStreak: 5,
}

const DUMMY_NEXT_EVENT = {
  id: "evt-next",
  title: "Kebaktian Minggu",
  location: "Vihara Dharma Bhakti",
  event_date: "2025-07-13T08:00:00Z",
  rsvp_count: 23,
  my_rsvp: null as "hadir" | "tidak_hadir" | null,
  friends_attending: [
    { initials: "RS", name: "Rina" },
    { initials: "BD", name: "Budi" },
    { initials: "MP", name: "Maya" },
  ],
}

const DUMMY_MISSIONS = [
  { id: "m1", title: "Hadir Kebaktian", reward: 50, completed: false, icon: "📅" },
  { id: "m2", title: "RSVP Event", reward: 10, completed: true, icon: "✅" },
  { id: "m3", title: "Baca Renungan Harian", reward: 5, completed: false, icon: "📖" },
]

const DUMMY_TOP3 = [
  { rank: 1, name: "Hendra", initials: "HK", points: 596 },
  { rank: 2, name: "Sari", initials: "SI", points: 525 },
  { rank: 3, name: "Lina", initials: "LS", points: 524 },
]

const DUMMY_ANNOUNCEMENTS = [
  { id: "ann-1", title: "Pendaftaran Retreat Tahunan Dibuka", body: "Kuota terbatas, segera daftar sebelum 20 Juli.", date: "10 Jul 2025" },
  { id: "ann-2", title: "Jadwal Meditasi Berubah", body: "Mulai bulan Agustus, sesi meditasi pindah ke Sabtu pagi.", date: "8 Jul 2025" },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { authState } = useAuth()
  const [rsvp, setRsvp] = useState<"hadir" | "tidak_hadir" | null>(DUMMY_NEXT_EVENT.my_rsvp)

  const displayName =
    authState.status === "authenticated" && authState.userId === "admin-user-1"
      ? DUMMY_USER.name
      : "Pengguna"

  const levelProgress = Math.round((DUMMY_USER.totalPoints / DUMMY_USER.nextLevelPoints) * 100)

  return (
    <main>
      <PageBreadcrumb items={[{ label: "Beranda" }]} />
      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-8xl space-y-5">

          {/* ── Profile Header with Level Bar (feature #1) ───────────────── */}
          <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sekkha-brand-yellow text-heading-5 font-semibold text-sekkha-ink ring-3 ring-sekkha-hairline-soft">
                {displayName.split(" ").slice(0, 2).map(w => w[0]).join("")}
              </div>

              {/* Name + Level bar */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-heading-5 text-sekkha-ink">{displayName}</p>
                  <span className="rounded-full bg-sekkha-brand-yellow/20 px-2 py-0.5 text-caption-bold text-sekkha-yellow-dark">
                    Lv.{DUMMY_USER.level}
                  </span>
                </div>
                <p className="mt-0.5 text-caption text-sekkha-slate">{DUMMY_USER.levelLabel}</p>

                {/* Level progress bar */}
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-sekkha-surface">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sekkha-brand-yellow to-amber-400 transition-all"
                      style={{ width: `${levelProgress}%` }}
                    />
                  </div>
                  {/* Animated coin icon */}
                  <div className="animate-spin-slow">
                    <StarIcon className="size-5 text-sekkha-brand-yellow" aria-hidden="true" />
                  </div>
                  <span className="text-caption-bold text-sekkha-slate">
                    {DUMMY_USER.totalPoints}/{DUMMY_USER.nextLevelPoints}
                  </span>
                </div>
              </div>
            </div>

            {/* Stats row — large animated icons */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="flex items-center gap-3 rounded-xl bg-sekkha-coral-light px-4 py-3 border border-sekkha-brand-red-dark/20">
                <FlameIcon className="size-8 animate-pulse text-sekkha-ink" aria-hidden="true" />
                <div>
                  <p className="text-heading-4 font-semibold text-sekkha-ink">{DUMMY_USER.currentStreak}</p>
                  <p className="text-caption text-sekkha-slate">🔥 Minggu streak</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-sekkha-surface-yellow px-4 py-3 border border-sekkha-brand-yellow-deep/20">
                <StarIcon className="size-8 animate-bounce text-sekkha-brand-yellow" aria-hidden="true" />
                <div>
                  <p className="text-heading-4 font-semibold text-sekkha-ink">{DUMMY_USER.totalPoints.toLocaleString("id-ID")}</p>
                  <p className="text-caption text-sekkha-slate">⭐ Total poin</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── Two-column layout ──────────────────────────────────────────── */}
          <div className="flex flex-col gap-5 lg:flex-row">

            {/* Left column */}
            <div className="flex-1 space-y-4 lg:min-w-0">

              {/* ── Kegiatan Mendatang with green Hadir + friend avatars (feature #3, #4) */}
              <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
                <div className="mb-3 flex items-center gap-2">
                  <CalendarIcon className="size-4 text-sekkha-brand-blue" aria-hidden="true" />
                  <h2 className="text-body-sm-medium text-sekkha-ink">Kegiatan Mendatang</h2>
                </div>

                <div className="rounded-xl bg-sekkha-surface p-4">
                  <p className="text-body-sm-medium text-sekkha-ink">{DUMMY_NEXT_EVENT.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-caption text-sekkha-slate">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="size-3.5" /> {formatEventDate(DUMMY_NEXT_EVENT.event_date)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPinIcon className="size-3.5" /> {DUMMY_NEXT_EVENT.location}
                    </span>
                  </div>

                  {/* Friend avatars who already RSVP */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {DUMMY_NEXT_EVENT.friends_attending.map(f => (
                        <div
                          key={f.initials}
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-sekkha-brand-blue text-micro font-semibold text-white ring-2 ring-sekkha-canvas"
                          title={f.name}
                        >
                          {f.initials}
                        </div>
                      ))}
                    </div>
                    <span className="text-caption text-sekkha-slate">
                      +{DUMMY_NEXT_EVENT.rsvp_count - 3} lainnya hadir
                    </span>
                  </div>

                  {/* RSVP buttons — Sekkha-branded action buttons */}
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setRsvp("hadir")}
                      className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-body-sm-medium font-semibold transition-all ${
                        rsvp === "hadir"
                          ? "bg-sekkha-brand-blue text-white shadow-md"
                          : "border-2 border-sekkha-brand-blue bg-white text-sekkha-brand-blue hover:bg-sekkha-surface"
                      }`}
                    >
                      <ThumbsUpIcon className="size-4" />
                      Hadir 🔥
                    </button>
                    <button
                      type="button"
                      onClick={() => setRsvp("tidak_hadir")}
                      className={`rounded-full px-4 py-2.5 text-body-sm-medium transition-all ${
                        rsvp === "tidak_hadir"
                          ? "bg-sekkha-slate/20 text-sekkha-ink font-semibold"
                          : "text-sekkha-slate hover:text-sekkha-ink"
                      }`}
                    >
                      Tidak Hadir
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Misi Minggu Ini (feature #2) ──────────────────────────────── */}
              <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
                <div className="mb-4 flex items-center gap-2">
                  <GiftIcon className="size-5 text-sekkha-brand-yellow-deep" aria-hidden="true" />
                  <h2 className="text-body-sm-medium text-sekkha-ink">Misi Minggu Ini</h2>
                </div>

                <div className="space-y-2">
                  {DUMMY_MISSIONS.map(mission => (
                    <div
                      key={mission.id}
                      className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
                        mission.completed
                          ? "bg-sekkha-teal-light"
                          : "bg-sekkha-surface"
                      }`}
                    >
                      <span className="text-xl">{mission.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-body-sm ${mission.completed ? "text-sekkha-brand-blue line-through" : "text-sekkha-ink"}`}>
                          {mission.title}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-caption-bold ${
                        mission.completed
                          ? "bg-sekkha-brand-blue text-white"
                          : "bg-sekkha-surface-yellow text-sekkha-yellow-dark"
                      }`}>
                        {mission.completed ? <CheckCircleIcon className="size-3.5 inline" /> : `+${mission.reward}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <aside className="w-full space-y-4 lg:w-80 lg:shrink-0">

              {/* ── Mini Leaderboard Top 3 (feature #5) ───────────────────────── */}
              <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
                <div className="mb-4 flex items-center gap-2">
                  <TrophyIcon className="size-5 text-sekkha-brand-yellow" aria-hidden="true" />
                  <h2 className="text-body-sm-medium text-sekkha-ink">Top 3 Minggu Ini</h2>
                </div>

                <div className="space-y-2">
                  {DUMMY_TOP3.map(user => {
                    const medalColor = user.rank === 1 ? "text-yellow-500" : user.rank === 2 ? "text-slate-400" : "text-orange-400"
                    const avatarBg = user.rank === 1 ? "bg-sekkha-brand-yellow" : user.rank === 2 ? "bg-slate-200" : "bg-orange-200"
                    return (
                      <div key={user.rank} className="flex items-center gap-3 rounded-lg px-3 py-2">
                        <CrownIcon className={`size-4 shrink-0 ${medalColor}`} aria-hidden="true" />
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-micro font-semibold text-sekkha-ink ${avatarBg}`}>
                          {user.initials}
                        </div>
                        <p className="min-w-0 flex-1 truncate text-body-sm text-sekkha-ink">{user.name}</p>
                        <span className="text-body-sm-medium text-sekkha-ink">{user.points}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Pengumuman */}
              <AnnouncementCard announcements={DUMMY_ANNOUNCEMENTS} />

              {/* Renungan Dhamma */}
              <DhammaWidget />
            </aside>
          </div>
        </div>
      </div>
    </main>
  )
}
