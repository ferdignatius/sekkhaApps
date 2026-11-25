import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useAttendanceCheckInListener } from "../useAttendanceCheckInListener"
import { safeStorage } from "@/lib/storage"

describe("useAttendanceCheckInListener", () => {
  beforeEach(() => {
    localStorage.clear()
    safeStorage.setItem("sekkha_access_token", "member-jwt-token")
    vi.restoreAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("receives real-time SSE attendance_recorded frame, dispatches window event, and auto-dismisses", async () => {
    const nowIso = new Date().toISOString()
    const ssePayload = `event: attendance_recorded\ndata: ${JSON.stringify({
      eventId: "evt_1",
      eventTitle: "Sunday Youth Fellowship",
      method: "qr",
      isLate: false,
      pointsEarned: 50,
      scannedAt: nowIso,
    })}\n\n`

    const encoder = new TextEncoder()
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(ssePayload))
        controller.close()
      },
    })

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(stream, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        })
      )
    )

    const eventListener = vi.fn()
    window.addEventListener("sekkha:attendance_recorded", eventListener)

    const { result } = renderHook(() => useAttendanceCheckInListener(true))

    await waitFor(() => {
      expect(result.current.checkInSuccess?.eventTitle).toBe(
        "Sunday Youth Fellowship"
      )
    })

    expect(result.current.checkInSuccess?.pointsEarned).toBe(50)
    expect(eventListener).toHaveBeenCalledTimes(1)

    act(() => {
      result.current.dismiss()
    })
    expect(result.current.checkInSuccess).toBeNull()

    window.removeEventListener("sekkha:attendance_recorded", eventListener)
  })

  it("falls back to /events/attendance/latest polling when SSE stream is unavailable", async () => {
    const nowIso = new Date().toISOString()
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/events/attendance/stream")) {
        return Promise.resolve(new Response(null, { status: 502 }))
      }
      if (url.includes("/events/attendance/latest")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              status: "success",
              data: {
                latest: {
                  eventId: "evt_2",
                  eventTitle: "Morning Puja",
                  method: "qr",
                  isLate: true,
                  pointsEarned: 35,
                  scannedAt: nowIso,
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } }
          )
        )
      }
      return Promise.resolve(new Response(null, { status: 404 }))
    })
    vi.stubGlobal("fetch", fetchMock)

    const { result } = renderHook(() => useAttendanceCheckInListener(true))

    await waitFor(() => {
      expect(result.current.checkInSuccess?.eventTitle).toBe("Morning Puja")
    })
    expect(result.current.checkInSuccess?.isLate).toBe(true)
  })
})
