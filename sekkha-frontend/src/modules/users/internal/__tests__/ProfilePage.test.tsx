import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import { initialAuthState } from "@/modules/auth/internal/context/authReducer"
import type { AuthState } from "@/modules/auth/internal/context/authReducer"
import { ProfilePage } from "../components/ProfilePage"
import { userApi } from "../api/userApi"
import type {
  PointTransactionDto,
  UserProfileDto,
  VerifiedSchoolDto,
} from "../api/userApi"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: "/profile" }),
}))

vi.mock("../api/userApi", () => ({
  userApi: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    getPointsHistory: vi.fn(),
    getVerifiedSchools: vi.fn(),
    requestChangePasswordOtp: vi.fn(),
    changePassword: vi.fn(),
    requestEmailVerification: vi.fn(),
    confirmEmailVerification: vi.fn(),
    deleteMyAccount: vi.fn(),
  },
}))

const mockProfile: UserProfileDto = {
  id: "usr_1",
  user_number: "26010104",
  username: "admin",
  name: "Admin Sekkha",
  email: "admin@sekkha.com",
  email_verified: true,
  role: "admin",
  school_id: "sch_1",
  school: "Universitas Multimedia Nusantara",
  school_status: "verified",
  phone: "081199887766",
  date_of_birth: "2002-04-10",
  stats: {
    total_points: 100,
    current_streak: 1,
    total_attendances: 12,
  },
  joined_at: "2026-11-01T00:00:00Z",
}

const mockSchools: VerifiedSchoolDto[] = [
  { id: "sch_1", name: "Universitas Multimedia Nusantara", status: "verified" },
  { id: "sch_2", name: "SMA Negeri 1 Tangerang", status: "verified" },
]

function makeTransactions(count: number): PointTransactionDto[] {
  return Array.from({ length: count }).map((_, idx) => ({
    id: `tx_${idx + 1}`,
    points: 10,
    points_delta: 10,
    type: "attendance_checkin",
    description: `Transaction ${idx + 1}`,
    created_at: `2026-11-${String(Math.max(1, 28 - idx)).padStart(2, "0")}T09:00:00Z`,
  }))
}

function switchTab(tabElement: HTMLElement) {
  fireEvent.mouseDown(tabElement, { button: 0 })
  fireEvent.click(tabElement)
}

function renderProfilePage(overrides?: { logout?: ReturnType<typeof vi.fn> }) {
  const logout = overrides?.logout ?? vi.fn()
  const authState: AuthState = {
    ...initialAuthState,
    status: "authenticated",
    userId: "usr_1",
    role: "admin",
    username: "admin",
    name: "Admin Sekkha",
  }

  const contextValue = {
    authState,
    login: vi.fn(),
    register: vi.fn(),
    requestRegisterOtp: vi.fn(),
    verifyRegisterOtp: vi.fn(),
    resendRegisterOtp: vi.fn(),
    logout,
    updateUser: vi.fn(),
    refreshUser: vi.fn(),
  }

  return {
    logout,
    ...render(
      <AuthContext.Provider value={contextValue as any}>
        <ProfilePage />
      </AuthContext.Provider>
    ),
  }
}

