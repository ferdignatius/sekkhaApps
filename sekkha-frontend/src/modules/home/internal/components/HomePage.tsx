// ─── Imports ────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react"
import { useAuth } from "@/modules/auth"
import QRCode from "react-qr-code"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import {
  FlameIcon,
  CalendarIcon,
  MapPinIcon,
  QrCodeIcon,
  StarIcon,
  SearchIcon,
  SettingsIcon,
  TicketIcon,
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
import { Button, Badge, Input } from "@/components/base"

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
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
  const roleLabel =
    role === "admin"
      ? "Admin"
      : role === "pengurus" || role === "organizer"
        ? "Organizer"
        : role === "aktivis" || role === "activist"
          ? "Activist"
          : "Member"
  const displayName = dashboard?.profile.name || authState.name || roleLabel
  const memberId =
    dashboard?.profile.user_number ||
    (authState.userId ? `SKH-${authState.userId.slice(-4)}` : "SKH-8821")
  const totalPoints = dashboard?.profile.points ?? 0
  const currentStreak = dashboard?.streak.current_streak ?? 0
  const events = dashboard?.events ?? []
  const activities = dashboard?.activities ?? []

  const nextEvent = events[0] ?? null
  const activeSeason = dashboard?.season ?? null

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
            bg: "bg-[#1a3a3a]",
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
          bg: "bg-[#1a3a3a]",
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
                bg: "bg-[#1a3a3a]",
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

  // Flattened & filtered for in-modal search
  const normalizedQuery = menuSearchQuery.trim().toLowerCase()
  const filteredModalSections = allMenuSections
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

  const totalFilteredItems = filteredModalSections.reduce(
    (acc, sec) => acc + sec.items.length,
    0
  )

  const topBarActions = (
    <div className="flex items-center gap-2">
      <button
        disabled
        type="button"
        onClick={() => setShowQrModal(true)}
        aria-label="Attendance QR Code"
        className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-[#e5e5e5] bg-[#faf5e8]/90 text-[#0a0a0a] shadow-xs backdrop-blur-md transition-all hover:bg-[#f5f0e0] active:scale-[0.95] active:opacity-75"
        title="Show Attendance QR Code"
      >
        <TicketIcon className="size-5" />
      </button>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-28 text-left font-sans md:pb-12">
      <PageBreadcrumb items={[{ label: "Home" }]} actions={topBarActions} />

      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-6 sm:space-y-8">
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
            {loading && !dashboard && (
              <div
                role="status"
                aria-live="polite"
                className="mb-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] px-4 py-3 text-xs text-[#6a6a6a]"
              >
                Loading dashboard...
              </div>
            )}
            <div className="relative overflow-hidden rounded-[28px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs backdrop-blur-md sm:p-5 lg:p-6">
              {/* Subtle Ambient Radial Glows */}
              <div className="pointer-events-none absolute -top-12 -right-12 size-44 rounded-full bg-[#ffb084]/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-12 -left-12 size-44 rounded-full bg-[#1a3a3a]/10 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-4">
                {/* Top Row: Profile Info (Left) + Quick QR Action (Right) */}
                <div className="flex min-w-0 items-center justify-between gap-3">
                  {/* Avatar & Details */}
                  <div className="flex min-w-0 flex-1 items-center gap-3.5 sm:gap-4">
                    {/* Avatar Squircle */}
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-[18px] bg-[#e8b94a] text-lg font-black text-[#0a0a0a] shadow-xs ring-2 ring-[#e5e5e5] sm:size-16 sm:text-xl md:size-[68px]">
                      {displayName
                        .split(" ")
                        .slice(0, 2)
                        .map((w: string) => w[0])
                        .join("")}
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
                          variant="teal"
                          size="sm"
                          className="rounded-full px-2.5 py-0.5 font-semibold capitalize"
                        >
                          {roleLabel}
                        </Badge>
                        <span className="shrink-0 font-mono text-[11px] text-[#6a6a6a] sm:text-xs">
                          ID: {memberId}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick QR Action */}
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setShowQrModal(true)}
                    className="gap-2 rounded-full px-4 py-2 font-semibold shadow-xs active:scale-[0.98] active:opacity-85"
                    title="Attendance QR Code"
                    aria-label="Attendance QR Code"
                  >
                    <QrCodeIcon className="size-4 shrink-0 text-white sm:size-4.5" />
                    <span className="text-xs font-semibold whitespace-nowrap sm:text-sm">
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
                        {currentStreak}x Active
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
            <div className="rounded-[28px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs backdrop-blur-md sm:p-6">
              <div
                className={
                  primaryQuickAccessItems.length <= 4
                    ? "grid grid-cols-4 gap-x-2 gap-y-4 sm:gap-6"
                    : primaryQuickAccessItems.length === 5
                      ? "grid grid-cols-5 gap-x-2 gap-y-4 sm:gap-6"
                      : primaryQuickAccessItems.length === 6
                        ? "grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-6 sm:gap-6"
                        : "grid grid-cols-4 gap-x-2 gap-y-4 sm:grid-cols-7 sm:gap-6"
                }
              >
                {primaryQuickAccessItems.map((item) => {
                  const Icon = item.icon
                  const content = (
                    <div className="group flex cursor-pointer flex-col items-center text-center">
                      <div
                        className={`flex size-13 items-center justify-center rounded-[18px] sm:size-14 ${item.bg} ${item.iconColor} shadow-2xs transition-transform duration-150 group-hover:scale-105 group-active:scale-90 group-active:opacity-85`}
                      >
                        <Icon className="size-6" />
                      </div>
                      <span className="mt-2 line-clamp-2 flex min-h-[2.4em] items-center justify-center text-center text-[11px] leading-tight font-medium text-[#0a0a0a] sm:text-xs">
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
              {/* Upcoming Event Widget */}
              <div
                aria-labelledby="upcoming-event-heading"
                className="relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-5 shadow-xs backdrop-blur-md sm:p-6"
              >
                {/* Decorative background watermark */}
                <CalendarIcon className="pointer-events-none absolute -right-3 -bottom-3 size-24 rotate-12 text-[#e8b94a]/10" />

                <div className="relative z-10 flex flex-1 flex-col">
                  {/* Header: Title + Action */}
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
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

                    <Link
                      to={
                        `/events${nextEvent ? `?eventId=${nextEvent.id}` : ""}` as "/"
                      }
                      aria-label={
                        nextEvent
                          ? `View ${nextEvent.title}`
                          : "View full schedule"
                      }
                      title={
                        nextEvent
                          ? `View ${nextEvent.title}`
                          : "View full schedule"
                      }
                      className="group flex size-9 items-center justify-center rounded-full border border-[#e5e5e5] bg-[#fffaf0]/80 text-[#6a6a6a] transition-all hover:border-[#0a0a0a]/20 hover:bg-[#fffaf0] hover:text-[#0a0a0a] active:scale-90"
                    >
                      <ChevronRightIcon className="size-4.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>

                  {/* Inner Status Card */}
                  <div className="flex min-h-[130px] flex-1 flex-col justify-center rounded-[20px] border border-[#e5e5e5]/80 bg-[#fffaf0]/90 p-4.5 shadow-2xs backdrop-blur-sm sm:min-h-[145px]">
                    {nextEvent ? (
                      <Link
                        to={`/events?eventId=${nextEvent.id}` as "/"}
                        className="group flex flex-col justify-between gap-3 text-left transition-opacity hover:opacity-90 sm:flex-row sm:items-center"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              variant="emerald"
                              size="sm"
                              className="gap-1.5 rounded-full px-2.5 py-0.5 font-semibold"
                            >
                              <span className="size-1.5 animate-ping rounded-full bg-emerald-500" />
                              Next Event
                            </Badge>
                          </div>
                          <h4 className="mt-2 text-base font-bold text-[#0a0a0a] transition-colors group-hover:text-black sm:text-lg">
                            {nextEvent.title}
                          </h4>
                          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[#6a6a6a]">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="size-3.5 text-[#1a3a3a]" />
                              {formatEventDate(nextEvent.event_date)}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPinIcon className="size-3.5 text-rose-600" />
                              {nextEvent.location}
                            </span>
                          </div>
                        </div>

                        {/* View Event Button Indicator */}
                        <div className="flex shrink-0 items-center gap-1 self-start sm:self-center">
                          <span className="text-xs font-semibold text-[#1a3a3a] transition-all group-hover:underline">
                            View Event
                          </span>
                          <span className="flex size-7 items-center justify-center rounded-full border border-[#e5e5e5] bg-[#faf5e8] text-[#0a0a0a] transition-all group-hover:translate-x-0.5 group-hover:border-[#0a0a0a]/20">
                            <ChevronRightIcon className="size-3.5 text-[#0a0a0a]" />
                          </span>
                        </div>
                      </Link>
                    ) : (
                      <div className="flex flex-1 flex-col items-center justify-center py-6 text-center sm:py-8">
                        <p className="text-xs font-medium text-[#6a6a6a] sm:text-sm">
                          No upcoming events at the moment.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Active Season Progress Card */}
              <div
                aria-labelledby="active-season-heading"
                className="relative flex h-full flex-col justify-between overflow-hidden rounded-[28px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-5 shadow-xs backdrop-blur-md sm:p-6"
              >
                {/* Decorative background watermark */}
                <TrophyIcon className="pointer-events-none absolute -right-3 -bottom-3 size-24 rotate-12 text-[#ff4d8b]/10" />

                <div className="relative z-10 flex flex-1 flex-col">
                  {/* Header: Title + Action */}
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
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

                    <Link
                      to="/leaderboard"
                      aria-label="View Leaderboard"
                      title="View Leaderboard"
                      className="group flex size-9 items-center justify-center rounded-full border border-[#e5e5e5] bg-[#fffaf0]/80 text-[#6a6a6a] transition-all hover:border-[#0a0a0a]/20 hover:bg-[#fffaf0] hover:text-[#0a0a0a] active:scale-90"
                    >
                      <ChevronRightIcon className="size-4.5 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>

                  {/* Inner Status Card */}
                  <div className="flex min-h-[130px] flex-1 flex-col justify-between rounded-[20px] border border-[#e5e5e5]/80 bg-[#fffaf0]/90 p-4.5 shadow-2xs backdrop-blur-sm sm:min-h-[145px]">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge
                          variant="ochre"
                          size="sm"
                          className="gap-1.5 rounded-full px-2.5 py-0.5 font-semibold"
                        >
                          <SparklesIcon className="size-3 text-[#0a0a0a]" />
                          {activeSeason
                            ? `${activeSeason.days_left} Days Remaining`
                            : "Season Ongoing"}
                        </Badge>
                        <span className="text-xs font-semibold text-[#6a6a6a]">
                          {totalPoints.toLocaleString("en-US")} Season Pts
                        </span>
                      </div>

                      <div className="mt-1">
                        <div className="flex items-center justify-between text-xs font-semibold text-[#0a0a0a]">
                          <span>
                            Target: {activeSeason?.target_attendance ?? 500}{" "}
                            Check-ins
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
                          aria-valuenow={Math.min(
                            100,
                            Math.round(
                              (totalPoints /
                                (activeSeason?.target_attendance ?? 500)) *
                                100
                            )
                          )}
                          className="mt-2 h-2.5 w-full overflow-hidden rounded-full border border-[#e5e5e5] bg-[#f5f0e0]"
                        >
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[#e8b94a] to-[#ff4d8b] transition-all duration-500"
                            style={{
                              width: `${Math.max(
                                5,
                                Math.min(
                                  100,
                                  Math.round(
                                    (totalPoints /
                                      (activeSeason?.target_attendance ??
                                        500)) *
                                      100
                                  )
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <Link
                      to="/leaderboard"
                      className="group mt-3 flex items-center justify-between border-t border-[#e5e5e5]/80 pt-2.5 text-xs font-semibold text-[#1a3a3a] transition-all hover:text-black"
                    >
                      <span>Check Your Rank on Leaderboard</span>
                      <ChevronRightIcon className="size-4 text-[#0a0a0a] transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
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
                          {activity.method}
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
          {/* Sheet Grabber Handle */}
          <div className="mx-auto -mt-1 mb-2 h-1.5 w-12 rounded-full bg-[#e5e5e5]" />

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

          {/* Categorized and filtered items container */}
          <div className="max-h-[65vh] space-y-5 overflow-y-auto pr-1">
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

      {/* ── User Unique QR Code Modal ── */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowQrModal(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="attendance-qr-title"
            className="w-full max-w-sm animate-in rounded-[28px] border border-[#e5e5e5] bg-[#faf5e8] p-6 text-center shadow-2xl zoom-in-95 fade-in"
          >
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-[16px] bg-[#1a3a3a] text-white shadow-xs">
              <QrCodeIcon className="size-6" />
            </div>
            <h3
              id="attendance-qr-title"
              className="text-base font-bold tracking-tight text-[#0a0a0a]"
            >
              Your Attendance QR
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#6a6a6a]">
              Show this QR Code to the Event Organizer at Vihara Tri Maha
              Dharma.
            </p>

            {/* Dynamic QR Code Graphic */}
            <div className="mx-auto my-4 flex size-48 items-center justify-center rounded-[20px] border-2 border-[#1a3a3a]/15 bg-white p-3 shadow-xs">
              <div className="w-full text-center">
                <div className="flex items-center justify-center bg-white p-1">
                  <QRCode
                    value={memberId || "UNKNOWN"}
                    size={130}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox="0 0 256 256"
                  />
                </div>
                <span className="mt-2 block font-mono text-xs font-bold text-[#0a0a0a]">
                  {memberId}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              onClick={() => setShowQrModal(false)}
              className="min-h-[44px] w-full rounded-full text-sm font-semibold active:scale-[0.98]"
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </main>
  )
}
