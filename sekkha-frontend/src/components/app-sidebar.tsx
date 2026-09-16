// ─── Dynamic Sidebar ─────────────────────────────────────────────────────────
// Shell reads Registry to build sidebar dynamically.
// Overhauled with sleek group styling, role badges, sidebar collapse trigger, and unified user profile card dropdown.

import { useState, useRef, useEffect } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  LogOutIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  UserIcon,
  SettingsIcon,
  ChevronUpIcon,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { SettingsSection } from "@/modules/profile/internal/components/SettingsSection"
import { activeModules } from "@/shell/registry"
import { iconMap } from "@/shell/icon-map"
import { cn } from "@/lib/utils"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { logout, authState, updateUser } = useAuth()
  const { location } = useRouterState()
  const pathname = location.pathname
  const { state, toggleSidebar } = useSidebar()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Synchronize fresh user profile (including updated Full Name) on mount and on update events.
  // Uses refs so the event listener is registered ONCE and always sees the latest state,
  // avoiding stale-closure bugs when the auth context value reference changes.
  const updateUserRef = useRef(updateUser)
  const authStateNameRef = useRef(authState.name)
  const authStateStatusRef = useRef(authState.status)

  // Keep refs in sync with latest values on every render
  useEffect(() => {
    updateUserRef.current = updateUser
    authStateNameRef.current = authState.name
    authStateStatusRef.current = authState.status
  })

  // Event listener: register once on mount, use refs for latest values
  useEffect(() => {
    function handleProfileUpdated(e: Event) {
      const customEvent = e as CustomEvent<{ name?: string }>
      const newName = customEvent.detail?.name
      if (newName && newName !== authStateNameRef.current) {
        updateUserRef.current({ name: newName })
      }
    }
    window.addEventListener("sekkha:profile_updated", handleProfileUpdated)
    return () => {
      window.removeEventListener("sekkha:profile_updated", handleProfileUpdated)
    }
  }, [])

  // Initial / on-status-change API sync: fetch fresh profile from server.
  // Runs when status transitions to "authenticated" (e.g., after login or onboarding).
  useEffect(() => {
    if (authStateStatusRef.current !== "authenticated") return
    let cancelled = false
    api
      .get<{ name?: string }>("/users/me")
      .then((u) => {
        if (cancelled) return
        const freshName = u?.name
        if (freshName && freshName !== authStateNameRef.current) {
          updateUserRef.current({ name: freshName })
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [authState.status])

  const userId = authState.status === "authenticated" ? authState.userId : null
  const role = authState.status === "authenticated" ? authState.role : null
  const isPengurus = role === "pengurus" || role === "admin"

  // ── Build nav items dari Registry (Exclude notifications & profile as it's in user dropdown) ─────
  const mainNavItems = activeModules
    .flatMap((m) => m.navItems)
    .filter((item) => {
      if (item.to === "/notifications" || item.to === "/home/profile")
        return false
      if (role === "umat" && item.to === "/teams") return false
      return true
    })
  const pengurusNavItems = activeModules.flatMap(
    (m) => m.pengurusNavItems ?? []
  )
  const configureSections = activeModules.flatMap(
    (m) => m.configureSections ?? []
  )

  const roleLabel =
    role === "admin"
      ? "Admin"
      : role === "pengurus"
        ? "Organizer"
        : role === "aktivis"
          ? "Activist"
          : "Member"
  // Render blank when no real name is available — avoid flashing a default
  // (e.g. "Member") before the /users/me hydration completes.
  const userName =
    authState.status === "authenticated" && authState.name ? authState.name : ""
  const userInitials =
    userName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join("") || ""

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-[#e5e5e5] bg-[#fffaf0] font-sans"
      {...props}
    >
      {/* Brand Header & Sidebar Toggle Button */}
      <SidebarHeader className="border-b border-[#e5e5e5] px-3.5 py-3.5">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Title Toggle Trigger */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex min-w-0 cursor-pointer items-center gap-2.5 text-left group-data-[collapsible=icon]:w-full group-data-[collapsible=icon]:justify-center focus:outline-hidden"
            title={state === "collapsed" ? "Expand Sidebar" : undefined}
          >
            <div className="flex size-9 shrink-0 items-center justify-center transition-transform active:scale-95">
              <img
                src="/sekkha_logo.svg"
                alt="Sekkha Logo"
                className="size-full object-contain"
              />
            </div>
            <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-bold tracking-tight text-[#0a0a0a]">
                Sekkha Apps
              </span>
              <span className="flex items-center gap-1 truncate text-xs font-medium text-[#6a6a6a]">
                <ShieldCheckIcon className="size-3 text-[#1a3a3a]" />
                <span>{roleLabel}</span>
              </span>
            </div>
          </button>

          {/* Toggle Sidebar Expand / Collapse Button */}
          <SidebarTrigger className="shrink-0 cursor-pointer rounded-[8px] text-[#6a6a6a] group-data-[collapsible=icon]:hidden hover:bg-[#f5f0e0] hover:text-[#0a0a0a]" />
        </div>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className="space-y-3 px-2.5 py-3">
        {/* Main nav — Menu Utama */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-2 py-1 text-[11px] font-bold tracking-[1.5px] text-[#6a6a6a] uppercase group-data-[collapsible=icon]:hidden">
            Main Navigation
          </SidebarGroupLabel>
          <SidebarMenu className="space-y-0.5">
            {mainNavItems.map(({ label, to, icon }) => {
              const Icon = iconMap[icon]
              const isActive =
                to === "/home"
                  ? pathname === "/home" || pathname === "/home/"
                  : pathname.startsWith(to)

              return (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={label}
                    className={cn(
                      "rounded-[12px] text-sm font-medium transition-all",
                      isActive
                        ? "!bg-[#0a0a0a] font-semibold !text-white shadow-xs"
                        : "text-[#3a3a3a] hover:bg-[#f5f0e0] hover:text-[#0a0a0a]"
                    )}
                  >
                    <Link to={to} className="flex w-full items-center gap-2.5">
                      {Icon && (
                        <Icon
                          className={cn(
                            "size-4 shrink-0 transition-colors",
                            isActive ? "!text-white" : "text-[#6a6a6a]"
                          )}
                        />
                      )}
                      <span className="flex-1 truncate">{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Pengurus section — dari Registry */}
        {isPengurus && pengurusNavItems.length > 0 && (
          <SidebarGroup className="border-t border-[#e5e5e5] p-0 pt-2.5">
            <SidebarGroupLabel className="px-2 py-1 text-[11px] font-bold tracking-[1.5px] text-[#1a3a3a] uppercase group-data-[collapsible=icon]:hidden">
              Admin & Organizer
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5">
              {pengurusNavItems.map(({ label, to, icon }) => {
                const Icon = iconMap[icon]
                const isActive = pathname.startsWith(to)
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={label}
                      className={cn(
                        "rounded-[12px] text-sm font-medium transition-all",
                        isActive
                          ? "!bg-[#1a3a3a] font-semibold !text-white shadow-xs"
                          : "text-[#3a3a3a] hover:bg-[#f5f0e0] hover:text-[#0a0a0a]"
                      )}
                    >
                      <Link
                        to={to}
                        className="flex w-full items-center gap-2.5"
                      >
                        {Icon && (
                          <Icon
                            className={cn(
                              "size-4 shrink-0 transition-colors",
                              isActive ? "!text-white" : "text-[#6a6a6a]"
                            )}
                          />
                        )}
                        <span className="truncate">{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Configure Sections — dari Registry */}
        {isPengurus && configureSections.length > 0 && (
          <SidebarGroup className="border-t border-[#e5e5e5] p-0 pt-2.5">
            <SidebarGroupLabel className="px-2 py-1 text-[11px] font-bold tracking-[1.5px] text-[#6a6a6a] uppercase group-data-[collapsible=icon]:hidden">
              System Configuration
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5">
              {configureSections.map((section) => {
                const SectionIcon = iconMap[section.icon]
                const isSectionActive = section.items.some((item) =>
                  pathname.startsWith(item.to)
                )

                return (
                  <Collapsible
                    key={section.label}
                    asChild
                    defaultOpen={isSectionActive}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton
                          tooltip={section.label}
                          className={cn(
                            "rounded-[12px] text-sm font-medium transition-all",
                            isSectionActive
                              ? "border border-[#e5e5e5]/80 bg-[#faf5e8] font-semibold text-[#0a0a0a]"
                              : "text-[#3a3a3a] hover:bg-[#f5f0e0] hover:text-[#0a0a0a]"
                          )}
                        >
                          {SectionIcon && (
                            <SectionIcon className="size-4 shrink-0 text-[#6a6a6a]" />
                          )}
                          <span className="truncate">{section.label}</span>
                          <ChevronRightIcon className="ml-auto size-4 text-[#6a6a6a] transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="my-1 ml-4 space-y-0.5 border-l border-[#e5e5e5] pl-2.5">
                          {section.items.map((item) => {
                            const SubIcon = iconMap[item.icon]
                            const isSubActive = pathname.startsWith(item.to)

                            return (
                              <SidebarMenuSubItem key={item.to}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                  className={cn(
                                    "rounded-[8px] py-1.5 text-xs font-medium transition-all",
                                    isSubActive
                                      ? "!bg-[#0a0a0a] font-semibold !text-white shadow-xs"
                                      : "text-[#6a6a6a] hover:bg-[#f5f0e0] hover:text-[#0a0a0a]"
                                  )}
                                >
                                  {item.hasRoute ? (
                                    <Link
                                      to={item.to as "/"}
                                      className="flex w-full items-center gap-2"
                                    >
                                      {SubIcon && (
                                        <SubIcon
                                          className={cn(
                                            "size-3.5 shrink-0",
                                            isSubActive
                                              ? "!text-white"
                                              : "text-[#6a6a6a]"
                                          )}
                                        />
                                      )}
                                      <span className="truncate">
                                        {item.label}
                                      </span>
                                    </Link>
                                  ) : (
                                    <a
                                      href={item.to}
                                      className="flex w-full items-center gap-2"
                                    >
                                      {SubIcon && (
                                        <SubIcon
                                          className={cn(
                                            "size-3.5 shrink-0",
                                            isSubActive
                                              ? "!text-white"
                                              : "text-[#6a6a6a]"
                                          )}
                                        />
                                      )}
                                      <span className="truncate">
                                        {item.label}
                                      </span>
                                    </a>
                                  )}
                                </SidebarMenuSubButton>
                              </SidebarMenuSubItem>
                            )
                          })}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}
      </SidebarContent>

      {/* Footer Unified User Profile Menu */}
      <SidebarFooter
        ref={profileMenuRef}
        className="relative border-t border-[#e5e5e5] p-2.5 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-2"
      >
        {/* Floating Options Dropdown Menu */}
        {showProfileMenu && userId && (
          <div className="absolute right-2.5 bottom-full left-2.5 z-50 mb-2 animate-in space-y-0.5 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0]/95 p-1.5 shadow-2xl backdrop-blur-xl fade-in-0 slide-in-from-bottom-2 group-data-[collapsible=icon]:left-12 group-data-[collapsible=icon]:w-48">
            <Link
              to="/home/profile"
              onClick={() => setShowProfileMenu(false)}
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0]"
            >
              <UserIcon className="size-4 text-[#0a0a0a]" />
              <span>View Profile</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(false)
                setSettingsOpen(true)
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0]"
            >
              <SettingsIcon className="size-4 text-[#6a6a6a]" />
              <span>Settings & Goals</span>
            </button>

            <div className="my-1 border-t border-[#e5e5e5]" />

            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(false)
                logout()
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
            >
              <LogOutIcon className="size-4 text-rose-500" />
              <span>Sign Out</span>
            </button>
          </div>
        )}

        {/* User Card Button Trigger */}
        {userId && (
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title={roleLabel}
            className={cn(
              "flex w-full cursor-pointer items-center gap-2.5 rounded-[12px] transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0",
              showProfileMenu
                ? "border border-[#ebe6d6] bg-[#f5f0e0] p-2 ring-2 ring-[#0a0a0a]/15"
                : "border border-[#e5e5e5] bg-[#fffaf0] p-2 hover:border-[#ebe6d6] hover:bg-[#f5f0e0]"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-xs font-bold text-white uppercase shadow-xs transition-transform active:scale-95">
              {userInitials}
            </div>
            <div className="flex min-w-0 flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
              <span className="truncate text-xs font-bold text-[#0a0a0a]">
                {userName}
              </span>
              <span className="truncate text-[11px] font-medium text-[#6a6a6a]">
                {roleLabel}
              </span>
            </div>
            <ChevronUpIcon
              className={cn(
                "size-4 text-[#6a6a6a] transition-transform duration-200 group-data-[collapsible=icon]:hidden",
                showProfileMenu && "rotate-180 text-[#0a0a0a]"
              )}
            />
          </button>
        )}

        {/* Global Settings Modal triggered from bottom menu */}
        <ResponsiveFormModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          title="Settings & Goals"
          maxWidth="max-w-md"
        >
          <SettingsSection
            onLogout={logout}
            onClose={() => setSettingsOpen(false)}
          />
        </ResponsiveFormModal>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
