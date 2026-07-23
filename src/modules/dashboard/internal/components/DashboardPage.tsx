// feature/dashboard/components/DashboardPage
// Modern, clean & youth-friendly dashboard tailored for Remaja Vihara (SMP/SMA).
// Strictly using Sekkha Design System color tokens & clean layout.

import { useAuth } from "@/modules/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import {
  FlameIcon,
  CalendarIcon,
  MapPinIcon,
  GiftIcon,
  CheckCircleIcon,
  QrCodeIcon,
  TargetIcon,
  TrendingUpIcon,
  AwardIcon,
  PartyPopperIcon,
  ArrowRightIcon,
  ClockIcon,
  UserCheckIcon,
  SettingsIcon,
} from "lucide-react"
import { useState } from "react"
import { AnnouncementCard } from "./AnnouncementCard"
import { DhammaWidget } from "./DhammaWidget"
import { Link } from "@tanstack/react-router"

// ─── Dummy Data ────────────────────────────────────────────────────────────────

const INITIAL_USER = {
  name: "Admin Sekkha",
  level: 3,
  levelTitle: "Bhikshu Cilik / Remaja Setia",
  totalPoints: 1240,
  nextLevelPoints: 1500,
  currentStreak: 5,
  monthlyAttendance: 3,
  monthlyTarget: 4, // Read-only from profile settings
  qrCodeUrl: "https://sekkha.app/u/admin-sekkha-01", // Unique user QR Code (for scanning & future social profile link)
}

const DUMMY_TODAY_EVENT = {
  id: "evt-1",
  status: "active" as "active" | "scheduled", // Active event status set by Pengurus
  title: "Sesi Meditasi & Chanting Remaja",
  time: "17:00 - 18:00 WIB",
  location: "Dhammasala Utama",
  event_date: "2025-07-13T10:00:00Z",
}

const DUMMY_MISSIONS = [
  { id: "m1", title: "Hadir Kebaktian Minggu Ini", reward: 50, completed: false, icon: "📅", tag: "Mingguan" },
  { id: "m2", title: "Tunjukkan QR Presensi ke Pengurus", reward: 15, completed: true, icon: "⚡", tag: "Harian" },
  { id: "m3", title: "Baca Renungan Harian Dhamma", reward: 10, completed: false, icon: "📖", tag: "Harian" },
  { id: "m4", title: "Presensi QR Punctual (Tepat Waktu)", reward: 25, completed: false, icon: "⏱️", tag: "Spesial" },
]

const DUMMY_ANNOUNCEMENTS = [
  { id: "ann-1", title: "Pendaftaran Retreat Youth Dibuka!", body: "Kuota terbatas khusus remaja SMP-SMA. Buruan daftar ya!", date: "10 Jul 2025" },
  { id: "ann-2", title: "Perubahan Jam Meditasi", body: "Sesi meditasi sore dimajukan 30 menit mulai minggu depan.", date: "8 Jul 2025" },
]

