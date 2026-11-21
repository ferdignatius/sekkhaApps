// ─── Imports ────────────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo } from "react"
import { useAuth } from "@/modules/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { MemberQrModal } from "@/components/common/MemberQrModal"
import {
  FlameIcon,
  CalendarIcon,
  MapPinIcon,
  QrCodeIcon,
  StarIcon,
  SearchIcon,
  SettingsIcon,
  TrophyIcon,
  UsersIcon,
  UserIcon,
  LayoutGridIcon,
  BarChart3Icon,
  XIcon,
  SparklesIcon,
  ChevronRightIcon,
} from "lucide-react"
import { api } from "@/lib/api"
import { DhammaWidget } from "./DhammaWidget"
import { Link } from "@tanstack/react-router"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { Badge, Input } from "@/components/base"

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

function formatAttendanceMethod(method: string): string {
  const normalized = method.toLowerCase()
  if (normalized.includes("qr")) return "QR Check-in"
  if (normalized.includes("manual")) return "Manual Check-in"
  return method
}

function getTimeGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 4 && hour < 12) return "Good morning"
  if (hour >= 12 && hour < 17) return "Good afternoon"
  return "Good evening"
}

function formatTodayHeader(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

type HomeEvent = {
  id: string
  title: string
  location: string | null
  event_date: string
}

type HomeActivity = {
  event_id: string
  event_title: string
  event_date: string
  method: string
  scanned_at: string
}

type HomeSeason = {
  id: string
  name: string
  code: string | null
  start_date: string
  end_date: string
  target_attendance: number
  current_attendance?: number
  total_attendances?: number
  days_left: number
}

type HomeDashboard = {
  profile: {
    name: string
    user_number: string | null
    role: string
    points: number
  }
  streak: {
    current_streak: number
    longest_streak: number
    status?: "active" | "paused" | "inactive" | "expired"
    last_attended: string | null
  }
  season?: HomeSeason | null
  events: HomeEvent[]
  activities: HomeActivity[]
}

export function HomePage() {
  const { authState } = useAuth()
  const [showQrModal, setShowQrModal] = useState(false)
  const [dashboard, setDashboard] = useState<HomeDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    if (authState.status !== "authenticated") return

    const controller = new AbortController()
    let isMounted = true
    const timeoutId = window.setTimeout(() => controller.abort(), 8_000)

    async function loadDashboardData() {
      setLoading(true)
      setError(null)
      try {
        const data = await api.get<HomeDashboard>("/home", {
          signal: controller.signal,
          ttlMs: 5_000,
        })
        if (isMounted) setDashboard(data)
      } catch (cause) {
        if (!isMounted) return
        setError(
          cause instanceof Error && cause.name === "AbortError"
            ? "Dashboard timed out. Please try again."
            : "Failed to load dashboard. Please try again."
        )
      } finally {
        window.clearTimeout(timeoutId)
        if (isMounted) setLoading(false)
      }
    }

    loadDashboardData()
    return () => {
      isMounted = false
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [authState.status, retryKey])

  const role =
    authState.status === "authenticated"
      ? (dashboard?.profile.role ?? authState.role ?? "umat")
      : "umat"
  const displayName = dashboard?.profile.name || authState.name || "Member"
  const memberId =
    dashboard?.profile.user_number ||
    (authState.userId ? `SKH-${authState.userId.slice(-4)}` : "SKH-8821")
  const totalPoints = dashboard?.profile.points ?? 0
  const currentStreak = dashboard?.streak.current_streak ?? 0
  const events = dashboard?.events ?? []
  const activities = dashboard?.activities ?? []

  const nextEvent = events[0] ?? null
  const activeSeason = dashboard?.season ?? null
  const totalAttendances =
    activeSeason?.current_attendance ??
    activeSeason?.total_attendances ??
    activities.length
  const targetAttendance = Math.max(1, activeSeason?.target_attendance ?? 12)
  const seasonProgressPercent = Math.min(
    100,
    Math.round((totalAttendances / targetAttendance) * 100)
  )

  // State for "See More" (Lainnya) modal and in-modal menu search
  const [showAllMenusModal, setShowAllMenusModal] = useState(false)
  const [menuSearchQuery, setMenuSearchQuery] = useState("")

  const isPengurus =
    role === "organizer" || role === "pengurus" || role === "admin"
  const canAccessPeople = isPengurus

  // 8 Primary Quick Access Items for Home (Clay 6-Color Palette)
  const primaryQuickAccessItems = [
    {
      id: "events",
      label: "Events",
      icon: CalendarIcon,
      bg: "bg-[#e8b94a]",
      iconColor: "text-[#0a0a0a]",
      href: "/events",
    },
    {
      id: "leaderboard",
      label: "Leaderboard",
      icon: TrophyIcon,
      bg: "bg-[#ff4d8b]",
      iconColor: "text-white",
      href: "/leaderboard",
    },
    ...(canAccessPeople
      ? [
        {
          id: "people",
          label: "People",
          icon: UsersIcon,
          bg: "bg-[#ffb084]",
          iconColor: "text-[#0a0a0a]",
          href: "/people",
        },
      ]
      : []),
    ...(isPengurus
      ? [
        {
          id: "insight",
          label: "Community Insights",
          icon: BarChart3Icon,
          bg: "bg-[#0a0a0a]",
          iconColor: "text-white",
          href: "/insight",
        },
      ]
      : []),
    {
      id: "see-more",
      label: "See More",
      icon: LayoutGridIcon,
      bg: "bg-[#f5f0e0] border border-[#e5e5e5]",
      iconColor: "text-[#0a0a0a]",
      onClick: () => {
        setMenuSearchQuery("")
        setShowAllMenusModal(true)
      },
    },
  ]

  // All application menus categorized for the "See More" modal
  const allMenuSections = [
    {
      category: "Core Features",
      items: [
        {
          id: "events",
          label: "Events",
          description:
            "Temple services, puja schedules, and community gatherings",
          icon: CalendarIcon,
          bg: "bg-[#e8b94a]",
          iconColor: "text-[#0a0a0a]",
          href: "/events",
          badge: "Schedule",
          keywords:
            "events schedule calendar puja services activities vihara agenda kegiatan jadwal",
        },
        {
          id: "leaderboard",
          label: "Leaderboard",
          description: "Community activity ranking and merit point standings",
          icon: TrophyIcon,
          bg: "bg-[#ff4d8b]",
          iconColor: "text-white",
          href: "/leaderboard",
          badge: "Rankings",
          keywords:
            "leaderboard ranking score points merit standings peringkat klasemen skor",
        },
        ...(canAccessPeople
          ? [
            {
              id: "people",
              label: "People",
              description:
                "Temple member database, service teams, and community roles",
              icon: UsersIcon,
              bg: "bg-[#ffb084]",
              iconColor: "text-[#0a0a0a]",
              href: "/people",
              badge: "Directory",
              keywords:
                "people teams ministry fellowship community committees members direktori tim kepengurusan umat",
            },
          ]
          : []),
      ],
    },
    {
      category: "Account & Activity",
      items: [
        {
          id: "profile",
          label: "Profile",
          description:
            "Manage personal information, attendance history, and preferences",
          icon: UserIcon,
          bg: "bg-[#0a0a0a]",
          iconColor: "text-white",
          href: "/profile",
          badge: "Account",
          keywords:
            "profile settings account user preferences security password akun profil",
        },
      ],
    },
    ...(isPengurus
      ? [
        {
          category: "Organizer & Analytics",
          items: [
            {
              id: "insight",
              label: "Community & Contributor Insights",
              description:
                "Attendance trends, community demographics, and Seva contributor records",
              icon: BarChart3Icon,
              bg: "bg-[#ffb084]",
              iconColor: "text-[#0a0a0a]",
              href: "/insight",
              badge: "Analytics",
              keywords:
                "insight community analytics reports stats charts data trends seva contributor board analitik grafik data",
            },
          ],
        },
        {
          category: "Master Data & Configuration",
          items: [
            {
              id: "schools",
              label: "Schools Directory",
              description:
                "Manage student Buddhist fellowships (KMB) and school databases",
              icon: SettingsIcon,
              bg: "bg-[#faf5e8] border border-[#e5e5e5]",
              iconColor: "text-[#0a0a0a]",
              href: "/configure/master/school",
              badge: "Master",
              keywords: "schools kmb kampus sekolah universitas master data",
            },
            {
              id: "event-types",
              label: "Event Categories",
              description:
                "Manage activity types, service categories, and liturgical tags",
              icon: CalendarIcon,
              bg: "bg-[#ffb084]",
              iconColor: "text-[#0a0a0a]",
              href: "/configure/master/event-type",
              badge: "Master",
              keywords: "event types categories jenis kegiatan puja kategori",
            },
            {
              id: "points-rules",
              label: "Point Rules",
              description:
                "Define attendance merit multipliers and points scoring logic",
              icon: SparklesIcon,
              bg: "bg-[#0a0a0a]",
              iconColor: "text-white",
              href: "/configure/rules/points",
              badge: "Rules",
              keywords: "points rules aturan poin penilaian merit bobot",
            },
            {
              id: "seasons",
              label: "Seasons & Periods",
              description:
                "Manage competition periods, calendar seasons, and target metrics",
              icon: TrophyIcon,
              bg: "bg-[#e8b94a]",
              iconColor: "text-[#0a0a0a]",
              href: "/configure/rules/season",
              badge: "Rules",
              keywords:
                "seasons periods semester annual vassa musim kompetisi target",
            },
            {
              id: "badge-activities",
              label: "Service Activities",
              description:
                "Configure Seva duty roles, MC, liturgical chanting, and bonus points",
              icon: SparklesIcon,
              bg: "bg-[#ff4d8b]",
              iconColor: "text-white",
              href: "/configure/master/badge-activity",
              badge: "Master",
              keywords:
                "service activities seva tugas kebaktian mc puja bonus merit",
            },
          ],
        },
      ]
      : []),
  ]

  // Flattened & filtered for in-modal search (memoized & skipped when modal is closed)
  const filteredModalSections = useMemo(() => {
    if (!showAllMenusModal) return []
    const normalizedQuery = menuSearchQuery.trim().toLowerCase()
    return allMenuSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            !normalizedQuery ||
            item.label.toLowerCase().includes(normalizedQuery) ||
            item.description.toLowerCase().includes(normalizedQuery) ||
            item.badge?.toLowerCase().includes(normalizedQuery) ||
            item.keywords?.toLowerCase().includes(normalizedQuery)
        ),
      }))
      .filter((section) => section.items.length > 0)
  }, [showAllMenusModal, menuSearchQuery, canAccessPeople, isPengurus])

  const totalFilteredItems = useMemo(
    () =>
      filteredModalSections.reduce((acc, sec) => acc + sec.items.length, 0),
    [filteredModalSections]
  )

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-28 text-left font-sans md:pb-12">
      {/* On mobile, extend the Warm Sunrise backdrop + ambient glows behind the transparent top bar so there is zero seam */}
      <div className="relative overflow-hidden bg-gradient-to-b from-[#f6e8c8] via-[#faf2dd] to-[#f4e7c6] md:overflow-visible md:bg-none">
        {/* Mobile Hero Wallpaper spanning seamlessly behind top bar & hero */}
        <img
          src="/home-background.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover object-right-bottom select-none md:hidden"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#faf2dd]/85 via-[#faf2dd]/45 to-transparent md:hidden"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#faf2dd]/55 to-transparent md:hidden"
        />

        <PageBreadcrumb
          items={[{ label: "Home" }]}
          actions={
            <button
              type="button"
              onClick={() => setShowQrModal(true)}
              title="Attendance QR Code"
              aria-label="Attendance QR Code"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#ded6c2] bg-[#faf5e8]/90 text-[#0a0a0a] shadow-2xs backdrop-blur-md transition-all hover:bg-[#f5efe0] active:scale-95 sm:size-10"
            >
              <QrCodeIcon className="size-4" aria-hidden="true" />
            </button>
          }
        />

        {/* ── 1. Warm Sekkha Sunrise Hero (Curved Sheet Anchor on Mobile, Banner Card on md+) ── */}
        <div className="md:px-6 md:pt-2 lg:px-8 xl:px-12">
          <section
            aria-labelledby="section-profile"
            className="relative mx-auto max-w-7xl px-4 pt-3 pb-16 sm:px-6 md:overflow-hidden md:rounded-[32px] md:border md:border-[#e6decb] md:bg-gradient-to-b md:from-[#f6e8c8] md:via-[#faf2dd] md:to-[#f4e7c6] md:px-7 md:py-7 md:shadow-xs lg:px-8 lg:py-8"
          >
            <h2 id="section-profile" className="sr-only">
              Member Summary
            </h2>

            {/* Desktop Hero Wallpaper + Soft Readability Scrim */}
            <img
              src="/home-background.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none hidden h-full w-full object-cover object-right select-none md:absolute md:inset-0 md:block"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none hidden bg-gradient-to-r from-[#faf2dd]/85 via-[#faf2dd]/45 to-transparent md:absolute md:inset-0 md:block"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none hidden right-1/3 -bottom-12 size-44 rounded-full bg-[#ff4d8b]/10 blur-3xl md:absolute md:block"
            />

            <div className="relative z-10 space-y-5">
              {error && (
                <div
                  role="alert"
                  className="flex items-center justify-between gap-3 rounded-[16px] border border-rose-200 bg-rose-50/95 px-4 py-3 text-xs text-rose-800 shadow-2xs"
                >
                  <span>
                    {dashboard ? `Showing cached data. ${error}` : error}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRetryKey((value) => value + 1)}
                    className="min-h-11 shrink-0 rounded-full bg-rose-800 px-4 font-semibold text-white"
                  >
                    Retry
                  </button>
                </div>
              )}

              {loading && !dashboard ? (
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div
                    role="status"
                    aria-live="polite"
                    className="space-y-3"
                  >
                    <span className="sr-only">Loading dashboard...</span>
                    <div className="h-7 w-44 animate-pulse rounded-xl bg-[#ebe1c7]" />
                    <div className="h-3.5 w-40 animate-pulse rounded bg-[#ebe1c7]" />
                    <div className="h-12 w-36 animate-pulse rounded-2xl bg-[#ebe1c7]" />
                    <div className="h-4 w-32 animate-pulse rounded bg-[#ebe1c7]" />
                  </div>
                  <div
                    aria-hidden="true"
                    className="hidden min-w-[230px] flex-col gap-2 rounded-[20px] border border-[#ded3b8] bg-[#fffaf0]/80 px-4 py-3 md:flex"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-3.5 w-20 animate-pulse rounded bg-[#ebe1c7]" />
                      <div className="h-3.5 w-14 animate-pulse rounded bg-[#ebe1c7]" />
                    </div>
                    <div className="h-1.5 w-full animate-pulse rounded-full bg-[#ebe1c7]" />
                    <div className="h-3 w-28 animate-pulse rounded bg-[#ebe1c7]" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div className="space-y-2.5">
                    <div className="space-y-1">
                      <h1 className="text-2xl leading-tight font-bold tracking-tight text-[#0a0a0a] sm:text-3xl">
                        {getTimeGreeting()}.
                      </h1>
                      <p className="text-xs font-medium text-[#5f5849] sm:text-sm">
                        Today · {formatTodayHeader()}
                      </p>
                    </div>

                    {/* Highlight Utama: Streak */}
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="inline-flex size-10 items-center justify-center self-center rounded-[14px] bg-[#ff4d8b]/15 shadow-2xs sm:size-11">
                        <FlameIcon className="size-6 text-[#ff4d8b] sm:size-7" />
                      </span>
                      <span className="text-5xl leading-none font-black tracking-tight text-[#0a0a0a] tabular-nums sm:text-6xl">
                        {currentStreak}
                      </span>
                      <span className="text-sm text-[#3a352b] sm:text-lg">
                        Streak
                      </span>
                    </div>

                    {/* Points tepat di bawah Streak (Clean Text) */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-sm">
                      <StarIcon className="size-4 shrink-0 fill-[#e8b94a] text-[#c28e20]" />
                      <span className="font-extrabold text-[#0a0a0a] tabular-nums">
                        {totalPoints.toLocaleString("en-US")} Pts
                      </span>
                      <span className="text-xs font-medium text-[#6a6252]">
                        Karma Points
                      </span>
                    </div>
                  </div>

                  {/* Desktop/Tablet Compact Season Pill inside Hero */}
                  {activeSeason && (
                    <Link
                      to="/leaderboard"
                      className="hidden min-w-[230px] flex-col gap-1.5 rounded-[20px] border border-[#ded3b8] bg-[#fffaf0]/85 px-4 py-3 shadow-2xs backdrop-blur-sm transition-all hover:bg-[#fffaf0] md:flex"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-xs font-bold text-[#0a0a0a]">
                          Season Goal
                        </span>
                        <span className="shrink-0 text-[11px] font-bold text-[#c28e20]">
                          {activeSeason.days_left}d left
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#ebe2cc]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#e8b94a] to-[#ff4d8b]"
                          style={{
                            width: `${Math.max(5, seasonProgressPercent)}%`,
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-[#6a6252]">
                        {totalAttendances} / {targetAttendance} attendances
                      </span>
                    </Link>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ── Curved Sheet Body (Overlaps Hero on Mobile, Spacious Bento on Tablet/Desktop) ── */}
      <div className="relative z-10 -mt-6 rounded-t-[32px] border-t border-[#e5dec9]/80 bg-[#fffaf0] px-4 pt-5 shadow-[0_-10px_28px_-6px_rgba(10,10,10,0.07)] sm:px-6 md:mt-0 md:rounded-none md:border-t-0 md:bg-transparent md:px-6 md:pt-6 md:shadow-none lg:px-8 xl:px-12">
        <div className="mx-auto max-w-7xl space-y-5 sm:space-y-6 lg:space-y-7">
          {/* ── 2. Quick Access Section ── */}
          <section aria-labelledby="section-quick-access" className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2
                id="section-quick-access"
                className="text-[11px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-xs"
              >
                Quick Access
              </h2>
            </div>
            <div className="rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/90 p-3.5 shadow-xs backdrop-blur-md sm:rounded-[28px] sm:p-5">
              <div
                className={
                  primaryQuickAccessItems.length <= 3
                    ? "grid grid-cols-3 gap-x-2 gap-y-3 sm:gap-5"
                    : primaryQuickAccessItems.length === 4
                      ? "grid grid-cols-4 gap-x-2 gap-y-3 sm:gap-5"
                      : primaryQuickAccessItems.length === 5
                        ? "grid grid-cols-5 gap-x-1.5 gap-y-3 sm:gap-5"
                        : "grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-6 sm:gap-5"
                }
              >
                {primaryQuickAccessItems.map((item) => {
                  const Icon = item.icon
                  const content = (
                    <div className="group flex cursor-pointer flex-col items-center text-center">
                      <div
                        className={`flex size-12 items-center justify-center rounded-[16px] sm:size-14 sm:rounded-[18px] ${item.bg} ${item.iconColor} shadow-2xs transition-transform duration-150 group-hover:scale-105 group-active:scale-90 group-active:opacity-85`}
                      >
                        <Icon className="size-5 sm:size-6" />
                      </div>
                      <span className="mt-1.5 line-clamp-2 flex min-h-[2.4em] items-center justify-center text-center text-[10px] leading-tight font-medium text-[#0a0a0a] sm:mt-2 sm:text-xs">
                        {item.label}
                      </span>
                    </div>
                  )

                  if (item.onClick) {
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={item.onClick}
                        className="w-full"
                      >
                        {content}
                      </button>
                    )
                  }

                  return (
                    <Link key={item.id} to={item.href as "/"}>
                      {content}
                    </Link>
                  )
                })}
              </div>
            </div>
          </section>

          {/* ── 3. Highlights & Reflections (Responsive 1-col / 2-col / 3-col Bento) ── */}
          <section aria-labelledby="section-highlights" className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2
                id="section-highlights"
                className="text-[11px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-xs"
              >
                Today&apos;s Highlights
              </h2>
            </div>
            <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
              {/* Upcoming Event Widget (Single clean card, 1 clear CTA) */}
              <div
                aria-labelledby="upcoming-event-heading"
                className="relative flex h-full flex-col justify-between overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs backdrop-blur-md sm:rounded-[28px] sm:p-6"
              >
                {/* Decorative background watermark */}
                <CalendarIcon className="pointer-events-none absolute -right-3 -bottom-3 size-24 rotate-12 text-[#e8b94a]/10" />

                <div className="relative z-10 flex flex-1 flex-col justify-between gap-4">
                  {/* Header: Title + Status */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-[#e8b94a] shadow-xs">
                        <CalendarIcon className="size-4.5" />
                      </span>
                      <div className="min-w-0">
                        <h3
                          id="upcoming-event-heading"
                          className="truncate text-sm font-bold text-[#0a0a0a]"
                        >
                          Upcoming Event
                        </h3>
                        <p className="text-[11px] text-[#6a6a6a]">
                          Temple Schedule
                        </p>
                      </div>
                    </div>

                    {nextEvent && (
                      <Badge
                        variant="emerald"
                        size="sm"
                        className="shrink-0 gap-1.5 rounded-full px-2.5 py-0.5 font-semibold"
                      >
                        <span className="relative flex size-1.5 shrink-0" aria-hidden="true">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                        </span>
                        Next Event
                      </Badge>
                    )}
                  </div>

                  {/* Body */}
                  {loading && !dashboard ? (
                    <div aria-hidden="true" className="flex flex-1 flex-col justify-between gap-4">
                      <div className="space-y-2">
                        <div className="h-5 w-4/5 animate-pulse rounded-lg bg-[#ebe1c7]" />
                        <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#ebe1c7]" />
                      </div>
                      <div className="flex items-center justify-between border-t border-[#e5e5e5]/80 pt-3">
                        <div className="h-3.5 w-20 animate-pulse rounded bg-[#ebe1c7]" />
                        <div className="size-7 animate-pulse rounded-full bg-[#ebe1c7]" />
                      </div>
                    </div>
                  ) : nextEvent ? (
                    <Link
                      to="/events"
                      search={{ eventId: nextEvent.id }}
                      className="group flex flex-1 flex-col justify-between gap-3 text-left transition-opacity hover:opacity-90"
                    >
                      <div className="min-w-0 space-y-1.5">
                        <h4 className="truncate text-base font-bold text-[#0a0a0a] transition-colors group-hover:text-black sm:text-lg">
                          {nextEvent.title}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#6a6a6a]">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="size-3.5 text-[#0a0a0a]" />
                            {formatEventDate(nextEvent.event_date)}
                          </span>
                          {nextEvent.location && (
                            <span className="flex items-center gap-1">
                              <MapPinIcon className="size-3.5 text-rose-600" />
                              <span className="truncate">{nextEvent.location}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#e5e5e5]/80 pt-3 text-xs font-semibold text-[#0a0a0a]">
                        <span>View Event</span>
                        <span className="flex size-7 items-center justify-center rounded-full border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] transition-transform group-hover:translate-x-0.5">
                          <ChevronRightIcon className="size-3.5" />
                        </span>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex flex-1 flex-col items-center justify-center py-6 text-center">
                      <p className="text-xs font-medium text-[#6a6a6a] sm:text-sm">
                        No upcoming events at the moment.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Active Season Progress Card (Single clean card, 1 clear CTA) */}
              <div
                aria-labelledby="active-season-heading"
                className="relative flex h-full flex-col justify-between overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs backdrop-blur-md sm:rounded-[28px] sm:p-6"
              >
                {/* Decorative background watermark */}
                <TrophyIcon className="pointer-events-none absolute -right-3 -bottom-3 size-24 rotate-12 text-[#ff4d8b]/10" />

                <div className="relative z-10 flex flex-1 flex-col justify-between gap-4">
                  {/* Header: Title + Countdown Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-[#e8b94a] shadow-xs">
                        <TrophyIcon className="size-4.5" />
                      </span>
                      <div className="min-w-0">
                        <h3
                          id="active-season-heading"
                          className="truncate text-sm font-bold text-[#0a0a0a]"
                        >
                          {activeSeason?.name || "Active Season"}
                        </h3>
                        <p className="text-[11px] text-[#6a6a6a]">
                          Community Standings
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="ochre"
                      size="sm"
                      className="shrink-0 gap-1 rounded-full px-2.5 py-0.5 font-semibold"
                    >
                      <SparklesIcon className="size-3 text-[#0a0a0a]" />
                      {activeSeason
                        ? `${activeSeason.days_left}d left`
                        : "Ongoing"}
                    </Badge>
                  </div>

                  {/* Body: Progress + Action */}
                  {loading && !dashboard ? (
                    <div aria-hidden="true" className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="h-3.5 w-32 animate-pulse rounded bg-[#ebe1c7]" />
                        <div className="h-3.5 w-16 animate-pulse rounded bg-[#ebe1c7]" />
                      </div>
                      <div className="h-2.5 w-full animate-pulse rounded-full bg-[#ebe1c7]" />
                      <div className="flex items-center justify-between border-t border-[#e5e5e5]/80 pt-3">
                        <div className="h-3.5 w-40 animate-pulse rounded bg-[#ebe1c7]" />
                        <div className="size-7 animate-pulse rounded-full bg-[#ebe1c7]" />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-semibold text-[#0a0a0a]">
                          <span>
                            Attendance: {totalAttendances} / {targetAttendance}
                          </span>
                          <span className="font-bold text-[#c28e20]">
                            {currentStreak}w Streak
                          </span>
                        </div>
                        <div
                          role="progressbar"
                          aria-label="Season activity progress"
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={seasonProgressPercent}
                          className="h-2.5 w-full overflow-hidden rounded-full border border-[#e5e5e5] bg-[#fffaf0]"
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#e8b94a] to-[#ff4d8b] transition-all duration-500"
                            style={{
                              width: `${Math.max(5, seasonProgressPercent)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <Link
                        to="/leaderboard"
                        className="group flex items-center justify-between border-t border-[#e5e5e5]/80 pt-3 text-xs font-semibold text-[#0a0a0a] transition-all hover:text-black"
                      >
                        <span>Check Your Rank on Leaderboard</span>
                        <span className="flex size-7 items-center justify-center rounded-full border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] transition-transform group-hover:translate-x-0.5">
                          <ChevronRightIcon className="size-3.5" />
                        </span>
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Dhamma Wisdom Widget (Full width on tablet 2-col, 3rd col on xl desktop) */}
              <div id="dhamma-wisdom-card" className="md:col-span-2 xl:col-span-1">
                <DhammaWidget />
              </div>
            </div>
          </section>

          <section aria-labelledby="section-activity" className="space-y-2">
            <h2
              id="section-activity"
              className="px-1 text-[11px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-xs"
            >
              Latest Activity
            </h2>
            <div className="rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs sm:rounded-[28px] sm:p-5">
              {loading && !dashboard ? (
                <div
                  aria-hidden="true"
                  className="divide-y divide-[#e5e5e5] lg:grid lg:grid-cols-2 lg:gap-x-8 lg:divide-y-0"
                >
                  {[1, 2].map((idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 lg:py-2"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="h-4 w-44 animate-pulse rounded bg-[#ebe1c7]" />
                        <div className="h-3 w-28 animate-pulse rounded bg-[#ebe1c7]" />
                      </div>
                      <div className="h-6 w-16 shrink-0 animate-pulse rounded-full bg-[#ebe1c7]" />
                    </div>
                  ))}
                </div>
              ) : activities.length > 0 ? (
                <ul className="divide-y divide-[#e5e5e5] lg:grid lg:grid-cols-2 lg:gap-x-8 lg:divide-y-0">
                  {activities.map((activity) => (
                    <li
                      key={`${activity.event_id}-${activity.scanned_at}`}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 lg:border-b lg:border-[#e5e5e5]/70 lg:py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#0a0a0a]">
                          {activity.event_title}
                        </p>
                        <p className="text-xs text-[#6a6a6a]">
                          {formatEventDate(activity.scanned_at)} ·{" "}
                          {formatAttendanceMethod(activity.method)}
                        </p>
                      </div>
                      <Badge variant="emerald" size="sm">
                        Attended
                      </Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-3 text-center text-xs text-[#6a6a6a]">
                  No recent activity yet.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* ── See More / All Menus Modal with Search ── */}
      <ResponsiveFormModal
        open={showAllMenusModal}
        onOpenChange={(open) => {
          setShowAllMenusModal(open)
          if (!open) setMenuSearchQuery("")
        }}
        title="All Menus & Features"
        maxWidth="max-w-4xl"
      >
        <div className="space-y-4 pt-0 font-sans">
          {/* Search bar inside modal / drawer */}
          <Input
            value={menuSearchQuery}
            onChange={(e) => setMenuSearchQuery(e.target.value)}
            placeholder="Search features or menus..."
            aria-label="Search menus and features"
            autoFocus
            className="rounded-[14px]"
            startIcon={<SearchIcon className="size-4 text-[#6a6a6a]" />}
            endIcon={
              menuSearchQuery ? (
                <button
                  type="button"
                  onClick={() => setMenuSearchQuery("")}
                  className="cursor-pointer p-0.5 text-[#6a6a6a] hover:text-[#0a0a0a]"
                  aria-label="Clear search"
                >
                  <XIcon className="size-3.5" />
                </button>
              ) : undefined
            }
          />

          {/* Categorized and filtered items container (delegates scroll to ResponsiveFormModal) */}
          <div className="space-y-5">
            {totalFilteredItems === 0 ? (
              <div className="space-y-1.5 py-8 text-center">
                <p className="text-sm font-semibold text-[#0a0a0a]">
                  No features found
                </p>
                <p className="text-xs text-[#6a6a6a]">
                  No menus matching &quot;{menuSearchQuery}&quot;.
                </p>
              </div>
            ) : (
              filteredModalSections.map((section) => (
                <div key={section.category} className="space-y-2">
                  <h4 className="px-1 text-[11px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                    {section.category}
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-2.5 lg:grid-cols-3">
                    {section.items.map((item) => {
                      const Icon = item.icon
                      const content = (
                        <>
                          <div
                            className={`flex size-9 shrink-0 items-center justify-center rounded-[12px] sm:size-10 ${item.bg} ${item.iconColor} shadow-2xs transition-transform group-hover:scale-105`}
                          >
                            <Icon className="size-4.5 sm:size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-semibold text-[#0a0a0a] group-hover:text-black sm:text-sm">
                              {item.label}
                            </span>
                          </div>
                          <ChevronRightIcon className="size-4 shrink-0 text-[#6a6a6a] transition-transform group-hover:translate-x-0.5" />
                        </>
                      )

                      if (
                        "onClick" in item &&
                        typeof (item as any).onClick === "function"
                      ) {
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setShowAllMenusModal(false)
                                ; (item as any).onClick()
                            }}
                            className="group flex w-full cursor-pointer items-center gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] px-3.5 py-3 text-left transition-all hover:border-[#0a0a0a]/20 hover:bg-[#f5f0e0] active:scale-[0.98]"
                          >
                            {content}
                          </button>
                        )
                      }

                      return (
                        <Link
                          key={item.id}
                          to={item.href as "/"}
                          onClick={() => setShowAllMenusModal(false)}
                          className="group flex cursor-pointer items-center gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] px-3.5 py-3 text-left transition-all hover:border-[#0a0a0a]/20 hover:bg-[#f5f0e0] active:scale-[0.98]"
                        >
                          {content}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </ResponsiveFormModal>

      {/* ── User Unique QR Code Modal (Unified HIG Pass) ── */}
      <MemberQrModal
        open={showQrModal}
        onClose={() => setShowQrModal(false)}
        userNumber={memberId}
        name={displayName}
      />
    </main>
  )
}
