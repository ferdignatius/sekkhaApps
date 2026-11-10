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
import type {
  AuthState,
  UserRole,
} from "@/modules/auth/internal/context/authReducer"
import { api } from "@/lib/api"
import { LeaderboardPage } from "../components/LeaderboardPage"
import type { LeaderboardEntry } from "../types"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function makeEntries(count: number, userIdAtRank?: { id: string; rank: number }) {
  return Array.from({ length: count }).map((_, idx) => {
    const rank = idx + 1
    const isTarget = userIdAtRank?.rank === rank
    const entry: LeaderboardEntry = {
      rank,
      user_id: isTarget ? userIdAtRank.id : `usr_${rank}`,
      username: isTarget ? "current_member" : `member_${rank}`,
      name: isTarget ? "Current Member" : `Member ${rank}`,
      initials: isTarget ? "CM" : `M${rank}`,
      value: Math.max(10, (count - idx) * 20),
      label: `${Math.max(10, (count - idx) * 20)} points`,
      role:
        rank === 1
          ? "admin"
          : rank === 2
            ? "activist"
            : rank === 4
              ? "organizer"
              : "member",
    }
    return entry
  })
}

function renderLeaderboard(
  payload: any,
  userId = "usr_me",
  role: UserRole = "admin"
) {
  const getSpy = vi.spyOn(api, "get").mockResolvedValue(payload)

  const authState: AuthState = {
    ...initialAuthState,
    status: "authenticated",
    userId,
    role,
    username: "current_member",
    name: "Current Member",
  }

  return {
    getSpy,
    ...render(
      <AuthContext.Provider value={{ authState } as any}>
        <LeaderboardPage />
      </AuthContext.Provider>
    ),
  }
}

describe("LeaderboardPage Top 10, Bottom Self-Rank (>10) & Visual Role/Self Separation", () => {
  it("never renders a floating bottom rank bar and keeps Top 10 clean when user ranks #1", async () => {
    const entries = makeEntries(10, { id: "usr_me", rank: 1 })
    const { getSpy } = renderLeaderboard({
      entries,
      my_rank: { rank: 1, value: 200, initials: "CM", username: "current_member" },
      season: {
        id: "s_1",
        name: "Semester 2 · 2026",
        start_date: "2026-07-01T00:00:00Z",
        end_date: "2026-12-31T00:00:00Z",
        days_left: 52,
        target_attendance: 500,
      },
      available_periods: [
        {
          id: "s_1",
          key: "semester",
          name: "Semester 2 · 2026",
          start_date: "2026-07-01T00:00:00Z",
          end_date: "2026-12-31T00:00:00Z",
          days_left: 52,
          target_attendance: 500,
          is_active: true,
          is_custom: false,
        },
        {
          id: "a_1",
          key: "annual",
          name: "Annual · 2026",
          start_date: "2026-01-01T00:00:00Z",
          end_date: "2026-12-31T00:00:00Z",
          days_left: 52,
          target_attendance: 1000,
          is_active: true,
          is_custom: false,
        },
      ],
      community_goal: {
        current: 150,
        target: 500,
        label: "Community Attendance Target",
      },
    })

    await waitFor(() => {
      expect(screen.getByText("@current_member")).toBeTruthy()
    })

    expect(getSpy.mock.calls[0]?.[0]).toMatch(/&limit=10(&|$)/)

    // No floating bottom bar & no redundant static mobile card above podium
    expect(screen.queryByLabelText("Your ranking quick view")).toBeNull()
    expect(screen.queryByLabelText("Your leaderboard position")).toBeNull()
    expect(screen.queryByLabelText("Your ranking outside Top 10")).toBeNull()

    // Podium #1 uses gold/ochre exclusive YOU badge and appears once
    const youBadge = screen.getByTestId("self-you-badge")
    expect(youBadge.className).toContain("bg-clay-ochre")
    expect(screen.getAllByText("@current_member")).toHaveLength(1)

    // Organizer at rank #4 displays subtle caption text, NOT a competing pill badge
    const orgCaption = screen.getByText("Organizer")
    expect(orgCaption.className).not.toContain("rounded-full")
  })

  it("places user rank card below Rank #10 (with separator) instead of a floating bottom bar when user ranks #15", async () => {
    const entries = makeEntries(10)
    renderLeaderboard({
      entries,
      my_rank: {
        rank: 15,
        value: 40,
        initials: "CM",
        username: "current_member",
        role: "activist",
        is_in_top: false,
      },
      season: {
        id: "s_1",
        name: "Semester 2 · 2026",
        start_date: "2026-07-01T00:00:00Z",
        end_date: "2026-12-31T00:00:00Z",
        days_left: 52,
        target_attendance: 500,
      },
      available_periods: [],
      community_goal: {
        current: 120,
        target: 500,
        label: "Community Attendance Target",
      },
    })

    await waitFor(() => {
      expect(screen.getByLabelText("Your ranking outside Top 10")).toBeTruthy()
    })

    // No floating bar at viewport bottom
    expect(screen.queryByLabelText("Your ranking quick view")).toBeNull()

    const outsideSection = screen.getByLabelText("Your ranking outside Top 10")
    expect(outsideSection.textContent).toContain("#15")
    expect(outsideSection.textContent).toContain("@current_member")
    expect(outsideSection.textContent).toContain("40")

    // Gold YOU pill rendered cleanly once
    const youBadge = screen.getByTestId("self-you-badge")
    expect(youBadge.className).toContain("bg-clay-ochre")
  })

  it("highlights user cleanly in-place inside Ranks 4-10 without duplicating row at bottom or floating", async () => {
    const entries = makeEntries(10, { id: "usr_me", rank: 6 })
    const getSpy = vi
      .spyOn(api, "get")
      .mockRejectedValueOnce(new Error("Timeout"))
      .mockResolvedValueOnce({
        entries,
        my_rank: { rank: 6, value: 100, initials: "CM", username: "current_member" },
        season: {
          id: "s_1",
          name: "Semester 2 · 2026",
          start_date: "2026-07-01T00:00:00Z",
          end_date: "2026-12-31T00:00:00Z",
          days_left: 52,
          target_attendance: 500,
        },
        available_periods: [],
        community_goal: {
          current: 200,
          target: 500,
          label: "Community Attendance Target",
        },
      })

    const authState: AuthState = {
      ...initialAuthState,
      status: "authenticated",
      userId: "usr_me",
      role: "admin",
      username: "current_member",
    }

    render(
      <AuthContext.Provider value={{ authState } as any}>
        <LeaderboardPage />
      </AuthContext.Provider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Unable to load leaderboard/i)).toBeTruthy()
    })

    fireEvent.click(screen.getByRole("button", { name: /Try again/i }))

    await waitFor(() => {
      expect(screen.getByText("@current_member")).toBeTruthy()
    })

    expect(getSpy).toHaveBeenCalledTimes(2)
    expect(screen.queryByLabelText("Your ranking quick view")).toBeNull()
    expect(screen.queryByLabelText("Your ranking outside Top 10")).toBeNull()
    expect(screen.getAllByText("@current_member")).toHaveLength(1)
    expect(screen.getByTestId("self-you-badge").className).toContain("bg-clay-ochre")
  })
})
