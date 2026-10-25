// Feature: mobile-dock
// Tests that MobileDock navigation items match the sidebar order and permissions.

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
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
      "/home/profile",
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
      "/home/profile",
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
})
