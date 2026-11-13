import { describe, it, expect, vi, afterEach } from "vitest"
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react"
import { AuthContext } from "@/modules/auth/internal/context/AuthContext"
import { initialAuthState } from "@/modules/auth/internal/context/authReducer"
import type { AuthState } from "@/modules/auth/internal/context/authReducer"
import { api } from "@/lib/api"
import { peopleApi } from "@/modules/people"
import { AttendanceScanPage } from "../components/AttendanceScanPage"

const mockNavigate = vi.fn()

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mockNavigate,
  useSearch: () => ({ eventId: "evt_1" }),
}))

vi.mock("../components/QrScannerCamera", () => ({
  QrScannerCamera: () => <div data-testid="mock-qr-camera" />,
}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  mockNavigate.mockReset()
})

function renderAttendanceScan() {
  vi.spyOn(api, "get").mockImplementation((url: string) => {
    if (url === "/events/evt_1") {
      return Promise.resolve({
        id: "evt_1",
        title: "Sunday Puja",
        event_date: "2026-11-11T09:00:00Z",
        status: "active",
        tag: "regular-puja",
      }) as any
    }
    if (url === "/events/evt_1/attendances") {
      return Promise.resolve([]) as any
    }
    return Promise.resolve([]) as any
  })

  vi.spyOn(peopleApi, "listMembers").mockResolvedValue({
    items: [],
    total: 0,
    page: 1,
    limit: 100,
    totalPages: 1,
  } as any)

  vi.spyOn(peopleApi, "getVerifiedSchools").mockResolvedValue([
    { id: "sch_umn", name: "Universitas Multimedia Nusantara", type: "Universitas" },
  ])

  const authState: AuthState = {
    ...initialAuthState,
    status: "authenticated",
    userId: "usr_org_1",
    role: "organizer",
    name: "Organizer Sekkha",
  }

  return render(
    <AuthContext.Provider value={{ authState } as any}>
      <AttendanceScanPage />
    </AuthContext.Provider>
  )
}

describe("AttendanceScanPage Manual Entry — Unified Search, Clickable Rows, ID Check-In & Quick Pre-Provision", () => {
  it("supports unified name/ID search with clickable member rows (no SimilarMembersNotice clutter) and quick registration", async () => {
    const similarSpy = vi
      .spyOn(peopleApi, "findSimilarMembers")
      .mockImplementation((name: string) => {
        if (name.toLowerCase().includes("budi")) {
          return Promise.resolve({
            items: [
              {
                id: "usr_budi",
                user_number: 2026110101,
                username: "budi1492",
                name: "Budi Santoso",
                role: "member",
                is_claimed: false,
                school: "SMA Tri Ratna",
                similarity_score: 91,
              },
            ],
            total: 1,
          })
        }
        return Promise.resolve({ items: [], total: 0 })
      })

    const postSpy = vi.spyOn(api, "post").mockResolvedValue({
      attendance_id: "att_1",
      user_id: "usr_budi",
      name: "Budi Santoso",
      user_number: "2026110101",
      is_late: false,
      is_finalized: false,
    } as any)

    renderAttendanceScan()

    // Camera scanner & floating search bar are mounted together without mode tabs
    expect(screen.queryByRole("button", { name: /Manual Entry/i })).toBeNull()
    expect(screen.queryByRole("button", { name: /QR Scanner/i })).toBeNull()
    expect(await screen.findByTestId("mock-qr-camera")).toBeTruthy()

    const searchInput = await screen.findByPlaceholderText(
      /Search member name or ID/i
    )
    expect(searchInput).toBeTruthy()

    // Empty initially: no results dropdown & no confusing "Similar existing members found" banner
    expect(screen.queryByText(/Similar existing members? found/i)).toBeNull()
    expect(screen.queryByRole("button", { name: /Create New Member/i })).toBeNull()

    // Type a name -> fuzzy search runs & renders directly clickable member row in dropdown
    fireEvent.change(searchInput, {
      target: { value: "Budi Santosa" },
    })

    await waitFor(() => {
      expect(similarSpy).toHaveBeenCalledWith(
        "Budi Santosa",
        5,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
      expect(screen.getByText("Budi Santoso")).toBeTruthy()
    })
    expect(screen.queryByText(/Similar existing members? found/i)).toBeNull()

    // Clicking the member row itself triggers manual check-in directly
    fireEvent.click(screen.getByRole("button", { name: /Budi Santoso/i }))

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        "/events/evt_1/attendances",
        expect.objectContaining({
          user_number: "2026110101",
          method: "manual",
        })
      )
    })

    // Typing non-matching name shows empty message + allows Create New Member
    fireEvent.change(screen.getByPlaceholderText(/Search member name or ID/i), {
      target: { value: "Zyxwvu Unique" },
    })
    await waitFor(() => {
      expect(screen.getByText(/No registered member matches/i)).toBeTruthy()
    })

    // Create New Member button at bottom of dropdown opens Pre-Provision modal pre-filled with typed name
    fireEvent.click(screen.getByRole("button", { name: /Create New Member/i }))
    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeTruthy()
    })
    expect((screen.getByLabelText(/Full Name/i) as HTMLInputElement).value).toBe("Zyxwvu Unique")
    expect(screen.queryByLabelText(/Initial Role/i)).toBeNull()
    expect(screen.queryByLabelText(/Date of Birth/i)).toBeNull()
  })
})

