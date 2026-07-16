// ─── Dynamic Sidebar ─────────────────────────────────────────────────────────
// Shell reads Registry to build sidebar dynamically.
// Tidak tahu apa isi internal modul — hanya baca navItems, pengurusNavItems,
// dan configureSections dari ModuleDefinition.

import { Link, useRouterState } from "@tanstack/react-router"
import { LogOutIcon, ChevronRightIcon } from "lucide-react"
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
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuth } from "@/modules/auth"
import { activeModules } from "@/shell/registry"
import { iconMap } from "@/shell/icon-map"

// ─── Component ─────────────────────────────────────────────────────────────────

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { logout, authState } = useAuth()
  const { location } = useRouterState()
  const pathname = location.pathname

  const role = authState.status === "authenticated" ? authState.role : null
  const isPengurus = role === "pengurus" || role === "admin"

  // ── Build nav items dari Registry ─────────────────────────────────────────
  const mainNavItems = activeModules.flatMap((m) => m.navItems)
  const pengurusNavItems = activeModules.flatMap((m) => m.pengurusNavItems ?? [])
  const configureSections = activeModules.flatMap((m) => m.configureSections ?? [])

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Brand */}
      <SidebarHeader className="border-b border-sekkha-hairline-soft px-4 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sekkha-brand-yellow">
            <span className="text-xs font-bold text-sekkha-ink">S</span>
          </div>
          <span className="truncate text-body-sm-medium text-sekkha-ink group-data-[collapsible=icon]:hidden">
            Sekkha
          </span>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-2 py-3">
        {/* Main nav — dari Registry */}
        <SidebarMenu>
          {mainNavItems.map(({ label, to, icon }) => {
            const Icon = iconMap[icon]
            const isActive =
              to === "/home"
                ? pathname === "/home" || pathname === "/home/"
                : pathname.startsWith(to)

            return (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                  <Link to={to}>
                    {Icon && <Icon className="size-4 shrink-0" />}
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>

        {/* Pengurus section — dari Registry */}
        {isPengurus && pengurusNavItems.length > 0 && (
          <SidebarGroup className="mt-3 pt-3 border-t border-sekkha-hairline-soft">
            <SidebarGroupLabel>Pengurus</SidebarGroupLabel>
            <SidebarMenu>
              {pengurusNavItems.map(({ label, to, icon }) => {
                const Icon = iconMap[icon]
                return (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild isActive={pathname.startsWith(to)} tooltip={label}>
                      <Link to={to}>
                        {Icon && <Icon className="size-4 shrink-0" />}
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Configure — dari Registry */}
        {isPengurus && configureSections.length > 0 && (
          <SidebarGroup className="mt-3 pt-3 border-t border-sekkha-hairline-soft">
            <SidebarGroupLabel>Configure</SidebarGroupLabel>
            <SidebarMenu>
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
                        <SidebarMenuButton tooltip={section.label}>
                          {SectionIcon && <SectionIcon className="size-4 shrink-0" />}
                          <span>{section.label}</span>
                          <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {section.items.map((item) => {
                            const SubIcon = iconMap[item.icon]
                            const isSubActive = pathname.startsWith(item.to)

                            return (
                              <SidebarMenuSubItem key={item.to}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                >
                                  {item.hasRoute ? (
                                    <Link to={item.to as "/"}>
                                      {SubIcon && <SubIcon className="size-3.5 shrink-0" />}
                                      <span>{item.label}</span>
                                    </Link>
                                  ) : (
                                    <a href={item.to}>
                                      {SubIcon && <SubIcon className="size-3.5 shrink-0" />}
                                      <span>{item.label}</span>
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

      {/* Logout */}
      <SidebarFooter className="border-t border-sekkha-hairline-soft px-2 py-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="Keluar"
              onClick={logout}
              className="text-sekkha-slate"
            >
              <LogOutIcon className="size-4 shrink-0" />
              <span>Keluar</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
