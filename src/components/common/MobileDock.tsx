// common/MobileDock
// Floating Apple-style bottom navigation dock for mobile screens (md and below).
// Features a "Lainnya" (...) menu item that toggles a floating vertical action menu.

import { useState, useRef, useEffect } from "react"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  LayoutDashboardIcon,
  CalendarDaysIcon,
  MessageCircleIcon,
  TrophyIcon,
  MoreHorizontalIcon,
  UserIcon,
  SettingsIcon,
  LogOutIcon,
  XIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"

const MAIN_DOCK_ITEMS = [
  { label: "Beranda",   to: "/home",        icon: LayoutDashboardIcon },
  { label: "Events",    to: "/events",      icon: CalendarDaysIcon    },
  { label: "Top",       to: "/leaderboard", icon: TrophyIcon          },
  { label: "Komunitas", to: "/community",   icon: MessageCircleIcon   },
]

// ─── Component ─────────────────────────────────────────────────────────────────

export function MobileDock() {
  const { location } = useRouterState()
  const pathname = location.pathname
  const { logout } = useAuth()
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
    }
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [showMoreMenu])

  const isProfileActive = pathname.startsWith("/home/profile")

  return (
    <div ref={menuRef} className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-md md:hidden">
      
      {/* ── Vertical Floating Menu (Pop-up above dock) ── */}
      {showMoreMenu && (
        <div className="absolute bottom-full mb-3 right-0 left-0 mx-auto w-full overflow-hidden rounded-2xl border border-white/80 bg-sekkha-canvas/90 backdrop-blur-2xl p-2 shadow-2xl transition-all animate-in fade-in-0 slide-in-from-bottom-2">
          
          <div className="flex items-center justify-between px-3 py-2 border-b border-sekkha-hairline-soft/80 mb-1">
            <span className="text-micro-bold text-sekkha-slate uppercase tracking-wider">Menu Utama</span>
            <button
              type="button"
              onClick={() => setShowMoreMenu(false)}
              className="rounded-full p-1 text-sekkha-slate hover:bg-sekkha-surface"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          <div className="space-y-1">
            {/* Profil Saya */}
            <Link
              to="/home/profile"
              onClick={() => setShowMoreMenu(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-caption font-semibold transition-all ${
                isProfileActive
                  ? "bg-sekkha-brand-blue text-white shadow-xs"
                  : "text-sekkha-ink hover:bg-sekkha-surface"
              }`}
            >
              <UserIcon className="size-4" />
              <span>Profil Saya</span>
            </Link>

            {/* Pengaturan */}
            <Link
              to="/home/profile"
              onClick={() => setShowMoreMenu(false)}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-caption font-semibold text-sekkha-ink hover:bg-sekkha-surface transition-all"
            >
              <SettingsIcon className="size-4 text-sekkha-slate" />
              <span>Pengaturan & Target</span>
            </Link>

            {/* Keluar */}
            <button
              type="button"
              onClick={() => {
                setShowMoreMenu(false)
                logout()
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-caption font-semibold text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOutIcon className="size-4 text-red-500" />
              <span>Keluar Akun</span>
            </button>
          </div>

        </div>
      )}

      {/* ── Apple-Style Floating Dock Bar ── */}
      <nav
        aria-label="Navigasi utama"
        className="flex items-center justify-around rounded-2xl border border-white/80 bg-sekkha-canvas/80 backdrop-blur-xl p-1.5 shadow-2xl ring-1 ring-black/5"
      >
        {MAIN_DOCK_ITEMS.map(({ label, to, icon: Icon }) => {
          const isActive =
            to === "/home"
              ? pathname === "/home" || pathname === "/home/"
              : pathname.startsWith(to)

          return (
            <Link
              key={to}
              to={to}
              onClick={() => setShowMoreMenu(false)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-micro transition-all ${
                isActive
                  ? "bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-bold"
                  : "text-sekkha-slate hover:text-sekkha-ink"
              }`}
            >
              <Icon className={`size-5 transition-transform ${isActive ? "scale-110 text-sekkha-brand-blue" : ""}`} />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          )
        })}

        {/* Tombol "Lainnya" (...) */}
        <button
          type="button"
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          aria-expanded={showMoreMenu}
          className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-micro transition-all ${
            showMoreMenu || isProfileActive
              ? "bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-bold"
              : "text-sekkha-slate hover:text-sekkha-ink"
          }`}
        >
          <MoreHorizontalIcon className={`size-5 transition-transform ${showMoreMenu ? "rotate-90 text-sekkha-brand-blue" : ""}`} />
          <span className="text-[11px] font-medium">Lainnya</span>
        </button>
      </nav>

    </div>
  )
}
