// Feature: mobile-dock
// Tests that MobileDock navigation items match the sidebar order and permissions.

import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, cleanup } from "@testing-library/react"
import { MobileDock } from "@/components/common/MobileDock"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import {
  initialAuthState,
  type AuthState,
  type UserRole,
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

function renderDock(role: UserRole = "aktivis") {
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
    initiateGoogleOAuth: vi.fn(),
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
  it("renders navigation items in the same order as sidebar: Home, Events, Leaderboard, Community, Profile", () => {
    renderDock("aktivis")

    const links = screen.getAllByRole("link")
    const labels = links.map((link) => link.textContent?.trim())

    expect(labels).toEqual([
      "Home",
      "Events",
      "Leaderboard",
      "Community",
      "Profile",
    ])
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/home",
      "/events",
      "/leaderboard",
      "/teams",
      "/home/profile",
    ])
  })

  it("hides Community (/teams) when user role is 'umat' (matching sidebar)", () => {
    renderDock("umat")

    const links = screen.getAllByRole("link")
    const labels = links.map((link) => link.textContent?.trim())

    expect(labels).toEqual(["Home", "Events", "Leaderboard", "Profile"])
    expect(screen.queryByText("Community")).toBeNull()
  })

  it("sets aria-current='page' on the active route", () => {
    currentPath = "/events"
    renderDock("aktivis")

    const eventsLink = screen.getByRole("link", { name: /events/i })
    expect(eventsLink.getAttribute("aria-current")).toBe("page")

    const homeLink = screen.getByRole("link", { name: /home/i })
    expect(homeLink.getAttribute("aria-current")).toBeNull()
  })
})
