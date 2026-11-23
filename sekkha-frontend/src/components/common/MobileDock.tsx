// common/MobileDock
// Floating Apple-style bottom navigation dock for mobile screens (md and below).
// Design: Apple HIG iOS dock — frosted glass, warm canvas tint, ochre active state.

import { useEffect, useState } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import { useAuth } from "@/modules/auth"
import { useMobileKeyboardInset } from "@/hooks/useMobileKeyboardInset"
import { activeModules } from "@/shell/registry"
import { iconMap } from "@/shell/icon-map"

const DOCK_ORDER: Record<string, number> = {
  "/home": 1,
  "/events": 2,
  "/leaderboard": 3,
  "/people": 4,
  "/profile": 5,
}

function hasEventIdInUrl(): boolean {
  if (typeof window === "undefined") return false
  return new URLSearchParams(window.location.search).has("eventId")
}

export function MobileDock() {
  const { location } = useRouterState()
  const pathname = location.pathname
  const routerHasEventId = Boolean(
    (location as { search?: { eventId?: string } }).search?.eventId
  )
  const [hiddenByDetailView, setHiddenByDetailView] = useState(
    () => routerHasEventId || (pathname === "/events" && hasEventIdInUrl())
  )
  const { authState } = useAuth()
  const { isKeyboardOpen } = useMobileKeyboardInset()

  useEffect(() => {
    setHiddenByDetailView(
      routerHasEventId || (pathname === "/events" && hasEventIdInUrl())
    )
  }, [pathname, routerHasEventId])

  useEffect(() => {
    if (typeof window === "undefined") return
    const handleVisibility = (e: Event) => {
      const custom = e as CustomEvent<{ hidden?: boolean }>
      setHiddenByDetailView(Boolean(custom.detail?.hidden))
    }
    const handlePopState = () => {
      setHiddenByDetailView(
        window.location.pathname === "/events" && hasEventIdInUrl()
      )
    }
    window.addEventListener("sekkha:mobile-dock-visibility", handleVisibility)
    window.addEventListener("popstate", handlePopState)
    return () => {
      window.removeEventListener(
        "sekkha:mobile-dock-visibility",
        handleVisibility
      )
      window.removeEventListener("popstate", handlePopState)
    }
  }, [])

  const role = authState?.status === "authenticated" ? authState.role : null
  const isPengurus =
    role === "organizer" ||
    (role as string) === "pengurus" ||
    role === "admin"

  const navItems = activeModules
    .flatMap((module) => {
      const items = [...module.navItems]
      if (isPengurus && module.pengurusNavItems) {
        items.push(
          ...module.pengurusNavItems.filter((item) => item.to in DOCK_ORDER)
        )
      }
      return items.map((item) => ({
        ...item,
        icon: iconMap[item.icon],
        isActive:
          item.to === "/home"
            ? pathname === "/home" || pathname === "/home/"
            : pathname.startsWith(item.to),
      }))
    })
    .sort((a, b) => (DOCK_ORDER[a.to] ?? 99) - (DOCK_ORDER[b.to] ?? 99))

  if (isKeyboardOpen || hiddenByDetailView) {
    return null
  }

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
          if (!Icon) return null
          return (
            <Link
              key={item.label}
              to={item.to}
              aria-current={item.isActive ? "page" : undefined}
              className={`relative flex min-h-[48px] min-w-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] px-2 py-2 transition-all duration-200 active:scale-90 ${item.isActive
                ? "bg-[#faf5e8] shadow-[0_1px_4px_rgba(0,0,0,0.10)] ring-1 ring-[#e8b94a]/30"
                : "hover:bg-[#faf5e8]/60"
                }`}
            >
              {/* Active indicator dot */}
              {/* {item.isActive && (
                <span className="absolute top-1.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-[#e8b94a]" />
              )} */}

              <Icon
                className={`size-[22px] transition-all duration-200 ${item.isActive ? "scale-105 text-[#0a0a0a]" : "text-[#8a8a8a]"
                  }`}
                strokeWidth={item.isActive ? 2.25 : 1.75}
              />
              <span
                className={`text-[10px] tracking-tight transition-colors duration-200 ${item.isActive
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
