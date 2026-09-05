// Feature: profile-sync
// Verifies that the AppSidebar's bottom user card reflects the latest Full Name
// after a profile update event is dispatched (regression test for the bug where
// the sidebar kept showing the old name even after the user updated their profile).

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { render, screen, act, cleanup } from "@testing-library/react"
import { MemoryRouter } from "@tanstack/react-router"
import { AppSidebar } from "@/components/app-sidebar"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import { authReducer, initialAuthState, type AuthState, type UserRole } from "@/modules/auth/internal/context/authReducer"
import { api } from "@/lib/api"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeAuthState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    ...initialAuthState,
    status: "authenticated",
    accessToken: "test-token",
    userId: "user-1",
    role: "umat" as UserRole,
    name: "Old Name",
    ...overrides,
  }
}

function renderWithAuth(authState: AuthState, apiGetMock: ReturnType<typeof vi.fn>) {
  // Mock the api module so we can control /users/me responses.
  vi.spyOn(api, "get").mockImplementation(apiGetMock as any)

  // Create a mutable authState that the test's updateUser can mutate.
  // This simulates how the reducer would produce a new state.
  let currentState = { ...authState }

  const value = {
    authState: currentState,
    login: vi.fn(),
    register: vi.fn(),
    requestRegisterOtp: vi.fn(),
    verifyRegisterOtp: vi.fn(),
    resendRegisterOtp: vi.fn(),
    logout: vi.fn(),
    initiateGoogleOAuth: vi.fn(),
    updateUser: (data: Partial<{ name: string | null; role: UserRole; email: string | null }>) => {
      currentState = authReducer(currentState, { type: "AUTH_UPDATE_USER", payload: data })
    },
    refreshUser: vi.fn(),
  }

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <AuthContext.Provider value={value as any}>{children}</AuthContext.Provider>
    </MemoryRouter>
  )

  const result = render(<AppSidebar />, { wrapper: Wrapper })

  return { ...result, value, getState: () => currentState }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("AppSidebar — profile name sync", () => {
  beforeEach(() => {
    // Clear any window event listeners from previous tests
    vi.restoreAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders the initial Full Name from authState.name", () => {
    renderWithAuth(makeAuthState({ name: "Ferdi" }), vi.fn().mockResolvedValue({ name: "Ferdi" }))

    // The bottom user card should show "Ferdi"
    const userNameElements = screen.getAllByText("Ferdi")
    expect(userNameElements.length).toBeGreaterThan(0)
  })

  it("updates the displayed Full Name when sekkha:profile_updated event is dispatched", () => {
    const { rerender, getState, value } = renderWithAuth(
      makeAuthState({ name: "Ferdi" }),
      vi.fn().mockResolvedValue({ name: "Ferdi" }),
    )

    // Verify initial state
    expect(screen.getAllByText("Ferdi").length).toBeGreaterThan(0)
    expect(screen.queryByText("Budi Baru")).toBeNull()

    // Simulate ProfilePage saving a new name and dispatching the event.
    // Our test harness's updateUser mutates the closure's currentState.
    act(() => {
      window.dispatchEvent(
        new CustomEvent("sekkha:profile_updated", { detail: { name: "Budi Baru" } }),
      )
    })

    // The authState should have been updated
    expect(getState().name).toBe("Budi Baru")

    // Re-render with the new state so the sidebar picks it up
    act(() => {
      rerender(
        <MemoryRouter>
          <AuthContext.Provider value={{ ...value, authState: getState() } as any}>
            <AppSidebar />
          </AuthContext.Provider>
        </MemoryRouter>,
      )
    })

    // The new name should be visible in the user card
    expect(screen.getAllByText("Budi Baru").length).toBeGreaterThan(0)
  })

  it("does NOT throw or lose state when the dispatched name matches the current state (no-op guard)", () => {
    renderWithAuth(
      makeAuthState({ name: "Same Name" }),
      vi.fn().mockResolvedValue({ name: "Same Name" }),
    )

    // Dispatch event with the SAME name
    expect(() => {
      act(() => {
        window.dispatchEvent(
          new CustomEvent("sekkha:profile_updated", { detail: { name: "Same Name" } }),
        )
      })
    }).not.toThrow()

    // The name should still be rendered
    expect(screen.getAllByText("Same Name").length).toBeGreaterThan(0)
  })
})
