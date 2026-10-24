// feature/events/components/AttendanceScanPage
// Continuous QR Attendance Scanner for Organizers & Admins.
// Implements in-flight mutex, 3-second rapid scan cooldown buffer,
// draft attendance listing, manual userNumber entry, and finalization.
// For members and activists, displays their personal Member QR card.

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CameraIcon,
  SearchIcon,
  AlertTriangleIcon,
  ListFilterIcon,
  ChevronDownIcon,
  RefreshCwIcon,
  UserPlusIcon,
  XIcon,
  LockIcon,
  Trash2Icon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import QRCode from "react-qr-code"
import { peopleApi } from "@/modules/people/internal/api/peopleApi"
import type { MemberDto } from "@/modules/people/internal/api/peopleApi"
import type { EventListItem, AttendanceRecord, UserRole } from "../types"
import { QrScannerCamera } from "./QrScannerCamera"
import { ConfirmDialog } from "@/components/base/AlertDialog"

interface RecentScanItem {
  id: string
  userId: string
  name: string
  userNumber?: string | null
  time: string
  status: "success" | "duplicate" | "error"
  message: string
}

function playScanChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sine"
    osc.frequency.setValueAtTime(880, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.15)
  } catch {}
}

function playWarningBuzz() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = "sawtooth"
    osc.frequency.setValueAtTime(240, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + 0.2)
    gain.gain.setValueAtTime(0.3, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + 0.25)
  } catch {}
}

