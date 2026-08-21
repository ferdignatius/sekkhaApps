// feature/dashboard/components/DashboardPage
// Modern, clean & youth-friendly dashboard tailored for Remaja Vihara (SMP/SMA).
// Strictly using Sekkha Design System color tokens & clean layout.

import { useState, useEffect } from "react"
import { useAuth } from "@/modules/auth"
import QRCode from "react-qr-code"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import {
  FlameIcon,
  CalendarIcon,
  MapPinIcon,
  GiftIcon,
  QrCodeIcon,
  TargetIcon,
  TrendingUpIcon,
  AwardIcon,
  ArrowRightIcon,
  UserCheckIcon,
  SettingsIcon,
} from "lucide-react"
import { api } from "@/lib/api"
import { AnnouncementCard } from "./AnnouncementCard"
import { DhammaWidget } from "./DhammaWidget"
import { Link } from "@tanstack/react-router"

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
  const [showQrModal, setShowQrModal] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  const [streakData, setStreakData] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [announcements] = useState<any[]>([])
  const [missions] = useState<any[]>([])

  useEffect(() => {
    let isMounted = true
    async function loadDashboardData() {
      const promises: Promise<any>[] = [api.get<any[]>("/events")]
      if (authState.status === "authenticated") {
        promises.push(api.get<any>("/users/me"))
        promises.push(api.get<any>("/users/me/streak"))
      }

      const results = await Promise.allSettled(promises)
      if (!isMounted) return

      if (results[0]?.status === "fulfilled") {
        setEvents(results[0].value || [])
      }
      if (results[1]?.status === "fulfilled") {
        setUserProfile(results[1].value)
      }
      if (results[2]?.status === "fulfilled") {
        setStreakData(results[2].value)
      }
    }
    loadDashboardData()
    return () => {
      isMounted = false
    }
  }, [authState.status])

  const role = authState.status === "authenticated" ? (authState.role ?? "umat") : "umat"
  const displayName = userProfile?.name || (role.charAt(0).toUpperCase() + role.slice(1))
  const memberId = userProfile?.user_number || userProfile?.userNumber || userProfile?.id || (authState.userId ? `SKH-${authState.userId.slice(-4)}` : "SKH-8821")
  const totalPoints = userProfile?.points ?? 0
  const currentStreak = streakData?.current_streak ?? 0
  const activeEvent = events.length > 0 ? events[0] : null

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
                {/* Profile Picture */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-300 text-heading-5 sm:text-heading-4 font-extrabold text-sekkha-ink ring-4 ring-white/90 shadow-xs">
                    {displayName.split(" ").slice(0, 2).map((w: string) => w[0]).join("")}
                  </div>
                </div>

                {/* Text Info: Name -> Role & Points */}
                <div className="min-w-0 flex-1 flex flex-col items-center sm:items-start text-center sm:text-left">
                  <h1 className="text-body-base sm:text-body-lg font-bold text-sekkha-ink truncate">
                    Namo Buddhaya, {displayName}! 👋
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="rounded-full bg-blue-50 border border-blue-200/80 px-2.5 py-0.5 text-micro-bold text-sekkha-brand-blue capitalize">
                      {role}
                    </span>
                    <span className="text-micro font-medium text-sekkha-slate font-mono">
                      ID: {memberId}
                    </span>
                  </div>
                </div>

              </div>

              {/* Stats (Streak & Poin) & QR Button */}
              <div className="flex flex-col items-center w-full lg:w-auto gap-3 border-t border-sekkha-hairline-soft/60 pt-3 lg:border-t-0 lg:pt-0 lg:flex-row lg:items-center">
                
                {/* Stats pills: Streak & Poin */}
                <div className="flex items-center justify-center gap-2 w-full sm:w-auto shrink-0">
                  <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-orange-50 border border-orange-200/80 px-3.5 py-1.5 shadow-2xs">
                    <FlameIcon className="size-4 text-orange-500 shrink-0 animate-pulse" />
                    <div className="text-left">
                      <p className="text-[10px] text-orange-700 uppercase font-bold leading-none">Streak</p>
                      <p className="text-caption-bold font-black text-orange-950 leading-tight">{currentStreak}x Aktif</p>
                    </div>
                  </div>

                  <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-xl bg-amber-50 border border-amber-200/80 px-3.5 py-1.5 shadow-2xs">
                    <AwardIcon className="size-4 text-amber-600 shrink-0" />
                    <div className="text-left">
                      <p className="text-[10px] text-amber-700 uppercase font-bold leading-none">Poin</p>
                      <p className="text-caption-bold font-black text-amber-950 leading-tight">{totalPoints.toLocaleString("id-ID")} Pts</p>
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
              <AnnouncementCard announcements={announcements} />
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
                  
                  {activeEvent ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sekkha-hairline-soft pb-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-xs font-bold text-emerald-800 shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Acara Aktif
                          </span>
                        </div>
                        <h3 className="text-body-sm-medium font-bold text-sekkha-ink text-base sm:text-lg mt-1">
                          {activeEvent.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-micro sm:text-caption text-sekkha-slate">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="size-3.5 text-sekkha-brand-blue" />
                            {formatEventDate(activeEvent.event_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="size-3.5 text-sekkha-brand-blue" />
                            {activeEvent.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center space-y-2">
                      <p className="text-caption font-medium text-sekkha-slate">Belum ada acara aktif saat ini.</p>
                      <Link to="/events" className="inline-flex items-center gap-1.5 text-xs font-bold text-sekkha-brand-blue hover:underline">
                        <span>Lihat Jadwal Kegiatan</span> <ArrowRightIcon className="size-3" />
                      </Link>
                    </div>
                  )}

                  {/* Informative Workflow Banner for Presensi */}
                  <div className="flex items-start gap-2.5 rounded-lg bg-sekkha-canvas/80 p-3 border border-sekkha-hairline-soft">
                    <UserCheckIcon className="size-4 text-sekkha-brand-blue shrink-0 mt-0.5" />
                    <p className="text-micro sm:text-caption text-sekkha-slate">
                      <strong className="text-sekkha-ink">Presensi oleh Pengurus:</strong> Tekan tombol <span className="font-semibold text-sekkha-brand-blue font-mono">Tunjukkan QR</span> di kartu profil kamu di atas untuk di-scan oleh pengurus.
                    </p>
                  </div>

                </div>
              </div>

              {/* ── Misi Minggu Ini (Glassmorphism Styled) ── */}
              <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-sekkha-canvas/95 via-white/90 to-teal-50/30 backdrop-blur-md p-4 sm:p-5 shadow-xs transition-all hover:shadow-md">
                {/* Misi Minggu Ini */}
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

                  {missions.length === 0 ? (
                    <p className="text-caption text-sekkha-slate p-3 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface/60">
                      Belum ada misi aktif minggu ini.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {missions.map((mission) => (
                        <div
                          key={mission.id}
                          className="flex items-center gap-2.5 rounded-xl p-2.5 border border-sekkha-hairline-soft bg-sekkha-surface/80"
                        >
                          <span className="text-lg shrink-0">{mission.icon}</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-caption font-semibold truncate text-sekkha-ink">
                              {mission.title}
                            </p>
                            <span className="text-micro text-sekkha-slate">{mission.tag}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>

            </div>

            {/* Sidebar Column */}
            <div className="space-y-4 sm:space-y-5">

              {/* Desktop-Only Announcements */}
              <div className="hidden lg:block">
                <AnnouncementCard announcements={announcements} />
              </div>

              {/* Desktop-Only Renungan Dhamma Harian */}
              <div className="hidden lg:block">
                <DhammaWidget />
              </div>

            </div>

          </div>

        </div>
      </div>

      {/* ── User Unique QR Code Modal ─────────────────────────── */}
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

            {/* Dynamic QR Code Graphic */}
            <div className="my-4 sm:my-5 mx-auto flex h-52 w-52 items-center justify-center rounded-2xl bg-white border-2 border-sekkha-brand-blue/30 p-3 shadow-xs">
              <div className="text-center w-full">
                <div className="flex items-center justify-center p-1 bg-white">
                  <QRCode
                    value={memberId || "UNKNOWN"}
                    size={140}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox="0 0 256 256"
                  />
                </div>
                <span className="text-micro font-mono text-sekkha-brand-blue font-bold mt-2 block">
                  ID: {memberId}
                </span>
              </div>
            </div>

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
