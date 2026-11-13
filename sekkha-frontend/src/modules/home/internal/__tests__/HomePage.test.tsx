import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import { render, screen, cleanup, fireEvent, waitFor } from "@testing-library/react"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import { initialAuthState } from "@/modules/auth/internal/context/authReducer"
import type { AuthState } from "@/modules/auth/internal/context/authReducer"
import { HomePage } from "../components/HomePage"
import { api } from "@/lib/api"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/home" }),
}))

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
  },
}))

vi.mock("../components/DhammaWidget", () => ({
  DhammaWidget: () => <div data-testid="dhamma-widget">Mock Dhamma Widget</div>,
}))

vi.mock("@/components/common/MemberQrModal", () => ({
  MemberQrModal: ({ open, onClose, name, userNumber }: any) =>
    open ? (
      <div data-testid="mock-qr-modal">
        <span>{name}</span>
        <span>{userNumber}</span>
        <button type="button" onClick={onClose}>
          Close QR
        </button>
      </div>
    ) : null,
}))

const mockDashboardData = {
  profile: {
    name: "Siddhartha Gautama",
    user_number: "2026111101",
    role: "member",
    points: 420,
  },
  streak: {
    current_streak: 5,
    longest_streak: 8,
    last_attended: "2026-11-10T10:00:00Z",
  },
  season: {
    id: "sea_1",
    name: "Season Dhamma 2026",
    code: "S2026-01",
    start_date: "2026-01-01T00:00:00Z",
    end_date: "2026-12-31T23:59:59Z",
    target_attendance: 20,
    current_attendance: 8,
    days_left: 48,
  },
  events: [
    {
      id: "evt_1",
      title: "Sunday Puja & Meditation",
      event_date: "2026-11-15T09:00:00Z",
      status: "scheduled",
      is_eligible: true,
      category: "Weekly Service",
      location: "Main Dhammasala",
    },
  ],
  activities: [
    {
      id: "act_1",
      title: "Dhamma Class Attendance",
      created_at: "2026-11-10T10:30:00Z",
      points_earned: 25,
      method: "qr_code",
      event_title: "Sunday Puja",
    },
  ],
}

function renderHomePage(authStateOverride: Partial<AuthState> = {}) {
  const authState: AuthState = {
    ...initialAuthState,
    status: "authenticated",
    userId: "usr_123",
    role: "member",
    name: "Siddhartha Gautama",
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
      <HomePage />
    </AuthContext.Provider>
  )
}

describe("HomePage Component Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("renders loading message while dashboard data is fetching", () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {}))
    renderHomePage()

    expect(screen.getByRole("status").textContent).toContain("Loading dashboard...")
  })

  it("renders dashboard greeting, karma points, streak count and upcoming events upon success", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockDashboardData)
    renderHomePage()

    await waitFor(() => {
      expect(screen.getByText("Siddhartha Gautama")).toBeDefined()
    })

    expect(screen.getByText("420 Pts")).toBeDefined()
    expect(screen.getByText("5x Active")).toBeDefined()
    expect(screen.getByText("Sunday Puja & Meditation")).toBeDefined()
    expect(screen.getByText("Season Dhamma 2026")).toBeDefined()
  })

  it("renders error alert with retry button when API fails and re-fetches on click", async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error("Network disconnect"))
    renderHomePage()

    await waitFor(() => {
      expect(screen.getByText("Failed to load dashboard. Please try again.")).toBeDefined()
    })

    const retryButton = screen.getByRole("button", { name: "Retry" })
    expect(retryButton).toBeDefined()

    vi.mocked(api.get).mockResolvedValueOnce(mockDashboardData)
    fireEvent.click(retryButton)

    await waitFor(() => {
      expect(screen.getByText("Siddhartha Gautama")).toBeDefined()
    })
  })

  it("opens QR modal when Show QR card button is clicked and closes on close action", async () => {
    vi.mocked(api.get).mockResolvedValueOnce(mockDashboardData)
    renderHomePage()

    await waitFor(() => {
      expect(screen.getByText("Siddhartha Gautama")).toBeDefined()
    })

    const qrButtons = screen.getAllByRole("button", { name: "Attendance QR Code" })
    const activeQrButton = qrButtons.find((btn) => !btn.hasAttribute("disabled")) ?? qrButtons[0]
    fireEvent.click(activeQrButton)

    await waitFor(() => {
      expect(screen.getByTestId("mock-qr-modal")).toBeDefined()
    })

    const closeBtn = screen.getByRole("button", { name: "Close QR" })
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByTestId("mock-qr-modal")).toBeNull()
    })
  })
})
