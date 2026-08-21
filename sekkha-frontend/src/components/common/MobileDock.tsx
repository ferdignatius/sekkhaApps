// common/MobileDock
// Floating Apple-style bottom navigation dock for mobile screens (md and below).
// Features a "Menu" button that toggles a full responsive Mobile Navigation Sheet/Drawer.

import { useState, useRef, useEffect } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  LayoutDashboardIcon,
  CalendarDaysIcon,
  UsersIcon,
  TrophyIcon,
  MenuIcon,
  LogOutIcon,
  XIcon,
  SparklesIcon,
  ShieldCheckIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  UserIcon,
  SettingsIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { SettingsSection } from "@/modules/profile/internal/components/SettingsSection"
import { activeModules } from "@/shell/registry"
import { iconMap } from "@/shell/icon-map"

export function MobileDock() {
  const { location } = useRouterState()
  const pathname = location.pathname
  const { logout, authState } = useAuth()

  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [isConfigSectionOpen, setIsConfigSectionOpen] = useState(false)
  const [openConfigureSections, setOpenConfigureSections] = useState<Record<string, boolean>>({})

  const menuRef = useRef<HTMLDivElement>(null)

  const userId = authState.status === "authenticated" ? authState.userId : null
  const role = authState.status === "authenticated" ? authState.role : null
  const isPengurus = role === "pengurus" || role === "admin"

  // ── Build nav items dari Registry ─────────────────────────────────────────
  const pengurusNavItems = activeModules.flatMap((m) => m.pengurusNavItems ?? [])
  const configureSections = activeModules.flatMap((m) => m.configureSections ?? [])

  const roleLabel = role === "admin" ? "Admin Vihara" : role === "pengurus" ? "Pengurus" : role === "aktivis" ? "Aktivis" : "Umat"
  const userName = authState.status === "authenticated" && authState.name ? authState.name : roleLabel
  const userInitials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || roleLabel.slice(0, 2)

  const toggleConfigureSection = (sectionLabel: string) => {
    setOpenConfigureSections((prev) => {
      const current = prev[sectionLabel] ?? false
      return { ...prev, [sectionLabel]: !current }
    })
  }

  const isSectionOpen = (sectionLabel: string) => {
    if (openConfigureSections[sectionLabel] !== undefined) {
      return openConfigureSections[sectionLabel]
    }
    return false
  }

  // Close menu when clicking backdrop
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMoreMenu])

  return (
    <div ref={menuRef} className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-md md:hidden font-sans">
      
      {/* ── Full Mobile Navigation Drawer Sheet (Pop-up above dock) ── */}
      {showMoreMenu && (
        <>
          {/* Dark Blur Backdrop Overlay */}
          <div
            className="fixed inset-0 z-[115] bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in-0"
            onClick={() => setShowMoreMenu(false)}
          />

          <div className="fixed inset-x-0 bottom-0 z-[120] max-h-[88vh] flex flex-col rounded-t-[28px] bg-white border-t border-sekkha-hairline shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            
            {/* Sticky Drag Handle Header with Blur */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-sekkha-hairline-soft shrink-0 rounded-t-[28px]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sekkha-brand-blue text-white">
                  <SparklesIcon className="size-4 text-amber-300" />
                </div>
                <span className="text-caption-bold font-extrabold text-sekkha-ink">Menu Navigation Sekkha</span>
              </div>
            <button
              type="button"
              onClick={() => setShowMoreMenu(false)}
              className="rounded-xl p-1.5 text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink transition-colors cursor-pointer"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          {/* Scrollable Navigation Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            
            {/* User Profile Card */}
            {userId && (
              <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/80 p-3 shadow-2xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sekkha-brand-blue text-caption-bold text-white font-extrabold shadow-xs uppercase">
                      {userInitials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-caption-bold font-extrabold text-sekkha-ink">{userName}</p>
                      <p className="truncate text-micro text-sekkha-brand-blue font-semibold">{roleLabel}</p>
                    </div>
                  </div>

                  <span className="inline-flex items-center gap-1 rounded-lg bg-sekkha-brand-blue/10 px-2.5 py-1 text-micro-bold text-sekkha-brand-blue shrink-0 ml-2">
                    <ShieldCheckIcon className="size-3" />
                    <span>{roleLabel}</span>
                  </span>
                </div>

                {/* Profile Actions */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-sekkha-hairline-soft/80">
                  <Link
                    to="/home/profile"
                    onClick={() => setShowMoreMenu(false)}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-sekkha-hairline bg-white py-2 text-micro-bold text-sekkha-ink hover:bg-sekkha-surface transition-colors shadow-2xs"
                  >
                    <UserIcon className="size-3.5 text-sekkha-brand-blue" />
                    <span>Lihat Profil</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false)
                      setSettingsOpen(true)
                    }}
                    className="flex items-center justify-center gap-1.5 rounded-xl border border-sekkha-hairline bg-white py-2 text-micro-bold text-sekkha-ink hover:bg-sekkha-surface transition-colors shadow-2xs cursor-pointer"
                  >
                    <SettingsIcon className="size-3.5 text-sekkha-slate" />
                    <span>Pengaturan</span>
                  </button>
                </div>
              </div>
            )}

            {/* 1. Pengurus Nav Items */}
            {isPengurus && pengurusNavItems.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-purple-700/80 px-1 mb-1.5">
                  Pengurus & Admin
                </p>
                <div className="space-y-1">
                  {pengurusNavItems.map(({ label, to, icon }) => {
                    const Icon = iconMap[icon]
                    const isActive = pathname.startsWith(to)
                    return (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setShowMoreMenu(false)}
                        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-caption font-semibold transition-all border ${
                          isActive
                            ? "bg-purple-100/80 border-purple-200 text-purple-900 font-extrabold shadow-2xs"
                            : "bg-purple-50/40 border-purple-100 text-sekkha-ink hover:bg-purple-50"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {Icon && <Icon className="size-4 shrink-0 text-purple-700" />}
                          <span className="truncate">{label}</span>
                        </div>
                        <ChevronRightIcon className="size-4 text-purple-400 shrink-0" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

            {/* 2. Configure Sections (Expandable / Collapsible) */}
            {isPengurus && configureSections.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-sekkha-hairline-soft">
                {/* Main Header Accordion Toggle */}
                <button
                  type="button"
                  onClick={() => setIsConfigSectionOpen(!isConfigSectionOpen)}
                  className="flex w-full items-center justify-between px-1 py-1 cursor-pointer group rounded-lg hover:bg-sekkha-surface/60 transition-colors"
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-sekkha-slate/70">
                    Konfigurasi Sistem
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-sekkha-slate font-medium">
                      {isConfigSectionOpen ? "Tutup" : "Buka"}
                    </span>
                    <ChevronDownIcon className={`size-3.5 text-sekkha-slate transition-transform duration-200 ${isConfigSectionOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {/* Main Section Content */}
                {isConfigSectionOpen && (
                  <div className="space-y-2 animate-in fade-in-0 duration-150">
                    {configureSections.map((section) => {
                      const hasActiveChild = section.items.some((item) => pathname.startsWith(item.to))
                      const isOpen = isSectionOpen(section.label)

                      return (
                        <div key={section.label} className="rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/40 overflow-hidden shadow-2xs">
                          {/* Sub-Section Card Accordion Trigger */}
                          <button
                            type="button"
                            onClick={() => toggleConfigureSection(section.label)}
                            className="flex w-full items-center justify-between p-3 bg-white hover:bg-sekkha-surface/80 transition-colors cursor-pointer text-left border-b border-sekkha-hairline-soft/60"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sekkha-brand-blue/10 text-sekkha-brand-blue shrink-0">
                                <SparklesIcon className="size-3.5" />
                              </div>
                              <span className="text-caption-bold font-extrabold text-sekkha-ink truncate">{section.label}</span>
                              {hasActiveChild && (
                                <span className="rounded-full bg-sekkha-brand-blue/10 px-2 py-0.5 text-[9px] font-extrabold text-sekkha-brand-blue shrink-0">
                                  Aktif
                                </span>
                              )}
                            </div>
                            <ChevronDownIcon className={`size-4 text-sekkha-slate transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                          </button>

                          {/* Sub-Section Items Grid */}
                          {isOpen && (
                            <div className="p-2 space-y-1 bg-sekkha-canvas/30 animate-in fade-in-0 duration-150">
                              {section.items.map((item) => {
                                const SubIcon = iconMap[item.icon]
                                const isSubActive = pathname.startsWith(item.to)
                                return (
                                  <Link
                                    key={item.to}
                                    to={item.to as "/"}
                                    onClick={() => setShowMoreMenu(false)}
                                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-caption font-semibold transition-all border ${
                                      isSubActive
                                        ? "bg-sekkha-brand-blue text-white border-sekkha-brand-blue font-extrabold shadow-xs"
                                        : "bg-white border-sekkha-hairline text-sekkha-ink hover:bg-sekkha-surface"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      {SubIcon && <SubIcon className={`size-4 shrink-0 ${isSubActive ? "text-white" : "text-sekkha-slate"}`} />}
                                      <span className="truncate">{item.label}</span>
                                    </div>
                                    <ChevronRightIcon className={`size-4 shrink-0 ${isSubActive ? "text-white/80" : "text-sekkha-slate/40"}`} />
                                  </Link>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. Action Logout Button */}
            <div className="pt-2 border-t border-sekkha-hairline-soft">
              <button
                type="button"
                onClick={() => {
                  setShowMoreMenu(false)
                  logout()
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50/80 py-2.5 text-caption-bold text-rose-700 hover:bg-rose-100 transition-all cursor-pointer font-extrabold"
              >
                <LogOutIcon className="size-4 text-rose-600" />
                <span>Keluar Akun</span>
              </button>
            </div>

          </div>

        </div>
      </>
      )}

      {/* ── Apple-Style Floating Bottom Dock Bar ── */}
      <nav
        aria-label="Navigasi utama"
        className="flex items-center justify-around rounded-2xl border border-white/80 bg-sekkha-canvas/85 backdrop-blur-xl p-1.5 shadow-2xl ring-1 ring-black/5"
      >
        {/* 1. Beranda */}
        <Link
          to="/home"
          onClick={() => setShowMoreMenu(false)}
          aria-current={pathname === "/home" || pathname === "/home/" ? "page" : undefined}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-micro transition-all ${
            pathname === "/home" || pathname === "/home/"
              ? "bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-bold"
              : "text-sekkha-slate hover:text-sekkha-ink"
          }`}
        >
          <LayoutDashboardIcon className={`size-5 transition-transform ${pathname === "/home" ? "scale-110 text-sekkha-brand-blue" : ""}`} />
          <span className="text-[10px] font-bold">Beranda</span>
        </Link>

        {/* 2. Events */}
        <Link
          to="/events"
          onClick={() => setShowMoreMenu(false)}
          aria-current={pathname.startsWith("/events") ? "page" : undefined}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-micro transition-all ${
            pathname.startsWith("/events")
              ? "bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-bold"
              : "text-sekkha-slate hover:text-sekkha-ink"
          }`}
        >
          <CalendarDaysIcon className={`size-5 transition-transform ${pathname.startsWith("/events") ? "scale-110 text-sekkha-brand-blue" : ""}`} />
          <span className="text-[10px] font-bold">Events</span>
        </Link>

        {/* 3. Tim */}
        <Link
          to="/teams"
          onClick={() => setShowMoreMenu(false)}
          aria-current={pathname.startsWith("/teams") ? "page" : undefined}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-micro transition-all ${
            pathname.startsWith("/teams")
              ? "bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-bold"
              : "text-sekkha-slate hover:text-sekkha-ink"
          }`}
        >
          <UsersIcon className={`size-5 transition-transform ${pathname.startsWith("/teams") ? "scale-110 text-sekkha-brand-blue" : ""}`} />
          <span className="text-[10px] font-bold">People</span>
        </Link>

        {/* 4. Top (Leaderboard) */}
        <Link
          to="/leaderboard"
          onClick={() => setShowMoreMenu(false)}
          aria-current={pathname.startsWith("/leaderboard") ? "page" : undefined}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-micro transition-all ${
            pathname.startsWith("/leaderboard")
              ? "bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-bold"
              : "text-sekkha-slate hover:text-sekkha-ink"
          }`}
        >
          <TrophyIcon className={`size-5 transition-transform ${pathname.startsWith("/leaderboard") ? "scale-110 text-sekkha-brand-blue" : ""}`} />
          <span className="text-[10px] font-bold">Top</span>
        </Link>

        {/* 5. Menu Drawer Trigger (☰) */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          aria-expanded={showMoreMenu}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-2.5 py-1.5 text-micro transition-all cursor-pointer ${
            showMoreMenu
              ? "bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-bold"
              : "text-sekkha-slate hover:text-sekkha-ink"
          }`}
        >
          <MenuIcon className={`size-5 transition-transform ${showMoreMenu ? "scale-110 text-sekkha-brand-blue" : ""}`} />
          <span className="text-[10px] font-bold">Menu</span>
        </button>
      </nav>

      {/* Global Settings Modal for Mobile */}
      <ResponsiveFormModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Pengaturan & Target"
      >
        <SettingsSection onLogout={logout} />
      </ResponsiveFormModal>

    </div>
  )
}

