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
  AwardIcon,
  SearchIcon,
  BellIcon,
  SettingsIcon,
  TicketIcon,
  HeartHandshakeIcon,
  TrophyIcon,
  UsersIcon,
  UserIcon,
  LayoutGridIcon,
  BarChart3Icon,
  ClockIcon,
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

export function HomePage() {
  const { authState } = useAuth()
  const [showQrModal, setShowQrModal] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  const [streakData, setStreakData] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    let isMounted = true
    async function loadDashboardData() {
      // Guard: wait until auth state is resolved to avoid duplicate requests on status transition
      if (authState.status === "loading") return

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

  const role =
    authState.status === "authenticated" ? (authState.role ?? "umat") : "umat"
  const roleLabel =
    role === "admin"
      ? "Admin"
      : role === "pengurus"
        ? "Organizer"
        : role === "aktivis"
          ? "Activist"
          : "Member"
  const displayName = userProfile?.name || authState.name || roleLabel
  const memberId =
    userProfile?.user_number ||
    userProfile?.userNumber ||
    userProfile?.id ||
    (authState.userId ? `SKH-${authState.userId.slice(-4)}` : "SKH-8821")
  const totalPoints = userProfile?.points ?? 0
  const currentStreak = streakData?.current_streak ?? 0

  // Filter for next upcoming event only (exclude past/previous events)
  const upcomingEvents = events
    .filter((e) => {
      if (
        !e ||
        e.status === "cancelled" ||
        e.status === "done" ||
        e.status === "closed"
      ) {
        return false
      }
      const eventTime = new Date(e.event_date).getTime()
      // Exclude past events (allow ongoing events within 3 hours)
      return !isNaN(eventTime) && eventTime >= Date.now() - 3 * 60 * 60 * 1000
    })
    .sort(
      (a, b) =>
        new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
    )

  const nextEvent = upcomingEvents.length > 0 ? upcomingEvents[0] : null

  // State for "See More" (Lainnya) modal and in-modal menu search
  const [showAllMenusModal, setShowAllMenusModal] = useState(false)
  const [menuSearchQuery, setMenuSearchQuery] = useState("")

  const isPengurus = role === "pengurus" || role === "admin"
  const isAktivis = role === "aktivis"
  const canAccessTeams = isAktivis || isPengurus

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
    {
      id: "achievements",
      label: "Achievements",
      icon: AwardIcon,
      bg: "bg-[#b8a4ed]",
      iconColor: "text-[#0a0a0a]",
      href: "/home/achievements",
    },
    ...(canAccessTeams
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
          {
            id: "recency",
            label: "Recency Alerts",
            icon: ClockIcon,
            bg: "bg-[#faf5e8] border border-[#e5e5e5]",
            iconColor: "text-[#0a0a0a]",
            href: "/recency-alerts",
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
        {
          id: "achievements",
          label: "Achievements",
          description:
            "Track your Dhamma badges, spiritual levels, and milestones",
          icon: AwardIcon,
          bg: "bg-[#b8a4ed]",
          iconColor: "text-[#0a0a0a]",
          href: "/home/achievements",
          badge: "Badges",
          keywords:
            "achievements badges milestones level rewards pencapaian lencana tingkat",
        },
        ...(canAccessTeams
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
          href: "/home/profile",
          badge: "Account",
          keywords:
            "profile settings account user preferences security password akun profil",
        },
        {
          id: "notifications",
          label: "Notifications",
          description:
            "Temple announcements, event reminders, and community alerts",
          icon: BellIcon,
          bg: "bg-[#e8b94a]",
          iconColor: "text-[#0a0a0a]",
          href: "/notifications",
          badge: "Alerts",
          keywords:
            "notifications alerts messages announcements reminders notifikasi pemberitahuan",
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
                label: "Community Insights",
                description:
                  "Attendance trends, community demographics, and engagement metrics",
                icon: BarChart3Icon,
                bg: "bg-[#ffb084]",
                iconColor: "text-[#0a0a0a]",
                href: "/insight",
                badge: "Analytics",
                keywords:
                  "insight community analytics reports stats charts data trends analitik grafik data",
              },
              {
                id: "contributions",
                label: "Contributor Insights",
                description:
                  "Review volunteer hours, committee contributions, and seva records",
                icon: HeartHandshakeIcon,
                bg: "bg-[#b8a4ed]",
                iconColor: "text-[#0a0a0a]",
                href: "/pengurus-contribution",
                badge: "Service",
                keywords:
                  "contributions contributor insights volunteers service seva records kontribusi pengurus panitia",
              },
              {
                id: "recency",
                label: "Recency Alerts",
                description:
                  "Monitor member absence recency for pastoral follow-up",
                icon: ClockIcon,
                bg: "bg-[#ff4d8b]",
                iconColor: "text-white",
                href: "/recency-alerts",
                badge: "Care",
                keywords:
                  "recency alerts pastoral follow-up care inactive absence peringatan keaktifan",
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
                id: "badges",
                label: "Master Badges",
                description:
                  "Configure spiritual badges, criteria, and gamification rewards",
                icon: AwardIcon,
                bg: "bg-[#b8a4ed]",
                iconColor: "text-[#0a0a0a]",
                href: "/configure/master/badge",
                badge: "Gamification",
                keywords: "badge master badges lencana gamifikasi",
              },
              {
                id: "levels",
                label: "Member Levels",
                description:
                  "Configure point thresholds, level titles, and progression rules",
                icon: TrophyIcon,
                bg: "bg-[#e8b94a]",
                iconColor: "text-[#0a0a0a]",
                href: "/configure/master/level",
                badge: "Gamification",
                keywords:
                  "level tiers rank progression tingkatan member jenjang",
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
                id: "thresholds",
                label: "Threshold Settings",
                description:
                  "Adjust absence duration triggers for pastoral early warning",
                icon: ClockIcon,
                bg: "bg-[#ff4d8b]",
                iconColor: "text-white",
                href: "/configure/early-warning/threshold",
                badge: "Alerts",
                keywords:
                  "thresholds silent churn early warning batas absensi tidak aktif",
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
        type="button"
        onClick={() => setShowQrModal(true)}
        aria-label="Attendance QR Code"
        className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-[#e5e5e5] bg-[#faf5e8]/90 text-[#0a0a0a] shadow-xs backdrop-blur-md transition-all hover:bg-[#f5f0e0] active:scale-[0.95] active:opacity-75"
        title="Show Attendance QR Code"
      >
        <TicketIcon className="size-5" />
      </button>

      <Link
        to="/notifications"
        aria-label="Notifications"
        className="relative flex size-11 items-center justify-center rounded-full border border-[#e5e5e5] bg-[#faf5e8]/90 text-[#0a0a0a] shadow-xs backdrop-blur-md transition-all hover:bg-[#f5f0e0] active:scale-[0.95] active:opacity-75"
        title="Notifications"
      >
        <BellIcon className="size-5 text-[#0a0a0a]" />
      </Link>
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
                        Namo Buddhaya
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
                      <AwardIcon className="size-5 text-[#0a0a0a]" />
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

              {/* Dhamma Wisdom Widget */}
              <div id="dhamma-wisdom-card" className="flex h-full flex-col">
                <DhammaWidget />
              </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-md">
          <div className="w-full max-w-sm animate-in rounded-[28px] border border-[#e5e5e5] bg-[#faf5e8] p-6 text-center shadow-2xl zoom-in-95 fade-in">
            <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-[16px] bg-[#1a3a3a] text-white shadow-xs">
              <QrCodeIcon className="size-6" />
            </div>
            <h3 className="text-base font-bold tracking-tight text-[#0a0a0a]">
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