describe("ProfilePage UI/UX, Layout & Behavioral Improvements", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(userApi.getVerifiedSchools).mockResolvedValue(mockSchools)
  })

  afterEach(() => {
    cleanup()
  })

  it("shows accessible aria-busy loading skeleton then renders lean Hero Card without duplicate ID, email, or phone clutter", async () => {
    let resolveProfile!: (val: UserProfileDto) => void
    vi.mocked(userApi.getProfile).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveProfile = resolve
        })
    )
    vi.mocked(userApi.getPointsHistory).mockResolvedValueOnce([])

    renderProfilePage()

    const skeleton = screen.getByTestId("profile-loading-skeleton")
    expect(skeleton.getAttribute("aria-busy")).toBe("true")

    resolveProfile(mockProfile)

    await waitFor(() => {
      expect(screen.getByTestId("profile-hero-card")).toBeDefined()
    })

    const hero = screen.getByTestId("profile-hero-card")
    expect(within(hero).getByText("Admin Sekkha")).toBeDefined()
    expect(within(hero).getByText("@admin")).toBeDefined()
    expect(within(hero).getByText("100 Pts")).toBeDefined()
    expect(within(hero).getByText("1 Week")).toBeDefined()

    // Duplicate details belong exclusively in Pass & Personal Profile sections
    expect(within(hero).queryByText(/26010104/)).toBeNull()
    expect(within(hero).queryByText(/admin@sekkha\.com/)).toBeNull()
    expect(within(hero).queryByText(/081199887766/)).toBeNull()
  })

  it("renders recoverable error card with Try Again button when loading profile fails", async () => {
    vi.mocked(userApi.getProfile)
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(mockProfile)
    vi.mocked(userApi.getPointsHistory).mockResolvedValue([])

    renderProfilePage()

    await waitFor(() => {
      expect(screen.getByText(/Unable to load profile/i)).toBeDefined()
    })

    fireEvent.click(screen.getByRole("button", { name: /Try Again/i }))

    await waitFor(() => {
      expect(screen.getByTestId("profile-hero-card")).toBeDefined()
    })
    expect(userApi.getProfile).toHaveBeenCalledTimes(2)
  })

  it("uses unclipped concise mobile tab labels and progressive 10-item PointsLedger with error retry and no duplicate Current Balance box", async () => {
    vi.mocked(userApi.getProfile).mockResolvedValueOnce(mockProfile)
    vi.mocked(userApi.getPointsHistory)
      .mockRejectedValueOnce(new Error("History timeout"))
      .mockResolvedValueOnce(makeTransactions(15))

    renderProfilePage()

    await waitFor(() => {
      expect(screen.getByTestId("profile-hero-card")).toBeDefined()
    })

    // 3 responsive tabs exist cleanly
    expect(screen.getByRole("tab", { name: /Pass/i })).toBeDefined()
    expect(screen.getByRole("tab", { name: /Profile/i })).toBeDefined()
    expect(screen.getByRole("tab", { name: /Security/i })).toBeDefined()

    // DigitalMemberCard keeps single-row actions and prominent Enlarge QR
    const enlargeBtn = screen.getByRole("button", { name: /Enlarge QR/i })
    expect(enlargeBtn.className).toContain("bg-[#0a0a0a]")
    const actionsRow = enlargeBtn.parentElement!
    expect(actionsRow.className).toContain("grid-cols-3")

    // PointsLedger error state recovers via Try Again
    await waitFor(() => {
      expect(screen.getByText(/Unable to load points history/i)).toBeDefined()
    })

    fireEvent.click(
      within(screen.getByTestId("points-ledger-section")).getByRole("button", {
        name: /Try Again/i,
      })
    )

    await waitFor(() => {
      expect(screen.getByText("Transaction 1")).toBeDefined()
    })

    // No redundant Current Balance box
    expect(screen.queryByText("Current Balance")).toBeNull()

    // Progressive display: 10 shown initially, remaining 5 hidden behind Show More
    expect(screen.getByText("Transaction 10")).toBeDefined()
    expect(screen.queryByText("Transaction 11")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /Show More/i }))

    expect(screen.getByText("Transaction 15")).toBeDefined()
  })

  it("lazy-loads verified schools only when entering Edit Profile and displays read-only email hint in View Mode", async () => {
    vi.mocked(userApi.getProfile).mockResolvedValueOnce(mockProfile)
    vi.mocked(userApi.getPointsHistory).mockResolvedValueOnce([])

    renderProfilePage()

    await waitFor(() => {
      expect(screen.getByTestId("profile-hero-card")).toBeDefined()
    })

    // Not fetched on initial /profile mount
    expect(userApi.getVerifiedSchools).not.toHaveBeenCalled()

    switchTab(screen.getByRole("tab", { name: /Profile/i }))

    await waitFor(() => {
      expect(screen.getByText("Personal Information")).toBeDefined()
    })

    // Still not fetched in View Mode!
    expect(userApi.getVerifiedSchools).not.toHaveBeenCalled()

    // Read-only Email row + interactive hint pointing to Security tab
    expect(screen.getByText("admin@sekkha.com")).toBeDefined()
    expect(
      within(screen.getByRole("tabpanel")).getByRole("button", {
        name: /Security & Settings/i,
      })
    ).toBeDefined()

    // Enter Edit Mode -> fetches verified schools lazily
    fireEvent.click(screen.getByRole("button", { name: /Edit Profile/i }))

    await waitFor(() => {
      expect(userApi.getVerifiedSchools).toHaveBeenCalledTimes(1)
    })
  })

  it("renders Sign Out prominently at the bottom of the page across tabs with confirmation dialog and avoids duplicating Sign Out inside Security tab", async () => {
    vi.mocked(userApi.getProfile).mockResolvedValueOnce(mockProfile)
    vi.mocked(userApi.getPointsHistory).mockResolvedValueOnce([])

    const logout = vi.fn()
    renderProfilePage({ logout })

    await waitFor(() => {
      expect(screen.getByTestId("profile-hero-card")).toBeDefined()
    })

    // Bottom Sign Out card is directly visible on initial Pass tab & tucked into left rail on desktop
    const layoutGrid = screen.getByTestId("profile-layout-grid")
    expect(layoutGrid.className).toContain("lg:grid-cols-12")

    const bottomSignOutSection = screen.getByTestId("profile-signout-section")
    expect(bottomSignOutSection.className).toContain("lg:row-start-2")
    const signOutBtn = within(bottomSignOutSection).getByRole("button", {
      name: /Sign Out/i,
    })

    // Switch to Security tab and check there is no duplicate Session & Sign Out card inside Security tab
    switchTab(screen.getByRole("tab", { name: /Security/i }))
    await waitFor(() => {
      expect(screen.getByText("Change Account Password")).toBeDefined()
    })
    expect(screen.getAllByRole("button", { name: /Sign Out/i })).toHaveLength(1)

    // Trigger Sign Out confirmation dialog and confirm logout
    fireEvent.click(signOutBtn)

    await waitFor(() => {
      expect(screen.getByText("Confirm Sign Out")).toBeDefined()
    })

    const dialog = screen.getByRole("alertdialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /^Sign Out$/i }))

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1)
    })
  })
})