// ─── Helpers ───────────────────────────────────────────────────────────────────

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const { authState } = useAuth()
  const [claimedReward, setClaimedReward] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)

  const displayName =
    authState.status === "authenticated" && authState.userId === "admin-user-1"
      ? INITIAL_USER.name
      : "Sahabat Sekkha"

  const levelProgress = Math.round((INITIAL_USER.totalPoints / INITIAL_USER.nextLevelPoints) * 100)
  const monthlyProgress = Math.min(100, Math.round((INITIAL_USER.monthlyAttendance / INITIAL_USER.monthlyTarget) * 100))
  const isGoalAchieved = INITIAL_USER.monthlyAttendance >= INITIAL_USER.monthlyTarget

  return (
    <main className="min-h-screen bg-sekkha-surface pb-32 md:pb-12">
      <PageBreadcrumb items={[{ label: "Beranda" }]} />

      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">

          {/* ── 1. Profile Header Card (Glassmorphism Youthful Style) ─────────────────────────────── */}
          <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-sekkha-canvas/95 via-white/90 to-amber-50/50 backdrop-blur-md p-4 sm:p-5 shadow-xs transition-all hover:shadow-md">
            {/* Playful Decorative Background Glows */}
            <div className="absolute -top-10 -right-10 size-36 rounded-full bg-sekkha-brand-yellow/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 size-36 rounded-full bg-sekkha-brand-blue/10 blur-2xl pointer-events-none" />

            {/* Content Wrapper: Center-aligned column on mobile, row on desktop */}
            <div className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left gap-4">
              
              {/* Profile Info Section */}
              <div className="flex flex-col items-center sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0 w-full sm:w-auto">
                
                {/* Profile Picture & Level Badge */}
                <div className="flex flex-col items-center shrink-0 gap-1.5">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-sekkha-brand-yellow text-heading-5 sm:text-heading-4 font-extrabold text-sekkha-ink ring-4 ring-white/90 shadow-xs">
                    {displayName.split(" ").slice(0, 2).map((w) => w[0]).join("")}
                  </div>
                  <span className="rounded-full bg-sekkha-brand-yellow/25 border border-sekkha-brand-yellow/50 px-2.5 py-0.5 text-xs font-bold text-sekkha-yellow-dark shadow-2xs">
                    Lv.{INITIAL_USER.level}
                  </span>
                </div>

                {/* Text Info: Name -> Status Title -> XP Progress Bar */}
                <div className="min-w-0 flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
                  <h1 className="text-body-base sm:text-body-lg font-bold text-sekkha-ink truncate">
                    Namo Buddhaya, {displayName.split(" ")[0]}! 👋
                  </h1>
                  <p className="text-micro sm:text-caption font-medium text-sekkha-slate mt-0.5 truncate">
                    {INITIAL_USER.levelTitle}
                  </p>

                  {/* Level Progress Bar (Cleanly aligned under Name on Desktop, Centered on Mobile) */}
                  <div className="mt-2 flex items-center gap-2 w-full max-w-[200px] sm:max-w-[220px] justify-center sm:justify-start">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sekkha-surface/90 border border-slate-200/60">
                      <div
                        className="h-full rounded-full bg-sekkha-brand-yellow transition-all duration-500"
                        style={{ width: `${levelProgress}%` }}
                      />
                    </div>
                    <span className="text-micro font-medium text-sekkha-slate shrink-0">
                      {INITIAL_USER.totalPoints}/{INITIAL_USER.nextLevelPoints} XP
                    </span>
                  </div>
                </div>

              </div>

              {/* Stats (Streak & Poin) & QR Button: Inline on Desktop (lg+), Stacked on Mobile/Tablet */}
              <div className="flex flex-col items-center w-full lg:w-auto gap-3 border-t border-sekkha-hairline-soft/60 pt-3 lg:border-t-0 lg:pt-0 lg:flex-row lg:items-center">
                
                {/* Stats pills: Streak & Poin */}
                <div className="flex items-center justify-center gap-2 w-full sm:w-auto shrink-0">
                  <div className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-sekkha-coral-light/40 border border-sekkha-brand-red/30 px-3.5 py-1.5 backdrop-blur-xs">
                    <FlameIcon className="size-4 text-sekkha-ink shrink-0 animate-pulse" />
                    <div className="text-left">
                      <p className="text-[10px] text-sekkha-slate uppercase font-semibold leading-none">Streak</p>
                      <p className="text-caption-bold font-bold text-sekkha-ink leading-tight">{INITIAL_USER.currentStreak} Minggu 🔥</p>
                    </div>
                  </div>

                  <div className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-sekkha-surface-yellow/80 border border-sekkha-brand-yellow/50 px-3.5 py-1.5 backdrop-blur-xs">
                    <AwardIcon className="size-4 text-sekkha-ink shrink-0" />
                    <div className="text-left">
                      <p className="text-[10px] text-sekkha-slate uppercase font-semibold leading-none">Poin</p>
                      <p className="text-caption-bold font-bold text-sekkha-ink leading-tight">{INITIAL_USER.totalPoints} ⭐</p>
                    </div>
                  </div>
                </div>

                {/* QR Presensi Button */}
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue py-2.5 px-4 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-[0.99] shrink-0"
                >
                  <QrCodeIcon className="size-4" />
                  <span>Tunjukkan QR Presensi</span>
                </button>

              </div>

            </div>
          </div>

          {/* ── 2. Unified Layout ── */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">

            {/* Mobile-Only Highlights: Announcements & Dhamma Reflection */}
            <div className="space-y-4 block lg:hidden">
              <AnnouncementCard announcements={DUMMY_ANNOUNCEMENTS} />
              <DhammaWidget />
            </div>

            {/* Main Content Column (2 Cols Desktop) */}
            <div className="space-y-4 sm:space-y-5 lg:col-span-2">

              {/* ── Event Active & Status (Glassmorphism Styled) ── */}
              <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-sekkha-canvas/95 via-white/90 to-blue-50/30 backdrop-blur-md p-4 sm:p-5 shadow-xs transition-all hover:shadow-md">
                
                {/* Header */}
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sekkha-brand-blue text-white shadow-xs">
                      <CalendarIcon className="size-4" />
                    </span>
                    <h2 className="text-body-sm-medium font-bold text-sekkha-ink">Acara & Presensi Vihara</h2>
                  </div>
                  <Link to="/events" className="flex items-center gap-0.5 text-caption text-sekkha-brand-blue hover:underline font-semibold">
                    Jadwal Lengkap <ArrowRightIcon className="size-3" />
                  </Link>
                </div>

                {/* Event Status Card */}
                <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface/80 backdrop-blur-xs p-3.5 sm:p-4 space-y-3">
                  
                  {/* Event Title & Active Status Indicator */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sekkha-hairline-soft pb-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-xs font-bold text-emerald-800 shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Acara Aktif
                        </span>
                        <span className="flex items-center gap-1 text-caption text-sekkha-slate font-medium shrink-0">
                          <ClockIcon className="size-3.5" /> {DUMMY_TODAY_EVENT.time}
                        </span>
                      </div>
                      <h3 className="text-body-sm-medium font-bold text-sekkha-ink text-base sm:text-lg mt-1">
                        {DUMMY_TODAY_EVENT.title}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-micro sm:text-caption text-sekkha-slate">
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="size-3.5 text-sekkha-brand-blue" />
                          {formatEventDate(DUMMY_TODAY_EVENT.event_date)}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPinIcon className="size-3.5 text-sekkha-brand-blue" />
                          {DUMMY_TODAY_EVENT.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Informative Workflow Banner for Presensi */}
                  <div className="flex items-start gap-2.5 rounded-lg bg-sekkha-canvas/80 p-3 border border-sekkha-hairline-soft">
                    <UserCheckIcon className="size-4 text-sekkha-brand-blue shrink-0 mt-0.5" />
                    <p className="text-micro sm:text-caption text-sekkha-slate">
                      <strong className="text-sekkha-ink">Presensi oleh Pengurus:</strong> Tekan tombol <span className="font-semibold text-sekkha-brand-blue font-mono">Tunjukkan QR</span> di kartu profil kamu di atas untuk di-scan oleh pengurus.
                    </p>
                  </div>

                </div>
              </div>

              {/* ── Integrated Target Kehadiran & Misi Minggu Ini (Glassmorphism Styled) ── */}
              <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-sekkha-canvas/95 via-white/90 to-teal-50/30 backdrop-blur-md p-4 sm:p-5 shadow-xs transition-all hover:shadow-md">
                
                {/* Section 1: Target Kehadiran Bulanan */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sekkha-brand-blue text-white shadow-xs">
                        <TargetIcon className="size-4" />
                      </span>
                      <h2 className="text-body-sm-medium font-bold text-sekkha-ink">Target Kehadiran Bulan Ini</h2>
                      <span className="text-micro text-sekkha-slate font-medium">· Juli 2025</span>
                    </div>
                    <Link
                      to="/home/profile"
                      className="flex items-center gap-1 text-xs font-bold text-sekkha-brand-blue hover:underline shrink-0"
                      title="Atur target di menu Profil"
                    >
                      <SettingsIcon className="size-3" />
                      <span>Ubah di Profil</span>
                    </Link>
                  </div>

                  {/* Target Progress Box */}
                  <div className="rounded-xl border border-sekkha-brand-blue/20 bg-sekkha-teal-light/20 backdrop-blur-xs p-3.5 space-y-2">
                    <div className="flex items-center justify-between text-caption font-medium">
                      <span className="text-sekkha-slate">
                        Hadir <strong className="text-sekkha-ink font-semibold">{INITIAL_USER.monthlyAttendance} dari {INITIAL_USER.monthlyTarget}</strong> kali ({monthlyProgress}%)
                      </span>
                      <span className="text-sekkha-brand-blue font-semibold flex items-center gap-1">
                        <TrendingUpIcon className="size-3.5" />
                        {isGoalAchieved ? "Target Tercapai! 🎉" : `Sisa ${Math.max(0, INITIAL_USER.monthlyTarget - INITIAL_USER.monthlyAttendance)}x lagi`}
                      </span>
                    </div>

                    <div className="h-2 w-full overflow-hidden rounded-full bg-sekkha-canvas border border-sekkha-hairline-soft">
                      <div
                        className="h-full rounded-full bg-sekkha-brand-blue transition-all duration-500"
                        style={{ width: `${monthlyProgress}%` }}
                      />
                    </div>

                    {isGoalAchieved && (
                      <div className="mt-2 flex items-center justify-between rounded-lg bg-sekkha-surface-yellow border border-sekkha-brand-yellow/50 p-2 text-sekkha-ink">
                        <div className="flex items-center gap-2">
                          <PartyPopperIcon className="size-4 text-sekkha-brand-yellow-deep animate-bounce shrink-0" />
                          <p className="text-caption font-semibold">Target Tuntas! Klaim bonus +100 XP</p>
                        </div>
                        <button
                          type="button"
                          disabled={claimedReward}
                          onClick={() => setClaimedReward(true)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                            claimedReward ? "bg-emerald-600 text-white" : "bg-sekkha-brand-yellow text-sekkha-ink shadow-xs hover:bg-amber-400"
                          }`}
                        >
                          {claimedReward ? "✓ Terklaim" : "Klaim +100 XP"}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-sekkha-hairline-soft/80 my-4" />

                {/* Section 2: Misi Minggu Ini */}
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sekkha-surface-yellow border border-sekkha-brand-yellow/40 text-sekkha-ink shadow-xs">
                        <GiftIcon className="size-4 text-sekkha-brand-yellow-deep" />
                      </span>
                      <h2 className="text-body-sm-medium font-bold text-sekkha-ink">Misi Minggu Ini</h2>
                    </div>
                    <span className="text-micro text-sekkha-slate font-medium">Kumpulkan XP Tambahan</span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {DUMMY_MISSIONS.map((mission) => (
                      <div
                        key={mission.id}
                        className={`flex items-center gap-2.5 rounded-xl p-2.5 border backdrop-blur-xs transition-all ${
                          mission.completed
                            ? "border-sekkha-brand-blue/20 bg-sekkha-teal-light/30"
                            : "border-sekkha-hairline-soft bg-sekkha-surface/80"
                        }`}
                      >
                        <span className="text-lg shrink-0">{mission.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-caption font-semibold truncate ${mission.completed ? "text-sekkha-brand-blue line-through" : "text-sekkha-ink"}`}>
                            {mission.title}
                          </p>
                          <span className="text-micro text-sekkha-slate">{mission.tag}</span>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                          mission.completed ? "bg-sekkha-brand-blue text-white" : "bg-sekkha-surface-yellow text-sekkha-yellow-dark"
                        }`}>
                          {mission.completed ? <CheckCircleIcon className="size-3.5 inline" /> : `+${mission.reward} XP`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

            {/* Sidebar Column */}
            <div className="space-y-4 sm:space-y-5">

              {/* Desktop-Only Announcements */}
              <div className="hidden lg:block">
                <AnnouncementCard announcements={DUMMY_ANNOUNCEMENTS} />
              </div>

              {/* Desktop-Only Renungan Dhamma Harian */}
              <div className="hidden lg:block">
                <DhammaWidget />
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* ── User Unique QR Code Modal (Point #3) ─────────────────────────── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-2xl bg-sekkha-canvas p-5 sm:p-6 text-center shadow-xl border border-sekkha-hairline">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sekkha-teal-light text-sekkha-brand-blue mb-3">
              <QrCodeIcon className="size-6" />
            </div>
            <h3 className="text-heading-5 font-semibold text-sekkha-ink">QR Code Presensi Kamu</h3>
            <p className="text-caption text-sekkha-slate mt-1">
              Tunjukkan QR Code ini kepada Pengurus Vihara untuk presensi kehadiran pada acara aktif.
            </p>

            {/* Simulated QR Code Graphic */}
            <div className="my-4 sm:my-5 mx-auto flex h-44 w-44 sm:h-48 sm:w-48 items-center justify-center rounded-xl bg-sekkha-surface border-2 border-dashed border-sekkha-brand-blue p-4">
              <div className="text-center">
                <QrCodeIcon className="size-28 sm:size-32 text-sekkha-ink mx-auto" />
                <span className="text-micro font-mono text-sekkha-slate mt-1 block">ID: {INITIAL_USER.name}</span>
              </div>
            </div>

            <p className="text-micro text-sekkha-slate bg-sekkha-surface p-2 rounded-lg font-mono truncate">
              {INITIAL_USER.qrCodeUrl}
            </p>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="mt-4 sm:mt-5 w-full rounded-xl bg-sekkha-ink py-2.5 text-caption-bold text-white hover:bg-black transition-all"
            >
              Tutup Modal QR
            </button>
          </div>
        </div>
      )}

    </main>
  )
}
