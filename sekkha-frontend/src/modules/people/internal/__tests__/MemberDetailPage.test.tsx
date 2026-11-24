import { describe, it, expect, vi, afterEach } from "vitest"
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
  within,
} from "@testing-library/react"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import { initialAuthState } from "@/modules/auth/internal/context/authReducer"
import type {
  AuthState,
  UserRole,
} from "@/modules/auth/internal/context/authReducer"
import { MemberDetailPage } from "../components/MemberDetailPage"
import { peopleApi } from "../api/peopleApi"
import type { MemberDetailDto } from "../api/peopleApi"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
  useParams: () => ({ memberId: "usr_target" }),
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  mockNavigate.mockReset()
})

function makeMemberDetail(
  overrides: Partial<MemberDetailDto> = {}
): MemberDetailDto {
  return {
    id: "usr_target",
    name: "Budi Santoso",
    username: "budi1234",
    email: null,
    school: "SMA Negeri 1",
    school_id: "sch_1",
    role: "member",
    user_number: "2026111001",
    is_claimed: false,
    created_at: "2026-11-01T00:00:00Z",
    points: 100,
    current_streak: 2,
    heatmap: {
      year: 2026,
      active_month: 10,
      total_checkins: 2,
      weeks: [
        {
          week_start: "2026-11-02",
          week_end: "2026-11-08",
          month: 10,
          week_of_month: 1,
          count: 2,
        },
      ],
    },
    attendances: [],
    ...overrides,
  }
}

function renderWithAuth(
  role: UserRole,
  actorId: string,
  targetMember: MemberDetailDto
) {
  vi.spyOn(peopleApi, "getMember").mockResolvedValue(targetMember)

  const authState: AuthState = {
    ...initialAuthState,
    status: "authenticated",
    role,
    userId: actorId,
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
      <MemberDetailPage memberId={targetMember.id} />
    </AuthContext.Provider>
  )
}

async function openActionsDrawer() {
  const fab = await screen.findByRole("button", {
    name: /Administrative actions/i,
  })
  fireEvent.click(fab)
  await waitFor(() => {
    expect(screen.getByText("Administrative Actions")).toBeTruthy()
  })
}

