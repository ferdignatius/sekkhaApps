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
import { SchoolPage } from "../components/SchoolPage"
import { schoolsApi } from "../api/configureApi"

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: any) => <a href={to}>{children}</a>,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("SchoolPage — Cursor Infinite Scroll", () => {
  it("renders initial cursor chunk with backend stats and loads next chunk on Load more", async () => {
    const listCursorSpy = vi
      .spyOn(schoolsApi, "listCursor")
      .mockResolvedValueOnce({
        items: [
          {
            id: "sch_1",
            name: "SMA Sekkha 1",
            type: "SMA/SMK",
            is_active: true,
            status: "active",
            userCount: 14,
          },
        ],
        total: 2,
        has_more: true,
        next_cursor: "sch_1",
        stats: {
          total: 2,
          senior_high: 1,
          university: 1,
          linked_users: 20,
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: "sch_2",
            name: "Universitas Sekkha",
            type: "Universitas",
            is_active: true,
            status: "active",
            userCount: 6,
          },
        ],
        total: 2,
        has_more: false,
        next_cursor: null,
      })

    vi.spyOn(schoolsApi, "requests").mockResolvedValue([])

    const authState: AuthState = {
      ...initialAuthState,
      status: "authenticated",
      userId: "usr_admin",
      role: "admin",
      name: "Admin Sekkha",
    }

    render(
      <AuthContext.Provider value={{ authState } as any}>
        <SchoolPage />
      </AuthContext.Provider>
    )

    await waitFor(() => {
      expect(screen.getByText("SMA Sekkha 1")).toBeTruthy()
    })

    expect(screen.getByText("20")).toBeTruthy()
    expect(listCursorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 20, include_stats: true }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )

    fireEvent.click(screen.getByRole("button", { name: /Load more/i }))
    await waitFor(() => {
      expect(screen.getByText("Universitas Sekkha")).toBeTruthy()
    })
    expect(listCursorSpy).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: "sch_1", limit: 20, include_stats: false }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })
})
