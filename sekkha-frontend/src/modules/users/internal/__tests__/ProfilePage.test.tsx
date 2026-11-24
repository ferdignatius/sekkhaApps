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
    getPointsHistoryPage: vi.fn(),
    getActivityHeatmap: vi.fn(),
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
    vi.mocked(userApi.getActivityHeatmap).mockResolvedValue({
      year: 2026,
      active_month: 10,
      total_checkins: 3,
      weeks: [
        {
          week_start: "2026-10-05",
          week_end: "2026-10-11",
          month: 9,
          week_of_month: 2,
          count: 1,
        },
        {
          week_start: "2026-11-02",
          week_end: "2026-11-08",
          month: 10,
          week_of_month: 1,
          count: 1,
        },
        {
          week_start: "2026-11-09",
          week_end: "2026-11-15",
          month: 10,
          week_of_month: 2,
          count: 0,
        },
        {
          week_start: "2026-11-16",
          week_end: "2026-11-22",
          month: 10,
          week_of_month: 3,
          count: 1,
        },
        {
          week_start: "2026-11-23",
          week_end: "2026-11-29",
          month: 10,
          week_of_month: 4,
          count: 0,
        },
      ],
    })
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
    expect(within(hero).getByLabelText("Claimed Account")).toBeDefined()
    expect(within(hero).getByText("Admin Sekkha")).toBeDefined()
    expect(within(hero).getByText("@admin")).toBeDefined()
    expect(within(hero).getByText("100")).toBeDefined()
    expect(within(hero).getByText("Karma Points")).toBeDefined()
    expect(within(hero).getByText("1")).toBeDefined()
    expect(within(hero).getByText("Weekly Streak")).toBeDefined()

    // Duplicate details belong exclusively in Pass & Personal Profile sections
    expect(within(hero).queryByText(/26010104/)).toBeNull()
    expect(within(hero).queryByText(/admin@sekkha\.com/)).toBeNull()
    expect(within(hero).queryByText(/081199887766/)).toBeNull()
  })

  it("renders recoverable error card with Try Again button when loading profile fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { })
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
    consoleSpy.mockRestore()
  })

  it("uses unclipped concise mobile tab labels and cursor-paginated PointsLedger with error retry and no duplicate Current Balance box", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { })
    vi.mocked(userApi.getProfile).mockResolvedValueOnce(mockProfile)
    vi.mocked(userApi.getPointsHistoryPage)
      .mockRejectedValueOnce(new Error("History timeout"))
      .mockResolvedValueOnce({
        items: makeTransactions(15),
        has_more: true,
        next_cursor: "tx_15",
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "tx_16",
            points: 50,
            points_delta: 50,
            type: "event_attendance",
            description: "Transaction 16",
            created_at: "2026-10-16T09:00:00Z",
          },
        ],
        has_more: false,
        next_cursor: null,
      })

    renderProfilePage()

    await waitFor(() => {
      expect(screen.getByTestId("profile-hero-card")).toBeDefined()
    })

    // Tabless single-page Profile with top-bar Member Pass & Settings buttons
    expect(screen.queryByRole("tablist")).toBeNull()
    expect(screen.getByRole("button", { name: /Member Pass/i })).toBeDefined()
    expect(screen.getByRole("button", { name: /Settings/i })).toBeDefined()

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

    // Server-paginated chunking: 15 items loaded first, cursor Load more appends tx_16
    expect(screen.getByText("Transaction 15")).toBeDefined()
    expect(screen.queryByText("Transaction 16")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: /Load more/i }))

    await waitFor(() => {
      expect(screen.getByText("Transaction 16")).toBeDefined()
    })
    expect(userApi.getPointsHistoryPage).toHaveBeenLastCalledWith({
      limit: 15,
      cursor: "tx_15",
    })

    // Clicking Member Pass button in top bar opens DigitalMemberCard bottom drawer and toggles Enlarge QR inline
    fireEvent.click(screen.getByRole("button", { name: /Member Pass/i }))
    const enlargeBtn = await screen.findByRole("button", { name: /Enlarge QR/i })
    expect(enlargeBtn.className).toContain("bg-[#0a0a0a]")
    const actionsRow = enlargeBtn.parentElement!
    expect(actionsRow.className).toContain("grid-cols-3")
    fireEvent.click(enlargeBtn)
    expect(screen.getByTestId("digital-member-card-enlarged-qr")).toBeDefined()
    expect(screen.getByRole("button", { name: /Show Card/i })).toBeDefined()
    consoleSpy.mockRestore()
  })

  it("lazy-loads verified schools only when opening Edit Profile modal from Hero Card and displays read-only email hint", async () => {
    vi.mocked(userApi.getProfile).mockResolvedValueOnce(mockProfile)
    vi.mocked(userApi.getPointsHistory).mockResolvedValueOnce([])

    renderProfilePage()

    await waitFor(() => {
      expect(screen.getByTestId("profile-hero-card")).toBeDefined()
    })

    // Not fetched on initial /profile mount
    expect(userApi.getVerifiedSchools).not.toHaveBeenCalled()

    // Prepare school mocks before clicking Edit Profile in Hero Card
    if (!HTMLElement.prototype.scrollIntoView) {
      HTMLElement.prototype.scrollIntoView = vi.fn()
    }
    vi.mocked(userApi.getVerifiedSchools)
      .mockResolvedValueOnce({
        items: [
          { id: "sch_1", name: "Universitas Multimedia Nusantara", status: "verified" },
          { id: "sch_2", name: "SMA Negeri 1 Tangerang", status: "verified" },
          { id: "sch_3", name: "SMA Tri Ratna", status: "verified" },
          { id: "sch_4", name: "SMA Dhammasavana", status: "verified" },
          { id: "sch_5", name: "Universitas Tarumanagara", status: "verified" },
        ],
        total: 7,
        page: 1,
        limit: 5,
        total_pages: 2,
        has_more: true,
      })
      .mockResolvedValueOnce({
        items: [
          { id: "sch_6", name: "Universitas Indonesia", status: "verified" },
          { id: "sch_7", name: "ITB Bandung", status: "verified" },
        ],
        total: 7,
        page: 2,
        limit: 5,
        total_pages: 2,
        has_more: false,
      })

    fireEvent.click(screen.getByRole("button", { name: /Edit Profile/i }))

    await waitFor(() => {
      expect(screen.getByText("Personal Information")).toBeDefined()
      expect(userApi.getVerifiedSchools).toHaveBeenCalledTimes(1)
      expect(userApi.getVerifiedSchools).toHaveBeenCalledWith({
        page: 1,
        limit: 5,
        search: undefined,
      })
    })

    // Read-only Email row + interactive hint pointing to Security & Settings
    expect(screen.getByText("admin@sekkha.com")).toBeDefined()
    expect(
      screen.getByRole("button", {
        name: /Security & Settings/i,
      })
    ).toBeDefined()

    const schoolTrigger = await waitFor(() => {
      const el = screen.getByRole("combobox") as HTMLButtonElement
      expect(el.disabled).toBe(false)
      return el
    })
    fireEvent.click(schoolTrigger)
    fireEvent.keyDown(schoolTrigger, { key: "ArrowDown" })

    await waitFor(() => {
      expect(
        screen.getByRole("option", { name: /Universitas Tarumanagara/i })
      ).toBeDefined()
    })

    const scrollList = document.querySelector(
      '[data-slot="select-infinite-list"]'
    ) as HTMLElement
    expect(scrollList).not.toBeNull()
    Object.defineProperty(scrollList, "scrollHeight", { value: 260, configurable: true })
    Object.defineProperty(scrollList, "clientHeight", { value: 168, configurable: true })
    Object.defineProperty(scrollList, "scrollTop", { value: 85, configurable: true })
    fireEvent.scroll(scrollList)

    await waitFor(() => {
      expect(userApi.getVerifiedSchools).toHaveBeenCalledWith({
        page: 2,
        limit: 5,
        search: undefined,
      })
      expect(
        screen.getByRole("option", { name: /ITB Bandung/i })
      ).toBeDefined()
    })
  })

  it("opens Settings view from top-bar gear button with grouped Help/Legal, Security navigation, Sign Out, and Delete Account", async () => {
    window.history.replaceState({}, "", "/profile")
    vi.mocked(userApi.getProfile).mockResolvedValueOnce(mockProfile)
    vi.mocked(userApi.getPointsHistory).mockResolvedValueOnce([])

    const logout = vi.fn()
    renderProfilePage({ logout })

    await waitFor(() => {
      expect(screen.getByTestId("profile-hero-card")).toBeDefined()
    })

    // Main view keeps Profile clean without bottom Sign Out clutter
    expect(screen.queryByTestId("profile-signout-section")).toBeNull()

    // Open Settings via top-bar gear button
    fireEvent.click(screen.getByRole("button", { name: /Settings/i }))

    const settingsView = await screen.findByTestId("profile-settings-view")
    expect(within(settingsView).getByText(/Password & Email Security/i)).toBeDefined()
    expect(within(settingsView).getByText(/Help & Support/i)).toBeDefined()
    expect(within(settingsView).getByText(/About Sekkha/i)).toBeDefined()
    expect(within(settingsView).getByText(/Privacy Policy/i)).toBeDefined()
    expect(within(settingsView).getByRole("button", { name: /Delete Account/i })).toBeDefined()

    // Navigate into Security sub-view and verify Change Account Password is shown without duplicate Delete Zone
    fireEvent.click(within(settingsView).getByText(/Password & Email Security/i))
    await waitFor(() => {
      expect(screen.getByText("Change Account Password")).toBeDefined()
    })
    expect(screen.queryByText(/Danger Zone — Delete Account/i)).toBeNull()

    // Back to Settings and confirm Sign Out
    fireEvent.click(screen.getByRole("button", { name: /^Back$/i }))
    const backToSettings = await screen.findByTestId("profile-settings-view")
    fireEvent.click(within(backToSettings).getByRole("button", { name: /Sign Out/i }))

    await waitFor(() => {
      expect(screen.getByText("Confirm Sign Out")).toBeDefined()
    })

    const dialog = screen.getByRole("alertdialog")
    fireEvent.click(within(dialog).getByRole("button", { name: /^Sign Out$/i }))

    await waitFor(() => {
      expect(logout).toHaveBeenCalledTimes(1)
    })
    window.history.replaceState({}, "", "/profile")
  })

  it("renders 52-week contribution graph without month grouping and shows date range + activity count popover on click", async () => {
    window.history.replaceState({}, "", "/profile")
    vi.mocked(userApi.getProfile).mockResolvedValueOnce(mockProfile)
    vi.mocked(userApi.getPointsHistory).mockResolvedValueOnce([])

    renderProfilePage()

    const heatmapCard = await screen.findByTestId("weekly-activity-heatmap")
    expect(within(heatmapCard).getByText("activities in 2026", { exact: false })).toBeDefined()
    expect(within(heatmapCard).getByText("52 Weeks")).toBeDefined()
    expect(within(heatmapCard).queryByText("W1")).toBeNull()
    expect(within(heatmapCard).queryByRole("button", { name: /Full Year/i })).toBeNull()

    const grid = within(heatmapCard).getByTestId("contribution-grid-52")
    const cells = within(grid).getAllByRole("button")
    expect(cells).toHaveLength(52)

    // Clicking a week square opens popover showing week date range and activity count
    const targetCell = within(grid).getByRole("button", {
      name: /Nov 2–8, 2026: 1 activity/i,
    })
    fireEvent.click(targetCell)

    await waitFor(() => {
      expect(screen.getByText("Nov 2–8, 2026")).toBeDefined()
      expect(screen.getByText("1 activity")).toBeDefined()
    })
  })
})
