/**
 * Unit tests for LandingNavbar (updated for vihara community content revision)
 *
 * Requirements: 1.4, 1.5, 1.6, 2.8, 2.9, 2.10
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { LandingNavbar } from './LandingNavbar'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderNavbar(authState: 'loading' | 'authenticated' | 'unauthenticated', scrollY = 0) {
  return render(<LandingNavbar authState={authState} scrollY={scrollY} />)
}

// ─── Auth state: loading ──────────────────────────────────────────────────────

describe('LandingNavbar — auth state: loading', () => {
  it('renders skeleton elements with animate-pulse class', () => {
    renderNavbar('loading')
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
  })

  // Mobile inline CTA shows a smaller skeleton (72px wide), desktop shows 120px skeletons
  it('renders at least one skeleton element', () => {
    renderNavbar('loading')
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
  })

  it('does not render the "Dashboard" button', () => {
    renderNavbar('loading')
    expect(screen.queryByText('Dashboard')).toBeNull()
  })

  it('does not render the "Sign In" button', () => {
    renderNavbar('loading')
    expect(screen.queryByText('Sign In')).toBeNull()
  })

  it('does not render the "Join for Free" button', () => {
    renderNavbar('loading')
    expect(screen.queryByText('Join for Free')).toBeNull()
  })
})

// ─── Auth state: authenticated ────────────────────────────────────────────────

describe('LandingNavbar — auth state: authenticated', () => {
  it('renders the "Dashboard" button', () => {
    renderNavbar('authenticated')
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1)
  })

  it('does not render skeleton elements', () => {
    renderNavbar('authenticated')
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(0)
  })

  it('does not render the "Sign In" button', () => {
    renderNavbar('authenticated')
    expect(screen.queryByText('Sign In')).toBeNull()
  })

  it('"Dashboard" links to /home', () => {
    renderNavbar('authenticated')
    const links = screen.getAllByText('Dashboard')
    links.forEach((link) => {
      expect((link as HTMLAnchorElement).href).toContain('/home')
    })
  })
})

// ─── Auth state: unauthenticated ─────────────────────────────────────────────

describe('LandingNavbar — auth state: unauthenticated', () => {
  it('renders the "Sign In" button (mobile inline CTA)', () => {
    renderNavbar('unauthenticated')
    expect(screen.getAllByText('Sign In').length).toBeGreaterThanOrEqual(1)
  })

  it('does not render skeleton elements', () => {
    renderNavbar('unauthenticated')
    const skeletons = document.querySelectorAll('.animate-pulse')
    expect(skeletons.length).toBe(0)
  })

  it('does not render the "Dashboard" button', () => {
    renderNavbar('unauthenticated')
    expect(screen.queryByText('Dashboard')).toBeNull()
  })

  it('"Sign In" links to /login', () => {
    renderNavbar('unauthenticated')
    const links = screen.getAllByText('Sign In')
    links.forEach((link) => {
      expect((link as HTMLAnchorElement).href).toContain('/login')
    })
  })
})

// ─── Hamburger menu toggle ────────────────────────────────────────────────────

describe('LandingNavbar — hamburger menu toggle', () => {
  function getHamburgerButton() {
    return screen.getByRole('button', { name: /(buka menu navigasi|open navigation menu)/i })
  }

  it('drawer is closed by default', () => {
    renderNavbar('unauthenticated')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('clicking hamburger button opens the drawer', () => {
    renderNavbar('unauthenticated')
    const hamburger = getHamburgerButton()
    fireEvent.click(hamburger)
    expect(screen.getByRole('dialog')).toBeDefined()
  })

  it('hamburger button has aria-expanded=false initially', () => {
    renderNavbar('unauthenticated')
    const hamburger = getHamburgerButton()
    expect(hamburger.getAttribute('aria-expanded')).toBe('false')
  })

  it('hamburger button has aria-expanded=true when drawer is open', () => {
    renderNavbar('unauthenticated')
    const hamburger = getHamburgerButton()
    fireEvent.click(hamburger)
    expect(hamburger.getAttribute('aria-expanded')).toBe('true')
  })

  it('clicking hamburger again closes the drawer (aria-expanded becomes false)', () => {
    renderNavbar('unauthenticated')
    const hamburger = getHamburgerButton()

    fireEvent.click(hamburger)
    expect(hamburger.getAttribute('aria-expanded')).toBe('true')

    const closeBtn = screen.getByRole('button', { name: /(tutup menu navigasi|close navigation menu)/i })
    fireEvent.click(closeBtn)
    expect(hamburger.getAttribute('aria-expanded')).toBe('false')
  })

  it('pressing Escape key sets aria-expanded to false', () => {
    renderNavbar('unauthenticated')
    const hamburger = getHamburgerButton()

    fireEvent.click(hamburger)
    expect(hamburger.getAttribute('aria-expanded')).toBe('true')

    fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' })
    expect(hamburger.getAttribute('aria-expanded')).toBe('false')
  })

  it('drawer displays all navigation links when open', () => {
    renderNavbar('unauthenticated')
    const hamburger = getHamburgerButton()
    fireEvent.click(hamburger)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeDefined()
    expect(dialog.textContent).toContain('Events')
    expect(dialog.textContent).toContain('Community')
    expect(dialog.textContent).toContain('Leaderboard')
  })

  it('drawer shows "Join for Free" when unauthenticated', () => {
    renderNavbar('unauthenticated')
    const hamburger = getHamburgerButton()
    fireEvent.click(hamburger)

    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('Join for Free')
  })

  it('drawer shows "Dashboard" when authenticated', () => {
    renderNavbar('authenticated')
    const hamburger = screen.getByRole('button', { name: /(buka menu navigasi|open navigation menu)/i })
    fireEvent.click(hamburger)

    const dialog = screen.getByRole('dialog')
    expect(dialog.textContent).toContain('Dashboard')
  })
})