export function AttendanceScanPage() {
  const navigate = useNavigate()
  const searchParams: { eventId?: string } = useSearch({ strict: false })
  const eventId = searchParams.eventId

  const { authState } = useAuth()
  const role: UserRole | null = authState.role ?? null
  // Strictly organizer and admin can operate attendance scanning per PRD AC-EVT-01
  const isPengurus = role === "organizer" || role === "admin"

  const [event, setEvent] = useState<EventListItem | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(true)
  const [eventError, setEventError] = useState<string | null>(null)

  const [pengurusMode, setPengurusMode] = useState<"camera" | "search">("camera")
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
  const [activeCameraId, setActiveCameraId] = useState<string>("")
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)

  // People list for manual attendance
  const [peopleList, setPeopleList] = useState<MemberDto[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [manualUserNumber, setManualUserNumber] = useState("")

  // Attendance state
  const [sessionAttendedIds, setSessionAttendedIds] = useState<Set<string>>(new Set())
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([])
  const [sessionSuccessCount, setSessionSuccessCount] = useState(0)

  // Feedback banner
  const [lastFeedback, setLastFeedback] = useState<{
    type: "success" | "duplicate" | "error"
    title: string
    subtitle: string
  } | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // In-flight mutex & 3-second rapid scan cooldown buffer
  const inFlightScanRef = useRef(false)
  const lastScannedRef = useRef<{ code: string; timestamp: number }>({
    code: "",
    timestamp: 0,
  })

  // Finalize dialog
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closingEvent, setClosingEvent] = useState(false)

  // Lock body scroll
  useEffect(() => {
    if (typeof document !== "undefined") {
      const originalOverflow = document.body.style.overflow
      const originalTouchAction = document.body.style.touchAction
      document.body.style.overflow = "hidden"
      document.body.style.touchAction = "none"
      return () => {
        document.body.style.overflow = originalOverflow
        document.body.style.touchAction = originalTouchAction
      }
    }
  }, [])

  // Load Event and initial attendances for instant recovery
  useEffect(() => {
    let cancelled = false
    async function loadScannerContext() {
      if (!eventId) {
        setEventError("Please select an event first to launch the attendance scanner.")
        setLoadingEvent(false)
        return
      }

      setLoadingEvent(true)
      setEventError(null)

      try {
        const [evData, attData] = await Promise.all([
          api.get<EventListItem>(`/events/${eventId}`),
          api.get<any>(`/events/${eventId}/attendances`).catch(() => []),
        ])

        if (cancelled) return
        setEvent(evData)

        const list: AttendanceRecord[] = Array.isArray(attData)
          ? attData
          : attData?.attendances || []

        setSessionAttendedIds(new Set(list.map((r) => r.user_id).filter(Boolean)))
        setSessionSuccessCount(list.length)

        // Populate initial scan list from server
        const initialScans: RecentScanItem[] = list.slice(0, 20).map((r) => ({
          id: r.attendance_id || r.user_id,
          userId: r.user_id,
          name: r.name,
          userNumber: r.user_number,
          time: new Date(r.scanned_at).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "success",
          message: r.is_late
            ? `Checked in (Late -${r.late_penalty_applied ?? 15} Pts)`
            : "Checked in successfully",
        }))
        setRecentScans(initialScans)
      } catch (error) {
        if (cancelled) return
        console.error("Failed to prepare scanner context:", error)
        setEvent(null)
        setEventError("Failed to load event details. Please verify your connection.")
      } finally {
        if (!cancelled) setLoadingEvent(false)
      }
    }

    void loadScannerContext()
    return () => {
      cancelled = true
    }
  }, [eventId])

  // Member profile state for non-organizers
  const [memberProfile, setMemberProfile] = useState<{
    name?: string
    userNumber?: string | null
    role?: string
  } | null>(null)

  useEffect(() => {
    if (!isPengurus) {
      api
        .get<any>("/users/me")
        .then((res) => {
          if (res) {
            setMemberProfile({
              name: res.profile?.name || res.name || authState.name || "Sekkha Member",
              userNumber: res.userNumber || res.user_number || res.id || authState.userId,
              role: res.role || authState.role || "member",
            })
          }
        })
        .catch(() => {})
    }
  }, [isPengurus, authState])

  // Load people list for manual attendance lookup
  useEffect(() => {
    if (isPengurus) {
      peopleApi
        .listMembers({ limit: 150, page: 1 })
        .then((data: any) => {
          const items = Array.isArray(data) ? data : data?.items || []
          setPeopleList(items)
        })
        .catch(() => {})
    }
  }, [isPengurus])

  function triggerFeedback(
    type: "success" | "duplicate" | "error",
    title: string,
    subtitle: string
  ) {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
    setLastFeedback({ type, title, subtitle })
    feedbackTimerRef.current = setTimeout(() => {
      setLastFeedback(null)
    }, 3500)
  }

  const handleCamerasDetected = useCallback(
    (detectedCams: Array<{ id: string; label: string }>, chosenId: string) => {
      setCameras(detectedCams)
      setActiveCameraId(chosenId)
    },
    []
  )

  function handleToggleCamera() {
    if (cameras.length <= 1) return
    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId)
    const nextIndex = (currentIndex + 1) % cameras.length
    const nextCam = cameras[nextIndex]
    if (nextCam) setActiveCameraId(nextCam.id)
  }

  // ── Core Continuous Scanning Engine with In-Flight Mutex & Rapid Cooldown ──
  async function processPengurusQrText(rawText: string) {
    if (!eventId || !rawText || !isPengurus) return

    const now = Date.now()
    // 3000ms cooldown buffer for duplicate scan of the same code
    if (
      lastScannedRef.current.code === rawText &&
      now - lastScannedRef.current.timestamp < 3000
    ) {
      return
    }

    // In-flight mutex
    if (inFlightScanRef.current) {
      return
    }

    inFlightScanRef.current = true
    lastScannedRef.current = { code: rawText, timestamp: now }

    let parsedUserNumber = rawText.trim()
    try {
      if (rawText.startsWith("{") && rawText.endsWith("}")) {
        const parsed = JSON.parse(rawText)
        parsedUserNumber = (
          parsed.user_number ||
          parsed.userNumber ||
          parsed.userId ||
          parsed.id ||
          rawText
        )
          .toString()
          .trim()
      }
    } catch {}

    const nowFormatted = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

    try {
      const res = await api.post<any>(`/events/${eventId}/attendances`, {
        user_number: parsedUserNumber,
        method: "qr",
      })

      playScanChime()
      const returnedUserId = res.user_id || res.id
      const returnedName = res.name || parsedUserNumber
      const returnedUserNumber = res.user_number || parsedUserNumber
      const isLate = Boolean(res.is_late)
      const latePenalty = res.late_penalty_applied ?? 15

      setSessionAttendedIds((prev) => new Set(prev).add(returnedUserId))
      setSessionSuccessCount((prev) => prev + 1)
      setRecentScans((prev) => [
        {
          id: res.attendance_id || String(Date.now()),
          userId: returnedUserId,
          name: returnedName,
          userNumber: returnedUserNumber,
          time: nowFormatted,
          status: "success",
          message: isLate
            ? `Checked in (Late -${latePenalty} Pts)`
            : "Checked in successfully (QR)",
        },
        ...prev.slice(0, 19),
      ])

      if (isLate) {
        triggerFeedback(
          "success",
          "Recorded (Late Arrival)",
          `${returnedName} checked in (-${latePenalty} Pts penalty applied).`
        )
      } else {
        triggerFeedback(
          "success",
          "Attendance Recorded!",
          `${returnedName} checked in on time.`
        )
      }
    } catch (err: any) {
      playWarningBuzz()
      const status = err?.status || err?.statusCode || 500
      const errMsg = err?.message || ""
      if (
        status === 409 ||
        errMsg.toLowerCase().includes("sudah") ||
        errMsg.toLowerCase().includes("already")
      ) {
        triggerFeedback(
          "duplicate",
          "Already Checked In!",
          "Participant has already been recorded present."
        )
      } else if (
        status === 404 ||
        errMsg.toLowerCase().includes("not found") ||
        errMsg.toLowerCase().includes("tidak ditemukan")
      ) {
        triggerFeedback(
          "error",
          "Member Not Found",
          `Number "${parsedUserNumber}" was not found.`
        )
      } else {
        triggerFeedback(
          "error",
          "Check-In Failed",
          errMsg || "Failed to record attendance."
        )
      }
    } finally {
      inFlightScanRef.current = false
    }
  }

  // ── Manual Attendance Recording ──
  async function recordManualAttendance(targetNumberOrId: string, memberName?: string) {
    if (!eventId || !targetNumberOrId) return

    const nowFormatted = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

    try {
      const res = await api.post<any>(`/events/${eventId}/attendances`, {
        user_number: targetNumberOrId,
        method: "manual",
      })

      playScanChime()
      const returnedUserId = res.user_id || res.id
      const returnedName = res.name || memberName || targetNumberOrId
      const returnedUserNumber = res.user_number || targetNumberOrId
      const isLate = Boolean(res.is_late)
      const latePenalty = res.late_penalty_applied ?? 15

      setSessionAttendedIds((prev) => new Set(prev).add(returnedUserId))
      setSessionSuccessCount((prev) => prev + 1)
      setRecentScans((prev) => [
        {
          id: res.attendance_id || String(Date.now()),
          userId: returnedUserId,
          name: returnedName,
          userNumber: returnedUserNumber,
          time: nowFormatted,
          status: "success",
          message: isLate
            ? `Checked in (Late -${latePenalty} Pts)`
            : "Checked in successfully (Manual)",
        },
        ...prev.slice(0, 19),
      ])

      triggerFeedback(
        "success",
        "Attendance Recorded!",
        `${returnedName} checked in manually.`
      )
      setManualUserNumber("")
    } catch (err: any) {
      playWarningBuzz()
      const status = err?.status || err?.statusCode || 500
      const errMsg = err?.message || ""
      if (
        status === 409 ||
        errMsg.toLowerCase().includes("sudah") ||
        errMsg.toLowerCase().includes("already")
      ) {
        triggerFeedback(
          "duplicate",
          "Already Checked In!",
          "Participant has already been recorded present."
        )
      } else {
        triggerFeedback(
          "error",
          "Manual Check-In Failed",
          errMsg || "Failed to record manual attendance."
        )
      }
    }
  }

  // ── Delete Draft Attendance ──
  async function handleDeleteDraft(userId: string) {
    if (!eventId) return
    try {
      await api.delete(`/events/${eventId}/attendances/${userId}`)
      setSessionAttendedIds((prev) => {
        const next = new Set(prev)
        next.delete(userId)
        return next
      })
      setRecentScans((prev) => prev.filter((item) => item.userId !== userId))
      setSessionSuccessCount((prev) => Math.max(0, prev - 1))
      triggerFeedback(
        "success",
        "Attendance Cancelled",
        "Draft check-in was successfully removed."
      )
    } catch (err: any) {
      triggerFeedback(
        "error",
        "Deletion Failed",
        err?.message || "Failed to delete draft attendance."
      )
    }
  }

  // ── Finalize & Close Event ──
  async function handleCloseAndFinalize() {
    if (!eventId) return
    try {
      setClosingEvent(true)
      await api.patch(`/events/${eventId}/status`, { status: "closed" })
      navigate({ to: "/events", search: { eventId } })
    } catch (err: any) {
      alert(err?.message || "Failed to finalize event.")
    } finally {
      setClosingEvent(false)
      setCloseDialogOpen(false)
    }
  }


  const currentCamLabel = useMemo(() => {
    const found = cameras.find((c) => c.id === activeCameraId)
    if (!found) return "Rear Camera"
    const l = found.label.toLowerCase()
    return l.includes("front") ? "Front Camera" : "Rear Camera"
  }, [cameras, activeCameraId])

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return peopleList
      .filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q)
        const numMatch = p.user_number?.toLowerCase().includes(q)
        return nameMatch || numMatch
      })
      .slice(0, 10)
  }, [peopleList, searchQuery])

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-[#0d2222] font-sans select-none">
      {/* ── 1. Top Glass Header Bar ── */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between border-b border-white/10 bg-[#102828]/85 p-3 backdrop-blur-xl sm:p-4">
        <button
          type="button"
          onClick={() => navigate({ to: "/events", search: eventId ? { eventId } : undefined })}
          className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95"
          title="Back to Events"
        >
          <ArrowLeftIcon className="size-4" />
        </button>

        <div className="min-w-0 max-w-[60%] text-center">
          <p className="text-caption truncate font-bold text-white">
            {loadingEvent
              ? "Loading Session..."
              : eventError
              ? "Event Not Found"
              : event?.title || "Attendance Session"}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-amber-300">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
            <span>
              {isPengurus
                ? `Live Session (${sessionSuccessCount} Present)`
                : "Member Card"}
            </span>
          </div>
        </div>

        {isPengurus ? (
          <div className="flex items-center gap-2">
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={handleToggleCamera}
                className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-all hover:bg-white/20 active:scale-95"
                title={`Switch Camera (${currentCamLabel})`}
              >
                <RefreshCwIcon className="size-4 text-amber-300" />
              </button>
            )}
            <button
              type="button"
              onClick={() => setCloseDialogOpen(true)}
              className="flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-full bg-rose-600/90 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-rose-600 active:scale-95"
              title="Close & Finalize Event"
            >
              <LockIcon className="size-3.5" />
              <span className="hidden sm:inline">Finalize Event</span>
            </button>
          </div>
        ) : (
          <div className="size-10" />
        )}
      </div>

      {/* Error state overlay if event loading failed */}
      {eventError && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-[#0d2222]/95 p-6 text-center">
          <AlertTriangleIcon className="size-8 text-amber-400" />
          <p className="text-sm font-semibold text-white">{eventError}</p>
          <button
            type="button"
            onClick={() => navigate({ to: "/events" })}
            className="cursor-pointer rounded-full bg-white px-5 py-2 text-xs font-bold text-black hover:bg-neutral-100"
          >
            Back to Events
          </button>
        </div>
      )}

      {/* ── 2. Floating Feedback Toast Banner ── */}
      {lastFeedback && (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-x-3 top-16 z-40 mx-auto max-w-sm animate-in duration-200 fade-in slide-in-from-top-4 sm:top-20"
        >
          <div
            className={`flex items-start gap-2.5 rounded-2xl border p-3 shadow-2xl backdrop-blur-xl ${
              lastFeedback.type === "success"
                ? "border-emerald-400/80 bg-emerald-950/90 text-white"
                : lastFeedback.type === "duplicate"
                  ? "border-amber-400/80 bg-amber-950/90 text-white"
                  : "border-rose-400/80 bg-rose-950/90 text-white"
            }`}
          >
            {lastFeedback.type === "success" ? (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/30 text-emerald-300">
                <CheckCircle2Icon className="size-4 text-emerald-400" />
              </div>
            ) : (
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-xl ${
                  lastFeedback.type === "duplicate"
                    ? "bg-amber-500/30 text-amber-300"
                    : "bg-rose-500/30 text-rose-300"
                }`}
              >
                <AlertTriangleIcon className="size-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold leading-tight">{lastFeedback.title}</p>
              <p className="mt-0.5 text-[11px] leading-tight opacity-90">
                {lastFeedback.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLastFeedback(null)}
              className="flex size-6 cursor-pointer items-center justify-center rounded-full text-white/60 hover:text-white"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Main Body (Camera Scanner or Member QR Card) ── */}
      <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center overflow-hidden">
        {isPengurus ? (
          pengurusMode === "camera" ? (
            <QrScannerCamera
              onScan={processPengurusQrText}
              onError={() => {}}
              isFullScreen={true}
              hideControls={true}
              onCamerasDetected={handleCamerasDetected}
              externalCameraId={activeCameraId}
            />
          ) : (
            /* Manual Attendance Form */
            <div className="mx-auto max-h-[80vh] w-full max-w-md animate-in space-y-4 overflow-y-auto p-4 duration-150 zoom-in-95 fade-in">
              <div className="space-y-4 rounded-3xl border border-white/20 bg-[#102828]/95 p-5 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <h4 className="flex items-center gap-2 text-sm font-bold text-white">
                    <UserPlusIcon className="size-4 text-amber-400" />
                    <span>Manual Attendance</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setPengurusMode("camera")}
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200"
                  >
                    Open Camera
                  </button>
                </div>

                {/* Direct Number Input */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (manualUserNumber.trim()) {
                      void recordManualAttendance(manualUserNumber.trim())
                    }
                  }}
                  className="space-y-2"
                >
                  <label className="text-[11px] font-semibold text-white/70">
                    Input Member Number (userNumber)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualUserNumber}
                      onChange={(e) => setManualUserNumber(e.target.value)}
                      placeholder="e.g. 202610230001"
                      className="flex-1 rounded-xl border border-white/20 bg-[#1a3a3a] px-3 py-2 text-xs text-white outline-none placeholder:text-white/40 focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      disabled={!manualUserNumber.trim()}
                      className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-[#1a3a3a] shadow-xs hover:bg-amber-300 disabled:opacity-50"
                    >
                      Check In
                    </button>
                  </div>
                </form>

                {/* Search in Registered Members */}
                <div className="border-t border-white/10 pt-3">
                  <label className="text-[11px] font-semibold text-white/70">
                    Or Search by Member Name
                  </label>
                  <div className="relative mt-1">
                    <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-white/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type member name..."
                      className="w-full rounded-xl border border-white/20 bg-[#1a3a3a] py-2 pr-3 pl-9 text-xs text-white outline-none placeholder:text-white/40 focus:border-amber-400"
                    />
                  </div>

                  <div className="mt-2 max-h-48 space-y-1.5 overflow-y-auto pr-1">
                    {filteredPeople.map((p) => {
                      const isAttended = sessionAttendedIds.has(p.id)
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between rounded-xl bg-white/5 p-2"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-white">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-white/60">
                              {p.user_number || "-"}
                            </p>
                          </div>
                          {isAttended ? (
                            <span className="text-[10px] font-bold text-emerald-400">
                              Present
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                void recordManualAttendance(p.user_number || p.id, p.name)
                                setSearchQuery("")
                              }}
                              className="rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-white/25"
                            >
                              + Check In
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          /* Member View: Personal Member QR Code Card (PRD Section 4) */
          <div className="mx-auto w-full max-w-sm animate-in space-y-4 p-4 duration-150 zoom-in-95 fade-in">
            <div className="space-y-4 rounded-3xl border border-white/20 bg-[#102828]/95 p-6 text-center shadow-2xl backdrop-blur-xl">
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-500/20 px-3 py-1 text-[11px] font-bold text-amber-300">
                  <CheckCircle2Icon className="size-3.5" />
                  <span>Member Attendance Card</span>
                </span>
                <h4 className="mt-2 text-base font-extrabold text-white">
                  {event?.title || "Sekkha Community Event"}
                </h4>
                <p className="text-xs text-zinc-400">
                  Present this QR code to the event organizers at the registration desk.
                </p>
              </div>

              <div className="mx-auto w-fit rounded-2xl bg-white p-4 shadow-inner">
                <QRCode
                  value={
                    memberProfile?.userNumber ||
                    authState.userId ||
                    "SEKKHA-MEMBER"
                  }
                  size={190}
                  level="H"
                />
              </div>

              <div className="space-y-0.5 pt-1">
                <p className="text-sm font-bold text-white">
                  {memberProfile?.name || authState.name || "Sekkha Member"}
                </p>
                <p className="font-mono text-xs font-semibold tracking-wider text-amber-400">
                  {memberProfile?.userNumber || "Registered ID"}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/events" })}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 py-3 text-xs font-bold text-white transition-all hover:bg-white/20 active:scale-[0.98]"
                >
                  <ArrowLeftIcon className="size-4" />
                  <span>Back to Events List</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Collapsible History Drawer ── */}
      {isHistoryDrawerOpen && isPengurus && (
        <div className="absolute inset-x-2.5 bottom-20 z-40 mx-auto max-w-md animate-in rounded-3xl border border-white/20 bg-[#102828]/95 p-4 shadow-2xl backdrop-blur-2xl duration-200 slide-in-from-bottom-5 fade-in sm:inset-x-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <ListFilterIcon className="size-4 text-amber-400" />
              <h4 className="text-xs font-bold text-white">
                Live Scan History
              </h4>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white">
                {recentScans.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsHistoryDrawerOpen(false)}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <ChevronDownIcon className="size-4" />
            </button>
          </div>

          <div className="mt-3 max-h-56 space-y-2 divide-y divide-white/5 overflow-y-auto pr-1">
            {recentScans.length > 0 ? (
              recentScans.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between pt-2 first:pt-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">
                      {item.name}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400">
                      {item.userNumber ? `${item.userNumber} • ` : ""}
                      {item.message}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pl-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                        item.status === "success"
                          ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                          : "border-amber-500/30 bg-amber-500/20 text-amber-300"
                      }`}
                    >
                      {item.time}
                    </span>
                    {item.userId !== "unknown" && (
                      <button
                        type="button"
                        onClick={() => handleDeleteDraft(item.userId)}
                        className="text-zinc-400 hover:text-rose-400"
                        title="Delete draft attendance"
                      >
                        <Trash2Icon className="size-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-xs text-zinc-400">
                No attendance scans recorded in this session yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 5. Bottom Navigation Dock ── */}
      {isPengurus && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-2 bg-gradient-to-t from-[#102828]/95 via-[#102828]/70 to-transparent p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-3 sm:p-4">
          <button
            type="button"
            onClick={() => {
              setPengurusMode((prev) => (prev === "camera" ? "search" : "camera"))
              setIsHistoryDrawerOpen(false)
            }}
            className={`flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold shadow-lg backdrop-blur-xl transition-all active:scale-95 ${
              pengurusMode === "search"
                ? "border-amber-300 bg-amber-400 text-[#1a3a3a]"
                : "border-white/25 bg-[#102828]/85 text-white hover:bg-[#1a3a3a]"
            }`}
          >
            {pengurusMode === "search" ? (
              <>
                <CameraIcon className="size-4 text-[#1a3a3a]" />
                <span>Open Camera</span>
              </>
            ) : (
              <>
                <UserPlusIcon className="size-4 text-amber-300" />
                <span>Manual Entry</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsHistoryDrawerOpen((prev) => !prev)}
            className={`flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-bold shadow-lg backdrop-blur-xl transition-all active:scale-95 ${
              isHistoryDrawerOpen
                ? "border-white bg-white text-[#1a3a3a]"
                : "border-white/25 bg-[#102828]/85 text-white hover:bg-[#1a3a3a]"
            }`}
          >
            <ListFilterIcon className="size-4 text-amber-400" />
            <span>History ({recentScans.length})</span>
          </button>
        </div>
      )}

      {/* ── Finalize Confirmation Dialog ── */}
      <ConfirmDialog
        open={closeDialogOpen}
        onOpenChange={(open) => !open && setCloseDialogOpen(false)}
        variant="destructive"
        title="Complete & Finalize Attendance Session?"
        description="Closing the event will mark all draft attendances as finalized and credit attendance points directly to members' balances in a single transaction. This action cannot be reversed."
        confirmLabel={closingEvent ? "Finalizing..." : "Yes, Finalize & Close"}
        cancelLabel="Keep Session Active"
        onConfirm={handleCloseAndFinalize}
      />
    </div>
  )
}
