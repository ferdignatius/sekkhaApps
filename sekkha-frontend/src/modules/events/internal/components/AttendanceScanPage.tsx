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
  SearchIcon,
  AlertTriangleIcon,
  UserPlusIcon,
  XIcon,
  LockIcon,
  MoreVerticalIcon,
  ImageIcon,
  RefreshCwIcon,
  ZapIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import {
  peopleApi,
  PreProvisionMemberModal,
  useSimilarMembers,
} from "@/modules/people"
import type { MemberDto, SimilarMemberDto } from "@/modules/people"
import type { EventListItem, AttendanceRecord, UserRole } from "../types"
import { QrScannerCamera } from "./QrScannerCamera"

interface RecentScanItem {
  id: string
  userId: string
  name: string
  userNumber?: string | null
  time: string
  status: "success" | "duplicate" | "error"
  message: string
}

/** Format attendance check-in timestamps uniformly without seconds. */
function formatScanTime(input: Date | string): string {
  return new Date(input).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

let sharedAudioCtx: AudioContext | null = null

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null
  if (!sharedAudioCtx || sharedAudioCtx.state === "closed") {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx()
    }
  }
  if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
    void sharedAudioCtx.resume().catch(() => { })
  }
  return sharedAudioCtx
}

function playScanChime() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
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
  } catch { }
}

function playWarningBuzz() {
  try {
    const ctx = getSharedAudioContext()
    if (!ctx) return
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
  } catch { }
}

