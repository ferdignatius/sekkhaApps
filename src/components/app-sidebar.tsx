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

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { logout, authState } = useAuth()
  const { location } = useRouterState()
  const pathname = location.pathname
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  const userId = authState.status === "authenticated" ? authState.userId : null
  const role = authState.status === "authenticated" ? authState.role : null
  const isPengurus = role === "pengurus" || role === "admin"

  // ── Build nav items dari Registry (Exclude notifications & profile as it's in user dropdown) ─────
  const mainNavItems = activeModules
    .flatMap((m) => m.navItems)
    .filter((item) => item.to !== "/notifications" && item.to !== "/home/profile")

  const pengurusNavItems = activeModules.flatMap((m) => m.pengurusNavItems ?? [])
  const configureSections = activeModules.flatMap((m) => m.configureSections ?? [])

  const roleLabel = role === "admin" ? "Admin Vihara" : role === "pengurus" ? "Pengurus" : "Umat"

  // Close profile dropdown menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false)
      }
    }
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showProfileMenu])

  return (
    <Sidebar collapsible="icon" className="border-r border-sekkha-hairline font-sans bg-white/95 backdrop-blur-md" {...props}>
      {/* Brand Header & Sidebar Toggle Button */}
      <SidebarHeader className="border-b border-sekkha-hairline-soft px-3 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sekkha-brand-blue text-white shadow-xs font-black">
              <SparklesIcon className="size-5 text-amber-300" />
            </div>
            <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
              <span className="truncate text-caption-bold font-extrabold text-sekkha-ink tracking-tight">
                Sekkha Vihara
              </span>
              <span className="truncate text-micro font-bold text-sekkha-brand-blue flex items-center gap-1">
                <ShieldCheckIcon className="size-3 text-sekkha-brand-blue" />
                <span>{roleLabel}</span>
              </span>
            </div>
          </div>

          {/* Toggle Sidebar Expand / Collapse Button */}
          <SidebarTrigger className="shrink-0 text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink cursor-pointer" />
        </div>
      </SidebarHeader>

      {/* Navigation Content */}
      <SidebarContent className="px-2.5 py-3 space-y-3">
        {/* Main nav — Menu Utama */}
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="text-[10px] font-extrabold uppercase tracking-widest text-sekkha-slate/60 px-2 py-1 group-data-[collapsible=icon]:hidden">
            Navigasi Utama
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
                    className={`rounded-xl transition-all font-semibold ${
                      isActive
                        ? "bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-bold shadow-2xs"
                        : "text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink"
                    }`}
                  >
                    <Link to={to}>
                      {Icon && <Icon className={`size-4 shrink-0 ${isActive ? "text-sekkha-brand-blue" : ""}`} />}
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
          <SidebarGroup className="pt-2 border-t border-sekkha-hairline-soft p-0">
            <SidebarGroupLabel className="text-[10px] font-extrabold uppercase tracking-widest text-purple-700/80 px-2 py-1 group-data-[collapsible=icon]:hidden">
              Pengurus & Admin
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
                      className={`rounded-xl transition-all font-semibold ${
                        isActive
                          ? "bg-purple-100/80 text-purple-800 font-bold shadow-2xs"
                          : "text-sekkha-slate hover:bg-purple-50/60 hover:text-purple-900"
                      }`}
                    >
                      <Link to={to}>
                        {Icon && <Icon className={`size-4 shrink-0 ${isActive ? "text-purple-700" : ""}`} />}
                        <span className="truncate">{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Configure / Master Data — dari Registry */}
        {isPengurus && configureSections.length > 0 && (
          <SidebarGroup className="pt-2 border-t border-sekkha-hairline-soft p-0">
            <SidebarGroupLabel className="text-[10px] font-extrabold uppercase tracking-widest text-sekkha-slate/60 px-2 py-1 group-data-[collapsible=icon]:hidden">
              Konfigurasi Master Data
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
                          className={`rounded-xl transition-all font-semibold ${
                            isSectionActive
                              ? "bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-bold"
                              : "text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink"
                          }`}
                        >
                          {SectionIcon && <SectionIcon className="size-4 shrink-0" />}
                          <span className="truncate">{section.label}</span>
                          <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub className="my-1 space-y-0.5 border-l border-sekkha-hairline ml-3.5 pl-2.5">
                          {section.items.map((item) => {
                            const SubIcon = iconMap[item.icon]
                            const isSubActive = pathname.startsWith(item.to)

                            return (
                              <SidebarMenuSubItem key={item.to}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                  className={`rounded-lg py-1.5 transition-all text-micro font-medium ${
                                    isSubActive
                                      ? "bg-sekkha-brand-blue text-white font-bold shadow-2xs"
                                      : "text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink"
                                  }`}
                                >
                                  {item.hasRoute ? (
                                    <Link to={item.to as "/"}>
                                      {SubIcon && <SubIcon className="size-3.5 shrink-0" />}
                                      <span className="truncate">{item.label}</span>
                                    </Link>
                                  ) : (
                                    <a href={item.to}>
                                      {SubIcon && <SubIcon className="size-3.5 shrink-0" />}
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
      <SidebarFooter ref={profileMenuRef} className="relative border-t border-sekkha-hairline-soft p-2.5">
        {/* Floating Options Dropdown Menu */}
        {showProfileMenu && userId && (
          <div className="absolute bottom-full mb-2 left-2.5 right-2.5 z-50 rounded-2xl border border-sekkha-hairline bg-white/95 backdrop-blur-xl p-1.5 shadow-2xl space-y-0.5 animate-in fade-in-0 slide-in-from-bottom-2 group-data-[collapsible=icon]:w-48 group-data-[collapsible=icon]:left-12">
            <Link
              to="/home/profile"
              onClick={() => setShowProfileMenu(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-caption font-semibold text-sekkha-ink hover:bg-sekkha-surface transition-colors"
            >
              <UserIcon className="size-4 text-sekkha-brand-blue" />
              <span>Lihat Profil Saya</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(false)
                setSettingsOpen(true)
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-caption font-semibold text-sekkha-ink hover:bg-sekkha-surface transition-colors cursor-pointer"
            >
              <SettingsIcon className="size-4 text-sekkha-slate" />
              <span>Pengaturan & Target</span>
            </button>

            <div className="my-1 border-t border-sekkha-hairline-soft" />

            <button
              type="button"
              onClick={() => {
                setShowProfileMenu(false)
                logout()
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-caption font-semibold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOutIcon className="size-4 text-rose-500" />
              <span>Keluar Akun</span>
            </button>
          </div>
        )}

        {/* User Card Button Trigger */}
        {userId && (
          <button
            type="button"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className={`flex w-full items-center gap-2.5 rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas/80 p-2 text-left transition-all cursor-pointer hover:bg-sekkha-surface hover:border-sekkha-hairline ${
              showProfileMenu ? "ring-2 ring-sekkha-brand-blue/30 bg-sekkha-surface" : ""
            }`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sekkha-brand-blue text-micro-bold text-white font-bold uppercase">
              {roleLabel.slice(0, 2)}
            </div>
            <div className="flex flex-col min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
              <span className="truncate text-micro-bold text-sekkha-ink font-extrabold">{roleLabel}</span>
              <span className="truncate text-[10px] text-sekkha-slate font-medium">ID: {userId.slice(0, 8)}</span>
            </div>
            <ChevronUpIcon className={`size-4 text-sekkha-slate transition-transform duration-200 group-data-[collapsible=icon]:hidden ${showProfileMenu ? "rotate-180 text-sekkha-brand-blue" : ""}`} />
          </button>
        )}

        {/* Global Settings Modal triggered from bottom menu */}
        <ResponsiveFormModal
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          title="Pengaturan & Target"
        >
          <SettingsSection onLogout={logout} />
        </ResponsiveFormModal>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

