// ─── Dynamic Sidebar ─────────────────────────────────────────────────────────
// Shell reads Registry to build sidebar dynamically.
// Overhauled with sleek group styling, role badges, sidebar collapse trigger, and unified user profile card dropdown.

import { useState, useRef, useEffect } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  LogOutIcon,
  ChevronRightIcon,
  SparklesIcon,
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
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { SettingsSection } from "@/modules/profile/internal/components/SettingsSection"
import { activeModules } from "@/shell/registry"
import { iconMap } from "@/shell/icon-map"
import { cn } from "@/lib/utils"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { logout, authState } = useAuth()
  const { location } = useRouterState()
  const pathname = location.pathname
  const { state, toggleSidebar } = useSidebar()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  const userId = authState.status === "authenticated" ? authState.userId : null
  const role = authState.status === "authenticated" ? authState.role : null
  const isPengurus = role === "pengurus" || role === "admin"

  // ── Build nav items dari Registry (Exclude notifications & profile as it's in user dropdown) ─────
  const mainNavItems = activeModules
    .flatMap((m) => m.navItems)
    .filter((item) => {
      if (item.to === "/notifications" || item.to === "/home/profile") return false
      if (role === "umat" && item.to === "/teams") return false
      return true
    })
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
    <Sidebar collapsible="icon" className="border-r border-[#e5e5e5] font-sans bg-[#fffaf0]" {...props}>
      {/* Brand Header & Sidebar Toggle Button */}
      <SidebarHeader className="border-b border-[#e5e5e5] px-3.5 py-3.5">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Title Toggle Trigger */}
          <button
            type="button"
            onClick={toggleSidebar}
            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:w-full focus:outline-hidden"
            title={state === "collapsed" ? "Expand Sidebar" : undefined}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shadow-xs font-bold transition-transform active:scale-95">
              <SparklesIcon className="size-4.5 text-[#e8b94a]" />
            </div>
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-bold text-[#0a0a0a] tracking-tight">
                Sekkha Apps
              </span>
              <span className="truncate text-xs font-medium text-[#6a6a6a] flex items-center gap-1">
                <ShieldCheckIcon className="size-3 text-[#1a3a3a]" />
                <span>{roleLabel}</span>
              </span>
            </div>
          </button>

          {/* Toggle Sidebar Expand / Collapse Button */}
          <SidebarTrigger className="shrink-0 text-[#6a6a6a] hover:bg-[#f5f0e0] hover:text-[#0a0a0a] cursor-pointer group-data-[collapsible=icon]:hidden rounded-[8px]" />
        </div>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className="px-2.5 py-3 space-y-3">
        {/* Main nav — Menu Utama */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#6a6a6a] px-2 py-1 group-data-[collapsible=icon]:hidden">
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
                      "rounded-[12px] transition-all font-medium text-sm",
                      isActive
                        ? "!bg-[#0a0a0a] !text-white font-semibold shadow-xs"
                        : "text-[#3a3a3a] hover:bg-[#f5f0e0] hover:text-[#0a0a0a]"
                    )}
                  >
                    <Link to={to} className="flex items-center gap-2.5 w-full">
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
          <SidebarGroup className="pt-2.5 border-t border-[#e5e5e5] p-0">
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#1a3a3a] px-2 py-1 group-data-[collapsible=icon]:hidden">
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
                        "rounded-[12px] transition-all font-medium text-sm",
                        isActive
                          ? "!bg-[#1a3a3a] !text-white font-semibold shadow-xs"
                          : "text-[#3a3a3a] hover:bg-[#f5f0e0] hover:text-[#0a0a0a]"
                      )}
                    >
                      <Link to={to} className="flex items-center gap-2.5 w-full">
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
          <SidebarGroup className="pt-2.5 border-t border-[#e5e5e5] p-0">
            <SidebarGroupLabel className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#6a6a6a] px-2 py-1 group-data-[collapsible=icon]:hidden">
              System Configuration
            </SidebarGroupLabel>
            <SidebarMenu className="space-y-0.5">
              {configureSections.map((section) => {
                const SectionIcon = iconMap[section.icon]
                const isSectionActive = section.items.some((item) =>
                  pathname.startsWith(item.to),
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
                            "rounded-[12px] transition-all text-sm font-medium",
                            isSectionActive
                              ? "bg-[#faf5e8] text-[#0a0a0a] font-semibold border border-[#e5e5e5]/80"
                              : "text-[#3a3a3a] hover:bg-[#f5f0e0] hover:text-[#0a0a0a]"
                          )}
                        >
                          {SectionIcon && <SectionIcon className="size-4 shrink-0 text-[#6a6a6a]" />}
                          <span className="truncate">{section.label}</span>
                          <ChevronRightIcon className="ml-auto size-4 text-[#6a6a6a] transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="my-1 space-y-0.5 border-l border-[#e5e5e5] ml-4 pl-2.5">
                          {section.items.map((item) => {
                            const SubIcon = iconMap[item.icon]
                            const isSubActive = pathname.startsWith(item.to)

                            return (
                              <SidebarMenuSubItem key={item.to}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                  className={cn(
                                    "rounded-[8px] py-1.5 transition-all text-xs font-medium",
                                    isSubActive
                                      ? "!bg-[#0a0a0a] !text-white font-semibold shadow-xs"
                                      : "text-[#6a6a6a] hover:bg-[#f5f0e0] hover:text-[#0a0a0a]"
                                  )}
                                >
                                  {item.hasRoute ? (
                                    <Link to={item.to as "/"} className="flex items-center gap-2 w-full">
                                      {SubIcon && (
                                        <SubIcon
                                          className={cn(
                                            "size-3.5 shrink-0",
                                            isSubActive ? "!text-white" : "text-[#6a6a6a]"
                                          )}
                                        />
                                      )}
                                      <span className="truncate">{item.label}</span>
                                    </Link>
                                  ) : (
                                    <a href={item.to} className="flex items-center gap-2 w-full">
                                      {SubIcon && (
                                        <SubIcon
                                          className={cn(
                                            "size-3.5 shrink-0",
                                            isSubActive ? "!text-white" : "text-[#6a6a6a]"
                                          )}
                                        />
                                      )}
                                      <span className="truncate">{item.label}</span>
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
      <SidebarFooter ref={profileMenuRef} className="relative border-t border-[#e5e5e5] p-2.5 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:py-2">
        {/* Floating Options Dropdown Menu */}
        {showProfileMenu && userId && (
          <div className="absolute bottom-full mb-2 left-2.5 right-2.5 z-50 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0]/95 backdrop-blur-xl p-1.5 shadow-2xl space-y-0.5 animate-in fade-in-0 slide-in-from-bottom-2 group-data-[collapsible=icon]:w-48 group-data-[collapsible=icon]:left-12">
            <Link
              to="/home/profile"
              onClick={() => setShowProfileMenu(false)}
              className="flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-xs font-semibold text-[#0a0a0a] hover:bg-[#f5f0e0] transition-colors"
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
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-xs font-semibold text-[#0a0a0a] hover:bg-[#f5f0e0] transition-colors cursor-pointer"
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
              className="flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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
              "flex w-full items-center gap-2.5 rounded-[12px] transition-all cursor-pointer group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:bg-transparent",
              showProfileMenu
                ? "ring-2 ring-[#0a0a0a]/15 bg-[#f5f0e0] border border-[#ebe6d6] p-2"
                : "border border-[#e5e5e5] bg-[#fffaf0] p-2 hover:bg-[#f5f0e0] hover:border-[#ebe6d6]"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-xs text-white font-bold shadow-xs uppercase transition-transform active:scale-95">
              {userInitials}
            </div>
            <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden text-left">
              <span className="truncate text-xs text-[#0a0a0a] font-bold">{userName}</span>
              <span className="truncate text-[11px] text-[#6a6a6a] font-medium">{roleLabel}</span>
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
          <SettingsSection onLogout={logout} onClose={() => setSettingsOpen(false)} />
        </ResponsiveFormModal>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