function triggerHaptic(type: "success" | "error") {
  if (typeof window !== "undefined" && "vibrate" in navigator) {
    try {
      if (type === "success") {
        navigator.vibrate?.([40, 60, 40])
      } else {
        navigator.vibrate?.([80, 50, 80])
      }
    } catch { }
  }
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

  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>(
    []
  )
  const [activeCameraId, setActiveCameraId] = useState<string>("")
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)
  const [isTorchOn, setIsTorchOn] = useState(false)
  const [hasTorchSupport, setHasTorchSupport] = useState(false)

  // Detect torch capability on active video stream track
  const checkTorchCapability = useCallback(() => {
    try {
      const videoElem = document.querySelector("video") as HTMLVideoElement | null
      const stream = videoElem?.srcObject as MediaStream | null
      const track = stream?.getVideoTracks()[0]
      if (track) {
        const caps = track.getCapabilities?.() as any
        if (caps && "torch" in caps) {
          setHasTorchSupport(true)
          return
        }
      }
    } catch { }
    setHasTorchSupport(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(checkTorchCapability, 1200)
    return () => clearTimeout(timer)
  }, [activeCameraId, checkTorchCapability])

  async function handleToggleTorch() {
    try {
      const videoElem = document.querySelector("video") as HTMLVideoElement | null
      const stream = videoElem?.srcObject as MediaStream | null
      const track = stream?.getVideoTracks()[0]
      if (!track) return
      const nextTorch = !isTorchOn
      await (track.applyConstraints as any)({
        advanced: [{ torch: nextTorch }],
      })
      setIsTorchOn(nextTorch)
    } catch (err) {
      console.warn("Flashlight toggle not supported on this track:", err)
    }
  }

  // People list for manual attendance
  const [peopleList, setPeopleList] = useState<MemberDto[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [preProvisionOpen, setPreProvisionOpen] = useState(false)

  const isNumericQuery = /^\d+$/.test(searchQuery.trim())

  // Async fuzzy similarity lookup powers typo-tolerant results inside the floating search dropdown
  const { similarMembers } = useSimilarMembers(searchQuery, {
    enabled: isPengurus && !isNumericQuery,
  })

  // Bottom sheet drag gesture state for History drawer
  const sheetDragStartYRef = useRef<number | null>(null)
  const sheetDraggedRef = useRef(false)

  function handleSheetPointerDown(e: React.PointerEvent<HTMLElement>) {
    sheetDragStartYRef.current = e.clientY
    sheetDraggedRef.current = false
  }

  function handleSheetPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (sheetDragStartYRef.current === null) return
    const deltaY = e.clientY - sheetDragStartYRef.current
    if (Math.abs(deltaY) > 24) {
      sheetDraggedRef.current = true
      if (deltaY < -24) {
        setIsHistoryDrawerOpen(true)
      } else if (deltaY > 24) {
        setIsHistoryDrawerOpen(false)
      }
      sheetDragStartYRef.current = null
    }
  }

  function handleSheetPointerEnd() {
    sheetDragStartYRef.current = null
  }

  // Attendance state
  const [sessionAttendedIds, setSessionAttendedIds] = useState<Set<string>>(
    new Set()
  )
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([])
  const [sessionSuccessCount, setSessionSuccessCount] = useState(0)

  // Feedback banner & floating random bubble toasts
  const [lastFeedback, setLastFeedback] = useState<{
    type: "success" | "duplicate" | "error"
    title: string
    subtitle: string
  } | null>(null)
  const [floatingBubbles, setFloatingBubbles] = useState<
    Array<{
      id: string
      type: "success" | "duplicate" | "error"
      title: string
      subtitle: string
      offsetX: number
    }>
  >([])
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bubbleTimersRef = useRef<Array<ReturnType<typeof setTimeout>>>([])

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current)
      bubbleTimersRef.current.forEach(clearTimeout)
      bubbleTimersRef.current = []
    }
  }, [])

  // In-flight mutex & 3-second rapid scan cooldown buffer
  const inFlightScanRef = useRef(false)
  const lastScannedRef = useRef<{ code: string; timestamp: number }>({
    code: "",
    timestamp: 0,
  })

  // Scanner options menu & imperative actions
  const [menuOpen, setMenuOpen] = useState(false)
  const scannerActionsRef = useRef<{ openGallery: () => void } | null>(null)

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
        setEventError(
          "Please select an event first to launch the attendance scanner."
        )
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

        setSessionAttendedIds(
          new Set(list.map((r) => r.user_id).filter(Boolean))
        )
        setSessionSuccessCount(list.length)

        // Populate initial scan list from server
        const initialScans: RecentScanItem[] = list.slice(0, 20).map((r) => ({
          id: r.attendance_id || r.user_id,
          userId: r.user_id,
          name: r.name,
          userNumber: r.user_number,
          time: formatScanTime(r.scanned_at),
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
        setEventError(
          "Failed to load event details. Please verify your connection."
        )
      } finally {
        if (!cancelled) setLoadingEvent(false)
      }
    }

    void loadScannerContext()
    return () => {
      cancelled = true
    }
  }, [eventId])

  // Load people list for manual attendance lookup
  useEffect(() => {
    if (isPengurus) {
      peopleApi
        .listMembers({ limit: 100, page: 1 })
        .then((data: any) => {
          const items = Array.isArray(data) ? data : data?.items || []
          setPeopleList(items)
        })
        .catch(() => { })
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

    const id = `bubble-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const offsetX = Math.round((Math.random() - 0.5) * 56)
    setFloatingBubbles((prev) => [
      ...prev.slice(-3),
      { id, type, title, subtitle, offsetX },
    ])
    const timer = setTimeout(() => {
      setFloatingBubbles((prev) => prev.filter((b) => b.id !== id))
    }, 2600)
    bubbleTimersRef.current.push(timer)
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
    } catch { }

    const nowFormatted = formatScanTime(new Date())

    try {
      const res = await api.post<any>(`/events/${eventId}/attendances`, {
        user_number: parsedUserNumber,
        method: "qr",
      })

      playScanChime()
      triggerHaptic("success")
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
      triggerHaptic("error")
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
  async function recordManualAttendance(
    targetNumberOrId: string,
    memberName?: string
  ) {
    if (!eventId || !targetNumberOrId) return

    const nowFormatted = formatScanTime(new Date())

    try {
      const res = await api.post<any>(`/events/${eventId}/attendances`, {
        user_number: targetNumberOrId,
        method: "manual",
      })

      playScanChime()
      triggerHaptic("success")
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
      setSearchQuery("")
    } catch (err: any) {
      playWarningBuzz()
      triggerHaptic("error")
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

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return []
    const q = searchQuery.toLowerCase().trim()
    return peopleList
      .filter((p) => {
        const nameMatch = p.name.toLowerCase().includes(q)
        const numMatch =
          p.user_number !== null &&
          p.user_number !== undefined &&
          String(p.user_number).toLowerCase().includes(q)
        return nameMatch || numMatch
      })
      .slice(0, 10)
  }, [peopleList, searchQuery])

  const displayedManualPeople: Array<MemberDto | SimilarMemberDto> = useMemo(() => {
    if (!searchQuery.trim()) return []
    if (!isNumericQuery && searchQuery.trim().length >= 3 && similarMembers.length > 0) {
      const seen = new Set(filteredPeople.map((p) => p.id))
      const extraFuzzy = similarMembers.filter((m) => !seen.has(m.id))
      return [...filteredPeople, ...extraFuzzy].slice(0, 8)
    }
    return filteredPeople.slice(0, 8)
  }, [searchQuery, isNumericQuery, similarMembers, filteredPeople])

  return (
    <div className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-[#fffaf0] font-sans select-none">
      {/* ── 1. Top Transparent Floating Header Bar ── */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-40 flex items-center justify-between bg-gradient-to-b from-black/25 via-black/5 to-transparent p-3 pb-6 sm:p-4 sm:pb-8">
        <button
          type="button"
          onClick={() =>
            navigate({
              to: "/events",
              search: eventId ? { eventId } : undefined,
            })
          }
          className="pointer-events-auto flex size-10 cursor-pointer items-center justify-center rounded-full border border-[#ded5c0] bg-[#fffaf0]/92 text-[#0a0a0a] shadow-m3-1 backdrop-blur-md transition-all hover:bg-[#faf5e8] active:scale-95"
          title="Back to Events"
        >
          <ArrowLeftIcon className="size-4" />
        </button>

        <div className="max-w-[60%] min-w-0 rounded-full border border-[#ded5c0] bg-[#fffaf0]/92 px-3.5 py-1 text-center shadow-m3-1 backdrop-blur-md">
          <p className="text-caption truncate font-bold text-[#0a0a0a]">
            {loadingEvent
              ? "Loading Session..."
              : eventError
                ? "Event Not Found"
                : event?.title || "Attendance Session"}
          </p>
          <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium text-[#6a6a6a]">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            <span>
              {isPengurus
                ? `Live Session (${sessionSuccessCount} Present)`
                : "Member Card"}
            </span>
          </div>
        </div>

        {isPengurus ? (
          <div className="pointer-events-auto relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Scanner options"
              aria-expanded={menuOpen}
              className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-[#ded5c0] bg-[#fffaf0]/92 text-[#0a0a0a] shadow-m3-1 backdrop-blur-md transition-all hover:bg-[#faf5e8] active:scale-95"
              title="More options"
            >
              <MoreVerticalIcon className="size-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setMenuOpen(false)}
                />
                <div
                  role="menu"
                  className="absolute top-12 right-0 z-50 w-52 animate-in rounded-2xl border border-[#ded5c0] bg-[#fffaf0]/95 p-1.5 text-[#0a0a0a] shadow-m3-2 backdrop-blur-xl duration-150 fade-in zoom-in-95"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      scannerActionsRef.current?.openGallery()
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0]"
                  >
                    <ImageIcon className="size-4 text-[#9a6e13]" />
                    <span>Upload QR Image</span>
                  </button>

                  {cameras.length > 1 && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        handleToggleCamera()
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0]"
                    >
                      <RefreshCwIcon className="size-4 text-[#9a6e13]" />
                      <span>Flip Camera</span>
                    </button>
                  )}

                  {hasTorchSupport && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false)
                        void handleToggleTorch()
                      }}
                      className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0]"
                    >
                      <ZapIcon
                        className={`size-4 ${isTorchOn ? "fill-[#e8b94a] text-[#9a6e13]" : "text-[#9a6e13]"}`}
                      />
                      <span>
                        {isTorchOn ? "Turn Off Flash" : "Turn On Flash"}
                      </span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="size-10" />
        )}
      </div>

      {/* Error state overlay if event loading failed */}
      {eventError && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-[#fffaf0]/95 p-6 text-center text-[#0a0a0a]">
          <AlertTriangleIcon className="size-8 text-[#b47f14]" />
          <p className="text-sm font-semibold text-[#0a0a0a]">{eventError}</p>
          <button
            type="button"
            onClick={() => navigate({ to: "/events" })}
            className="cursor-pointer rounded-full bg-[#0a0a0a] px-5 py-2 text-xs font-bold text-white hover:bg-[#262626]"
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
            className={`flex items-start gap-2.5 rounded-2xl border p-3 shadow-2xl backdrop-blur-xl ${lastFeedback.type === "success"
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
                className={`flex size-7 shrink-0 items-center justify-center rounded-xl ${lastFeedback.type === "duplicate"
                  ? "bg-amber-500/30 text-amber-300"
                  : "bg-rose-500/30 text-rose-300"
                  }`}
              >
                <AlertTriangleIcon className="size-4" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs leading-tight font-bold">
                {lastFeedback.title}
              </p>
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

      {/* ── 3. Main Body (Full-Screen Live QR Camera Scanner) ── */}
      <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center overflow-hidden">
        {isPengurus ? (
          <QrScannerCamera
            onScan={processPengurusQrText}
            onError={() => { }}
            isFullScreen={true}
            hideControls={true}
            isPaused={searchQuery.trim().length > 0 || preProvisionOpen}
            onCamerasDetected={handleCamerasDetected}
            externalCameraId={activeCameraId}
            actionsRef={scannerActionsRef}
          />
        ) : (
          /* Non-organizer / non-admin blocked access per PRD AC-EVT-01 */
          <div className="mx-auto w-full max-w-sm animate-in space-y-4 p-4 duration-150 zoom-in-95 fade-in">
            <div className="space-y-4 rounded-3xl border border-[#e5e5e5] bg-[#fffaf0] p-6 text-center shadow-m3-2">
              <div className="flex justify-center">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
                  <LockIcon className="size-6" />
                </span>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-extrabold text-[#0a0a0a]">
                  Access Restricted
                </h4>
                <p className="text-xs text-[#6a6a6a]">
                  Attendance scanning is strictly restricted to event organizers and administrators. Your personal QR card can be viewed in your Profile.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/events" })}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[#e5e5e5] bg-[#faf5e8] py-3 text-xs font-bold text-[#0a0a0a] transition-all hover:bg-[#ebe6d6] active:scale-[0.98]"
                >
                  <ArrowLeftIcon className="size-4" />
                  <span>Back to Events List</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Floating Random Bubble Toasts ── */}
      {floatingBubbles.length > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 bottom-24 z-40 flex flex-col items-center gap-2"
        >
          {floatingBubbles.map((bubble) => (
            <div
              key={bubble.id}
              style={{ transform: `translateX(${bubble.offsetX}px)` }}
              className={`inline-flex max-w-xs animate-in items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold shadow-2xl backdrop-blur-xl duration-300 fade-in slide-in-from-bottom-4 zoom-in-95 ${bubble.type === "success"
                ? "border-emerald-300/70 bg-emerald-900/90 text-emerald-50"
                : bubble.type === "duplicate"
                  ? "border-amber-300/70 bg-amber-900/90 text-amber-50"
                  : "border-rose-300/70 bg-rose-900/90 text-rose-50"
                }`}
            >
              {bubble.type === "success" ? (
                <CheckCircle2Icon className="size-4 shrink-0 text-emerald-300" />
              ) : (
                <AlertTriangleIcon className="size-4 shrink-0 text-amber-300" />
              )}
              <span className="truncate">{bubble.title}</span>
              <span className="max-w-[140px] truncate text-[11px] font-medium opacity-80">
                {bubble.subtitle}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* ── 4. iOS-style Bottom Frosted Search Bar + Draggable History Sheet ── */}
      {isPengurus && !eventError && (
        <>
          {(searchQuery.trim().length > 0 || isHistoryDrawerOpen) && (
            <div
              className="fixed inset-0 z-20"
              onClick={() => {
                setSearchQuery("")
                setIsHistoryDrawerOpen(false)
              }}
            />
          )}

          <div className="pointer-events-none fixed inset-x-3 bottom-[max(0.85rem,env(safe-area-inset-bottom))] z-30 mx-auto max-w-md">
            <div
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={handleSheetPointerEnd}
              onPointerCancel={handleSheetPointerEnd}
              className="pointer-events-auto overflow-hidden rounded-[24px] border border-[#ded5c0] bg-[#fffaf0]/92 text-[#0a0a0a] shadow-m3-2 backdrop-blur-xl transition-all duration-200"
            >
              {/* Drag Handle Bar — swipe up anywhere on pill or tap handle to reveal History */}
              <div
                onClick={() => {
                  if (sheetDraggedRef.current) {
                    sheetDraggedRef.current = false
                    return
                  }
                  if (searchQuery.trim().length > 0) return
                  setIsHistoryDrawerOpen((prev) => !prev)
                }}
                aria-label="Drag up or tap for attendance history"
                className="flex cursor-grab touch-none justify-center pt-2 pb-1 active:cursor-grabbing"
              >
                <div className="h-1 w-9 rounded-full bg-[#0a0a0a]/20" />
              </div>

              {/* iOS-Style Frosted Search Input Row (stays at top of sheet when dragged up) */}
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  const q = searchQuery.trim()
                  if (!q) return
                  if (/^\d+$/.test(q)) {
                    void recordManualAttendance(q)
                  } else if (displayedManualPeople.length === 1) {
                    const onlyMatch = displayedManualPeople[0]!
                    void recordManualAttendance(
                      onlyMatch.user_number
                        ? String(onlyMatch.user_number)
                        : onlyMatch.id,
                      onlyMatch.name
                    )
                  }
                }}
                className="flex items-center gap-2 px-3.5 pt-1 pb-2.5"
              >
                <SearchIcon className="size-4 shrink-0 text-[#6a6a6a]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (e.target.value.trim()) {
                      setIsHistoryDrawerOpen(false)
                    }
                  }}
                  placeholder="Search member name or ID..."
                  className="min-w-0 flex-1 bg-transparent text-xs font-medium text-[#0a0a0a] outline-none placeholder:text-[#6a6a6a]"
                />
                {searchQuery.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#6a6a6a] transition-colors hover:bg-[#ebe6d6] hover:text-[#0a0a0a]"
                  >
                    <XIcon className="size-3.5" />
                  </button>
                )}
                {isNumericQuery && (
                  <button
                    type="submit"
                    className="shrink-0 cursor-pointer rounded-xl bg-[#0a0a0a] px-3 py-1.5 text-[11px] font-bold text-white shadow-xs hover:bg-[#262626]"
                  >
                    Check In
                  </button>
                )}
              </form>

              {/* Expanded Area Below Search Bar: either Live Search Results OR Dragged-Up History */}
              {searchQuery.trim().length > 0 ? (
                <div className="animate-in border-t border-[#e5e5e5] px-2.5 pt-2.5 pb-2.5 duration-150 fade-in slide-in-from-bottom-2">
                  <div className="max-h-[42vh] touch-pan-y space-y-1.5 overflow-y-auto pr-0.5">
                    {displayedManualPeople.map((p) => {
                      const isAttended = sessionAttendedIds.has(p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          disabled={isAttended}
                          onClick={() => {
                            if (isAttended) return
                            void recordManualAttendance(
                              p.user_number ? String(p.user_number) : p.id,
                              p.name
                            )
                          }}
                          className={`flex w-full items-center justify-between gap-2 rounded-xl border p-2.5 text-left transition-all ${
                            isAttended
                              ? "cursor-default border-emerald-500/30 bg-emerald-500/10"
                              : "cursor-pointer border-[#ded5c0] bg-[#faf5e8] hover:border-[#e8b94a] hover:bg-[#f5f0e0] active:scale-[0.99]"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-[#0a0a0a]">
                              {p.name}
                            </p>
                            <p className="truncate text-[10px] text-[#6a6a6a]">
                              {p.user_number || "-"}
                              {"school" in p && p.school ? ` · ${p.school}` : ""}
                            </p>
                          </div>
                          {isAttended ? (
                            <span className="shrink-0 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              Present
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-lg bg-[#0a0a0a] px-2.5 py-1 text-[11px] font-bold text-white shadow-xs">
                              + Check In
                            </span>
                          )}
                        </button>
                      )
                    })}

                    {displayedManualPeople.length === 0 && (
                      <p className="py-3 text-center text-xs text-[#6a6a6a]">
                        No registered member matches &ldquo;{searchQuery.trim()}&rdquo;.
                      </p>
                    )}
                  </div>

                  {/* Create New Member Action at the bottom of results */}
                  <div className="mt-2 border-t border-[#e5e5e5] pt-2">
                    <button
                      type="button"
                      onClick={() => setPreProvisionOpen(true)}
                      className="flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#e8b94a]/70 bg-[#faf5e8] px-3 py-2 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#f5ebd0]"
                    >
                      <UserPlusIcon className="size-3.5 text-[#9a6e13]" />
                      <span>Create New Member</span>
                    </button>
                  </div>
                </div>
              ) : isHistoryDrawerOpen ? (
                <div className="animate-in border-t border-[#e5e5e5] px-3.5 pt-2.5 pb-3 duration-150 fade-in slide-in-from-bottom-2">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[11px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                      Session Attendance ({recentScans.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsHistoryDrawerOpen(false)}
                      aria-label="Close history"
                      className="flex size-6 cursor-pointer items-center justify-center rounded-full text-[#6a6a6a] hover:bg-[#ebe6d6] hover:text-[#0a0a0a]"
                    >
                      <XIcon className="size-3.5" />
                    </button>
                  </div>

                  <div className="max-h-[42vh] touch-pan-y space-y-2 divide-y divide-[#e5e5e5] overflow-y-auto pr-1">
                    {recentScans.length > 0 ? (
                      recentScans.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between pt-2 first:pt-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-[#0a0a0a]">
                              {item.name}
                            </p>
                            <p className="truncate text-[10px] text-[#6a6a6a]">
                              {item.userNumber ? `${item.userNumber} • ` : ""}
                              {item.message}
                            </p>
                          </div>
                          <span
                            className={`ml-2 shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${
                              item.status === "success"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                                : "border-[#e8b94a]/50 bg-[#e8b94a]/15 text-[#8a6110]"
                            }`}
                          >
                            {item.time}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="py-4 text-center text-xs text-[#6a6a6a]">
                        No attendance scans recorded in this session yet.
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      )}

      {/* ── Quick Pre-Provision Member Modal (Walk-in Manual Entry) ── */}
      <PreProvisionMemberModal
        open={preProvisionOpen}
        onOpenChange={setPreProvisionOpen}
        initialName={searchQuery.trim()}
        canLoadSchools={isPengurus}
        submitLabel="Register & Check In"
        onSuccess={async (created) => {
          setPeopleList((prev) => [
            {
              id: created.id,
              name: created.name,
              username: created.username,
              role: created.role,
              user_number: created.user_number,
              is_claimed: created.is_claimed,
              school: created.school ?? null,
              school_id: created.school_id ?? null,
              created_at: created.created_at,
            },
            ...prev,
          ])
          if (created.user_number) {
            await recordManualAttendance(
              String(created.user_number),
              created.name
            )
          }
          setSearchQuery("")
        }}
      />
    </div>
  )
}
