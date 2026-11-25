import * as React from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/base/Button"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthState = "loading" | "authenticated" | "unauthenticated"

interface NavLink {
  label: string
  href: string
}

interface LandingNavbarProps {
  authState: AuthState
  scrollY: number
}

// ─── Nav links ────────────────────────────────────────────────────────────────

const NAV_LINKS: NavLink[] = [
  { label: "Events", href: "#events" },
  { label: "Community", href: "#features" },
  { label: "Leaderboard", href: "#leaderboard" },
]

// ─── Desktop CTA (right side, desktop/tablet only) ───────────────────────────

function DesktopCTA({ authState }: { authState: AuthState }) {
  if (authState === "loading") {
    return (
      <div className="hidden items-center md:flex">
        <div
          className="animate-pulse rounded-full bg-sekkha-hairline"
          style={{ width: 96, height: 38 }}
          aria-hidden="true"
        />
      </div>
    )
  }

  return (
    <div className="hidden items-center md:flex">
      {authState === "authenticated" ? (
        <Button
          variant="primary"
          asChild
          className="h-[38px] rounded-full bg-[#0a0a0a] px-5 text-xs font-semibold !text-white shadow-xs transition-colors hover:bg-[#1f1f1f] sm:text-sm"
        >
          <a href="/home">Dashboard</a>
        </Button>
      ) : (
        <Button
          variant="primary"
          asChild
          className="h-[38px] rounded-full bg-[#0a0a0a] px-5 text-xs font-semibold !text-white shadow-xs transition-colors hover:bg-[#1f1f1f] sm:text-sm"
        >
          <a href="/login">Sign In</a>
        </Button>
      )}
    </div>
  )
}

// ─── Mobile inline CTA (always visible on mobile, beside hamburger) ───────────

function MobileInlineCTA({ authState }: { authState: AuthState }) {
  if (authState === "loading") {
    return (
      <div
        className="animate-pulse rounded-full bg-sekkha-hairline md:hidden"
        style={{ width: 72, height: 36 }}
        aria-hidden="true"
      />
    )
  }

  if (authState === "authenticated") {
    return (
      <Button
        variant="primary"
        asChild
        className="h-[36px] rounded-full bg-[#0a0a0a] px-4 text-xs font-semibold !text-white md:hidden"
      >
        <a href="/home">Dashboard</a>
      </Button>
    )
  }

  return (
    <Button
      variant="primary"
      asChild
      className="h-[36px] rounded-full bg-[#0a0a0a] px-4 text-xs font-semibold !text-white md:hidden"
    >
      <a href="/login">Sign In</a>
    </Button>
  )
}

// ─── Hamburger Icon ───────────────────────────────────────────────────────────

function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isOpen ? (
          <motion.g
            key="close"
            initial={{ opacity: 0, rotate: -45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 45 }}
            transition={{ duration: 0.18 }}
          >
            <line
              x1="6"
              y1="6"
              x2="18"
              y2="18"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <line
              x1="18"
              y1="6"
              x2="6"
              y2="18"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </motion.g>
        ) : (
          <motion.g
            key="open"
            initial={{ opacity: 0, rotate: 45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: -45 }}
            transition={{ duration: 0.18 }}
          >
            <line
              x1="4"
              y1="7"
              x2="20"
              y2="7"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <line
              x1="4"
              y1="12"
              x2="20"
              y2="12"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
            <line
              x1="4"
              y1="17"
              x2="20"
              y2="17"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
            />
          </motion.g>
        )}
      </AnimatePresence>
    </svg>
  )
}

// ─── Mobile Drawer ────────────────────────────────────────────────────────────

interface MobileDrawerProps {
  isOpen: boolean
  onClose: () => void
  authState: AuthState
  navLinks: NavLink[]
  firstFocusableRef: React.RefObject<HTMLAnchorElement | null>
}

