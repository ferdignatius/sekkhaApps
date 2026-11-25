import { useCallback, useEffect, useRef, useState } from "react"
import { api, API_BASE_URL, clearApiCache } from "@/lib/api"
import { safeStorage } from "@/lib/storage"

export interface AttendanceCheckInNotification {
  eventId: string
  eventTitle: string
  method: string
  isLate: boolean
  pointsEarned: number
  scannedAt: string
}

const POLL_INTERVAL_MS = 3_000
const OVERLAY_AUTO_HIDE_MS = 3_000
const CLOCK_SKEW_TOLERANCE_MS = 5_000

/**
 * Listens for live organizer check-in events for the currently signed-in member
 * while their QR pass is open, using SSE (`GET /events/attendance/stream`)
 * with automatic 3-second short-polling fallback (`GET /events/attendance/latest`).
 */
export function useAttendanceCheckInListener(enabled: boolean) {
  const [checkInSuccess, setCheckInSuccess] =
    useState<AttendanceCheckInNotification | null>(null)
  const seenKeysRef = useRef<Set<string>>(new Set())

  const dismiss = useCallback(() => {
    setCheckInSuccess(null)
  }, [])

  useEffect(() => {
    if (!checkInSuccess) return
    const timer = window.setTimeout(() => {
      setCheckInSuccess(null)
    }, OVERLAY_AUTO_HIDE_MS)
    return () => window.clearTimeout(timer)
  }, [checkInSuccess])

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      setCheckInSuccess(null)
      return
    }

    const token = safeStorage.getItem("sekkha_access_token")
    if (!token) return

    const openedAtMs = Date.now()
    let cancelled = false
    let pollTimer: number | null = null
    const abortController = new AbortController()

    function handleIncoming(payload: AttendanceCheckInNotification) {
      if (cancelled || !payload?.eventId || !payload?.scannedAt) return
      const scannedMs = Date.parse(payload.scannedAt)
      if (!Number.isNaN(scannedMs) && scannedMs < openedAtMs - CLOCK_SKEW_TOLERANCE_MS) {
        return
      }
      const key = `${payload.eventId}:${payload.scannedAt}`
      if (seenKeysRef.current.has(key)) return
      seenKeysRef.current.add(key)

      try {
        navigator.vibrate?.([40, 40, 60])
      } catch {
        // Ignore haptic unavailability
      }

      clearApiCache()
      setCheckInSuccess(payload)
      window.dispatchEvent(
        new CustomEvent("sekkha:attendance_recorded", { detail: payload })
      )
    }

    function startPollingFallback() {
      if (cancelled || pollTimer !== null) return
      const pollOnce = async () => {
        if (cancelled) return
        try {
          const res = await api.get<{
            data?: { latest?: AttendanceCheckInNotification | null }
            latest?: AttendanceCheckInNotification | null
          }>("/events/attendance/latest", { noCache: true })
          const latest = res?.data?.latest ?? res?.latest ?? null
          if (latest) {
            handleIncoming(latest)
          }
        } catch {
          // Ignore transient polling failures while QR stays open
        }
      }
      void pollOnce()
      pollTimer = window.setInterval(() => {
        void pollOnce()
      }, POLL_INTERVAL_MS)
    }

    async function connectSse() {
      if (typeof fetch !== "function") {
        startPollingFallback()
        return
      }

      try {
        const response = await fetch(`${API_BASE_URL}/events/attendance/stream`, {
          method: "GET",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "text/event-stream",
          },
          signal: abortController.signal,
        })

        if (!response.ok || !response.body || typeof response.body.getReader !== "function") {
          startPollingFallback()
          return
        }

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ""

        while (!cancelled) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const frames = buffer.split("\n\n")
          buffer = frames.pop() ?? ""

          for (const frame of frames) {
            const dataLines = frame
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim())
            if (dataLines.length === 0) continue

            try {
              const parsed = JSON.parse(
                dataLines.join("\n")
              ) as AttendanceCheckInNotification
              handleIncoming(parsed)
            } catch {
              // Ignore non-JSON heartbeat/comment frames
            }
          }
        }

        if (!cancelled) {
          startPollingFallback()
        }
      } catch {
        if (!cancelled) {
          startPollingFallback()
        }
      }
    }

    void connectSse()

    return () => {
      cancelled = true
      abortController.abort()
      if (pollTimer !== null) {
        window.clearInterval(pollTimer)
      }
    }
  }, [enabled])

  return { checkInSuccess, dismiss }
}
