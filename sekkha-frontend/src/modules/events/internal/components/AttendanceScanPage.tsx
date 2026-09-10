import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useSearch } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  CameraIcon,
  SearchIcon,
  AlertTriangleIcon,
  KeyboardIcon,
  ListFilterIcon,
  ChevronDownIcon,
  ImageIcon,
  RefreshCwIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import { teamsApi } from "@/modules/teams/internal/api/teamsApi"
import type { MemberDto } from "@/modules/teams/internal/api/teamsApi"
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

function playWarningChime() {
  try {
    const ctx = new (
      window.AudioContext || (window as any).webkitAudioContext
    )()
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
  const isPengurus = role === "pengurus" || role === "admin"

  // Event and attendances data state
  const [event, setEvent] = useState<EventListItem | null>(null)
  const [loadingEvent, setLoadingEvent] = useState(true)

  // Mode for Pengurus: 'camera' | 'search'
  const [pengurusMode, setPengurusMode] = useState<"camera" | "search">(
    "camera"
  )

  // Mode for Umat: 'camera' | 'manual'
  const [umatMode, setUmatMode] = useState<"camera" | "manual">("camera")

  // Camera Switcher state
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>(
    []
  )
  const [activeCameraId, setActiveCameraId] = useState<string>("")

  const handleCamerasDetected = useCallback(
    (detectedCams: Array<{ id: string; label: string }>, chosenId: string) => {
      setCameras(detectedCams)
      setActiveCameraId(chosenId)
    },
    []
  )

  // Collapsible History Drawer State
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)

  // Real People database for manual search
  const [peopleList, setPeopleList] = useState<MemberDto[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  // Attended IDs Set
  const [sessionAttendedIds, setSessionAttendedIds] = useState<Set<string>>(
    new Set()
  )

  // Live real-time scan queue list
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([])
  const [sessionSuccessCount, setSessionSuccessCount] = useState(0)

  // Banner feedback for last scan
  const [lastFeedback, setLastFeedback] = useState<{
    type: "success" | "duplicate" | "error"
    title: string
    subtitle: string
  } | null>(null)
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Manual input state
  const [codeInput, setCodeInput] = useState("")
  const [codeError, setCodeError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Photo upload ref
  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  // Lock body scroll on mount
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

  // Fetch Event details and Attendances list
  useEffect(() => {
    if (!eventId) {
      setLoadingEvent(false)
      return
    }

    setLoadingEvent(true)
    Promise.all([
      api.get<EventListItem>(`/events/${eventId}`).catch(() => null),
      api
        .get<AttendanceRecord[]>(`/events/${eventId}/attendance`)
        .catch(() => []),
    ])
      .then(([evData, attData]) => {
        if (evData) setEvent(evData)
        if (attData) {
          setSessionAttendedIds(
            new Set(attData.map((r) => r.user_id).filter(Boolean) as string[])
          )
        }
      })
      .finally(() => setLoadingEvent(false))
  }, [eventId])

  // Load People list for Pengurus manual search
  useEffect(() => {
    if (isPengurus) {
      teamsApi
        .listMembers()
        .then((data) => setPeopleList(data))
        .catch((err) => console.error("Gagal memuat People list:", err))
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
    }, 4000)
  }

  // Helper to format clean camera labels (Rear / Front)
  function getCameraDisplayName(label?: string): string {
    if (!label) return "Rear Camera"
    const l = label.toLowerCase()
    if (
      l.includes("back") ||
      l.includes("rear") ||
      l.includes("belakang") ||
      l.includes("environment")
    ) {
      return "Rear"
    }
    if (
      l.includes("front") ||
      l.includes("depan") ||
      l.includes("user") ||
      l.includes("selfie")
    ) {
      return "Front"
    }
    return label.replace(/(camera|video|facing)/gi, "").trim() || "Camera"
  }

  // Switch between front/back cameras
  function handleToggleCamera() {
    if (cameras.length <= 1) return
    const currentIndex = cameras.findIndex((c) => c.id === activeCameraId)
    const nextIndex = (currentIndex + 1) % cameras.length
    const nextCam = cameras[nextIndex]
    if (nextCam) {
      setActiveCameraId(nextCam.id)
    }
  }

  // ── Non-Blocking Background Async Process for Organizer (scanning Attendee's QR) ──
  function processPengurusQrText(rawText: string) {
    setCodeError("")
    let parsedQuery = rawText.trim().toLowerCase()

    try {
      if (rawText.startsWith("{") && rawText.endsWith("}")) {
        const parsed = JSON.parse(rawText)
        parsedQuery = (
          parsed.user_number ||
          parsed.userNumber ||
          parsed.userId ||
          parsed.id ||
          parsed.username ||
          parsed.email ||
          rawText
        )
          .toString()
          .trim()
          .toLowerCase()
      }
    } catch {}

    const matched = peopleList.find(
      (m) =>
        (m.user_number && m.user_number.toLowerCase() === parsedQuery) ||
        m.id.toLowerCase() === parsedQuery ||
        (m.username && m.username.toLowerCase() === parsedQuery) ||
        (m.email && m.email.toLowerCase() === parsedQuery)
    )

    const nowFormatted = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

    if (!matched) {
      // Query server directly (supports userNumber, username, email, ID)
      if (eventId) {
        api
          .post<any>(`/events/${eventId}/attendance`, {
            method: "qr",
            user_id: parsedQuery,
          })
          .then((res) => {
            const returnedUserId = res.user_id || res.id
            const returnedName = res.name || parsedQuery
            const returnedUserNumber = res.user_number || parsedQuery

            if (sessionAttendedIds.has(returnedUserId)) {
              playWarningChime()
              triggerFeedback(
                "duplicate",
                "Already Checked In! ⚠️",
                `${returnedName} was already recorded earlier.`
              )
              return
            }

            setSessionAttendedIds((prev) => new Set(prev).add(returnedUserId))
            setSessionSuccessCount((prev) => prev + 1)
            setRecentScans((prev) => [
              {
                id: Math.random().toString(),
                userId: returnedUserId,
                name: returnedName,
                userNumber: returnedUserNumber,
                time: nowFormatted,
                status: "success",
                message: "Checked in successfully (QR)",
              },
              ...prev.slice(0, 19),
            ])
            triggerFeedback(
              "success",
              "Attendance Recorded! 🎉",
              `${returnedName} (${returnedUserNumber}) checked in.`
            )
          })
          .catch((err: any) => {
            playWarningChime()
            if (
              err.message?.includes("already") ||
              err.error === "DUPLICATE_ATTENDANCE"
            ) {
              triggerFeedback(
                "duplicate",
                "Already Checked In! ⚠️",
                err.message || "User is already checked in."
              )
            } else {
              triggerFeedback(
                "error",
                "Unrecognized QR Code",
                `Code "${rawText}" was not found in the database.`
              )
              setRecentScans((prev) => [
                {
                  id: Math.random().toString(),
                  userId: "unknown",
                  name: rawText.slice(0, 20),
                  time: nowFormatted,
                  status: "error",
                  message: err.message || "Not found in database",
                },
                ...prev.slice(0, 19),
              ])
            }
          })
      } else {
        playWarningChime()
        triggerFeedback(
          "error",
          "Unrecognized QR Code",
          `Code "${rawText}" was not found in the People database.`
        )
      }
      return
    }

    if (sessionAttendedIds.has(matched.id)) {
      playWarningChime()
      triggerFeedback(
        "duplicate",
        "Already Checked In! ⚠️",
        `${matched.name} (${matched.user_number || "Member"}) has already checked in.`
      )
      setRecentScans((prev) => [
        {
          id: Math.random().toString(),
          userId: matched.id,
          name: matched.name,
          userNumber: matched.user_number,
          time: nowFormatted,
          status: "duplicate",
          message: "Duplicate scan rejected (already present)",
        },
        ...prev.slice(0, 19),
      ])
      return
    }

    // Optimistic instant feedback
    setSessionAttendedIds((prev) => new Set(prev).add(matched.id))
    setSessionSuccessCount((prev) => prev + 1)

    const scanItemId = Math.random().toString()
    setRecentScans((prev) => [
      {
        id: scanItemId,
        userId: matched.id,
        name: matched.name,
        userNumber: matched.user_number,
        time: nowFormatted,
        status: "success",
        message: "Checked in successfully (QR)",
      },
      ...prev.slice(0, 19),
    ])

    triggerFeedback(
      "success",
      "Attendance Recorded! 🎉",
      `${matched.name} (${matched.user_number || "Member"}) checked in.`
    )

    // Background server sync
    if (eventId) {
      api
        .post(`/events/${eventId}/attendance`, {
          method: "qr",
          user_id: matched.id,
        })
        .catch((err: any) => {
          if (
            err.message?.includes("already") ||
            err.error === "DUPLICATE_ATTENDANCE"
          ) {
            return
          }
          setSessionAttendedIds((prev) => {
            const next = new Set(prev)
            next.delete(matched.id)
            return next
          })
          setSessionSuccessCount((prev) => Math.max(0, prev - 1))
          setRecentScans((prev) =>
            prev.map((item) =>
              item.id === scanItemId
                ? {
                    ...item,
                    status: "error",
                    message: err.message || "Failed to sync with server",
                  }
                : item
            )
          )
          triggerFeedback(
            "error",
            "Server Sync Failed",
            err.message || "Network connection issue."
          )
        })
    }
  }

  // ── Non-Blocking Background Async Process for Member ──
  async function processUmatQrText(rawText: string) {
    setCodeError("")
    let scannedCode = rawText.trim().toUpperCase()

    try {
      if (rawText.startsWith("{") && rawText.endsWith("}")) {
        const parsed = JSON.parse(rawText)
        scannedCode = (parsed.code || parsed.eventCode || rawText)
          .toString()
          .trim()
          .toUpperCase()
      }
    } catch {}

    if (
      event?.qr_code?.code &&
      scannedCode !== event.qr_code.code.toUpperCase()
    ) {
      playWarningChime()
      setCodeError("QR Code does not match this event.")
      return
    }

    if (eventId) {
      setSubmitting(true)
      try {
        await api.post(`/events/${eventId}/attendance`, {
          method: "qr",
          qr_code: scannedCode,
        })
        triggerFeedback(
          "success",
          "Self Check-In Successful! 🎉",
          "Your attendance has been recorded."
        )
      } catch (err: any) {
        playWarningChime()
        if (
          err.message?.includes("already") ||
          err.error === "DUPLICATE_ATTENDANCE"
        ) {
          triggerFeedback(
            "duplicate",
            "Already Checked In ⚠️",
            "You are already recorded for this event."
          )
        } else if (
          err.error?.includes("tidak valid") ||
          err.message?.includes("tidak valid")
        ) {
          setCodeError("QR Code does not match this event.")
        } else {
          setCodeError(err.message || "Failed to record self attendance.")
        }
      } finally {
        setSubmitting(false)
      }
    }
  }

  // Manual submission for Member
  async function handleUmatManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCodeError("")
    const code = codeInput.trim()
    if (!code) {
      setCodeError("Please enter the event code.")
      return
    }

    if (
      event?.qr_code?.code &&
      code.toUpperCase() !== event.qr_code.code.toUpperCase()
    ) {
      playWarningChime()
      setCodeError("The entered code does not match the event code.")
      return
    }

    try {
      setSubmitting(true)
      if (eventId) {
        await api.post(`/events/${eventId}/attendance`, {
          method: "qr",
          qr_code: code,
        })
      }
      triggerFeedback(
        "success",
        "Self Check-In Successful! 🎉",
        "Your attendance has been recorded."
      )
      setCodeInput("")
    } catch (err: any) {
      playWarningChime()
      if (
        err.message?.includes("already") ||
        err.error === "DUPLICATE_ATTENDANCE"
      ) {
        triggerFeedback(
          "duplicate",
          "Already Checked In ⚠️",
          "You are already recorded for this event."
        )
      } else if (
        err.error?.includes("tidak valid") ||
        err.message?.includes("tidak valid")
      ) {
        setCodeError("The entered code does not match the event code.")
      } else {
        setCodeError(err.message || "Failed to record attendance.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered people for manual search
  const filteredPeople = searchQuery.trim()
    ? peopleList.filter(
        (m) =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.username &&
            m.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (m.email &&
            m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (m.user_number &&
            m.user_number.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : []

  const currentCameraObj = cameras.find((c) => c.id === activeCameraId)
  const currentCamLabel = getCameraDisplayName(currentCameraObj?.label)

  // Helper for scanning QR from uploaded image file reliably
  async function handleImageFileSelected(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0]
    if (!file) return

    const sandboxId = "qr-file-scan-sandbox"
    let sandboxEl = document.getElementById(sandboxId)
    if (!sandboxEl) {
      sandboxEl = document.createElement("div")
      sandboxEl.id = sandboxId
      sandboxEl.style.position = "fixed"
      sandboxEl.style.left = "-9999px"
      sandboxEl.style.top = "-9999px"
      sandboxEl.style.width = "400px"
      sandboxEl.style.height = "400px"
      sandboxEl.style.opacity = "0"
      sandboxEl.style.pointerEvents = "none"
      document.body.appendChild(sandboxEl)
    }

    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } =
        await import("html5-qrcode")
      const tempScanner = new Html5Qrcode(sandboxId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      })

      try {
        const decoded = await tempScanner.scanFile(file, true)
        if (isPengurus) {
          processPengurusQrText(decoded)
        } else {
          processUmatQrText(decoded)
        }
      } finally {
        try {
          tempScanner.clear()
        } catch {}
      }
    } catch (err: any) {
      console.warn("Failed to scan QR from image:", err)
      playWarningChime()
      triggerFeedback(
        "error",
        "Failed to Read QR Image",
        "No QR code detected in the image. Please make sure the image is clear and well-lit."
      )
    } finally {
      if (uploadInputRef.current) uploadInputRef.current.value = ""
    }
  }

  function handleBack() {
    navigate({ to: "/events" })
  }

  if (loadingEvent) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black text-white">
        <RefreshCwIcon className="size-8 animate-spin text-amber-400" />
        <p className="text-caption font-semibold">
          Preparing Attendance Scanner...
        </p>
      </div>
    )
  }

  return (
    <div
      role="main"
      aria-label="Scan QR Attendance"
      className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-black font-sans text-white select-none"
    >
      {/* ── 1. Floating Top Bar ── */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        {/* Left: Back Button */}
        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to Events"
          className="sm:text-caption flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-[11px] font-bold text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/20 active:scale-95"
        >
          <ArrowLeftIcon className="size-4 sm:size-5" />
          <span className="xs:inline hidden">Back</span>
        </button>

        {/* Center: Live Counter / Title Pill */}
        <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1 shadow-lg backdrop-blur-md sm:gap-2 sm:px-4 sm:py-1.5">
          <span className="flex size-2 animate-pulse rounded-full bg-emerald-500 sm:size-2.5" />
          <span className="sm:text-caption text-[11px] font-bold tracking-wide text-white">
            {isPengurus
              ? `Scan QR • ${sessionAttendedIds.size} Attended`
              : event?.title
                ? `Scan QR • ${event.title}`
                : "Scan QR Check-In"}
          </span>
          {isPengurus && sessionSuccessCount > 0 && (
            <span className="py-0.2 rounded-full bg-emerald-500/30 px-1.5 text-[9px] font-extrabold text-emerald-300 sm:text-[10px]">
              +{sessionSuccessCount}
            </span>
          )}
        </div>

        {/* Right: Camera Switcher */}
        {cameras.length > 1 ? (
          <button
            type="button"
            onClick={handleToggleCamera}
            className="sm:text-caption flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-black/75 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/25 active:scale-95 sm:px-3.5 sm:py-2"
            title="Switch Camera (Rear / Front)"
          >
            <RefreshCwIcon className="size-3.5 shrink-0 text-amber-300 sm:size-4" />
            <span>{currentCamLabel}</span>
          </button>
        ) : (
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-md sm:px-3 sm:py-1.5 sm:text-[11px]">
            <CameraIcon className="size-3 text-amber-400 sm:size-3.5" />
            <span>Camera</span>
          </div>
        )}
      </div>

      {/* ── 2. Floating Dynamic Feedback Banner ── */}
      {lastFeedback && (
        <div className="absolute inset-x-2.5 top-16 z-40 mx-auto max-w-sm animate-in duration-200 fade-in slide-in-from-top-4 sm:inset-x-4 sm:top-20 sm:max-w-md">
          <div
            className={`flex items-start gap-2.5 rounded-2xl border p-3 shadow-2xl backdrop-blur-xl sm:gap-3 sm:p-4 ${
              lastFeedback.type === "success"
                ? "border-emerald-400/80 bg-emerald-950/90 text-white"
                : lastFeedback.type === "duplicate"
                  ? "border-amber-400/80 bg-amber-950/90 text-white"
                  : "border-rose-400/80 bg-rose-950/90 text-white"
            }`}
          >
            {lastFeedback.type === "success" ? (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-emerald-500/30 text-emerald-300 sm:size-8">
                <CheckCircle2Icon className="size-4 text-emerald-400 sm:size-5" />
              </div>
            ) : (
              <div
                className={`flex size-7 shrink-0 items-center justify-center rounded-xl sm:size-8 ${
                  lastFeedback.type === "duplicate"
                    ? "bg-amber-500/30 text-amber-300"
                    : "bg-rose-500/30 text-rose-300"
                }`}
              >
                <AlertTriangleIcon className="size-4 sm:size-5" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-caption sm:text-body-sm leading-tight font-black">
                {lastFeedback.title}
              </p>
              <p className="sm:text-caption mt-0.5 text-[11px] leading-tight opacity-90 sm:mt-1">
                {lastFeedback.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLastFeedback(null)}
              className="cursor-pointer p-1 text-white/60 hover:text-white"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Main Center Content (Camera Viewfinder or Manual Form) ── */}
      <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center overflow-hidden">
        {isPengurus ? (
          pengurusMode === "camera" ? (
            <QrScannerCamera
              onScan={processPengurusQrText}
              onError={(err) => setCodeError(err)}
              isFullScreen={true}
              hideControls={true}
              onCamerasDetected={handleCamerasDetected}
              externalCameraId={activeCameraId}
            />
          ) : (
            /* Manual Search Form in Full Screen */
            <div className="mx-auto max-h-[80vh] w-full max-w-lg animate-in space-y-4 overflow-y-auto p-4 duration-150 zoom-in-95 fade-in sm:p-6">
              <div className="space-y-3 rounded-3xl border border-white/20 bg-zinc-950/85 p-4 shadow-2xl backdrop-blur-xl sm:p-5">
                <div className="flex items-center justify-between">
                  <h4 className="text-caption-bold sm:text-body-md flex items-center gap-2 text-white">
                    <UserPlusIcon className="size-4 text-amber-400" />
                    <span>Record Attendance Manually</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setPengurusMode("camera")}
                    className="text-caption cursor-pointer font-semibold text-amber-300 hover:text-amber-200"
                  >
                    Open Scanner
                  </button>
                </div>

                <div className="relative">
                  <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Name / Member ID / Email..."
                    className="text-caption w-full rounded-xl border border-white/20 bg-black/60 py-2.5 pr-4 pl-10 text-white outline-none placeholder:text-zinc-500 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    autoFocus
                  />
                </div>

                <div className="max-h-64 space-y-2 divide-y divide-white/10 overflow-y-auto pr-1">
                  {filteredPeople.length > 0 ? (
                    filteredPeople.map((p) => {
                      const isAlreadyAttended = sessionAttendedIds.has(p.id)
                      return (
                        <div
                          key={p.id}
                          className="flex items-center justify-between pt-2 first:pt-0"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-caption truncate font-bold text-white">
                              {p.name}
                            </p>
                            <p className="truncate text-[11px] text-zinc-400">
                              {p.user_number || "No Member ID"} • {p.email}
                            </p>
                          </div>
                          {isAlreadyAttended ? (
                            <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                              <CheckCircle2Icon className="size-3.5" /> Present
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                processPengurusQrText(p.id)
                                setSearchQuery("")
                                setPengurusMode("camera")
                              }}
                              className="text-caption shrink-0 cursor-pointer rounded-xl bg-amber-400 px-3 py-1 font-bold text-black shadow-xs transition-all hover:bg-amber-300 active:scale-95"
                            >
                              + Check In
                            </button>
                          )}
                        </div>
                      )
                    })
                  ) : searchQuery.trim() ? (
                    <p className="text-caption py-6 text-center text-zinc-400">
                      No member found for "{searchQuery}".
                    </p>
                  ) : (
                    <p className="text-caption py-6 text-center text-zinc-400">
                      Type a participant name above to record attendance
                      manually.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        ) : umatMode === "camera" ? (
          <QrScannerCamera
            onScan={processUmatQrText}
            onError={(err) => setCodeError(err)}
            isFullScreen={true}
            hideControls={true}
            onCamerasDetected={handleCamerasDetected}
            externalCameraId={activeCameraId}
          />
        ) : (
          /* Manual Code Form for Member */
          <div className="mx-auto w-full max-w-sm animate-in space-y-5 p-4 duration-150 zoom-in-95 fade-in sm:p-6">
            <div className="space-y-4 rounded-3xl border border-white/20 bg-zinc-950/85 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
                  <KeyboardIcon className="size-5" />
                </div>
                <div>
                  <h4 className="text-caption-bold sm:text-body-md text-white">
                    Enter Event Code
                  </h4>
                  <p className="sm:text-caption text-[11px] text-zinc-400">
                    Type the unique event QR code
                  </p>
                </div>
              </div>

              <form
                onSubmit={handleUmatManualSubmit}
                className="space-y-4 pt-2"
              >
                <div className="space-y-1.5">
                  <input
                    id="scan-code"
                    type="text"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value)
                      setCodeError("")
                    }}
                    placeholder={
                      event?.qr_code?.code?.replace(/./g, "·") ?? "••••••"
                    }
                    className="text-title-sm sm:text-title-md w-full rounded-2xl border border-white/20 bg-black/60 px-4 py-3.5 text-center font-mono tracking-widest text-amber-300 uppercase outline-none placeholder:text-zinc-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                    autoFocus
                  />
                  {codeError && (
                    <p className="sm:text-caption flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-950/60 p-2.5 text-[11px] font-semibold text-rose-400">
                      <AlertTriangleIcon className="size-4 shrink-0" />
                      <span>{codeError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !codeInput.trim()}
                  className="text-caption-bold sm:text-body-sm flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 font-black text-black shadow-lg transition-all hover:from-amber-300 hover:to-amber-400 active:scale-[0.98] disabled:opacity-50 sm:py-3.5"
                >
                  <CheckCircle2Icon className="size-4 sm:size-5" />
                  <span>
                    {submitting ? "Verifying..." : "Confirm Attendance"}
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Collapsible History Drawer ── */}
      {isHistoryDrawerOpen && (
        <div className="absolute inset-x-2.5 bottom-20 z-40 mx-auto max-w-md animate-in rounded-3xl border border-white/20 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur-2xl duration-200 slide-in-from-bottom-5 fade-in sm:inset-x-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <ListFilterIcon className="size-4 text-amber-400" />
              <h4 className="text-caption-bold sm:text-body-sm text-white">
                Scan History
              </h4>
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-bold text-white">
                {recentScans.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsHistoryDrawerOpen(false)}
              className="cursor-pointer p-1 text-zinc-400 hover:text-white"
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
                    <p className="text-caption truncate font-bold text-white">
                      {item.name}
                    </p>
                    <p className="truncate text-[10px] text-zinc-400 sm:text-[11px]">
                      {item.userNumber ? `${item.userNumber} • ` : ""}
                      {item.message}
                    </p>
                  </div>
                  <div className="shrink-0 pl-2 text-right">
                    <span
                      className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold sm:text-[10px] ${
                        item.status === "success"
                          ? "border-emerald-500/30 bg-emerald-500/20 text-emerald-300"
                          : item.status === "duplicate"
                            ? "border-amber-500/30 bg-amber-500/20 text-amber-300"
                            : "border-rose-500/30 bg-rose-500/20 text-rose-300"
                      }`}
                    >
                      {item.time}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-caption py-6 text-center text-zinc-400">
                No attendance scans recorded in this session yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── 5. Floating Bottom Action Dock ── */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-3 sm:p-4">
        {isPengurus ? (
          <>
            {/* Button 1: Toggle Manual Search */}
            <button
              type="button"
              onClick={() => {
                setPengurusMode((prev) =>
                  prev === "camera" ? "search" : "camera"
                )
                setIsHistoryDrawerOpen(false)
              }}
              className={`sm:text-caption flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold shadow-lg backdrop-blur-xl transition-all active:scale-95 sm:gap-2 sm:px-4 sm:py-2.5 ${
                pengurusMode === "search"
                  ? "border-amber-300 bg-amber-400 text-black"
                  : "border-white/25 bg-black/75 text-white hover:bg-white/20"
              }`}
            >
              {pengurusMode === "search" ? (
                <>
                  <CameraIcon className="size-3.5 shrink-0 text-black sm:size-4" />
                  <span>Open Camera</span>
                </>
              ) : (
                <>
                  <UserPlusIcon className="size-3.5 shrink-0 text-amber-300 sm:size-4" />
                  <span>Manual Entry</span>
                </>
              )}
            </button>

            {/* Button 2: Toggle Scan History Drawer */}
            <button
              type="button"
              onClick={() => setIsHistoryDrawerOpen((prev) => !prev)}
              className={`sm:text-caption flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold shadow-lg backdrop-blur-xl transition-all active:scale-95 sm:gap-2 sm:px-4 sm:py-2.5 ${
                isHistoryDrawerOpen
                  ? "border-white bg-white text-black"
                  : "border-white/25 bg-black/75 text-white hover:bg-white/20"
              }`}
            >
              <ListFilterIcon className="size-3.5 shrink-0 text-amber-400 sm:size-4" />
              <span>History ({recentScans.length})</span>
            </button>

            {/* Button 3: Photo Upload Fallback */}
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="sm:text-caption flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-black/75 px-3 py-2 text-[11px] font-bold text-white shadow-lg backdrop-blur-xl transition-all hover:bg-white/20 active:scale-95 sm:gap-2 sm:px-4 sm:py-2.5"
              title="Scan from Photo / Screenshot"
            >
              <ImageIcon className="size-3.5 shrink-0 text-cyan-400 sm:size-4" />
              <span>QR Image</span>
            </button>
          </>
        ) : (
          <>
            {/* Member Mode Toggle Button */}
            <button
              type="button"
              onClick={() => {
                setUmatMode((prev) => (prev === "camera" ? "manual" : "camera"))
                setCodeError("")
              }}
              className={`sm:text-caption flex cursor-pointer items-center gap-1.5 rounded-full border px-3.5 py-2 text-[11px] font-bold shadow-lg backdrop-blur-xl transition-all active:scale-95 sm:gap-2 sm:px-4 sm:py-2.5 ${
                umatMode === "manual"
                  ? "border-amber-300 bg-amber-400 text-black"
                  : "border-white/25 bg-black/75 text-white hover:bg-white/20"
              }`}
            >
              {umatMode === "manual" ? (
                <>
                  <CameraIcon className="size-3.5 shrink-0 text-black sm:size-4" />
                  <span>Open Camera</span>
                </>
              ) : (
                <>
                  <KeyboardIcon className="size-3.5 shrink-0 text-amber-300 sm:size-4" />
                  <span>Enter Code Manually</span>
                </>
              )}
            </button>

            {/* Upload Photo Button for Member */}
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="sm:text-caption flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-black/75 px-3.5 py-2 text-[11px] font-bold text-white shadow-lg backdrop-blur-xl transition-all hover:bg-white/20 active:scale-95 sm:gap-2 sm:px-4 sm:py-2.5"
              title="Scan from Photo / Screenshot"
            >
              <ImageIcon className="size-3.5 shrink-0 text-cyan-400 sm:size-4" />
              <span>QR Image</span>
            </button>
          </>
        )}
      </div>

      {/* Hidden File Input for Image Upload */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileSelected}
        className="hidden"
      />
    </div>
  )
}
