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
import { getInitials } from "@/lib/initials"
import {
  formatRoleLabel,
  getRoleAvatarClass,
  getRoleBadgeVariant,
} from "@/lib/roles"
import { DhammaWidget } from "./DhammaWidget"
import { Link } from "@tanstack/react-router"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { Button, Badge, Input } from "@/components/base"

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
  const roleLabel = formatRoleLabel(role)
  const displayName = dashboard?.profile.name || authState.name || roleLabel
  const memberId =
    dashboard?.profile.user_number ||
    (authState.userId ? `SKH-${authState.userId.slice(-4)}` : "SKH-8821")
  const totalPoints = dashboard?.profile.points ?? 0
  const currentStreak = dashboard?.streak.current_streak ?? 0
  const streakStatus = dashboard?.streak.status ?? "active"
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
      <PageBreadcrumb items={[{ label: "Home" }]} />

      <div className="px-3.5 py-3 sm:px-6 sm:py-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6 lg:space-y-8">
          {/* ── 1. Profile Section (Clay Warm Surface with Apple HIG Depth) ── */}
          <section aria-labelledby="section-profile">
            <h2 id="section-profile" className="sr-only">
              Member Profile
            </h2>
            {error && (
              <div
                role="alert"
                className="mb-3 flex items-center justify-between gap-3 rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"
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
              <div
                role="status"
                aria-live="polite"
                className="relative overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs sm:rounded-[28px] sm:p-5 lg:p-6"
              >
                <span className="sr-only">Loading dashboard...</span>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div className="size-14 animate-pulse rounded-[18px] bg-[#ebe6d6] sm:size-16" />
                    <div className="space-y-2">
                      <div className="h-3 w-20 animate-pulse rounded bg-[#ebe6d6]" />
                      <div className="h-5 w-36 animate-pulse rounded bg-[#ebe6d6]" />
                      <div className="h-3.5 w-24 animate-pulse rounded bg-[#ebe6d6]" />
                    </div>
                  </div>
                  <div className="size-11 animate-pulse rounded-full bg-[#ebe6d6] sm:w-28" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-[#e5e5e5]/80 pt-3 sm:gap-3">
                  <div className="h-14 animate-pulse rounded-[16px] bg-[#fffaf0]" />
                  <div className="h-14 animate-pulse rounded-[16px] bg-[#fffaf0]" />
                </div>
              </div>
            ) : (
            <div className="relative overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs backdrop-blur-md sm:rounded-[28px] sm:p-5 lg:p-6">
              {/* Subtle Ambient Radial Glows */}
              <div className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-[#ffb084]/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 size-44 rounded-full bg-[#0a0a0a]/5 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-4">
                {/* Top Row: Profile Info (Left) + Quick QR Action (Right) */}
                <div className="flex min-w-0 items-center justify-between gap-3">
                  {/* Avatar & Details */}
                  <div className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4">
                    {/* Avatar Squircle */}
                    <div
                      className={`flex size-14 shrink-0 items-center justify-center rounded-[18px] border text-lg font-black shadow-xs ring-2 ring-[#e5e5e5] sm:size-16 sm:text-xl md:size-[68px] ${getRoleAvatarClass(role)}`}
                    >
                      {getInitials(displayName, "M")}
                    </div>

                    {/* Typographic Hierarchy */}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold tracking-tight text-[#6a6a6a]">
                        {getTimeGreeting()}
                      </p>
                      <h1
                        className="mt-0.5 truncate text-xl leading-tight font-bold tracking-tight text-[#0a0a0a] sm:text-2xl"
                        title={displayName}
                      >
                        {displayName}
                      </h1>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <Badge
                          variant={getRoleBadgeVariant(role)}
                          size="sm"
                          className="rounded-full px-2.5 py-0.5 font-semibold"
                        >
                          {roleLabel}
                        </Badge>
                        <span className="shrink-0 font-mono text-[11px] text-[#6a6a6a] sm:text-xs">
                          ID: {memberId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick QR Action (Adaptive icon-only on compact mobile, text on sm+) */}
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setShowQrModal(true)}
                    className="flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-full px-3 py-2 font-semibold shadow-xs active:scale-[0.98] active:opacity-85 sm:px-4"
                    title="Attendance QR Code"
                    aria-label="Attendance QR Code"
                  >
                    <QrCodeIcon className="size-4 shrink-0 text-white sm:size-4.5" />
                    <span className="hidden text-xs font-semibold whitespace-nowrap sm:inline sm:text-sm">
                      QR Code
                    </span>
                  </Button>
                </div>

                {/* Bottom Row: Activity Summary Tiles */}
                <div className="grid grid-cols-2 gap-2.5 border-t border-[#e5e5e5]/80 pt-3 sm:gap-3">
                  <div className="flex items-center gap-2.5 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0]/90 px-3.5 py-2 shadow-2xs backdrop-blur-sm sm:px-4 sm:py-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#ff4d8b]/15">
                      <FlameIcon className="size-5 text-[#ff4d8b]" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-[11px]">
                        Streak
                      </p>
                      <p className="mt-0.5 truncate text-xs leading-tight font-bold whitespace-nowrap text-[#0a0a0a] sm:text-sm">
                        {streakStatus === "paused" && currentStreak > 0
                          ? `${currentStreak}x Paused`
                          : `${currentStreak}x Active`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0]/90 px-3.5 py-2 shadow-2xs backdrop-blur-sm sm:px-4 sm:py-2.5">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#e8b94a]/20">
                      <StarIcon className="size-5 text-[#0a0a0a]" />
                    </div>
                    <div className="min-w-0 text-left">
                      <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-[11px]">
                        Points
                      </p>
                      <p className="mt-0.5 truncate text-xs leading-tight font-bold whitespace-nowrap text-[#0a0a0a] sm:text-sm">
                        {totalPoints.toLocaleString("en-US")} Pts
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}
          </section>

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
            <div className="rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-3.5 shadow-xs backdrop-blur-md sm:rounded-[28px] sm:p-6">
              <div
                className={
                  primaryQuickAccessItems.length <= 3
                    ? "grid grid-cols-3 gap-x-2 gap-y-3 sm:gap-6"
                    : primaryQuickAccessItems.length === 4
                      ? "grid grid-cols-4 gap-x-2 gap-y-3 sm:gap-6"
                      : primaryQuickAccessItems.length === 5
                        ? "grid grid-cols-5 gap-x-1.5 gap-y-3 sm:gap-6"
                        : "grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-6 sm:gap-6"
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

          {/* ── 3. Highlights & Reflections ── */}
          <section aria-labelledby="section-highlights" className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2
                id="section-highlights"
                className="text-[11px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-xs"
              >
                Today&apos;s Highlights
              </h2>
            </div>
            <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 md:grid-cols-2">
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
                  {nextEvent ? (
                    <Link
                      to={`/events?eventId=${nextEvent.id}` as "/"}
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
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-xs font-semibold text-[#0a0a0a]">
                      <span>
                        Attendance: {totalAttendances} / {targetAttendance}
                      </span>
                      <span className="font-bold text-[#e8b94a]">
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
                </div>
              </div>
            </div>

            {/* Dhamma Wisdom Widget */}
            <div id="dhamma-wisdom-card">
              <DhammaWidget />
            </div>
          </section>

          <section aria-labelledby="section-activity" className="space-y-2">
            <h2
              id="section-activity"
              className="px-1 text-[11px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-xs"
            >
              Latest Activity
            </h2>
            <div className="rounded-[28px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs sm:p-5">
              {activities.length > 0 ? (
                <ul className="divide-y divide-[#e5e5e5]">
                  {activities.map((activity) => (
                    <li
                      key={`${activity.event_id}-${activity.scanned_at}`}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
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
                              ;(item as any).onClick()
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
