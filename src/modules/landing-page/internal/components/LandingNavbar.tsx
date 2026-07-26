import * as React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Button } from '@/components/base/Button'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type AuthState = 'loading' | 'authenticated' | 'unauthenticated'

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
  { label: 'Kegiatan', href: '#events' },
  { label: 'Komunitas', href: '#features' },
  { label: 'Leaderboard', href: '#leaderboard' },
]

// ─── Desktop CTA (right side, desktop/tablet only) ───────────────────────────

function DesktopCTA({ authState }: { authState: AuthState }) {
  if (authState === 'loading') {
    return (
      <div className="hidden md:flex items-center gap-3">
        <div
          className="animate-pulse bg-sekkha-hairline rounded-md"
          style={{ width: 120, height: 36 }}
          aria-hidden="true"
        />
        <div
          className="animate-pulse bg-sekkha-hairline rounded-md"
          style={{ width: 140, height: 36 }}
          aria-hidden="true"
        />
      </div>
    )
  }

  if (authState === 'authenticated') {
    return (
      <div className="hidden md:flex items-center">
        <Button variant="primary" asChild>
          <a href="/dashboard">Dashboard</a>
        </Button>
      </div>
    )
  }

  return (
    <div className="hidden md:flex items-center gap-3">
      <Button variant="secondary" asChild>
        <a href="/login" className="!text-sekkha-ink font-semibold">Masuk</a>
      </Button>
      <Button variant="primary" asChild>
        <a href="/sign-up" className="!text-white font-semibold">Bergabung Gratis</a>
      </Button>
    </div>
  )
}

// ─── Mobile inline CTA (always visible on mobile, beside hamburger) ───────────

function MobileInlineCTA({ authState }: { authState: AuthState }) {
  if (authState === 'loading') {
    return (
      <div
        className="md:hidden animate-pulse bg-sekkha-hairline rounded-full"
        style={{ width: 72, height: 34 }}
        aria-hidden="true"
      />
    )
  }

  if (authState === 'authenticated') {
    return (
      <Button variant="primary" asChild className="md:hidden text-body-sm px-4 py-2 h-auto">
        <a href="/dashboard">Dashboard</a>
      </Button>
    )
  }

  return (
    <Button variant="primary" asChild className="md:hidden text-body-sm px-4 py-2 h-auto">
      <a href="/login">Masuk</a>
    </Button>
  )
}

// ─── Hamburger Icon ───────────────────────────────────────────────────────────

function HamburgerIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      width={24}
      height={24}
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
            <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
          </motion.g>
        ) : (
          <motion.g
            key="open"
            initial={{ opacity: 0, rotate: 45 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: -45 }}
            transition={{ duration: 0.18 }}
          >
            <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
            <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth={2} strokeLinecap="round" />
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

function MobileDrawer({ isOpen, onClose, authState, navLinks, firstFocusableRef }: MobileDrawerProps) {
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />

          {/* Drawer panel */}
          <motion.div
            id="mobile-nav-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-x-0 top-16 z-50 bg-sekkha-canvas border-t border-sekkha-hairline shadow-lg"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <nav aria-label="Mobile navigation" className="flex flex-col px-4 py-6 gap-4">
              {navLinks.map((link, idx) => (
                <a
                  key={link.href}
                  href={link.href}
                  ref={idx === 0 ? firstFocusableRef : undefined}
                  className={cn(
                    'text-body-sm-medium text-sekkha-ink py-2',
                    'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sekkha-primary focus-visible:outline-none rounded-sm',
                  )}
                  onClick={onClose}
                >
                  {link.label}
                </a>
              ))}

              {/* Extra CTA in drawer */}
              <div className="flex flex-col gap-3 pt-2 border-t border-sekkha-hairline">
                {authState === 'unauthenticated' && (
                  <Button variant="secondary" asChild>
                    <a href="/sign-up" onClick={onClose}>Bergabung Gratis</a>
                  </Button>
                )}
                {authState === 'authenticated' && (
                  <Button variant="primary" asChild>
                    <a href="/home" onClick={onClose}>Dashboard</a>
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
 * LandingNavbar — sticky top navigation for the Sekkha landing page.
 *
 * Mobile: login/home button always visible beside hamburger icon.
 * Desktop: full nav links + auth CTA on the right.
 *
 * @requirements 1.4, 1.5, 1.6, 2.1–2.10
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
      const id = requestAnimationFrame(() => firstDrawerLinkRef.current?.focus())
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
  const isScrolledPastNavbar = scrollY > 64

  return (
    <header
      className={cn(
        'sticky top-0 z-50 h-16 bg-sekkha-canvas transition-all duration-300',
        isScrolledPastNavbar && 'backdrop-blur-md bg-white/80 glass-nav',
        hasScrolled && 'border-b border-sekkha-hairline shadow-sm',
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center justify-between px-4 md:px-8">

        {/* Logo */}
        <a
          href="/"
          className={cn(
            'text-heading-5 text-sekkha-ink shrink-0',
            'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sekkha-primary focus-visible:outline-none rounded-sm',
          )}
          aria-label="Sekkha — Kembali ke beranda"
        >
          Sekkha
        </a>

        {/* Desktop nav links */}
        <nav
          aria-label="Main navigation"
          className="hidden md:flex items-center gap-6"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={cn(
                'text-body-sm-medium text-sekkha-ink',
                'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sekkha-primary focus-visible:outline-none rounded-sm',
              )}
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop CTA */}
        <DesktopCTA authState={authState} />

        {/* Mobile right cluster: inline login/home btn + hamburger */}
        <div className="md:hidden flex items-center gap-2">
          <MobileInlineCTA authState={authState} />

          <button
            ref={hamburgerRef}
            type="button"
            aria-label={isDrawerOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            aria-expanded={isDrawerOpen}
            aria-controls="mobile-nav-drawer"
            onClick={isDrawerOpen ? closeDrawer : openDrawer}
            className={cn(
              'flex items-center justify-center text-sekkha-ink p-1',
              'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sekkha-primary focus-visible:outline-none rounded-sm',
            )}
          >
            <HamburgerIcon isOpen={isDrawerOpen} />
          </button>
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
