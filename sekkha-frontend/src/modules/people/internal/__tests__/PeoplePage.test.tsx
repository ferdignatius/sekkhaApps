import { describe, it, expect, vi, afterEach } from "vitest"
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import { initialAuthState } from "@/modules/auth/internal/context/authReducer"
import type { AuthState } from "@/modules/auth/internal/context/authReducer"
import { PeoplePage } from "../components/PeoplePage"
import { peopleApi } from "../api/peopleApi"
import type { PaginatedMembersResponse } from "../api/peopleApi"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
  useNavigate: () => mockNavigate,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  mockNavigate.mockReset()
})

function renderPeoplePage(response: PaginatedMembersResponse) {
  const listSpy = vi
    .spyOn(peopleApi, "listMembers")
    .mockResolvedValue(response as any)
  const schoolsSpy = vi
    .spyOn(peopleApi, "getVerifiedSchools")
    .mockResolvedValue([])

  const authState: AuthState = {
    ...initialAuthState,
    status: "authenticated",
    role: "admin",
    userId: "usr_admin_1",
  }

  return {
    listSpy,
    schoolsSpy,
    ...render(
      <AuthContext.Provider value={{ authState } as any}>
        <PeoplePage />
      </AuthContext.Provider>
    ),
  }
}

describe("PeoplePage 2-Column Mobile Grid, Fast Loading & Directory Isolation", () => {
  it("uses crisp 2-column grid on mobile scaling to 3/4 columns on larger screens with lightweight 12-item default page size", async () => {
    const { listSpy, schoolsSpy } = renderPeoplePage({
      items: [
        {
          id: "usr_admin_1",
          name: "Admin Sekkha",
          username: "admin",
          role: "admin",
          user_number: "26010104",
          is_claimed: true,
          created_at: "2026-10-01T00:00:00Z",
        },
        {
          id: "usr_2",
          name: "Budi Wijaya (Pengurus)",
          username: "pengurus",
          role: "organizer",
          user_number: "26010103",
          is_claimed: false,
          created_at: "2026-10-02T00:00:00Z",
        },
      ],
      total: 2,
      page: 1,
      limit: 12,
      totalPages: 1,
      stats: { total: 2, member: 0, activist: 0, organizer: 2 },
    })

    await waitFor(() => {
      expect(screen.getByText("Admin Sekkha")).toBeTruthy()
    })

    const grid = screen.getByTestId("people-directory-grid")
    const tokens = grid.className.split(/\s+/)
    expect(tokens).toContain("grid-cols-2")
    expect(tokens).toContain("md:grid-cols-3")
    expect(tokens).toContain("lg:grid-cols-4")

    // Default page size divides cleanly across 2, 3, and 4 columns and keeps initial payload fast
    expect(listSpy).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, limit: 12 })
    )
    // Schools dropdown is lazy-loaded only when opening Add Member modal
    expect(schoolsSpy).not.toHaveBeenCalled()
  })

  it("lazy-loads verified schools only when opening Add Member and navigates to detail only on card click", async () => {
    const getMemberSpy = vi.spyOn(peopleApi, "getMember")
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })

    const { schoolsSpy } = renderPeoplePage({
      items: [
        {
          id: "usr_member_99",
          name: "Siti Rahma",
          username: "siti99",
          role: "member",
          user_number: "2026111099",
          is_claimed: true,
          created_at: "2026-10-01T00:00:00Z",
        },
      ],
      total: 1,
      page: 1,
      limit: 12,
      totalPages: 1,
      stats: { total: 1, member: 1, activist: 0, organizer: 0 },
    })

    await waitFor(() => {
      expect(screen.getByText("Siti Rahma")).toBeTruthy()
    })

    expect(getMemberSpy).not.toHaveBeenCalled()
    expect(schoolsSpy).not.toHaveBeenCalled()

    // Clicking copy ID button must not navigate to detail
    fireEvent.click(screen.getByRole("button", { name: /2026111099/i }))
    expect(mockNavigate).not.toHaveBeenCalled()

    // Clicking the card navigates to member detail
    fireEvent.click(screen.getByText("Siti Rahma"))
    expect(mockNavigate).toHaveBeenCalledWith({
      to: "/people/$memberId",
      params: { memberId: "usr_member_99" },
    })

    // Opening Add Member triggers lazy school fetch
    fireEvent.click(screen.getByRole("button", { name: /Add Member/i }))
    await waitFor(() => {
      expect(schoolsSpy).toHaveBeenCalledTimes(1)
    })
  })
})