describe("MemberDetailPage RBAC & Self-Protection UI Guards", () => {
  it("disables Reset Temp Pass, Change Role, and Delete when Admin views their own account", async () => {
    const adminSelf = makeMemberDetail({
      id: "usr_admin_1",
      name: "Super Admin",
      role: "admin",
      is_claimed: false,
    })

    renderWithAuth("admin", "usr_admin_1", adminSelf)

    await waitFor(() => {
      expect(screen.getByText("You")).toBeTruthy()
    })

    await openActionsDrawer()

    const resetBtn = screen.getByRole("button", { name: /Reset Password/i })
    const roleBtn = screen.getByRole("button", { name: /Change Role/i })
    const deleteBtn = screen.getByRole("button", { name: /Delete/i })

    expect((resetBtn as HTMLButtonElement).disabled).toBe(true)
    expect((roleBtn as HTMLButtonElement).disabled).toBe(true)
    expect((deleteBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it("enables Change Role and Delete for Admin viewing another claimed account while disabling Reset Password", async () => {
    const otherMember = makeMemberDetail({
      id: "usr_member_1",
      role: "member",
      is_claimed: true,
    })

    renderWithAuth("admin", "usr_admin_1", otherMember)

    await openActionsDrawer()

    const resetBtn = screen.getByRole("button", { name: /Reset Password/i })
    const roleBtn = screen.getByRole("button", { name: /Change Role/i })
    const deleteBtn = screen.getByRole("button", { name: /Delete/i })

    expect((resetBtn as HTMLButtonElement).disabled).toBe(true)
    expect((roleBtn as HTMLButtonElement).disabled).toBe(false)
    expect((deleteBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it("hides Change Role & Delete for Organizer and allows Reset Password only on unclaimed non-privileged members", async () => {
    const unclaimedMember = makeMemberDetail({
      id: "usr_member_unclaimed",
      role: "member",
      is_claimed: false,
    })

    renderWithAuth("organizer", "usr_org_1", unclaimedMember)

    await openActionsDrawer()

    expect(screen.queryByRole("button", { name: /Change Role/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /Delete/i })).toBeNull()

    const resetBtn = screen.getByRole("button", { name: /Reset Password/i })
    expect((resetBtn as HTMLButtonElement).disabled).toBe(false)
  })

  it("disables Reset Password for Organizer viewing a claimed account", async () => {
    const claimedMember = makeMemberDetail({
      id: "usr_member_claimed",
      role: "member",
      is_claimed: true,
    })

    renderWithAuth("organizer", "usr_org_1", claimedMember)

    await openActionsDrawer()

    expect(screen.queryByRole("button", { name: /Change Role/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /Delete/i })).toBeNull()

    const resetBtn = screen.getByRole("button", { name: /Reset Password/i })
    expect((resetBtn as HTMLButtonElement).disabled).toBe(true)
  })

  it("disables Reset Password when Organizer views own account or another organizer/admin account", async () => {
    const orgSelf = makeMemberDetail({
      id: "usr_org_1",
      role: "organizer",
      is_claimed: false,
    })

    renderWithAuth("organizer", "usr_org_1", orgSelf)
    await openActionsDrawer()

    const resetBtn = screen.getByRole("button", { name: /Reset Password/i })
    expect((resetBtn as HTMLButtonElement).disabled).toBe(true)
    cleanup()

    const unclaimedAdmin = makeMemberDetail({
      id: "usr_admin_unclaimed",
      role: "admin",
      is_claimed: false,
    })

    renderWithAuth("organizer", "usr_org_1", unclaimedAdmin)
    await openActionsDrawer()

    const resetAdminBtn = screen.getByRole("button", {
      name: /Reset Password/i,
    })
    expect((resetAdminBtn as HTMLButtonElement).disabled).toBe(true)
  })
})

describe("MemberDetailPage Profile-Style UI/UX & Contribution Graph", () => {
  it("renders self-account governance alert with link to Profile Settings", async () => {
    const adminSelf = makeMemberDetail({
      id: "usr_admin_1",
      name: "Super Admin",
      role: "admin",
      is_claimed: true,
    })

    renderWithAuth("admin", "usr_admin_1", adminSelf)

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy()
    })

    expect(screen.getByText(/Viewing Your Own Account/i)).toBeTruthy()
    const profileLink = screen.getByRole("link", {
      name: /Profile Settings/i,
    })
    expect(profileLink.getAttribute("href")).toBe("/profile")
  })

  it("renders read-only staff alert when Organizer views an Admin account", async () => {
    const targetAdmin = makeMemberDetail({
      id: "usr_admin_other",
      name: "Venerable Admin",
      role: "admin",
      is_claimed: false,
    })

    renderWithAuth("organizer", "usr_org_1", targetAdmin)

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeTruthy()
    })

    expect(screen.getByText(/Read-Only Staff Profile/i)).toBeTruthy()
  })

  it("renders recoverable HIG error state with Retry button when API fetch fails", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { })
    const spy = vi
      .spyOn(peopleApi, "getMember")
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(
        makeMemberDetail({ id: "usr_retry", name: "Recovered Member" })
      )

    const authState: AuthState = {
      ...initialAuthState,
      status: "authenticated",
      role: "admin",
      userId: "usr_admin_1",
    }

    render(
      <AuthContext.Provider value={{ authState } as any}>
        <MemberDetailPage memberId="usr_retry" />
      </AuthContext.Provider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Failed to Load Member Profile/i)).toBeTruthy()
    })

    const retryBtn = screen.getByRole("button", { name: /Try Again/i })
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(screen.getAllByText("Recovered Member").length).toBeGreaterThan(0)
      expect(screen.getByTestId("weekly-activity-heatmap")).toBeTruthy()
    })
    expect(spy).toHaveBeenCalledTimes(2)
    consoleSpy.mockRestore()
  })

  it("renders compact header metadata, avatar claim status badge, inline stat pills, and 52-week contribution graph without phone or birth date", async () => {
    const member = makeMemberDetail({
      email: "budi@example.com",
      school: "SMA Negeri 1",
      is_claimed: true,
      points: 420,
      current_streak: 5,
      total_attendances: 8,
    })

    renderWithAuth("admin", "usr_admin_1", member)

    await waitFor(() => {
      expect(screen.getByLabelText("Claimed Account")).toBeTruthy()
    })

    expect(screen.queryByRole("tablist")).toBeNull()
    expect(screen.queryByText("Direct Communication")).toBeNull()
    expect(screen.queryByText(/Phone \/ WhatsApp/i)).toBeNull()
    expect(screen.queryByText(/Birth Date/i)).toBeNull()
    expect(screen.getByText("budi@example.com")).toBeTruthy()
    expect(screen.getByText("SMA Negeri 1")).toBeTruthy()
    expect(screen.getByText("420")).toBeTruthy()
    expect(screen.getByText("Karma Points")).toBeTruthy()
    expect(screen.getByText("5")).toBeTruthy()
    expect(screen.getByText("Weekly Streak")).toBeTruthy()

    const heatmapCard = screen.getByTestId("weekly-activity-heatmap")
    const grid = within(heatmapCard).getByTestId("contribution-grid-52")
    expect(within(grid).getAllByRole("button")).toHaveLength(52)

    const targetCell = within(grid).getByRole("button", {
      name: /Nov 2–8, 2026: 2 activities/i,
    })
    fireEvent.click(targetCell)

    await waitFor(() => {
      expect(screen.getByText("Nov 2–8, 2026")).toBeTruthy()
      expect(screen.getByText("2 activities")).toBeTruthy()
    })
  })

  it("opens Digital Member Pass drawer with DigitalMemberCard and Enlarge QR control", async () => {
    const member = makeMemberDetail({
      name: "Dewi Lestari",
      user_number: "2026111002",
      role: "activist",
      points: 250,
    })

    renderWithAuth("admin", "usr_admin_1", member)

    const passBtn = await screen.findByRole("button", {
      name: /Member Pass/i,
    })
    fireEvent.click(passBtn)

    await waitFor(() => {
      expect(screen.getByText("Digital Member Pass")).toBeTruthy()
      expect(screen.getByText("Official Identity Pass")).toBeTruthy()
    })

    const enlargeBtn = screen.getByRole("button", { name: /Enlarge QR/i })
    fireEvent.click(enlargeBtn)

    await waitFor(() => {
      expect(screen.getByTestId("digital-member-card-enlarged-qr")).toBeTruthy()
      expect(screen.getByText("Check-In QR Code")).toBeTruthy()
      expect(screen.getByRole("button", { name: /Show Card/i })).toBeTruthy()
    })

    const expandDrawerBtn = screen.getByRole("button", {
      name: /Expand drawer to full screen/i,
    })
    fireEvent.click(expandDrawerBtn)

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /Restore drawer height/i })
      ).toBeTruthy()
    })
  })

  it("displays Attendance Timeline directly with method badge and points without tabs", async () => {
    const member = makeMemberDetail({
      attendances: [
        {
          id: "att_1",
          event_title: "Sunday Dhamma Service",
          event_date: "2026-11-08T09:00:00Z",
          method: "qr_scan",
          points_earned: 50,
          scanned_at: "2026-11-08T08:55:00Z",
        },
        {
          id: "att_2",
          event_title: "Youth Meditation Circle",
          event_date: "2026-11-01T14:00:00Z",
          method: "manual",
          points_earned: 30,
          scanned_at: "2026-11-01T14:05:00Z",
        },
      ],
    })

    renderWithAuth("admin", "usr_admin_1", member)

    await waitFor(() => {
      expect(screen.getByText("Sunday Dhamma Service")).toBeTruthy()
      expect(screen.getByText("Youth Meditation Circle")).toBeTruthy()
    })

    expect(screen.getByText("QR Scan")).toBeTruthy()
    expect(screen.getByText("Manual Check-in")).toBeTruthy()
    expect(screen.queryByText(/Recent Karma Earned/i)).toBeNull()
    expect(screen.getByText("+50 Pts")).toBeTruthy()
    expect(screen.getByText("+30 Pts")).toBeTruthy()
  })

  it("opens Change Role dialog and Delete ConfirmDialog via 3-dot Administrative actions FAB", async () => {
    const targetMember = makeMemberDetail({
      id: "usr_target_2",
      name: "Siti Rahma",
      role: "member",
    })

    renderWithAuth("admin", "usr_admin_1", targetMember)

    await openActionsDrawer()
    fireEvent.click(screen.getByRole("button", { name: /Change Role/i }))

    await waitFor(() => {
      expect(screen.getByText("Change Member Role")).toBeTruthy()
    })

    fireEvent.click(screen.getByRole("button", { name: /Cancel/i }))

    await openActionsDrawer()
    fireEvent.click(screen.getByRole("button", { name: /Delete/i }))

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeTruthy()
      expect(screen.getByText("Delete Member?")).toBeTruthy()
    })
  })

  it("navigates immediately to /people upon confirming member deletion without artificial delay", async () => {
    const deleteSpy = vi
      .spyOn(peopleApi, "deleteMember")
      .mockResolvedValue({
        success: true,
        message: "Member deleted successfully.",
      })
    const targetMember = makeMemberDetail({
      id: "usr_target_del",
      name: "Delete Target",
      role: "member",
    })

    renderWithAuth("admin", "usr_admin_1", targetMember)

    await openActionsDrawer()
    fireEvent.click(screen.getByRole("button", { name: /Delete/i }))
    await screen.findByRole("alertdialog")
    const confirmDeleteBtn = screen.getByRole("button", {
      name: /Delete Member/i,
    })

    fireEvent.click(confirmDeleteBtn)

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith("usr_target_del")
      expect(mockNavigate).toHaveBeenCalledWith({ to: "/people" })
      expect(screen.getByText("Member deleted successfully.")).toBeTruthy()
    })
  })

  it("caps displayed attendance history to last 5 events while showing full lifetime total_attendances", async () => {
    const sevenAttendances = Array.from({ length: 7 }).map((_, i) => ({
      id: `att_${i + 1}`,
      event_title: `Dhamma Event ${i + 1}`,
      event_date: `2026-11-${String(20 - i).padStart(2, "0")}T09:00:00Z`,
      method: "qr_scan",
      points_earned: 50,
      scanned_at: `2026-11-${String(20 - i).padStart(2, "0")}T09:00:00Z`,
    }))

    const member = makeMemberDetail({
      points: 1200,
      total_attendances: 24,
      attendances: sevenAttendances,
    })

    renderWithAuth("admin", "usr_admin_1", member)

    await waitFor(() => {
      expect(screen.getByText("Showing latest 5 of 24")).toBeTruthy()
      expect(screen.getByText("Dhamma Event 1")).toBeTruthy()
      expect(screen.getByText("Dhamma Event 5")).toBeTruthy()
    })

    expect(screen.queryByText("Dhamma Event 6")).toBeNull()
    expect(screen.queryByText("Dhamma Event 7")).toBeNull()
    expect(screen.getByText(/Last 5 Events/i)).toBeTruthy()
  })

  it("resets stale member detail and fetches fresh detail when switching clicked memberId", async () => {
    const firstMember = makeMemberDetail({
      id: "usr_first",
      name: "First Member",
      email: "first@example.com",
    })
    const secondMember = makeMemberDetail({
      id: "usr_second",
      name: "Second Member",
      email: "second@example.com",
    })

    let resolveSecond: (val: MemberDetailDto) => void
    const secondPromise = new Promise<MemberDetailDto>((res) => {
      resolveSecond = res
    })

    const getSpy = vi
      .spyOn(peopleApi, "getMember")
      .mockResolvedValueOnce(firstMember)
      .mockImplementationOnce(() => secondPromise)

    const authState: AuthState = {
      ...initialAuthState,
      status: "authenticated",
      role: "admin",
      userId: "usr_admin_1",
    }

    const { rerender } = render(
      <AuthContext.Provider value={{ authState } as any}>
        <MemberDetailPage memberId="usr_first" />
      </AuthContext.Provider>
    )

    await waitFor(() => {
      expect(screen.getByText("first@example.com")).toBeTruthy()
    })
    expect(getSpy).toHaveBeenCalledWith("usr_first")

    rerender(
      <AuthContext.Provider value={{ authState } as any}>
        <MemberDetailPage memberId="usr_second" />
      </AuthContext.Provider>
    )

    await waitFor(() => {
      expect(screen.queryByText("first@example.com")).toBeNull()
      expect(getSpy).toHaveBeenCalledWith("usr_second")
    })

    resolveSecond!(secondMember)

    await waitFor(() => {
      expect(screen.getByText("second@example.com")).toBeTruthy()
    })
  })
})
