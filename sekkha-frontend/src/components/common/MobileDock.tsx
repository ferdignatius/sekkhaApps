// common/MobileDock
// Floating Apple-style bottom navigation dock for mobile screens (md and below).
// Direct access navigation matching sidebar order: Home, Events, Leaderboard, Community, Profile.

import { Link, useRouterState } from "@tanstack/react-router"
import {
  HomeIcon,
  CalendarDaysIcon,
  UsersIcon,
  TrophyIcon,
  UserIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"

export function MobileDock() {
  const { location } = useRouterState()
  const pathname = location.pathname
  const { authState } = useAuth()
  const role = authState.status === "authenticated" ? authState.role : null

  const allNavItems = [
    {
      label: "Home",
      to: "/home" as const,
      icon: HomeIcon,
      isActive: pathname === "/home" || pathname === "/home/",
    },
    {
      label: "Events",
      to: "/events" as const,
      icon: CalendarDaysIcon,
      isActive: pathname.startsWith("/events"),
    },
    {
      label: "Leaderboard",
      to: "/leaderboard" as const,
      icon: TrophyIcon,
      isActive: pathname.startsWith("/leaderboard"),
    },
    {
      label: "Community",
      to: "/teams" as const,
      icon: UsersIcon,
      isActive: pathname.startsWith("/teams"),
      hidden: role === "umat",
    },
    {
      label: "Profile",
      to: "/home/profile" as const,
      icon: UserIcon,
      isActive: pathname.startsWith("/home/profile"),
    },
  ]

  const navItems = allNavItems.filter((item) => !item.hidden)

  return (
    <div className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-50 mx-auto max-w-md font-sans md:hidden">
      <nav
        aria-label="Bottom Navigation"
        className="flex items-center justify-around rounded-[24px] border border-black/[0.06] bg-[#fffaf0]/90 p-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] ring-1 ring-white/70 backdrop-blur-2xl"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              to={item.to}
              aria-current={item.isActive ? "page" : undefined}
              className={`flex min-h-[44px] min-w-[50px] flex-col items-center justify-center gap-0.5 rounded-[16px] px-2.5 py-1.5 transition-all duration-150 active:scale-95 ${
                item.isActive
                  ? "bg-[#0a0a0a] font-bold text-white shadow-xs"
                  : "text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
              }`}
            >
              <Icon
                className={`size-4.5 transition-transform duration-150 ${item.isActive ? "scale-105 text-white" : ""}`}
              />
              <span className="text-[10px] font-semibold tracking-tight">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
