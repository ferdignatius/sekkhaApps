import { describe, it, expect, vi, afterEach } from "vitest"
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react"
import { AttendanceListSheet } from "../components/AttendanceListSheet"
import { api } from "@/lib/api"

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe("AttendanceListSheet Service Role Picker — Initial 5 + Infinite Scroll", () => {
  it("loads initial 5 active badge activities and fetches page 2 when scrolled", async () => {
    const getSpy = vi.spyOn(api, "get").mockImplementation((url: string) => {
      if (url.includes("page=2&limit=5")) {
        return Promise.resolve({
          items: [
            { id: "ba_6", code: "usher", label: "Usher Duty", bonus_points: 20 },
          ],
          total: 6,
          page: 2,
          limit: 5,
          total_pages: 2,
          has_more: false,
        }) as any
      }
      return Promise.resolve({
        items: [
          { id: "ba_1", code: "mc", label: "MC", bonus_points: 30 },
          { id: "ba_2", code: "puja", label: "Puja Leader", bonus_points: 30 },
          { id: "ba_3", code: "audio", label: "Audio Operator", bonus_points: 30 },
          { id: "ba_4", code: "doc", label: "Documentation", bonus_points: 25 },
          { id: "ba_5", code: "music", label: "Musician", bonus_points: 30 },
        ],
        total: 6,
        page: 1,
        limit: 5,
        total_pages: 2,
        has_more: true,
      }) as any
    })

    render(
      <AttendanceListSheet
        eventId="evt_1"
        role="organizer"
        records={[
          {
            user_id: "usr_1",
            user_number: "2026110101",
            name: "Budi Santoso",
            role: "member",
            method: "qr",
            scanned_at: "2026-11-11T09:00:00Z",
          } as any,
        ]}
      />
    )

    // Swipe right opens Service Role picker modal (also accessible via ⋮ menu)
    const row = screen.getByTestId("attendance-row-usr_1")
    const swipeSurface = row.lastElementChild as HTMLElement
    fireEvent.pointerDown(swipeSurface, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 20,
      clientY: 20,
    })
    fireEvent.pointerMove(swipeSurface, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 110,
      clientY: 22,
    })
    fireEvent.pointerUp(swipeSurface, {
      pointerId: 1,
      pointerType: "touch",
      clientX: 110,
      clientY: 22,
    })

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        "/configure/badge-activities?is_active=true&page=1&limit=5&paginated=true"
      )
      expect(screen.getByText("Musician")).toBeDefined()
    })
    expect(screen.queryByText("Usher Duty")).toBeNull()

    const scrollBox = screen.getByTestId("badge-activity-scroll-list")
    Object.defineProperty(scrollBox, "scrollHeight", { value: 280, configurable: true })
    Object.defineProperty(scrollBox, "clientHeight", { value: 168, configurable: true })
    Object.defineProperty(scrollBox, "scrollTop", { value: 100, configurable: true })

    fireEvent.scroll(scrollBox)

    await waitFor(() => {
      expect(getSpy).toHaveBeenCalledWith(
        "/configure/badge-activities?is_active=true&page=2&limit=5&paginated=true"
      )
      expect(screen.getByText("Usher Duty")).toBeDefined()
    })
  })

  it("allows admin (and not organizer) to remove late status before event is closed", async () => {
    const patchSpy = vi
      .spyOn(api, "patch")
      .mockResolvedValue({
        attendance_id: "att_1",
        user_id: "usr_late",
        is_late: false,
        late_penalty_applied: 0,
        points_earned: 50,
      } as any)
    const onRefresh = vi.fn()

    const lateRecord = {
      user_id: "usr_late",
      user_number: "2026110102",
      name: "Siti Rahma",
      role: "member",
      method: "qr",
      is_late: true,
      late_penalty_applied: 15,
      points_earned: 35,
      scanned_at: "2026-11-11T09:40:00Z",
    } as any

    const { rerender } = render(
      <AttendanceListSheet
        eventId="evt_1"
        role="organizer"
        records={[lateRecord]}
      />
    )
    expect(screen.getByText(/Late \(-15\)/i)).toBeDefined()
    expect(
      screen.queryByRole("button", { name: /Remove late status/i })
    ).toBeNull()

    rerender(
      <AttendanceListSheet
        eventId="evt_1"
        role="admin"
        isClosed={true}
        records={[lateRecord]}
      />
    )
    expect(
      screen.queryByRole("button", { name: /Remove late status/i })
    ).toBeNull()

    rerender(
      <AttendanceListSheet
        eventId="evt_1"
        role="admin"
        isClosed={false}
        records={[lateRecord]}
        onRefresh={onRefresh}
      />
    )

    const removeLateBtn = screen.getByRole("button", {
      name: /Remove late status/i,
    })
    fireEvent.click(removeLateBtn)

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith(
        "/events/evt_1/attendances/usr_late/waive-late",
        {}
      )
      expect(screen.queryByText(/Late \(-15\)/i)).toBeNull()
      expect(onRefresh).toHaveBeenCalled()
    })
  })

  it("supports swipe left to confirm deletion, Late filter pill, and 25/page pagination without Total Pts pill", () => {
    const records = Array.from({ length: 30 }, (_, i) => ({
      user_id: `usr_${i + 1}`,
      user_number: `20261101${String(i + 1).padStart(2, "0")}`,
      name: `Member ${i + 1}`,
      role: "member",
      method: i % 2 === 0 ? "qr" : "manual",
      is_late: i === 0,
      late_penalty_applied: i === 0 ? 15 : 0,
      points_earned: i === 0 ? 35 : 50,
      scanned_at: "2026-11-11T09:00:00Z",
    })) as any

    const onDeleteRecord = vi.fn()
    render(
      <AttendanceListSheet
        eventId="evt_1"
        role="organizer"
        records={records}
        onDeleteRecord={onDeleteRecord}
      />
    )

    // No noisy On Time pill and no Total Pts pill on top filter bar
    expect(screen.queryByText("On Time")).toBeNull()
    expect(screen.queryByTitle("Total points distributed")).toBeNull()

    // Pagination uses 25 per page (30 items = 2 pages instead of 3)
    expect(screen.getByText("1 / 2")).toBeDefined()
    expect(screen.getByText("Member 25")).toBeDefined()
    expect(screen.queryByText("Member 26")).toBeNull()

    // Late quick filter isolates late attendee
    fireEvent.click(screen.getByRole("button", { name: /Late · 1/i }))
    expect(screen.getByText("Member 1")).toBeDefined()
    expect(screen.queryByText("Member 2")).toBeNull()

    // Swipe left opens confirmation dialog and confirms delete
    const swipeSurface = screen.getByTestId("attendance-row-usr_1")
      .lastElementChild as HTMLElement
    fireEvent.pointerDown(swipeSurface, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 200,
      clientY: 20,
    })
    fireEvent.pointerMove(swipeSurface, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 100,
      clientY: 22,
    })
    fireEvent.pointerUp(swipeSurface, {
      pointerId: 2,
      pointerType: "touch",
      clientX: 100,
      clientY: 22,
    })

    expect(screen.getByText(/Remove Draft Attendance Record\?/i)).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: /Yes, Remove Record/i }))
    expect(onDeleteRecord).toHaveBeenCalledWith("usr_1")
  })
})
