import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import { initialAuthState } from "@/modules/auth/internal/context/authReducer"
import type { AuthState } from "@/modules/auth/internal/context/authReducer"
import { EventTypeCreatePage } from "../components/EventTypePage"
import { eventTypesApi } from "../api/configureApi"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
}))

vi.mock("../api/configureApi", () => ({
  eventTypesApi: {
    create: vi.fn(),
  },
}))

function renderComponent(authStateOverride: Partial<AuthState> = {}) {
  const authState: AuthState = {
    ...initialAuthState,
    status: "authenticated",
    userId: "usr_admin",
    role: "admin",
    name: "Admin Sekkha",
    ...authStateOverride,
  }

  const contextValue: any = {
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
    <AuthContext.Provider value={contextValue}>
      <EventTypeCreatePage />
    </AuthContext.Provider>
  )
}

describe("EventTypeCreatePage Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("restricts access when user role is not admin", () => {
    renderComponent({ role: "member" })

    expect(screen.getByText("Access Restricted")).toBeDefined()
    expect(
      screen.getByText("Only administrators have permission to add event types.")
    ).toBeDefined()
  })

  it("validates that label is required before submitting", async () => {
    renderComponent({ role: "admin" })

    const submitBtn = screen.getByRole("button", { name: "Save Event Type" })
    const form = submitBtn.closest("form")!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(
        screen.getByText("Label name and theme color are required.")
      ).toBeDefined()
    })
    expect(eventTypesApi.create).not.toHaveBeenCalled()
  })

  it("successfully creates event category and navigates back to list", async () => {
    vi.mocked(eventTypesApi.create).mockResolvedValueOnce({
      id: "evttype_1",
      code: "sunday-puja",
      label: "Sunday Puja",
    })

    renderComponent({ role: "admin" })

    const labelInput = screen.getByPlaceholderText(/regular puja/i)
    fireEvent.change(labelInput, { target: { value: "Sunday Puja" } })

    const submitBtn = screen.getByRole("button", { name: "Save Event Type" })
    const form = submitBtn.closest("form")!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(eventTypesApi.create).toHaveBeenCalledWith({
        label: "Sunday Puja",
        color: "#4262FF",
        description: null,
        default_point_reward: 50,
        is_active: true,
      })
    })

    expect(mockNavigate).toHaveBeenCalledWith({ to: "/configure/master/event-type" })
  })
})
