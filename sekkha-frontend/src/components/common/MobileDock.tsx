// common/MobileDock
// Floating Apple-style bottom navigation dock for mobile screens (md and below).
// Design: Apple HIG iOS dock — frosted glass, warm canvas tint, ochre active state.

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
      label: "Ranking",
      to: "/leaderboard" as const,
      icon: TrophyIcon,
      isActive: pathname.startsWith("/leaderboard"),
    },
    {
      label: "People",
      to: "/people" as const,
      icon: UsersIcon,
      isActive: pathname.startsWith("/people"),
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
    /* Safe-area aware floating dock */
    <div className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-3 z-50 mx-auto max-w-md font-sans md:hidden">
      {/* Outer glow for depth */}
      <div className="absolute inset-0 -z-10 rounded-[28px] bg-[#e8b94a]/8 blur-xl" />

      <nav
        aria-label="Bottom Navigation"
        className="flex items-center justify-around gap-0.5 rounded-[26px] border border-white/60 bg-white/80 px-1.5 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.14),0_2px_8px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04] backdrop-blur-[30px]"
      >
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <Link
              key={item.label}
              to={item.to}
              aria-current={item.isActive ? "page" : undefined}
              className={`relative flex min-h-[48px] min-w-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-2 py-2 transition-all duration-200 active:scale-90 ${
                item.isActive
                  ? "bg-[#faf5e8] shadow-[0_1px_4px_rgba(0,0,0,0.10)] ring-1 ring-[#e8b94a]/30"
                  : "hover:bg-[#faf5e8]/60"
              }`}
            >
              {/* Active indicator dot */}
              {item.isActive && (
                <span className="absolute top-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#e8b94a]" />
              )}

              <Icon
                className={`size-[22px] transition-all duration-200 ${
                  item.isActive ? "scale-105 text-[#0a0a0a]" : "text-[#8a8a8a]"
                }`}
                strokeWidth={item.isActive ? 2.25 : 1.75}
              />
              <span
                className={`text-[10px] tracking-tight transition-colors duration-200 ${
                  item.isActive
                    ? "font-bold text-[#0a0a0a]"
                    : "font-medium text-[#8a8a8a]"
                }`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
