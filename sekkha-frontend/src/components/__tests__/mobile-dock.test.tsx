// Feature: mobile-dock
// Tests that MobileDock navigation items match the sidebar order and permissions.

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup, act } from "@testing-library/react"
import { MobileDock } from "@/components/common/MobileDock"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import { initialAuthState } from "@/modules/auth/internal/context/authReducer"
import type {
  AuthState,
  UserRole,
} from "@/modules/auth/internal/context/authReducer"

let currentPath = "/home"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to, "aria-current": ariaCurrent, className }: any) => (
    <a href={to} aria-current={ariaCurrent} className={className}>
      {children}
    </a>
  ),
  useRouterState: () => ({ location: { pathname: currentPath } }),
}))

afterEach(() => {
  cleanup()
  currentPath = "/home"
})

function renderDock(role: UserRole = "activist") {
  const authState: AuthState = {
    ...initialAuthState,
    status: "authenticated",
    role,
    userId: "test-user",
  }

  const value = {
    authState,
    login: vi.fn(),
    register: vi.fn(),
    requestRegisterOtp: vi.fn(),
    verifyRegisterOtp: vi.fn(),
    resendRegisterOtp: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    refreshUser: vi.fn(),
  }

  return render(
    <AuthContext.Provider value={value as any}>
      <MobileDock />
    </AuthContext.Provider>
  )
}

describe("MobileDock", () => {
  it("renders standard navigation items in order without People for 'activist'", () => {
    renderDock("activist")

    const links = screen.getAllByRole("link")
    const labels = links.map((link) => link.textContent?.trim())

    expect(labels).toEqual(["Home", "Events", "Leaderboard", "Profile"])
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/home",
      "/events",
      "/leaderboard",
      "/profile",
    ])
    expect(screen.queryByText("People")).toBeNull()
  })

  it("hides People menu when user role is 'member'", () => {
    renderDock("member")

    const links = screen.getAllByRole("link")
    const labels = links.map((link) => link.textContent?.trim())

    expect(labels).toEqual(["Home", "Events", "Leaderboard", "Profile"])
    expect(screen.queryByText("People")).toBeNull()
  })

  it("renders all 5 items including People in order when user role is 'organizer'", () => {
    renderDock("organizer")

    const links = screen.getAllByRole("link")
    const labels = links.map((link) => link.textContent?.trim())

    expect(labels).toEqual([
      "Home",
      "Events",
      "Leaderboard",
      "People",
      "Profile",
    ])
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/home",
      "/events",
      "/leaderboard",
      "/people",
      "/profile",
    ])
    expect(screen.getByText("People")).toBeDefined()
  })

  it("renders all 5 items including People in order when user role is 'admin'", () => {
    renderDock("admin")

    const links = screen.getAllByRole("link")
    const labels = links.map((link) => link.textContent?.trim())

    expect(labels).toEqual([
      "Home",
      "Events",
      "Leaderboard",
      "People",
      "Profile",
    ])
    expect(screen.getByText("People")).toBeDefined()
  })

  it("sets aria-current='page' on the active route", () => {
    currentPath = "/events"
    renderDock("activist")

    const eventsLink = screen.getByRole("link", { name: /events/i })
    expect(eventsLink.getAttribute("aria-current")).toBe("page")

    const homeLink = screen.getByRole("link", { name: /home/i })
    expect(homeLink.getAttribute("aria-current")).toBeNull()
  })

  it("does not render More overflow button or menu on mobile dock for organizer and admin", () => {
    renderDock("organizer")
    expect(screen.queryByRole("button", { name: /more/i })).toBeNull()
    expect(screen.queryByText("More")).toBeNull()

    const links = screen.getAllByRole("link")
    const hrefs = links.map((link) => link.getAttribute("href"))
    expect(hrefs).not.toContain("/insight")
    expect(hrefs).not.toContain("/configure/master/event-type")
    cleanup()

    renderDock("admin")
    expect(screen.queryByRole("button", { name: /more/i })).toBeNull()
    expect(screen.queryByText("More")).toBeNull()
  })

  it("hides MobileDock automatically when the mobile virtual keyboard opens", () => {
    const origInnerHeight = window.innerHeight
    const origVisualViewport = window.visualViewport
    const listeners: Record<string, Array<() => void>> = {}
    const mockVv = {
      height: 844,
      offsetTop: 0,
      addEventListener: (ev: string, fn: () => void) => {
        listeners[ev] = listeners[ev] || []
        listeners[ev].push(fn)
      },
      removeEventListener: vi.fn(),
    }

    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: 844,
    })
    Object.defineProperty(window, "visualViewport", {
      writable: true,
      configurable: true,
      value: mockVv,
    })

    try {
      renderDock("member")
      expect(screen.getByRole("navigation", { name: /bottom navigation/i })).toBeTruthy()

      // Simulate virtual keyboard opening (300px height)
      act(() => {
        mockVv.height = 544
        listeners.resize?.forEach((fn) => fn())
      })

      expect(screen.queryByRole("navigation", { name: /bottom navigation/i })).toBeNull()

      // Simulate keyboard closing
      act(() => {
        mockVv.height = 844
        listeners.resize?.forEach((fn) => fn())
      })

      expect(screen.getByRole("navigation", { name: /bottom navigation/i })).toBeTruthy()
    } finally {
      Object.defineProperty(window, "innerHeight", {
        writable: true,
        configurable: true,
        value: origInnerHeight,
      })
      Object.defineProperty(window, "visualViewport", {
        writable: true,
        configurable: true,
        value: origVisualViewport,
      })
    }
  })

  it("hides MobileDock during focused Event Detail view and restores when closed", () => {
    currentPath = "/events"
    renderDock("member")
    expect(screen.getByRole("navigation", { name: /bottom navigation/i })).toBeTruthy()

    act(() => {
      window.dispatchEvent(
        new CustomEvent("sekkha:mobile-dock-visibility", {
          detail: { hidden: true },
        })
      )
    })
    expect(screen.queryByRole("navigation", { name: /bottom navigation/i })).toBeNull()

    act(() => {
      window.dispatchEvent(
        new CustomEvent("sekkha:mobile-dock-visibility", {
          detail: { hidden: false },
        })
      )
    })
    expect(screen.getByRole("navigation", { name: /bottom navigation/i })).toBeTruthy()
  })
})
