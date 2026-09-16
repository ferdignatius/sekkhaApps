// feature/dashboard/components/DashboardPage
// 100% Clay Design System compliance (DESIGN.md): Warm canvas (#fffaf0), surface (#faf5e8 / #f5f0e0),
// hairline borders (#e5e5e5), 6-color palette (pink, teal, lavender, peach, ochre, cream),
// and generous 24px border radii.

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
  ArrowRightIcon,
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
} from "lucide-react"
import { api } from "@/lib/api"
import { DhammaWidget } from "./DhammaWidget"
import { Link } from "@tanstack/react-router"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function DashboardPage() {
  const { authState } = useAuth()
  const [showQrModal, setShowQrModal] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)

  const [streakData, setStreakData] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])

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
            href: "/teams",
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
                href: "/teams",
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
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => setShowQrModal(true)}
        aria-label="Attendance QR Code"
        className="flex size-9 cursor-pointer items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shadow-xs transition-all hover:bg-[#1f1f1f] active:scale-95 sm:size-10"
        title="Show Attendance QR Code"
      >
        <TicketIcon className="size-4.5" />
      </button>

      <Link
        to="/notifications"
        aria-label="Notifications"
        className="relative flex size-9 items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-2xs transition-all hover:border-[#9a9a9a] hover:bg-[#faf5e8] active:scale-95 sm:size-10"
        title="Notifications"
      >
        <BellIcon className="size-4.5 text-[#0a0a0a]" />
      </Link>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-28 text-left font-sans md:pb-12">
      <PageBreadcrumb items={[{ label: "Home" }]} actions={topBarActions} />

      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
          {/* ── 1. Profile Header Card (Clay Warm Canvas Style) ── */}
          <div className="relative overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 shadow-xs transition-all sm:rounded-[24px] sm:p-5 lg:p-6">
            {/* Playful Subtle Decorative Glows */}
            <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-[#ffb084]/20 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 size-40 rounded-full bg-[#1a3a3a]/10 blur-2xl" />

            {/* Content Wrapper */}
            <div className="relative z-10 flex flex-col gap-3 sm:gap-4">
              {/* Top Row: Profile Info (Left) + Quick QR Button (Right) */}
              <div className="flex min-w-0 items-center justify-between gap-3">
                {/* Profile Picture + Name Info */}
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  {/* Profile Picture */}
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-[#e8b94a] text-base font-black text-[#0a0a0a] shadow-xs ring-2 ring-white sm:size-14 sm:rounded-[16px] sm:text-xl sm:ring-4 md:size-16">
                    {displayName
                      .split(" ")
                      .slice(0, 2)
                      .map((w: string) => w[0])
                      .join("")}
                  </div>

                  {/* Text Info: Namo Buddhaya -> Name (Truncated with ...) -> Role & Member ID */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs leading-none font-medium text-[#6a6a6a] sm:text-sm">
                      Namo Buddhaya
                    </p>
                    <h1
                      className="mt-1 truncate text-base leading-tight font-bold tracking-tight text-[#0a0a0a] sm:text-xl md:text-2xl"
                      title={displayName}
                    >
                      {displayName}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="shrink-0 rounded-full border border-[#1a3a3a]/20 bg-[#1a3a3a]/10 px-2 py-0.5 text-[11px] font-semibold text-[#1a3a3a] capitalize sm:text-xs">
                        {roleLabel}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-[#6a6a6a] sm:text-xs">
                        ID: {memberId}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick QR Action (Option B) */}
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-2.5 py-1.5 text-white shadow-xs transition-all hover:bg-[#1f1f1f] active:scale-95 sm:gap-2 sm:px-3.5 sm:py-2"
                  title="Attendance QR Code"
                  aria-label="Attendance QR Code"
                >
                  <QrCodeIcon className="size-4 shrink-0 text-white sm:size-4.5" />
                  <span className="text-xs font-bold whitespace-nowrap sm:text-sm">
                    QR Code
                  </span>
                </button>
              </div>

              {/* Bottom Row: Stats (Streak & Points) */}
              <div className="grid grid-cols-2 gap-2 border-t border-[#e5e5e5]/80 pt-2.5 sm:gap-3 sm:pt-3">
                <div className="flex items-center gap-2 rounded-[12px] border border-[#ffb084]/50 bg-[#ffb084]/25 px-3 py-1.5 shadow-2xs sm:gap-2.5 sm:px-4 sm:py-2.5">
                  <FlameIcon className="size-4 shrink-0 text-[#ff4d8b] sm:size-4.5" />
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] leading-none font-bold text-[#6a6a6a] uppercase sm:text-[11px]">
                      Streak
                    </p>
                    <p className="mt-0.5 truncate text-xs leading-tight font-black whitespace-nowrap text-[#0a0a0a] sm:text-sm">
                      {currentStreak}x Active
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-[12px] border border-[#e8b94a]/50 bg-[#e8b94a]/25 px-3 py-1.5 shadow-2xs sm:gap-2.5 sm:px-4 sm:py-2.5">
                  <AwardIcon className="size-4 shrink-0 text-[#0a0a0a] sm:size-4.5" />
                  <div className="min-w-0 text-left">
                    <p className="text-[10px] leading-none font-bold text-[#6a6a6a] uppercase sm:text-[11px]">
                      Points
                    </p>
                    <p className="mt-0.5 truncate text-xs leading-tight font-black whitespace-nowrap text-[#0a0a0a] sm:text-sm">
                      {totalPoints.toLocaleString("en-US")} Pts
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. Quick Access Feature Grid ── */}
          <div className="rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-xs sm:p-6">
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
                    {/* Saturated Clay Icon Badge */}
                    <div
                      className={`flex size-12 items-center justify-center rounded-[18px] sm:size-14 ${item.bg} ${item.iconColor} shadow-xs transition-transform duration-150 group-hover:scale-105 group-active:scale-95`}
                    >
                      <Icon className="size-6" />
                    </div>
                    {/* Label */}
                    <span className="mt-2 line-clamp-2 flex min-h-[2.4em] items-center justify-center text-center text-[11px] leading-tight font-semibold text-[#0a0a0a] sm:text-xs">
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

          {/* ── 3. Community Agenda & Dhamma Wisdom Grid ── */}
          <div className="grid grid-cols-1 items-stretch gap-4 sm:gap-6 md:grid-cols-2">
            {/* ── Upcoming Event Card ── */}
            <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs transition-all sm:rounded-[24px] sm:p-5">
              <div className="flex flex-1 flex-col">
                {/* Header */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#0a0a0a] text-white shadow-xs">
                      <CalendarIcon className="size-4 text-[#e8b94a]" />
                    </span>
                    <h2 className="text-sm font-bold text-[#0a0a0a]">
                      Upcoming Event
                    </h2>
                  </div>
                  <Link
                    to="/events"
                    className="flex items-center gap-1 text-xs font-bold text-[#0a0a0a] hover:underline"
                  >
                    <span>Full Schedule</span>{" "}
                    <ArrowRightIcon className="size-3" />
                  </Link>
                </div>

                {/* Event Status Card */}
                <div className="flex min-h-[120px] flex-1 flex-col justify-center rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 sm:min-h-[140px] sm:p-4">
                  {nextEvent ? (
                    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-emerald-500" />{" "}
                            Next Event
                          </span>
                        </div>
                        <h3 className="mt-1.5 text-base font-bold text-[#0a0a0a] sm:text-lg">
                          {nextEvent.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#6a6a6a]">
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
                    </div>
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

            {/* ── Daily Wisdom / Dhamma Reflection ── */}
            <div id="dhamma-wisdom-card" className="flex h-full flex-col">
              <DhammaWidget />
            </div>
          </div>
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
        <div className="space-y-4 pt-1 font-sans">
          {/* Search bar inside modal / drawer */}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6a6a6a]" />
            <input
              type="text"
              value={menuSearchQuery}
              onChange={(e) => setMenuSearchQuery(e.target.value)}
              placeholder="Cari menu atau fitur..."
              aria-label="Search menus and features"
              autoFocus
              className="w-full rounded-[14px] border border-[#e5e5e5] bg-[#fffaf0] py-2.5 pr-9 pl-10 text-xs text-[#0a0a0a] shadow-2xs transition-all placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:bg-white focus:ring-1 focus:ring-[#0a0a0a] focus:outline-none sm:text-sm"
            />
            {menuSearchQuery && (
              <button
                type="button"
                onClick={() => setMenuSearchQuery("")}
                className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer p-1 text-[#6a6a6a] hover:text-[#0a0a0a]"
                aria-label="Clear search"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>

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
                            <span className="block truncate text-xs font-bold text-[#0a0a0a] group-hover:text-black sm:text-sm">
                              {item.label}
                            </span>
                          </div>
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
                            className="group flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] px-3 py-2.5 text-left transition-all hover:border-[#0a0a0a]/20 hover:bg-[#f5f0e0]"
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
                          className="group flex cursor-pointer items-center gap-3 rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] px-3 py-2.5 text-left transition-all hover:border-[#0a0a0a]/20 hover:bg-[#f5f0e0]"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm animate-in rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 text-center shadow-2xl zoom-in-95 fade-in sm:p-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#1a3a3a] text-white shadow-xs">
              <QrCodeIcon className="size-6" />
            </div>
            <h3 className="text-base font-bold text-[#0a0a0a]">
              Your Attendance QR
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-[#6a6a6a]">
              Show this QR Code to the Event Organizer at Vihara Tri Maha
              Dharma.
            </p>

            {/* Dynamic QR Code Graphic */}
            <div className="mx-auto my-4 flex h-48 w-48 items-center justify-center rounded-[20px] border-2 border-[#1a3a3a]/20 bg-white p-3 shadow-xs">
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

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full cursor-pointer rounded-[12px] bg-[#0a0a0a] py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f]"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
