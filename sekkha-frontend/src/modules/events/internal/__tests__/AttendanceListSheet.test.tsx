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

    fireEvent.click(screen.getByRole("button", { name: /Assign Service Role/i }))

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
})
