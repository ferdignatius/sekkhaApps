// feature/events/components/AttendanceScanModal
// Full-Screen Immersive QRIS-Style Live Scanner for Pengurus with camera switcher, bottom action bar with manual add, collapsible history drawer, duplicate prevention, and audio feedback.

import { useState, useEffect, useRef, useCallback } from "react"
import { createPortal } from "react-dom"
import {
  ScanLineIcon,
  XIcon,
  CheckCircle2Icon,
  CameraIcon,
  SearchIcon,
  AlertTriangleIcon,
  KeyboardIcon,
  ClockIcon,
  ListFilterIcon,
  ChevronDownIcon,
  ImageIcon,
  RefreshCwIcon,
  UserPlusIcon,
} from "lucide-react"
import { api } from "@/lib/api"
import { teamsApi } from "@/modules/teams/internal/api/teamsApi"
import type { MemberDto } from "@/modules/teams/internal/api/teamsApi"
import type { AttendanceMethod, UserRole, AttendanceRecord } from "../types"
import { QrScannerCamera } from "./QrScannerCamera"

export interface ScanResult {
  name: string
  method: AttendanceMethod
  scanned_at: string
}

interface RecentScanItem {
  id: string
  userId: string
  name: string
  userNumber?: string | null
  time: string
  status: "success" | "duplicate" | "error"
  message: string
}

interface AttendanceScanModalProps {
  eventId?: string
  role: UserRole | null
  eventCode: string
  existingRecords?: AttendanceRecord[]
  onRecord: (result: ScanResult) => void
  onClose: () => void
}

// Audio tone helpers
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