function MobileDrawer({
  isOpen,
  onClose,
  authState,
  navLinks,
  firstFocusableRef,
}: MobileDrawerProps) {
  const drawerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (e.key !== "Tab") return
      const drawer = drawerRef.current
      if (!drawer) return
      const focusables = drawer.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="pointer-events-auto fixed inset-0 z-40 bg-black/20 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Floating Drawer Panel */}
          <motion.div
            ref={drawerRef}
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="pointer-events-auto fixed inset-x-4 top-[4.75rem] z-50 mx-auto max-h-[calc(100dvh-5.5rem)] max-w-[1216px] overflow-y-auto rounded-3xl border border-white/75 bg-[#fffaf0]/90 shadow-xl ring-1 ring-[#e5dec9]/80 backdrop-blur-xl"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav
              aria-label="Mobile navigation"
              className="flex flex-col gap-3 px-6 py-5"
            >
              {navLinks.map((link, idx) => (
                <a
                  key={link.href}
                  href={link.href}
                  ref={idx === 0 ? firstFocusableRef : undefined}
                  className={cn(
                    "text-body-md py-2 font-medium text-sekkha-ink",
                    "rounded-md focus-visible:ring-2 focus-visible:ring-sekkha-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                  )}
                  onClick={onClose}
                >
                  {link.label}
                </a>
              ))}

              {/* Extra CTA in drawer */}
              <div className="flex flex-col gap-2.5 border-t border-[#e5dec9] pt-4">
                {authState === "unauthenticated" && (
                  <Button
                    variant="primary"
                    asChild
                    className="h-11 rounded-full bg-[#0a0a0a] font-semibold !text-white"
                  >
                    <a href="/login" onClick={onClose}>
                      Sign In
                    </a>
                  </Button>
                )}
                {authState === "authenticated" && (
                  <Button
                    variant="primary"
                    asChild
                    className="h-11 rounded-full bg-[#0a0a0a] font-semibold !text-white"
                  >
                    <a href="/home" onClick={onClose}>
                      Dashboard
                    </a>
                  </Button>
                )}
              </div>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── LandingNavbar ────────────────────────────────────────────────────────────

/**
 * LandingNavbar — clean glassmorphism capsule navigation bar aligned to container width.
 */
export function LandingNavbar({ authState, scrollY }: LandingNavbarProps) {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false)

  const hamburgerRef = React.useRef<HTMLButtonElement>(null)
  const firstDrawerLinkRef = React.useRef<HTMLAnchorElement | null>(null)

  const openDrawer = React.useCallback(() => setIsDrawerOpen(true), [])
  const closeDrawer = React.useCallback(() => setIsDrawerOpen(false), [])

  // Focus management: move focus to first drawer link when drawer opens
  React.useEffect(() => {
    if (isDrawerOpen) {
      const id = requestAnimationFrame(() =>
        firstDrawerLinkRef.current?.focus()
      )
      return () => cancelAnimationFrame(id)
    }
  }, [isDrawerOpen])

  // Focus management: return focus to hamburger when drawer closes
  const previousDrawerOpen = React.useRef(false)
  React.useEffect(() => {
    if (previousDrawerOpen.current && !isDrawerOpen) {
      hamburgerRef.current?.focus()
    }
    previousDrawerOpen.current = isDrawerOpen
  }, [isDrawerOpen])

  const hasScrolled = scrollY > 0

  return (
    <header className="pointer-events-none sticky top-0 z-50 w-full pt-3 sm:pt-4">
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        <div
          data-capsule="true"
          className={cn(
            "pointer-events-auto flex h-14 w-full items-center justify-between gap-4 rounded-full border border-white/75 px-3.5 ring-1 ring-[#e5dec9]/75 backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 sm:h-[60px] sm:px-5",
            hasScrolled
              ? "bg-[#fffaf0]/75 shadow-[0_12px_36px_rgba(68,51,28,0.12)]"
              : "bg-[#fffaf0]/60 shadow-[0_4px_24px_rgba(68,51,28,0.06)]"
          )}
        >
          {/* Logo */}
          <a
            href="/"
            className={cn(
              "text-heading-5 flex min-h-[44px] shrink-0 items-center gap-2.5 pl-1 font-bold text-sekkha-ink",
              "rounded-full focus-visible:ring-2 focus-visible:ring-sekkha-primary focus-visible:ring-offset-2 focus-visible:outline-none"
            )}
            aria-label="Sekkha — Back to home"
          >
            <img
              src="/sekkha_logo.svg"
              alt=""
              width={28}
              height={28}
              decoding="async"
              className="size-7 object-contain"
            />
            <span>Sekkha</span>
          </a>

          {/* Desktop nav links (centered) */}
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 md:flex"
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={cn(
                  "text-body-sm font-medium text-sekkha-ink/85 transition-colors hover:text-sekkha-ink",
                  "rounded-full px-1 py-2 focus-visible:ring-2 focus-visible:ring-sekkha-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                )}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop CTA: single clean pill */}
          <DesktopCTA authState={authState} />

          {/* Mobile right cluster: inline Sign In / Dashboard pill + hamburger */}
          <div className="flex items-center gap-1.5 md:hidden">
            <MobileInlineCTA authState={authState} />

            <button
              ref={hamburgerRef}
              type="button"
              aria-label={
                isDrawerOpen ? "Close navigation menu" : "Open navigation menu"
              }
              aria-expanded={isDrawerOpen}
              aria-controls="mobile-nav-drawer"
              onClick={isDrawerOpen ? closeDrawer : openDrawer}
              className={cn(
                "flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full text-sekkha-ink",
                "focus-visible:ring-2 focus-visible:ring-sekkha-primary focus-visible:ring-offset-2 focus-visible:outline-none"
              )}
            >
              <HamburgerIcon isOpen={isDrawerOpen} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        authState={authState}
        navLinks={NAV_LINKS}
        firstFocusableRef={firstDrawerLinkRef}
      />
    </header>
  )
}

export default LandingNavbar
