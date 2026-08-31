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

  // ── Build nav items from Registry ─────────────────────────────────────────
  const pengurusNavItems = activeModules.flatMap((m) => m.pengurusNavItems ?? [])
  const configureSections = activeModules.flatMap((m) => m.configureSections ?? [])

  const roleLabel = role === "admin" ? "Admin" : role === "pengurus" ? "Organizer" : role === "aktivis" ? "Activist" : "Member"
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
            className="fixed inset-0 z-[115] bg-[#0a0a0a]/40 backdrop-blur-sm transition-opacity animate-in fade-in-0"
            onClick={() => setShowMoreMenu(false)}
          />

          <div className="fixed inset-x-0 bottom-0 z-[120] max-h-[88vh] flex flex-col rounded-t-[24px] bg-[#fffaf0] border-t border-[#e5e5e5] shadow-2xl animate-in slide-in-from-bottom-full duration-200">
            
            {/* Sticky Drag Handle Header with Blur */}
            <div className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-[#fffaf0]/95 backdrop-blur-md border-b border-[#e5e5e5] shrink-0 rounded-t-[24px]">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#0a0a0a] text-white">
                  <SparklesIcon className="size-4 text-[#e8b94a]" />
                </div>
                <span className="text-sm font-bold text-[#0a0a0a]">Sekkha Menu</span>
              </div>
              <button
                type="button"
                onClick={() => setShowMoreMenu(false)}
                className="rounded-[8px] p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a] transition-colors cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Scrollable Navigation Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              
              {/* User Profile Card */}
              {userId && (
                <div className="rounded-[16px] border border-[#e5e5e5] bg-[#f5f0e0] p-3 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-sm text-white font-bold shadow-xs uppercase">
                        {userInitials}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="truncate text-sm font-bold text-[#0a0a0a]">{userName}</p>
                        <p className="truncate text-xs text-[#6a6a6a] font-medium">{roleLabel}</p>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 rounded-full bg-[#1a3a3a]/10 px-2.5 py-1 text-xs font-semibold text-[#1a3a3a] shrink-0 ml-2">
                      <ShieldCheckIcon className="size-3" />
                      <span>{roleLabel}</span>
                    </span>
                  </div>

                  {/* Profile Actions */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#e5e5e5]">
                    <Link
                      to="/home/profile"
                      onClick={() => setShowMoreMenu(false)}
                      className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] py-2 text-xs font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors shadow-2xs"
                    >
                      <UserIcon className="size-3.5 text-[#0a0a0a]" />
                      <span>View Profile</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false)
                        setSettingsOpen(true)
                      }}
                      className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] py-2 text-xs font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors shadow-2xs cursor-pointer"
                    >
                      <SettingsIcon className="size-3.5 text-[#6a6a6a]" />
                      <span>Settings</span>
                    </button>
                  </div>
                </div>
              )}

              {/* 1. Pengurus Nav Items */}
              {isPengurus && pengurusNavItems.length > 0 && (
                <div className="space-y-1 text-left">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a] px-1 mb-1.5">
                    Admin & Organizer
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
                          className={`flex items-center justify-between rounded-[12px] px-3 py-2.5 text-xs font-semibold transition-all border ${
                            isActive
                              ? "bg-[#1a3a3a] border-[#1a3a3a] text-white font-bold shadow-xs"
                              : "bg-[#fffaf0] border-[#e5e5e5] text-[#0a0a0a] hover:bg-[#faf5e8]"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {Icon && <Icon className={`size-4 shrink-0 ${isActive ? "text-white" : "text-[#1a3a3a]"}`} />}
                            <span className="truncate">{label}</span>
                          </div>
                          <ChevronRightIcon className={`size-4 shrink-0 ${isActive ? "text-white/80" : "text-[#6a6a6a]"}`} />
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 2. Configure Sections (Expandable / Collapsible) */}
              {isPengurus && configureSections.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#e5e5e5] text-left">
                  {/* Main Header Accordion Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsConfigSectionOpen(!isConfigSectionOpen)}
                    className="flex w-full items-center justify-between px-1 py-1 cursor-pointer group rounded-[8px] hover:bg-[#faf5e8] transition-colors"
                  >
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a]">
                      System Configuration
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-[#6a6a6a] font-medium">
                        {isConfigSectionOpen ? "Close" : "Open"}
                      </span>
                      <ChevronDownIcon className={`size-3.5 text-[#6a6a6a] transition-transform duration-200 ${isConfigSectionOpen ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {/* Main Section Content */}
                  {isConfigSectionOpen && (
                    <div className="space-y-2 animate-in fade-in-0 duration-150">
                      {configureSections.map((section) => {
                        const hasActiveChild = section.items.some((item) => pathname.startsWith(item.to))
                        const isOpen = isSectionOpen(section.label)

                        return (
                          <div key={section.label} className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] overflow-hidden shadow-xs">
                            {/* Sub-Section Card Accordion Trigger */}
                            <button
                              type="button"
                              onClick={() => toggleConfigureSection(section.label)}
                              className="flex w-full items-center justify-between p-3 bg-[#fffaf0] hover:bg-[#faf5e8] transition-colors cursor-pointer text-left border-b border-[#e5e5e5]"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="flex h-6 w-6 items-center justify-center rounded-[6px] bg-[#1a3a3a]/10 text-[#1a3a3a] shrink-0">
                                  <SparklesIcon className="size-3.5" />
                                </div>
                                <span className="text-xs font-bold text-[#0a0a0a] truncate">{section.label}</span>
                                {hasActiveChild && (
                                  <span className="rounded-full bg-[#1a3a3a]/10 px-2 py-0.5 text-[10px] font-bold text-[#1a3a3a] shrink-0">
                                    Active
                                  </span>
                                )}
                              </div>
                              <ChevronDownIcon className={`size-4 text-[#6a6a6a] transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
                            </button>

                            {/* Sub-Section Items Grid */}
                            {isOpen && (
                              <div className="p-2 space-y-1 bg-[#faf5e8]/50 animate-in fade-in-0 duration-150">
                                {section.items.map((item) => {
                                  const SubIcon = iconMap[item.icon]
                                  const isSubActive = pathname.startsWith(item.to)
                                  return (
                                    <Link
                                      key={item.to}
                                      to={item.to as "/"}
                                      onClick={() => setShowMoreMenu(false)}
                                      className={`flex items-center justify-between rounded-[10px] px-3 py-2 text-xs font-semibold transition-all border ${
                                        isSubActive
                                          ? "bg-[#0a0a0a] text-white border-[#0a0a0a] font-bold shadow-xs"
                                          : "bg-[#fffaf0] border-[#e5e5e5] text-[#0a0a0a] hover:bg-[#faf5e8]"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        {SubIcon && <SubIcon className={`size-3.5 shrink-0 ${isSubActive ? "text-white" : "text-[#6a6a6a]"}`} />}
                                        <span className="truncate">{item.label}</span>
                                      </div>
                                      <ChevronRightIcon className={`size-3.5 shrink-0 ${isSubActive ? "text-white/80" : "text-[#6a6a6a]/60"}`} />
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
              <div className="pt-2 border-t border-[#e5e5e5]">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoreMenu(false)
                    logout()
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-rose-200 bg-rose-50/80 py-2.5 text-xs text-rose-700 hover:bg-rose-100 transition-all cursor-pointer font-bold"
                >
                  <LogOutIcon className="size-4 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>

            </div>

          </div>
        </>
      )}

      {/* ── Apple-Style Floating Bottom Dock Bar ── */}
      <nav
        aria-label="Main Navigation"
        className="flex items-center justify-around rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0]/90 backdrop-blur-xl p-1.5 shadow-xl ring-1 ring-black/5"
      >
        {/* 1. Home */}
        <Link
          to="/home"
          onClick={() => setShowMoreMenu(false)}
          aria-current={pathname === "/home" || pathname === "/home/" ? "page" : undefined}
          className={`flex flex-col items-center gap-0.5 rounded-[10px] px-3 py-1.5 transition-all ${
            pathname === "/home" || pathname === "/home/"
              ? "bg-[#0a0a0a] text-white font-bold shadow-xs"
              : "text-[#6a6a6a] hover:text-[#0a0a0a]"
          }`}
        >
          <LayoutDashboardIcon className={`size-4.5 transition-transform ${pathname === "/home" ? "scale-105 text-white" : ""}`} />
          <span className="text-[10px] font-semibold">Home</span>
        </Link>

        {/* 2. Events */}
        <Link
          to="/events"
          onClick={() => setShowMoreMenu(false)}
          aria-current={pathname.startsWith("/events") ? "page" : undefined}
          className={`flex flex-col items-center gap-0.5 rounded-[10px] px-3 py-1.5 transition-all ${
            pathname.startsWith("/events")
              ? "bg-[#0a0a0a] text-white font-bold shadow-xs"
              : "text-[#6a6a6a] hover:text-[#0a0a0a]"
          }`}
        >
          <CalendarDaysIcon className={`size-4.5 transition-transform ${pathname.startsWith("/events") ? "scale-105 text-white" : ""}`} />
          <span className="text-[10px] font-semibold">Events</span>
        </Link>

        {/* 3. People (Hidden for Umat) */}
        {role !== "umat" && (
          <Link
            to="/teams"
            onClick={() => setShowMoreMenu(false)}
            aria-current={pathname.startsWith("/teams") ? "page" : undefined}
            className={`flex flex-col items-center gap-0.5 rounded-[10px] px-3 py-1.5 transition-all ${
              pathname.startsWith("/teams")
                ? "bg-[#0a0a0a] text-white font-bold shadow-xs"
                : "text-[#6a6a6a] hover:text-[#0a0a0a]"
            }`}
          >
            <UsersIcon className={`size-4.5 transition-transform ${pathname.startsWith("/teams") ? "scale-105 text-white" : ""}`} />
            <span className="text-[10px] font-semibold">People</span>
          </Link>
        )}

        {/* 4. Top (Leaderboard) */}
        <Link
          to="/leaderboard"
          onClick={() => setShowMoreMenu(false)}
          aria-current={pathname.startsWith("/leaderboard") ? "page" : undefined}
          className={`flex flex-col items-center gap-0.5 rounded-[10px] px-3 py-1.5 transition-all ${
            pathname.startsWith("/leaderboard")
              ? "bg-[#0a0a0a] text-white font-bold shadow-xs"
              : "text-[#6a6a6a] hover:text-[#0a0a0a]"
          }`}
        >
          <TrophyIcon className={`size-4.5 transition-transform ${pathname.startsWith("/leaderboard") ? "scale-105 text-white" : ""}`} />
          <span className="text-[10px] font-semibold">Top</span>
        </Link>

        {/* 5. Menu Drawer Trigger (☰) */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          aria-expanded={showMoreMenu}
          className={`flex flex-col items-center gap-0.5 rounded-[10px] px-3 py-1.5 transition-all cursor-pointer ${
            showMoreMenu
              ? "bg-[#0a0a0a] text-white font-bold shadow-xs"
              : "text-[#6a6a6a] hover:text-[#0a0a0a]"
          }`}
        >
          <MenuIcon className={`size-4.5 transition-transform ${showMoreMenu ? "scale-105 text-white" : ""}`} />
          <span className="text-[10px] font-semibold">Menu</span>
        </button>
      </nav>

      {/* Global Settings Modal for Mobile */}
      <ResponsiveFormModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Settings & Goals"
      >
        <SettingsSection onLogout={logout} />
      </ResponsiveFormModal>

    </div>
  )
}
