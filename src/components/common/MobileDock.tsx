// common/MobileDock
// Fixed bottom navigation dock for mobile screens (md and below).
// Visible only on mobile; hidden on md+.

import { Link, useRouterState } from "@tanstack/react-router"
import { LayoutDashboardIcon, UserIcon, CalendarDaysIcon, MessageCircleIcon } from "lucide-react"

const DOCK_ITEMS = [
  { label: "Beranda",   to: "/dashboard",  icon: LayoutDashboardIcon },
  { label: "Events",   to: "/events",     icon: CalendarDaysIcon    },
  { label: "Komunitas",to: "/community",  icon: MessageCircleIcon   },
  { label: "Profil",   to: "/dashboard/profile", icon: UserIcon     },
]

// ─── Component ─────────────────────────────────────────────────────────────────

export function MobileDock() {
  const { location } = useRouterState()
  const pathname = location.pathname

  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-sekkha-hairline-soft bg-sekkha-canvas px-2 pb-safe md:hidden"
    >
      {DOCK_ITEMS.map(({ label, to, icon: Icon }) => {
        const isActive =
          to === "/dashboard"
            ? pathname === "/dashboard" || pathname === "/dashboard/"
            : pathname.startsWith(to)

        return (
          <Link
            key={to}
            to={to}
            aria-current={isActive ? "page" : undefined}
            className="flex min-w-[64px] flex-col items-center gap-1 px-3 py-3 text-caption transition-colors"
          >
            <Icon
              className={`size-5 transition-colors ${
                isActive
                  ? "text-sekkha-brand-blue"
                  : "text-sekkha-muted"
              }`}
            />
            <span
              className={`text-caption transition-colors ${
                isActive
                  ? "font-medium text-sekkha-brand-blue"
                  : "text-sekkha-muted"
              }`}
            >
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
