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

    // Infinite scroll shows initial 25 items and Load more button instead of Previous/Next
    expect(screen.queryByText("1 / 2")).toBeNull()
    expect(screen.getByText("Member 25")).toBeDefined()
    expect(screen.queryByText("Member 26")).toBeNull()
    fireEvent.click(screen.getByRole("button", { name: /Load more/i }))
    expect(screen.getByText("Member 26")).toBeDefined()
    expect(screen.getByText("Member 30")).toBeDefined()

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

  it("supports server-side cursor Load more and method filtering when attendanceMeta.hasMore is true", async () => {
    const getSpy = vi.spyOn(api, "get").mockResolvedValueOnce({
      event_id: "evt_srv",
      total_attended: 3,
      filtered_total: 3,
      qr_count: 2,
      manual_count: 1,
      late_count: 0,
      has_more: false,
      next_cursor: null,
      attendances: [
        {
          attendance_id: "att_2",
          user_id: "usr_2",
          name: "Loaded Attendee 2",
          role: "member",
          method: "qr",
          points_earned: 50,
          scanned_at: "2026-11-11T09:05:00Z",
        },
      ],
    })

    render(
      <AttendanceListSheet
        eventId="evt_srv"
        role="organizer"
        records={[
          {
            attendance_id: "att_1",
            user_id: "usr_1",
            name: "Initial Attendee 1",
            role: "member",
            method: "qr",
            points_earned: 50,
            scanned_at: "2026-11-11T09:00:00Z",
          } as any,
        ]}
        attendanceMeta={{
          totalCount: 3,
          qrCount: 2,
          manualCount: 1,
          lateCount: 0,
          hasMore: true,
          nextCursor: "att_1",
        }}
      />
    )

    expect(screen.getByText("All · 3")).toBeDefined()
    expect(screen.getByText("QR · 2")).toBeDefined()
    fireEvent.click(screen.getByRole("button", { name: /Load more/i }))

    await waitFor(() => {
      expect(screen.getByText("Loaded Attendee 2")).toBeDefined()
    })
    expect(screen.getByText("Initial Attendee 1")).toBeDefined()
    expect(getSpy).toHaveBeenCalledWith(
      expect.stringContaining("/events/evt_srv/attendances?paginated=true&limit=25&cursor=att_1"),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    )
  })
})
