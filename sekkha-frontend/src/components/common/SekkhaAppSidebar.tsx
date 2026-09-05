// common/SekkhaAppSidebar
// Sekkha-branded application sidebar: Dashboard + Profile navigation.
// Used on desktop (md+). On mobile the bottom dock is used instead.

import { Link, useRouterState } from "@tanstack/react-router"
import { LayoutDashboardIcon, UserIcon, LogOutIcon } from "lucide-react"
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
import { useAuth } from "@/modules/auth"

// ─── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  {
    label: "Home",
    to: "/home",
    icon: LayoutDashboardIcon,
  },
  {
    label: "Profile",
    to: "/home/profile",
    icon: UserIcon,
  },
] as const

// ─── Component ─────────────────────────────────────────────────────────────────

export function SekkhaAppSidebar(
  props: React.ComponentProps<typeof Sidebar>,
) {
  const { logout } = useAuth()
  const { location } = useRouterState()
  const pathname = location.pathname

  return (
    <Sidebar collapsible="icon" {...props}>
      {/* Logo / brand */}
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

      {/* Main nav */}
      <SidebarContent className="px-2 py-3">
        <SidebarMenu>
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
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
                >
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
              className="text-sekkha-slate hover:text-sekkha-ink"
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
