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
  UserCheckIcon,
  SearchIcon,
  BellIcon,
  SettingsIcon,
  TicketIcon,
  NewspaperIcon,
  GraduationCapIcon,
  HeartHandshakeIcon,
  SparklesIcon,
  TrophyIcon,
  SlidersHorizontalIcon,
} from "lucide-react"
import { api } from "@/lib/api"
import { DhammaWidget } from "./DhammaWidget"
import { Link } from "@tanstack/react-router"

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
  const [searchQuery, setSearchQuery] = useState("")
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

  const role = authState.status === "authenticated" ? (authState.role ?? "umat") : "umat"
  const roleLabel = role === "admin" ? "Admin" : role === "pengurus" ? "Organizer" : role === "aktivis" ? "Activist" : "Member"
  const displayName = userProfile?.name || authState.name || roleLabel
  const memberId = userProfile?.user_number || userProfile?.userNumber || userProfile?.id || (authState.userId ? `SKH-${authState.userId.slice(-4)}` : "SKH-8821")
  const totalPoints = userProfile?.points ?? 0
  const currentStreak = streakData?.current_streak ?? 0
  const activeEvent = events.length > 0 ? events[0] : null

  // 8 Quick Access Items in Clay 6-Color Palette (pink, teal, lavender, peach, ochre, cream)
  const quickAccessItems = [
    {
      id: "newsfeed",
      label: "Newsfeed",
      icon: NewspaperIcon,
      bg: "bg-[#ff4d8b]",
      iconColor: "text-white",
      href: "/home",
      badge: "News",
    },
    {
      id: "events",
      label: "Events",
      icon: CalendarIcon,
      bg: "bg-[#e8b94a]",
      iconColor: "text-[#0a0a0a]",
      href: "/events",
      badge: "Schedule",
    },
    {
      id: "classes",
      label: "Classes",
      icon: GraduationCapIcon,
      bg: "bg-[#b8a4ed]",
      iconColor: "text-[#0a0a0a]",
      href: "/home/achievements",
      badge: "Dhamma",
    },
    {
      id: "community",
      label: "Community",
      icon: HeartHandshakeIcon,
      bg: "bg-[#ffb084]",
      iconColor: "text-[#0a0a0a]",
      href: "/teams",
      badge: "Fellowship",
    },
    {
      id: "chanting",
      label: "Paritta & Puja",
      icon: SparklesIcon,
      bg: "bg-[#1a3a3a]",
      iconColor: "text-white",
      href: "/events",
      badge: "Chanting",
    },
    {
      id: "leaderboard",
      label: "Leaderboard",
      icon: TrophyIcon,
      bg: "bg-[#e8b94a]",
      iconColor: "text-[#0a0a0a]",
      href: "/leaderboard",
      badge: "Points",
    },
    {
      id: "checkin",
      label: "My QR Code",
      icon: QrCodeIcon,
      bg: "bg-[#0a0a0a]",
      iconColor: "text-white",
      onClick: () => setShowQrModal(true),
      badge: "Attendance",
    },
    {
      id: "settings",
      label: "Settings",
      icon: SlidersHorizontalIcon,
      bg: "bg-[#f5f0e0]",
      iconColor: "text-[#0a0a0a]",
      href: "/home/profile",
      badge: "Profile",
    },
  ]

  const filteredQuickAccess = quickAccessItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.badge.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const topBarActions = (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => setShowQrModal(true)}
        aria-label="Attendance QR Code"
        className="flex size-9 sm:size-10 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white hover:bg-[#1f1f1f] transition-all shadow-xs cursor-pointer active:scale-95"
        title="Show Attendance QR Code"
      >
        <TicketIcon className="size-4.5" />
      </button>

      <Link
        to="/notifications"
        aria-label="Notifications"
        className="flex size-9 sm:size-10 items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8] hover:border-[#9a9a9a] transition-all shadow-2xs relative active:scale-95"
        title="Notifications"
      >
        <BellIcon className="size-4.5 text-[#0a0a0a]" />
      </Link>

      <Link
        to="/home/profile"
        aria-label="Profile Settings"
        className="flex size-9 sm:size-10 items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8] hover:border-[#9a9a9a] transition-all shadow-2xs relative active:scale-95"
        title="Settings"
      >
        <SettingsIcon className="size-4.5 text-[#0a0a0a]" />
      </Link>
    </div>
  )

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-28 md:pb-12 font-sans text-left">
      <PageBreadcrumb items={[{ label: "Home" }]} actions={topBarActions} />

      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">

          {/* ── 1. Profile Header Card (Clay Warm Canvas Style) ── */}
          <div className="relative overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-4 sm:p-6 shadow-xs transition-all">
            {/* Playful Subtle Decorative Glows */}
            <div className="absolute -top-10 -right-10 size-40 rounded-full bg-[#ffb084]/20 blur-2xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 size-40 rounded-full bg-[#1a3a3a]/10 blur-2xl pointer-events-none" />

            {/* Content Wrapper */}
            <div className="relative z-10 flex flex-col items-center text-center sm:flex-row sm:items-center sm:justify-between sm:text-left gap-4">
              
              {/* Profile Info Section */}
              <div className="flex flex-col items-center sm:flex-row sm:items-center gap-3.5 sm:gap-4 min-w-0 w-full sm:w-auto">
                {/* Profile Picture */}
                <div className="flex flex-col items-center shrink-0">
                  <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-[16px] bg-[#e8b94a] text-xl font-black text-[#0a0a0a] ring-4 ring-white shadow-xs">
                    {displayName.split(" ").slice(0, 2).map((w: string) => w[0]).join("")}
                  </div>
                </div>

                {/* Text Info: Name -> Role & Member ID */}
                <div className="min-w-0 flex-1 flex flex-col items-center sm:items-start text-center sm:text-left w-full">
                  <h1 className="text-base sm:text-xl md:text-2xl font-bold text-[#0a0a0a] tracking-tight break-words leading-snug max-w-full">
                    Namo Buddhaya, {displayName}! 👋
                  </h1>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap justify-center sm:justify-start">
                    <span className="rounded-full bg-[#1a3a3a]/10 border border-[#1a3a3a]/20 px-2.5 py-0.5 text-xs font-semibold text-[#1a3a3a] capitalize">
                      {roleLabel}
                    </span>
                    <span className="text-xs text-[#6a6a6a] font-mono">
                      ID: {memberId}
                    </span>
                  </div>
                </div>

              </div>

              {/* Stats (Streak & Points) & QR Code Trigger */}
              <div className="flex flex-col sm:flex-row items-center w-full lg:w-auto gap-2.5 border-t border-[#e5e5e5] pt-3 lg:border-t-0 lg:pt-0">
                
                {/* Stats pills: Streak & Points */}
                <div className="flex items-center justify-center gap-2 w-full sm:w-auto shrink-0">
                  <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-[12px] bg-[#ffb084]/25 border border-[#ffb084]/50 px-3.5 py-2 shadow-2xs">
                    <FlameIcon className="size-4 text-[#ff4d8b] shrink-0" />
                    <div className="text-left">
                      <p className="text-[10px] text-[#0a0a0a] uppercase font-bold leading-none">Streak</p>
                      <p className="text-xs font-black text-[#0a0a0a] leading-tight mt-0.5">{currentStreak}x Active</p>
                    </div>
                  </div>

                  <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2 rounded-[12px] bg-[#e8b94a]/25 border border-[#e8b94a]/50 px-3.5 py-2 shadow-2xs">
                    <AwardIcon className="size-4 text-[#0a0a0a] shrink-0" />
                    <div className="text-left">
                      <p className="text-[10px] text-[#0a0a0a] uppercase font-bold leading-none">Points</p>
                      <p className="text-xs font-black text-[#0a0a0a] leading-tight mt-0.5">{totalPoints.toLocaleString("en-US")} Pts</p>
                    </div>
                  </div>
                </div>

                {/* Show QR Button */}
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] py-2 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all active:scale-[0.99] shrink-0 cursor-pointer"
                >
                  <QrCodeIcon className="size-4" />
                  <span>QR Code</span>
                </button>

              </div>

            </div>
          </div>

          {/* ── 2. Search Bar (Clay Rounded Hairline Style) ── */}
          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-[#6a6a6a]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Find events, classes & other features..."
              className="w-full rounded-[14px] border border-[#e5e5e5] bg-white py-3.5 pl-11 pr-4 text-xs sm:text-sm text-[#0a0a0a] shadow-xs placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:outline-none focus:ring-1 focus:ring-[#0a0a0a] transition-all"
            />
          </div>

          {/* ── 3. Quick Access Feature Grid (8 Direct Access Items in Clay 6-Color Palette) ── */}
          <div className="rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-4 sm:p-6 shadow-xs">
            <div className="grid grid-cols-4 gap-y-4 gap-x-2 sm:gap-6">
              {filteredQuickAccess.map((item) => {
                const Icon = item.icon
                const content = (
                  <div className="flex flex-col items-center text-center group cursor-pointer">
                    {/* Saturated Clay Icon Badge */}
                    <div className={`flex size-12 sm:size-14 items-center justify-center rounded-[18px] ${item.bg} ${item.iconColor} shadow-xs transition-transform duration-150 group-hover:scale-105 group-active:scale-95`}>
                      <Icon className="size-6" />
                    </div>
                    {/* Label */}
                    <span className="mt-2 text-[11px] sm:text-xs font-semibold text-[#0a0a0a] leading-tight line-clamp-1">
                      {item.label}
                    </span>
                  </div>
                )

                if (item.onClick) {
                  return (
                    <button key={item.id} type="button" onClick={item.onClick} className="w-full">
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

          {/* ── 4. Community Agenda & Dhamma Wisdom Grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">

            {/* ── Event Active & Status Card ── */}
            <div className="relative overflow-hidden rounded-[20px] sm:rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-5 shadow-xs transition-all flex flex-col justify-between">
              
              <div>
                {/* Header */}
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#0a0a0a] text-white shadow-xs">
                      <CalendarIcon className="size-4 text-[#e8b94a]" />
                    </span>
                    <h2 className="text-sm font-bold text-[#0a0a0a]">Community Events & Attendance</h2>
                  </div>
                  <Link to="/events" className="flex items-center gap-1 text-xs text-[#0a0a0a] hover:underline font-bold">
                    <span>Full Schedule</span> <ArrowRightIcon className="size-3" />
                  </Link>
                </div>

                {/* Event Status Card */}
                <div className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 sm:p-4 space-y-3">
                  
                  {activeEvent ? (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#e5e5e5] pb-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shrink-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Active Event
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-bold text-[#0a0a0a] mt-1.5">
                          {activeEvent.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#6a6a6a]">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="size-3.5 text-[#1a3a3a]" />
                            {formatEventDate(activeEvent.event_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPinIcon className="size-3.5 text-rose-600" />
                            {activeEvent.location}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-center space-y-2">
                      <p className="text-xs font-medium text-[#6a6a6a]">No active events at the moment.</p>
                      <Link to="/events" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0a0a0a] hover:underline">
                        <span>View Schedule</span> <ArrowRightIcon className="size-3" />
                      </Link>
                    </div>
                  )}

                  {/* Informative Workflow Banner for Check-In */}
                  <div className="flex items-start gap-2.5 rounded-[12px] bg-[#fffaf0] p-3 border border-[#e5e5e5]">
                    <UserCheckIcon className="size-4 text-[#1a3a3a] shrink-0 mt-0.5" />
                    <p className="text-xs text-[#6a6a6a] leading-relaxed">
                      <strong className="text-[#0a0a0a]">Organizer Check-In:</strong> Present your QR code to the event coordinator during onsite registration.
                    </p>
                  </div>

                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#e5e5e5] flex items-center justify-between text-xs">
                <span className="text-[#6a6a6a]">Member ID: <strong className="text-[#0a0a0a] font-mono">{memberId}</strong></span>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="text-xs font-bold text-[#0a0a0a] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <QrCodeIcon className="size-3.5" /> Show QR
                </button>
              </div>
            </div>

            {/* ── Daily Wisdom / Dhamma Reflection ── */}
            <DhammaWidget />

          </div>

        </div>
      </div>

      {/* ── User Unique QR Code Modal ── */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-[24px] bg-[#fffaf0] p-5 sm:p-6 text-center shadow-2xl border border-[#e5e5e5] animate-in fade-in zoom-in-95">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#1a3a3a] text-white mb-3 shadow-xs">
              <QrCodeIcon className="size-6" />
            </div>
            <h3 className="text-base font-bold text-[#0a0a0a]">Your Attendance QR</h3>
            <p className="text-xs text-[#6a6a6a] mt-1 leading-relaxed">
              Show this QR Code to the Event Organizer at Vihara Tri Maha Dharma.
            </p>

            {/* Dynamic QR Code Graphic */}
            <div className="my-4 mx-auto flex h-48 w-48 items-center justify-center rounded-[20px] bg-white border-2 border-[#1a3a3a]/20 p-3 shadow-xs">
              <div className="text-center w-full">
                <div className="flex items-center justify-center p-1 bg-white">
                  <QRCode
                    value={memberId || "UNKNOWN"}
                    size={130}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox="0 0 256 256"
                  />
                </div>
                <span className="text-xs font-mono text-[#0a0a0a] font-bold mt-2 block">
                  {memberId}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full rounded-[12px] bg-[#0a0a0a] py-2.5 text-xs font-bold text-white hover:bg-[#1f1f1f] transition-all cursor-pointer shadow-xs"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </main>
  )
}


