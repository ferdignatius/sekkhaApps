import { Link, useRouterState } from "@tanstack/react-router"
import { LayoutDashboardIcon, UserIcon, LogOutIcon, CalendarDaysIcon } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/feature/auth"

// ─── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboardIcon },
  { label: "Events", to: "/events", icon: CalendarDaysIcon },
  { label: "Profil", to: "/dashboard/profile", icon: UserIcon },
] as const

// ─── Component ─────────────────────────────────────────────────────────────────

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { logout } = useAuth()
  const { location } = useRouterState()
  const pathname = location.pathname

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
        <SidebarMenu>
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
            const isActive =
              to === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/dashboard/"
                : pathname.startsWith(to)            return (
              <SidebarMenuItem key={to}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={label}>
                  <Link to={to}>
                    <Icon className="size-4 shrink-0" />
                    <span>{label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
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
