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
    <div className="fixed right-3 bottom-3 left-3 z-50 mx-auto max-w-md font-sans md:hidden">
      <nav
        aria-label="Bottom Navigation"
        className="flex items-center justify-around rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0]/95 p-1.5 shadow-lg ring-1 ring-black/5 backdrop-blur-xl"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              to={item.to}
              aria-current={item.isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-[12px] px-3 py-1.5 transition-all ${
                item.isActive
                  ? "scale-100 bg-[#0a0a0a] font-bold text-white shadow-xs"
                  : "text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
              }`}
            >
              <Icon
                className={`size-4.5 transition-transform ${item.isActive ? "scale-105 text-white" : ""}`}
              />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