export function AttendanceScanModal({
  eventId,
  role,
  eventCode,
  existingRecords = [],
  onRecord,
  onClose,
}: AttendanceScanModalProps) {
  const isPengurus = role === "pengurus" || role === "admin"

  // Mode for Pengurus: 'camera' | 'search'
  const [pengurusMode, setPengurusMode] = useState<"camera" | "search">(
    "camera"
  )

  // Mode for Umat: 'camera' | 'manual'
  const [umatMode, setUmatMode] = useState<"camera" | "manual">("camera")

  // Client mount state for portal
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

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

  // Collapsible History Drawer State (Collapsed by default so it doesn't take space!)
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)

  // Real People database loaded from backend
  const [peopleList, setPeopleList] = useState<MemberDto[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)

  // Track already attended user IDs (both existing from props + scanned in current session)
  const [sessionAttendedIds, setSessionAttendedIds] = useState<Set<string>>(
    () => {
      const initial = new Set<string>()
      existingRecords.forEach((r) => {
        if (r.user_id) initial.add(r.user_id)
      })
      return initial
    }
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
  const feedbackTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Umat manual state
  const [codeInput, setCodeInput] = useState("")
  const [codeError, setCodeError] = useState("")

  // Pengurus search state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null)
  const [manualError, setManualError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const uploadInputRef = useRef<HTMLInputElement | null>(null)

  // Sync existingRecords into sessionAttendedIds if props update
  useEffect(() => {
    setSessionAttendedIds((prev) => {
      const next = new Set(prev)
      existingRecords.forEach((r) => {
        if (r.user_id) next.add(r.user_id)
      })
      return next
    })
  }, [existingRecords])

  // Lock background body scroll when full-screen scanner is open to prevent horizontal/vertical page drift
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

  // Load People list for Pengurus manual presensi
  useEffect(() => {
    if (isPengurus) {
      setLoadingPeople(true)
      teamsApi
        .listMembers()
        .then((data) => setPeopleList(data))
        .catch((err) =>
          console.error("Gagal memuat data People untuk presensi:", err)
        )
        .finally(() => setLoadingPeople(false))
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

  // ── Non-Blocking Background Async Process for Pengurus (scanning Umat's QR) ──
  function processPengurusQrText(rawText: string) {
    setCodeError("")

    let parsedQuery = rawText.trim().toLowerCase()

    // Handle potential JSON payload from QR
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

    // Find in real People database by user_number, id, username, or email
    const matched = peopleList.find(
      (m) =>
        (m.user_number && m.user_number.toLowerCase() === parsedQuery) ||
        m.id.toLowerCase() === parsedQuery ||
        (m.username && m.username.toLowerCase() === parsedQuery) ||
        (m.email && m.email.toLowerCase() === parsedQuery)
    )

    const nowFormatted = new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })

    if (!matched) {
      playWarningChime()
      triggerFeedback(
        "error",
        "QR Code Tidak Dikenali",
        `Kode "${rawText}" tidak ditemukan di database People.`
      )
      setRecentScans((prev) => [
        {
          id: Math.random().toString(),
          userId: "unknown",
          name: rawText.slice(0, 20),
          time: nowFormatted,
          status: "error",
          message: "Tidak terdaftar di database",
        },
        ...prev.slice(0, 19),
      ])
      return
    }

    // ── 🛡️ AVOID DUPLICATE SCAN: Instant check in local session cache ──
    if (sessionAttendedIds.has(matched.id)) {
      playWarningChime()
      triggerFeedback(
        "duplicate",
        "Sudah Tercatat Hadir! ⚠️",
        `${matched.name} (${matched.user_number || "Umat"}) sudah presensi sebelumnya.`
      )
      setRecentScans((prev) => [
        {
          id: Math.random().toString(),
          userId: matched.id,
          name: matched.name,
          userNumber: matched.user_number,
          time: nowFormatted,
          status: "duplicate",
          message: "Scan ulang ditolak (sudah hadir)",
        },
        ...prev.slice(0, 19),
      ])
      return
    }

    // ── ⚡ Optimistic Instant Update (Zero Latency UI & Non-Blocking Camera Stream) ──
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
        message: "Berhasil dicatat (QR)",
      },
      ...prev.slice(0, 19),
    ])

    triggerFeedback(
      "success",
      "Presensi Berhasil Dicatat! 🎉",
      `${matched.name} (${matched.user_number || "Umat"}) hadir.`
    )

    const result: ScanResult = {
      name: matched.name,
      method: "qr",
      scanned_at: new Date().toISOString(),
    }
    onRecord(result)

    // ── 🚀 Asynchronous Background Server Sync ──
    if (eventId) {
      api
        .post(`/events/${eventId}/attendance`, {
          method: "qr",
          user_id: matched.id,
        })
        .catch((err: any) => {
          console.warn("Latar belakang sync presensi:", err)
          if (
            err.message?.includes("sudah tercatat hadir") ||
            err.error === "DUPLICATE_ATTENDANCE"
          ) {
            // Already synced on server — keep as attended
            return
          }
          // On server failure, rollback and flag error
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
                    message: err.message || "Gagal sinkron server",
                  }
                : item
            )
          )
          triggerFeedback(
            "error",
            "Gagal Sinkronisasi Server",
            err.message || "Terjadi kendala koneksi."
          )
        })
    }
  }

  // ── Non-Blocking Background Async Process for Umat (scanning Event QR) ──
  function processUmatQrText(rawText: string) {
    setCodeError("")

    let scannedCode = rawText.trim().toUpperCase()

    // Handle potential JSON payload in Event QR
    try {
      if (rawText.startsWith("{") && rawText.endsWith("}")) {
        const parsed = JSON.parse(rawText)
        scannedCode = (parsed.code || parsed.eventCode || rawText)
          .toString()
          .trim()
          .toUpperCase()
      }
    } catch {}

    if (eventCode && scannedCode !== eventCode.toUpperCase()) {
      playWarningChime()
      setCodeError("QR Code tidak cocok dengan event ini.")
      return
    }

    if (eventId) {
      setSubmitting(true)
      api
        .post(`/events/${eventId}/attendance`, {
          method: "qr",
          qr_code: scannedCode,
        })
        .then(() => {
          const result: ScanResult = {
            name: "Kamu (Presensi Mandiri)",
            method: "qr",
            scanned_at: new Date().toISOString(),
          }
          triggerFeedback(
            "success",
            "Presensi Mandiri Berhasil! 🎉",
            "Kehadiranmu telah tercatat."
          )
          onRecord(result)
        })
        .catch((err: any) => {
          playWarningChime()
          if (
            err.message?.includes("sudah tercatat hadir") ||
            err.error === "DUPLICATE_ATTENDANCE"
          ) {
            triggerFeedback(
              "duplicate",
              "Sudah Presensi ⚠️",
              "Kamu sudah tercatat hadir di acara ini."
            )
          } else if (
            err.error?.includes("tidak valid") ||
            err.message?.includes("tidak valid")
          ) {
            setCodeError("QR Code tidak cocok dengan event ini.")
          } else {
            setCodeError(err.message || "Gagal mencatat presensi mandiri.")
          }
        })
        .finally(() => {
          setSubmitting(false)
        })
    }
  }

  // Umat Manual Submit
  async function handleUmatManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!codeInput.trim()) {
      setCodeError("Masukkan kode terlebih dahulu")
      return
    }
    processUmatQrText(codeInput.trim())
  }

  // Pengurus Manual Search Entry
  async function handleManualSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setManualError("")

    let target = selectedMember

    if (!target) {
      const q = searchQuery.trim().toLowerCase()
      if (!q) {
        setManualError("Masukkan nama, @username, email, atau ID anggota")
        return
      }
      const matches = peopleList.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.username && m.username.toLowerCase().includes(q)) ||
          (m.email && m.email.toLowerCase().includes(q)) ||
          (m.user_number && m.user_number.toLowerCase().includes(q))
      )

      if (matches.length === 0) {
        setManualError("Pengguna tidak terdaftar dalam People.")
        return
      } else if (matches.length === 1) {
        target = matches[0]!
      } else {
        setManualError(
          "Ditemukan beberapa pengguna. Silakan pilih salah satu dari daftar."
        )
        return
      }
    }

    if (sessionAttendedIds.has(target.id)) {
      setManualError(`⚠️ ${target.name} sudah tercatat hadir sebelumnya.`)
      return
    }

    try {
      setSubmitting(true)
      if (eventId) {
        await api.post(`/events/${eventId}/attendance`, {
          method: "manual",
          user_id: target.id,
        })
      }

      setSessionAttendedIds((prev) => new Set(prev).add(target!.id))
      setSessionSuccessCount((prev) => prev + 1)

      const result: ScanResult = {
        name: target.name,
        method: "manual",
        scanned_at: new Date().toISOString(),
      }
      onRecord(result)

      triggerFeedback(
        "success",
        "Presensi Berhasil Dicatat! 🎉",
        `${target.name} hadir via input People.`
      )

      const nowFormatted = new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })

      setRecentScans((prev) => [
        {
          id: Math.random().toString(),
          userId: target!.id,
          name: target!.name,
          userNumber: target!.user_number,
          time: nowFormatted,
          status: "success",
          message: "Berhasil dicatat (Manual)",
        },
        ...prev.slice(0, 19),
      ])

      setSelectedMember(null)
      setSearchQuery("")
      setManualError("")
      setPengurusMode("camera")
    } catch (err: any) {
      if (
        err.message?.includes("sudah tercatat hadir") ||
        err.error === "DUPLICATE_ATTENDANCE"
      ) {
        setSessionAttendedIds((prev) => new Set(prev).add(target!.id))
        setManualError(
          `⚠️ ${target.name} sudah tercatat hadir dalam kegiatan ini.`
        )
      } else {
        setManualError(err.message || "Gagal mencatat presensi manual.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMembers = searchQuery.trim()
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

  // Helper to format clean camera labels (Belakang / Depan)
  function getCameraDisplayName(label?: string): string {
    if (!label) return "Kamera Belakang"
    const l = label.toLowerCase()
    if (
      l.includes("back") ||
      l.includes("rear") ||
      l.includes("belakang") ||
      l.includes("environment")
    ) {
      return "Belakang"
    }
    if (
      l.includes("front") ||
      l.includes("depan") ||
      l.includes("user") ||
      l.includes("selfie")
    ) {
      return "Depan"
    }
    return label.replace(/(camera|video|facing)/gi, "").trim() || "Kamera"
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

  // ═════════════════════════════════════════════════════════════════════════════
  // PENGURUS FULL-SCREEN QRIS SCANNER VIEW (Mounted to Body Portal)
  // ═════════════════════════════════════════════════════════════════════════════
  if (!mounted || typeof document === "undefined") return null

  if (isPengurus) {
    const currentCameraObj = cameras.find((c) => c.id === activeCameraId)
    const currentCamLabel = getCameraDisplayName(currentCameraObj?.label)

    const modalContent = (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Live QRIS Scanner Presensi"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100dvh",
          zIndex: 99999,
          backgroundColor: "#000000",
        }}
        className="flex animate-in flex-col overflow-hidden bg-black font-sans text-white duration-200 fade-in"
      >
        {/* ── 1. Floating Top Bar (Responsive QRIS Style) ── */}
        <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
          {/* Left: Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Scanner"
            className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 sm:size-10"
          >
            <XIcon className="size-4 sm:size-5" />
          </button>

          {/* Center: Live Status & Counter Pill */}
          <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-2.5 py-1 shadow-lg backdrop-blur-md sm:gap-2 sm:px-3.5 sm:py-1.5">
            <span className="flex size-2 animate-pulse rounded-full bg-emerald-500 sm:size-2.5" />
            <span className="sm:text-caption text-[11px] font-bold tracking-wide text-white">
              {sessionAttendedIds.size} Hadir
            </span>
            {sessionSuccessCount > 0 && (
              <span className="py-0.2 rounded-full bg-emerald-500/30 px-1.5 text-[9px] font-extrabold text-emerald-300 sm:text-[10px]">
                +{sessionSuccessCount}
              </span>
            )}
          </div>

          {/* Right: Camera Switcher (Front/Back toggle) */}
          {cameras.length > 1 ? (
            <button
              type="button"
              onClick={handleToggleCamera}
              className="sm:text-caption flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-black/75 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/25 active:scale-95 sm:px-3.5 sm:py-2"
              title="Ganti Kamera Depan / Belakang"
            >
              <RefreshCwIcon className="size-3.5 shrink-0 text-amber-300 sm:size-4" />
              <span>Kamera: {currentCamLabel}</span>
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-md sm:px-3 sm:py-1.5 sm:text-[11px]">
              <CameraIcon className="size-3 text-amber-400 sm:size-3.5" />
              <span>Kamera Belakang</span>
            </div>
          )}
        </div>

        {/* ── 2. Floating Dynamic Notification Banner (Responsive) ── */}
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
                <CheckCircle2Icon className="mt-0.5 size-5 shrink-0 text-emerald-400 sm:size-6" />
              ) : (
                <AlertTriangleIcon
                  className={`mt-0.5 size-5 shrink-0 sm:size-6 ${
                    lastFeedback.type === "duplicate"
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                />
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

        {/* ── 3. Main Center Content: Full Camera or Search Form ── */}
        <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center">
          {pengurusMode === "camera" ? (
            <QrScannerCamera
              onScan={processPengurusQrText}
              onError={(err) => setCodeError(err)}
              isFullScreen={true}
              hideControls={true}
              onCamerasDetected={handleCamerasDetected}
              externalCameraId={activeCameraId}
            />
          ) : (
            /* Manual Search Form in Full Screen overlay */
            <div className="mx-auto max-h-[80vh] w-full max-w-lg animate-in space-y-4 overflow-y-auto p-3 duration-150 zoom-in-95 fade-in sm:p-6">
              <div className="space-y-3 rounded-3xl border border-white/20 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-2xl sm:space-y-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h4 className="text-caption-bold sm:text-title-sm flex items-center gap-1.5 font-bold text-white sm:gap-2">
                    <SearchIcon className="size-4 text-amber-400" />
                    <span>Cari & Catat Presensi Manual</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setPengurusMode("camera")}
                    className="text-caption cursor-pointer text-slate-400 hover:text-white"
                  >
                    Kamera
                  </button>
                </div>

                <form onSubmit={handleManualSearchSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label
                      htmlFor="people-full-search"
                      className="sm:text-caption text-[11px] font-medium text-slate-300"
                    >
                      Nama, @username, atau ID Umat
                    </label>
                    <div className="relative">
                      <SearchIcon className="absolute top-3 left-3.5 size-4 text-slate-400 sm:top-3.5" />
                      <input
                        id="people-full-search"
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value)
                          setSelectedMember(null)
                          setManualError("")
                        }}
                        placeholder="Ketik nama umat..."
                        className="text-caption sm:text-body-sm w-full rounded-2xl border border-slate-700 bg-slate-900 py-2.5 pr-3 pl-9 text-white outline-none placeholder:text-slate-500 focus:border-amber-400 sm:py-3 sm:pr-4 sm:pl-10"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Autocomplete List */}
                  {searchQuery.trim() && !selectedMember && (
                    <div className="max-h-44 divide-y divide-slate-800 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-xl sm:max-h-52">
                      {loadingPeople ? (
                        <p className="text-caption p-3 text-center text-slate-400 sm:p-4">
                          Memuat database...
                        </p>
                      ) : filteredMembers.length === 0 ? (
                        <p className="text-caption p-3 text-center text-slate-400 sm:p-4">
                          Tidak ada anggota cocok.
                        </p>
                      ) : (
                        filteredMembers.slice(0, 6).map((m) => {
                          const alreadyIn = sessionAttendedIds.has(m.id)
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedMember(m)
                                setSearchQuery(m.name)
                                setManualError("")
                              }}
                              className={`flex w-full cursor-pointer items-center justify-between p-2.5 text-left transition-colors sm:p-3 ${
                                alreadyIn
                                  ? "bg-amber-950/30 hover:bg-amber-950/50"
                                  : "hover:bg-slate-800"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-caption truncate font-bold text-white">
                                  {m.name}
                                </p>
                                <p className="sm:text-micro font-mono text-[10px] text-slate-400">
                                  {m.username ? `@${m.username} · ` : ""}ID:{" "}
                                  {m.user_number || "—"}
                                </p>
                              </div>
                              {alreadyIn ? (
                                <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[9px] font-bold text-amber-300 sm:text-[10px]">
                                  Sudah Hadir
                                </span>
                              ) : (
                                <span className="shrink-0 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-300 sm:text-[10px]">
                                  Pilih
                                </span>
                              )}
                            </button>
                          )
                        })
                      )}
                    </div>
                  )}

                  {/* Selected Member Card */}
                  {selectedMember && (
                    <div className="flex items-center justify-between rounded-2xl border border-amber-400/40 bg-amber-950/30 p-3 shadow-md sm:p-3.5">
                      <div>
                        <p className="text-caption sm:text-body-sm font-bold text-amber-200">
                          {selectedMember.name}
                        </p>
                        <p className="sm:text-caption font-mono text-[11px] text-slate-300">
                          {selectedMember.username
                            ? `@${selectedMember.username} · `
                            : ""}
                          ID: {selectedMember.user_number || "—"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMember(null)
                          setSearchQuery("")
                        }}
                        className="text-caption cursor-pointer font-semibold text-amber-400 hover:underline"
                      >
                        Ganti
                      </button>
                    </div>
                  )}

                  {manualError && (
                    <p className="text-caption flex items-center gap-1.5 rounded-2xl border border-rose-500/40 bg-rose-950/60 p-2.5 font-semibold text-rose-300 sm:p-3">
                      <AlertTriangleIcon className="size-4 shrink-0 text-rose-400" />
                      <span>{manualError}</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={
                      submitting || (!selectedMember && !searchQuery.trim())
                    }
                    className="text-caption w-full cursor-pointer rounded-2xl bg-[#e8b94a] py-2.5 font-bold tracking-wider text-[#0a0a0a] uppercase shadow-lg transition-all hover:bg-amber-400 disabled:opacity-50 sm:py-3"
                  >
                    {submitting ? "Mencatat..." : "Catat Kehadiran"}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* ── 4. Collapsible Bottom Scan History Drawer (Responsive) ── */}
        {isHistoryDrawerOpen && (
          <div className="absolute inset-x-2 bottom-20 z-40 flex max-h-[48vh] animate-in flex-col rounded-3xl border border-white/20 bg-slate-950/95 p-3.5 shadow-2xl backdrop-blur-2xl duration-200 slide-in-from-bottom-8 sm:inset-x-auto sm:bottom-24 sm:mx-auto sm:max-h-[52vh] sm:max-w-md sm:p-4">
            <div className="flex shrink-0 items-center justify-between border-b border-white/10 pb-2 sm:pb-2.5">
              <div className="flex items-center gap-2">
                <ClockIcon className="size-3.5 text-amber-400 sm:size-4" />
                <h4 className="text-caption font-bold text-white">
                  Riwayat Antrean Scan ({recentScans.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="cursor-pointer p-1 text-slate-400 hover:text-white"
                aria-label="Tutup Riwayat"
              >
                <ChevronDownIcon className="size-5" />
              </button>
            </div>

            <div className="no-scrollbar flex-1 space-y-1.5 overflow-y-auto py-2 pr-1 sm:space-y-2">
              {recentScans.length === 0 ? (
                <p className="text-caption py-6 text-center text-slate-400">
                  Belum ada QR yang di-scan pada sesi ini. Arahkan kamera ke QR
                  umat!
                </p>
              ) : (
                recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className={`text-caption flex items-center justify-between rounded-2xl border p-2 transition-all sm:p-2.5 ${
                      scan.status === "success"
                        ? "border-emerald-500/40 bg-emerald-950/60 text-emerald-200"
                        : scan.status === "duplicate"
                          ? "border-amber-500/40 bg-amber-950/60 text-amber-200"
                          : "border-rose-500/40 bg-rose-950/60 text-rose-200"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
                      <span
                        className={`text-caption-bold flex size-6 shrink-0 items-center justify-center rounded-xl font-black uppercase sm:size-7 ${
                          scan.status === "success"
                            ? "bg-emerald-500 text-black"
                            : scan.status === "duplicate"
                              ? "bg-amber-400 text-black"
                              : "bg-rose-500 text-white"
                        }`}
                      >
                        {scan.name[0] || "?"}
                      </span>
                      <div className="min-w-0">
                        <p className="sm:text-caption truncate text-[12px] font-bold text-white">
                          {scan.name}
                        </p>
                        <p className="truncate text-[10px] opacity-75 sm:text-[11px]">
                          {scan.message}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 pl-2 text-right">
                      <span className="block font-mono text-[9px] text-slate-300 sm:text-[10px]">
                        {scan.time}
                      </span>
                      <span
                        className={`inline-block rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase sm:px-2 sm:text-[9px] ${
                          scan.status === "success"
                            ? "bg-emerald-500/30 text-emerald-300"
                            : scan.status === "duplicate"
                              ? "bg-amber-500/30 text-amber-300"
                              : "bg-rose-500/30 text-rose-300"
                        }`}
                      >
                        {scan.status === "success"
                          ? "Hadir"
                          : scan.status === "duplicate"
                            ? "Duplikat"
                            : "Gagal"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── 5. Floating Bottom Navigation Bar (Responsive Dock) ── */}
        <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-1.5 bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:gap-2.5 sm:p-4">
          {/* Button 1: Add / Search User Manually (Bottom Action) */}
          <button
            type="button"
            onClick={() =>
              setPengurusMode((prev) =>
                prev === "camera" ? "search" : "camera"
              )
            }
            className={`sm:text-caption flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 text-[11px] font-bold shadow-lg backdrop-blur-xl transition-all active:scale-95 sm:gap-2 sm:px-4 sm:py-2.5 ${
              pengurusMode === "search"
                ? "border-amber-300 bg-[#e8b94a] font-extrabold text-[#0a0a0a]"
                : "border-white/25 bg-black/75 text-white hover:bg-white/20"
            }`}
          >
            {pengurusMode === "camera" ? (
              <>
                <UserPlusIcon className="size-3.5 shrink-0 text-amber-300 sm:size-4" />
                <span>Catat Manual</span>
              </>
            ) : (
              <>
                <CameraIcon className="size-3.5 shrink-0 sm:size-4" />
                <span>Buka Kamera</span>
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
            <span>Riwayat ({recentScans.length})</span>
          </button>

          {/* Button 3: Quick Upload from Photo Fallback */}
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="sm:text-caption flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-black/75 px-3 py-2 text-[11px] font-bold text-white shadow-lg backdrop-blur-xl transition-all hover:bg-white/20 active:scale-95 sm:gap-2 sm:px-4 sm:py-2.5"
            title="Scan dari Foto / Screenshot QR"
          >
            <ImageIcon className="size-3.5 shrink-0 text-cyan-400 sm:size-4" />
            <span>Foto QR</span>
          </button>
        </div>

        {/* Hidden File Input for Image Scan */}
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            try {
              const { Html5Qrcode } = await import("html5-qrcode")
              const tempScanner = new Html5Qrcode(
                "temp-qr-div-" + Math.random(),
                { verbose: false }
              )
              const decoded = await tempScanner.scanFile(file, true)
              await processPengurusQrText(decoded)
            } catch {
              triggerFeedback(
                "error",
                "Gagal Membaca QR",
                "Gambar tidak memuat QR Code yang jelas."
              )
            } finally {
              if (uploadInputRef.current) uploadInputRef.current.value = ""
            }
          }}
          className="hidden"
        />
        <div id="temp-qr-div" className="hidden" />
      </div>
    )

    if (typeof document !== "undefined") {
      return createPortal(modalContent, document.body)
    }
    return modalContent
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // UMAT SELF-ATTENDANCE MODAL VIEW (Full-Screen Immersive QRIS Portal)
  // ═════════════════════════════════════════════════════════════════════════════
  const currentCameraObj = cameras.find((c) => c.id === activeCameraId)
  const currentCamLabel = getCameraDisplayName(currentCameraObj?.label)

  const umatPortalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Presensi Mandiri Event"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100vw",
        height: "100dvh",
        zIndex: 99999,
        backgroundColor: "#000000",
      }}
      className="flex animate-in flex-col overflow-hidden bg-black font-sans text-white duration-200 fade-in"
    >
      {/* ── 1. Floating Top Bar ── */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent p-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:p-4">
        {/* Left: Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup Scanner"
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 sm:size-10"
        >
          <XIcon className="size-4 sm:size-5" />
        </button>

        {/* Center: Title Pill */}
        <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-black/70 px-3 py-1 shadow-lg backdrop-blur-md sm:gap-2 sm:px-4 sm:py-1.5">
          <ScanLineIcon className="size-3.5 text-amber-400 sm:size-4" />
          <span className="sm:text-caption text-[11px] font-bold tracking-wide text-white">
            Presensi Mandiri
          </span>
        </div>

        {/* Right: Camera Switcher */}
        {cameras.length > 1 ? (
          <button
            type="button"
            onClick={handleToggleCamera}
            className="sm:text-caption flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-black/75 px-3 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur-md transition-all hover:bg-white/25 active:scale-95 sm:px-3.5 sm:py-2"
            title="Ganti Kamera Depan / Belakang"
          >
            <RefreshCwIcon className="size-3.5 shrink-0 text-amber-300 sm:size-4" />
            <span>Kamera: {currentCamLabel}</span>
          </button>
        ) : (
          <div className="flex shrink-0 items-center gap-1 rounded-full border border-white/10 bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white/80 backdrop-blur-md sm:px-3 sm:py-1.5 sm:text-[11px]">
            <CameraIcon className="size-3 text-amber-400 sm:size-3.5" />
            <span>Kamera</span>
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

      {/* ── 3. Main Center Content: Camera Viewfinder or Manual Form ── */}
      <div className="relative flex h-full w-full flex-1 flex-col items-center justify-center">
        {umatMode === "camera" ? (
          <div className="flex h-full w-full items-center justify-center">
            <QrScannerCamera
              onScan={processUmatQrText}
              onError={(err) => setCodeError(err)}
              isFullScreen={true}
              hideControls={true}
              onCamerasDetected={handleCamerasDetected}
              externalCameraId={activeCameraId}
            />
          </div>
        ) : (
          /* Manual Code Form in Full Screen overlay */
          <div className="mx-auto w-full max-w-sm animate-in space-y-5 p-4 duration-150 zoom-in-95 fade-in sm:p-6">
            <div className="space-y-4 rounded-3xl border border-white/20 bg-zinc-950/85 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/20 text-amber-400">
                  <KeyboardIcon className="size-5" />
                </div>
                <div>
                  <h4 className="text-caption-bold sm:text-body-md text-white">
                    Masukkan Kode Presensi
                  </h4>
                  <p className="sm:text-caption text-[11px] text-zinc-400">
                    Ketik kode unik dari QR Event Vihara
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
                    placeholder={eventCode.replace(/./g, "·")}
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
                    {submitting ? "Memverifikasi..." : "Konfirmasi Kehadiran"}
                  </span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Floating Bottom Action Dock ── */}
      <div className="absolute inset-x-0 bottom-0 z-30 flex items-center justify-center gap-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-4">
        {/* Toggle Mode Button (Camera vs Manual) */}
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
              <span>Buka Kamera</span>
            </>
          ) : (
            <>
              <KeyboardIcon className="size-3.5 shrink-0 text-amber-300 sm:size-4" />
              <span>Input Kode Manual</span>
            </>
          )}
        </button>

        {/* Upload Photo Button */}
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          className="sm:text-caption flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-black/75 px-3.5 py-2 text-[11px] font-bold text-white shadow-lg backdrop-blur-xl transition-all hover:bg-white/20 active:scale-95 sm:gap-2 sm:px-4 sm:py-2.5"
          title="Scan dari Foto / Screenshot QR"
        >
          <ImageIcon className="size-3.5 shrink-0 text-cyan-400 sm:size-4" />
          <span>Foto QR</span>
        </button>
      </div>

      {/* Hidden File Input for Umat Photo Upload */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          try {
            const { Html5Qrcode } = await import("html5-qrcode")
            const tempScanner = new Html5Qrcode(
              "temp-qr-div-umat-" + Math.random(),
              { verbose: false }
            )
            const decoded = await tempScanner.scanFile(file, true)
            processUmatQrText(decoded)
          } catch {
            triggerFeedback(
              "error",
              "Gagal Membaca QR",
              "Gambar tidak memuat QR Code yang jelas."
            )
          } finally {
            if (uploadInputRef.current) uploadInputRef.current.value = ""
          }
        }}
        className="hidden"
      />
      <div id="temp-qr-div-umat" className="hidden" />
    </div>
  )

  if (typeof document !== "undefined") {
    return createPortal(umatPortalContent, document.body)
  }
  return umatPortalContent
}
