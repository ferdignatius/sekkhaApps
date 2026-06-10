import { Link, useRouterState } from "@tanstack/react-router"
import {
  LayoutDashboardIcon,
  UserIcon,
  LogOutIcon,
  CalendarDaysIcon,
  AwardIcon,
  LayersIcon,
  TagIcon,
  ZapIcon,
  ActivityIcon,
  BellIcon,
  BuildingIcon,
  UsersIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  TrophyIcon,
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
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuth } from "@/feature/auth"

// ─── Nav items ─────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { label: "Dashboard",   to: "/dashboard",    icon: LayoutDashboardIcon },
  { label: "Events",      to: "/events",       icon: CalendarDaysIcon    },
  { label: "Leaderboard", to: "/leaderboard",  icon: TrophyIcon          },
  { label: "Komunitas",   to: "/community",    icon: MessageCircleIcon   },
  { label: "Profil",      to: "/dashboard/profile", icon: UserIcon        },
] as const

// ─── Configure sub-menu structure (pengurus/admin only) ────────────────────────

const CONFIGURE_SECTIONS = [
  {
    label: "Master Data",
    icon: LayersIcon,
    items: [
      { label: "Badge", to: "/configure/master/badge", icon: AwardIcon, hasRoute: true },
      { label: "Level", to: "/configure/master/level", icon: ZapIcon, hasRoute: true },
      { label: "Event Type", to: "/configure/master/event-type", icon: TagIcon, hasRoute: true },
    ],
  },
  {
    label: "Gamifikasi Rules",
    icon: ActivityIcon,
    items: [
      { label: "Poin per Aksi", to: "/configure/gamifikasi/poin", icon: ZapIcon, hasRoute: false },
      { label: "Streak Logic", to: "/configure/gamifikasi/streak", icon: ActivityIcon, hasRoute: false },
    ],
  },
  {
    label: "Early Warning",
    icon: BellIcon,
    items: [
      { label: "Threshold", to: "/configure/early-warning/threshold", icon: BellIcon, hasRoute: false },
    ],
  },
  {
    label: "Organisasi",
    icon: BuildingIcon,
    items: [
      { label: "Profil Vihara", to: "/configure/organisasi/profil", icon: BuildingIcon, hasRoute: false },
      { label: "Pengurus", to: "/configure/organisasi/pengurus", icon: UsersIcon, hasRoute: false },
    ],
  },
]

// ─── Component ─────────────────────────────────────────────────────────────────

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const { logout, authState } = useAuth()
  const { location } = useRouterState()
  const pathname = location.pathname

  const role = authState.status === "authenticated" ? authState.role : null
  const isPengurus = role === "pengurus" || role === "admin"

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
        {/* Main nav */}
        <SidebarMenu>
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => {
            const isActive =
              to === "/dashboard"
                ? pathname === "/dashboard" || pathname === "/dashboard/"
                : pathname.startsWith(to)

            return (
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

        {/* Configure — pengurus/admin only */}
        {isPengurus && (
          <SidebarGroup className="mt-4">
            <SidebarGroupLabel>Configure</SidebarGroupLabel>
            <SidebarMenu>
              {CONFIGURE_SECTIONS.map((section) => {
                const SectionIcon = section.icon
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
                          <SectionIcon className="size-4 shrink-0" />
                          <span>{section.label}</span>
                          <ChevronRightIcon className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {section.items.map((item) => {
                            const SubIcon = item.icon
                            const isSubActive = pathname.startsWith(item.to)

                            return (
                              <SidebarMenuSubItem key={item.to}>
                                <SidebarMenuSubButton
                                  asChild
                                  isActive={isSubActive}
                                >
                                  {item.hasRoute ? (
                                    <Link to={item.to as "/"}>
                                      <SubIcon className="size-3.5 shrink-0" />
                                      <span>{item.label}</span>
                                    </Link>
                                  ) : (
                                    <a href={item.to}>
                                      <SubIcon className="size-3.5 shrink-0" />
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
