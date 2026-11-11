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

describe("AttendanceScanPage Manual Entry — Fuzzy Similar Name Notice, See More & Quick Pre-Provision", () => {
  it("shows similar existing members banner + See More modal in Manual Entry when typing a name, hides when empty, and supports quick registration", async () => {
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

    // Switch to Manual Entry
    const manualBtn = await screen.findByRole("button", { name: /Manual Entry/i })
    fireEvent.click(manualBtn)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Type member name.../i)).toBeTruthy()
    })

    // Empty initially: no similar notice & no See More button
    expect(screen.queryByText(/Similar existing members? found/i)).toBeNull()
    expect(screen.queryByRole("button", { name: /See More/i })).toBeNull()

    // Type similar name -> async lookup runs & displays banner + See More + Register New Member
    fireEvent.change(screen.getByPlaceholderText(/Type member name.../i), {
      target: { value: "Budi Santosa" },
    })

    await waitFor(() => {
      expect(similarSpy).toHaveBeenCalledWith(
        "Budi Santosa",
        5,
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
      expect(screen.getByText(/Similar existing members? found/i)).toBeTruthy()
    })

    const seeMoreBtn = screen.getByRole("button", { name: /See More/i })
    fireEvent.click(seeMoreBtn)

    await waitFor(() => {
      expect(screen.getByRole("dialog", { name: /Similar Existing Members/i })).toBeTruthy()
    })

    // Check-in directly from the See More modal
    const modalCheckInButtons = screen.getAllByRole("button", { name: /\+ Check In/i })
    fireEvent.click(modalCheckInButtons[modalCheckInButtons.length - 1])

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith(
        "/events/evt_1/attendances",
        expect.objectContaining({
          user_number: "2026110101",
          method: "manual",
        })
      )
    })

    // Typing non-matching name hides the banner cleanly
    fireEvent.change(screen.getByPlaceholderText(/Type member name.../i), {
      target: { value: "Zyxwvu Unique" },
    })
    await waitFor(() => {
      expect(screen.queryByText(/Similar existing members? found/i)).toBeNull()
      expect(screen.queryByRole("button", { name: /See More/i })).toBeNull()
    })

    // Quick Register New Member button opens Pre-Provision modal pre-filled with typed name
    fireEvent.click(screen.getByRole("button", { name: /Register New Member/i }))
    await waitFor(() => {
      expect(screen.getByLabelText(/Full Name/i)).toBeTruthy()
    })
    expect((screen.getByLabelText(/Full Name/i) as HTMLInputElement).value).toBe("Zyxwvu Unique")
    expect(screen.queryByLabelText(/Initial Role/i)).toBeNull()
    expect(screen.queryByLabelText(/Date of Birth/i)).toBeNull()
  })
})

