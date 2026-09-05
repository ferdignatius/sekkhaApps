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
  const [pengurusMode, setPengurusMode] = useState<"camera" | "search">("camera")

  // Mode for Umat: 'camera' | 'manual'
  const [umatMode, setUmatMode] = useState<"camera" | "manual">("camera")

  // Client mount state for portal
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  // Camera Switcher state
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([])
  const [activeCameraId, setActiveCameraId] = useState<string>("")

  const handleCamerasDetected = useCallback((detectedCams: Array<{ id: string; label: string }>, chosenId: string) => {
    setCameras(detectedCams)
    setActiveCameraId(chosenId)
  }, [])

  // Collapsible History Drawer State (Collapsed by default so it doesn't take space!)
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)

  // Real People database loaded from backend
  const [peopleList, setPeopleList] = useState<MemberDto[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)

  // Track already attended user IDs (both existing from props + scanned in current session)
  const [sessionAttendedIds, setSessionAttendedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    existingRecords.forEach((r) => {
      if (r.user_id) initial.add(r.user_id)
    })
    return initial
  })

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
        .catch((err) => console.error("Gagal memuat data People untuk presensi:", err))
        .finally(() => setLoadingPeople(false))
    }
  }, [isPengurus])

  function triggerFeedback(type: "success" | "duplicate" | "error", title: string, subtitle: string) {
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
          if (err.message?.includes("sudah tercatat hadir") || err.error === "DUPLICATE_ATTENDANCE") {
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
                ? { ...item, status: "error", message: err.message || "Gagal sinkron server" }
                : item
            )
          )
          triggerFeedback("error", "Gagal Sinkronisasi Server", err.message || "Terjadi kendala koneksi.")
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
        scannedCode = (parsed.code || parsed.eventCode || rawText).toString().trim().toUpperCase()
      }
    } catch {}

    if (scannedCode !== eventCode.toUpperCase()) {
      playWarningChime()
      setCodeError("QR Code tidak cocok dengan event ini.")
      return
    }

    const result: ScanResult = {
      name: "Kamu (Presensi Mandiri)",
      method: "qr",
      scanned_at: new Date().toISOString(),
    }
    triggerFeedback("success", "Presensi Mandiri Berhasil! 🎉", "Kehadiranmu telah tercatat.")
    onRecord(result)

    if (eventId) {
      setSubmitting(true)
      api
        .post(`/events/${eventId}/attendance`, { method: "qr" })
        .catch((err: any) => {
          if (err.message?.includes("sudah tercatat hadir") || err.error === "DUPLICATE_ATTENDANCE") {
            triggerFeedback("duplicate", "Sudah Presensi ⚠️", "Kamu sudah tercatat hadir di acara ini.")
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
        setManualError("Ditemukan beberapa pengguna. Silakan pilih salah satu dari daftar.")
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
      if (err.message?.includes("sudah tercatat hadir") || err.error === "DUPLICATE_ATTENDANCE") {
        setSessionAttendedIds((prev) => new Set(prev).add(target!.id))
        setManualError(`⚠️ ${target.name} sudah tercatat hadir dalam kegiatan ini.`)
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
          (m.username && m.username.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (m.user_number && m.user_number.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : []

  // Helper to format clean camera labels (Belakang / Depan)
  function getCameraDisplayName(label?: string): string {
    if (!label) return "Kamera Belakang"
    const l = label.toLowerCase()
    if (l.includes("back") || l.includes("rear") || l.includes("belakang") || l.includes("environment")) {
      return "Belakang"
    }
    if (l.includes("front") || l.includes("depan") || l.includes("user") || l.includes("selfie")) {
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
        className="flex flex-col bg-black text-white font-sans overflow-hidden animate-in fade-in duration-200"
      >
        {/* ── 1. Floating Top Bar (Responsive QRIS Style) ── */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/90 via-black/50 to-transparent">
          {/* Left: Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Scanner"
            className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
          >
            <XIcon className="size-4 sm:size-5" />
          </button>

          {/* Center: Live Status & Counter Pill */}
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-black/70 px-2.5 sm:px-3.5 py-1 sm:py-1.5 backdrop-blur-md border border-white/20 shadow-lg">
            <span className="flex size-2 sm:size-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] sm:text-caption font-bold text-white tracking-wide">
              {sessionAttendedIds.size} Hadir
            </span>
            {sessionSuccessCount > 0 && (
              <span className="rounded-full bg-emerald-500/30 px-1.5 py-0.2 text-[9px] sm:text-[10px] font-extrabold text-emerald-300">
                +{sessionSuccessCount}
              </span>
            )}
          </div>

          {/* Right: Camera Switcher (Front/Back toggle) */}
          {cameras.length > 1 ? (
            <button
              type="button"
              onClick={handleToggleCamera}
              className="flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-caption font-bold text-white backdrop-blur-md border border-white/25 hover:bg-white/25 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
              title="Ganti Kamera Depan / Belakang"
            >
              <RefreshCwIcon className="size-3.5 sm:size-4 text-amber-300 shrink-0" />
              <span>Kamera: {currentCamLabel}</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-white/80 bg-black/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/10 backdrop-blur-md shrink-0">
              <CameraIcon className="size-3 sm:size-3.5 text-amber-400" />
              <span>Kamera Belakang</span>
            </div>
          )}
        </div>

        {/* ── 2. Floating Dynamic Notification Banner (Responsive) ── */}
        {lastFeedback && (
          <div className="absolute top-16 sm:top-20 inset-x-2.5 sm:inset-x-4 max-w-sm sm:max-w-md mx-auto z-40 animate-in slide-in-from-top-4 fade-in duration-200">
            <div
              className={`flex items-start gap-2.5 sm:gap-3 rounded-2xl p-3 sm:p-4 shadow-2xl border backdrop-blur-xl ${
                lastFeedback.type === "success"
                  ? "bg-emerald-950/90 border-emerald-400/80 text-white"
                  : lastFeedback.type === "duplicate"
                  ? "bg-amber-950/90 border-amber-400/80 text-white"
                  : "bg-rose-950/90 border-rose-400/80 text-white"
              }`}
            >
              {lastFeedback.type === "success" ? (
                <CheckCircle2Icon className="size-5 sm:size-6 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangleIcon
                  className={`size-5 sm:size-6 shrink-0 mt-0.5 ${
                    lastFeedback.type === "duplicate" ? "text-amber-400" : "text-rose-400"
                  }`}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-caption sm:text-body-sm font-black leading-tight">{lastFeedback.title}</p>
                <p className="text-[11px] sm:text-caption opacity-90 leading-tight mt-0.5 sm:mt-1">{lastFeedback.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setLastFeedback(null)}
                className="text-white/60 hover:text-white p-1 cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── 3. Main Center Content: Full Camera or Search Form ── */}
        <div className="relative flex-1 w-full h-full flex flex-col items-center justify-center">
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
            <div className="w-full max-w-lg mx-auto p-3 sm:p-6 max-h-[80vh] overflow-y-auto space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="rounded-3xl border border-white/20 bg-slate-950/90 p-4 sm:p-5 backdrop-blur-2xl shadow-2xl space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <h4 className="text-caption-bold sm:text-title-sm font-bold text-white flex items-center gap-1.5 sm:gap-2">
                    <SearchIcon className="size-4 text-amber-400" />
                    <span>Cari & Catat Presensi Manual</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => setPengurusMode("camera")}
                    className="text-slate-400 hover:text-white text-caption cursor-pointer"
                  >
                    Kamera
                  </button>
                </div>

                <form onSubmit={handleManualSearchSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label htmlFor="people-full-search" className="text-[11px] sm:text-caption font-medium text-slate-300">
                      Nama, @username, atau ID Umat
                    </label>
                    <div className="relative">
                      <SearchIcon className="absolute left-3.5 top-3 sm:top-3.5 size-4 text-slate-400" />
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
                        className="w-full rounded-2xl border border-slate-700 bg-slate-900 pl-9 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 text-caption sm:text-body-sm text-white outline-none focus:border-amber-400 placeholder:text-slate-500"
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Autocomplete List */}
                  {searchQuery.trim() && !selectedMember && (
                    <div className="max-h-44 sm:max-h-52 overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 divide-y divide-slate-800 shadow-xl">
                      {loadingPeople ? (
                        <p className="p-3 sm:p-4 text-caption text-slate-400 text-center">Memuat database...</p>
                      ) : filteredMembers.length === 0 ? (
                        <p className="p-3 sm:p-4 text-caption text-slate-400 text-center">Tidak ada anggota cocok.</p>
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
                              className={`w-full flex items-center justify-between p-2.5 sm:p-3 text-left transition-colors cursor-pointer ${
                                alreadyIn ? "bg-amber-950/30 hover:bg-amber-950/50" : "hover:bg-slate-800"
                              }`}
                            >
                              <div className="min-w-0">
                                <p className="text-caption font-bold text-white truncate">{m.name}</p>
                                <p className="text-[10px] sm:text-micro text-slate-400 font-mono">
                                  {m.username ? `@${m.username} · ` : ""}ID: {m.user_number || "—"}
                                </p>
                              </div>
                              {alreadyIn ? (
                                <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full shrink-0 border border-amber-500/30">
                                  Sudah Hadir
                                </span>
                              ) : (
                                <span className="text-[9px] sm:text-[10px] font-semibold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full shrink-0 border border-emerald-500/30">
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
                    <div className="flex items-center justify-between rounded-2xl border border-amber-400/40 bg-amber-950/30 p-3 sm:p-3.5 shadow-md">
                      <div>
                        <p className="text-caption sm:text-body-sm font-bold text-amber-200">{selectedMember.name}</p>
                        <p className="text-[11px] sm:text-caption text-slate-300 font-mono">
                          {selectedMember.username ? `@${selectedMember.username} · ` : ""}ID: {selectedMember.user_number || "—"}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMember(null)
                          setSearchQuery("")
                        }}
                        className="text-caption font-semibold text-amber-400 hover:underline cursor-pointer"
                      >
                        Ganti
                      </button>
                    </div>
                  )}

                  {manualError && (
                    <p className="flex items-center gap-1.5 text-caption font-semibold text-rose-300 bg-rose-950/60 p-2.5 sm:p-3 rounded-2xl border border-rose-500/40">
                      <AlertTriangleIcon className="size-4 shrink-0 text-rose-400" />
                      <span>{manualError}</span>
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || (!selectedMember && !searchQuery.trim())}
                    className="w-full rounded-2xl bg-[#e8b94a] py-2.5 sm:py-3 text-caption font-bold text-[#0a0a0a] shadow-lg hover:bg-amber-400 transition-all disabled:opacity-50 cursor-pointer uppercase tracking-wider"
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
          <div className="absolute inset-x-2 sm:inset-x-auto sm:max-w-md sm:mx-auto bottom-20 sm:bottom-24 z-40 max-h-[48vh] sm:max-h-[52vh] bg-slate-950/95 border border-white/20 rounded-3xl p-3.5 sm:p-4 shadow-2xl backdrop-blur-2xl flex flex-col animate-in slide-in-from-bottom-8 duration-200">
            <div className="flex items-center justify-between pb-2 sm:pb-2.5 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <ClockIcon className="size-3.5 sm:size-4 text-amber-400" />
                <h4 className="text-caption font-bold text-white">Riwayat Antrean Scan ({recentScans.length})</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryDrawerOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
                aria-label="Tutup Riwayat"
              >
                <ChevronDownIcon className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 sm:space-y-2 py-2 pr-1 no-scrollbar">
              {recentScans.length === 0 ? (
                <p className="text-caption text-slate-400 text-center py-6">
                  Belum ada QR yang di-scan pada sesi ini. Arahkan kamera ke QR umat!
                </p>
              ) : (
                recentScans.map((scan) => (
                  <div
                    key={scan.id}
                    className={`flex items-center justify-between p-2 sm:p-2.5 rounded-2xl border text-caption transition-all ${
                      scan.status === "success"
                        ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-200"
                        : scan.status === "duplicate"
                        ? "bg-amber-950/60 border-amber-500/40 text-amber-200"
                        : "bg-rose-950/60 border-rose-500/40 text-rose-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <span
                        className={`flex size-6 sm:size-7 shrink-0 items-center justify-center rounded-xl text-caption-bold font-black uppercase ${
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
                        <p className="font-bold truncate text-white text-[12px] sm:text-caption">{scan.name}</p>
                        <p className="text-[10px] sm:text-[11px] opacity-75 truncate">{scan.message}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 pl-2">
                      <span className="text-[9px] sm:text-[10px] font-mono text-slate-300 block">{scan.time}</span>
                      <span
                        className={`inline-block text-[8px] sm:text-[9px] font-black uppercase px-1.5 sm:px-2 py-0.5 rounded-full ${
                          scan.status === "success"
                            ? "bg-emerald-500/30 text-emerald-300"
                            : scan.status === "duplicate"
                            ? "bg-amber-500/30 text-amber-300"
                            : "bg-rose-500/30 text-rose-300"
                        }`}
                      >
                        {scan.status === "success" ? "Hadir" : scan.status === "duplicate" ? "Duplikat" : "Gagal"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── 5. Floating Bottom Navigation Bar (Responsive Dock) ── */}
        <div className="absolute bottom-0 inset-x-0 z-30 p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-center justify-center gap-1.5 sm:gap-2.5">
          {/* Button 1: Add / Search User Manually (Bottom Action) */}
          <button
            type="button"
            onClick={() => setPengurusMode((prev) => (prev === "camera" ? "search" : "camera"))}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-caption font-bold backdrop-blur-xl border transition-all cursor-pointer shadow-lg active:scale-95 ${
              pengurusMode === "search"
                ? "bg-[#e8b94a] text-[#0a0a0a] border-amber-300 font-extrabold"
                : "bg-black/75 text-white border-white/25 hover:bg-white/20"
            }`}
          >
            {pengurusMode === "camera" ? (
              <>
                <UserPlusIcon className="size-3.5 sm:size-4 text-amber-300 shrink-0" />
                <span>Catat Manual</span>
              </>
            ) : (
              <>
                <CameraIcon className="size-3.5 sm:size-4 shrink-0" />
                <span>Buka Kamera</span>
              </>
            )}
          </button>

          {/* Button 2: Toggle Scan History Drawer */}
          <button
            type="button"
            onClick={() => setIsHistoryDrawerOpen((prev) => !prev)}
            className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-caption font-bold backdrop-blur-xl border transition-all cursor-pointer shadow-lg active:scale-95 ${
              isHistoryDrawerOpen
                ? "bg-white text-black border-white"
                : "bg-black/75 text-white border-white/25 hover:bg-white/20"
            }`}
          >
            <ListFilterIcon className="size-3.5 sm:size-4 text-amber-400 shrink-0" />
            <span>Riwayat ({recentScans.length})</span>
          </button>

          {/* Button 3: Quick Upload from Photo Fallback */}
          <button
            type="button"
            onClick={() => uploadInputRef.current?.click()}
            className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-black/75 text-white border border-white/25 px-3 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-caption font-bold backdrop-blur-xl hover:bg-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
            title="Scan dari Foto / Screenshot QR"
          >
            <ImageIcon className="size-3.5 sm:size-4 text-cyan-400 shrink-0" />
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
              const tempScanner = new Html5Qrcode("temp-qr-div-" + Math.random(), { verbose: false })
              const decoded = await tempScanner.scanFile(file, true)
              await processPengurusQrText(decoded)
            } catch {
              triggerFeedback("error", "Gagal Membaca QR", "Gambar tidak memuat QR Code yang jelas.")
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
        className="flex flex-col bg-black text-white font-sans overflow-hidden animate-in fade-in duration-200"
      >
      {/* ── 1. Floating Top Bar ── */}
      <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-3 sm:p-4 pt-[max(0.75rem,env(safe-area-inset-top))] bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        {/* Left: Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup Scanner"
          className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
        >
          <XIcon className="size-4 sm:size-5" />
        </button>

        {/* Center: Title Pill */}
        <div className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-black/70 px-3 sm:px-4 py-1 sm:py-1.5 backdrop-blur-md border border-white/20 shadow-lg">
          <ScanLineIcon className="size-3.5 sm:size-4 text-amber-400" />
          <span className="text-[11px] sm:text-caption font-bold text-white tracking-wide">
            Presensi Mandiri
          </span>
        </div>

        {/* Right: Camera Switcher */}
        {cameras.length > 1 ? (
          <button
            type="button"
            onClick={handleToggleCamera}
            className="flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] sm:text-caption font-bold text-white backdrop-blur-md border border-white/25 hover:bg-white/25 transition-all cursor-pointer shadow-lg active:scale-95 shrink-0"
            title="Ganti Kamera Depan / Belakang"
          >
            <RefreshCwIcon className="size-3.5 sm:size-4 text-amber-300 shrink-0" />
            <span>Kamera: {currentCamLabel}</span>
          </button>
        ) : (
          <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-white/80 bg-black/60 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-white/10 backdrop-blur-md shrink-0">
            <CameraIcon className="size-3 sm:size-3.5 text-amber-400" />
            <span>Kamera</span>
          </div>
        )}
      </div>

      {/* ── 2. Floating Dynamic Feedback Banner ── */}
      {lastFeedback && (
        <div className="absolute top-16 sm:top-20 inset-x-2.5 sm:inset-x-4 max-w-sm sm:max-w-md mx-auto z-40 animate-in slide-in-from-top-4 fade-in duration-200">
          <div
            className={`flex items-start gap-2.5 sm:gap-3 rounded-2xl p-3 sm:p-4 shadow-2xl border backdrop-blur-xl ${
              lastFeedback.type === "success"
                ? "bg-emerald-950/90 border-emerald-400/80 text-white"
                : lastFeedback.type === "duplicate"
                ? "bg-amber-950/90 border-amber-400/80 text-white"
                : "bg-rose-950/90 border-rose-400/80 text-white"
            }`}
          >
            {lastFeedback.type === "success" ? (
              <div className="flex size-7 sm:size-8 items-center justify-center rounded-xl bg-emerald-500/30 text-emerald-300 shrink-0">
                <CheckCircle2Icon className="size-4 sm:size-5 text-emerald-400" />
              </div>
            ) : (
              <div
                className={`flex size-7 sm:size-8 items-center justify-center rounded-xl shrink-0 ${
                  lastFeedback.type === "duplicate"
                    ? "bg-amber-500/30 text-amber-300"
                    : "bg-rose-500/30 text-rose-300"
                }`}
              >
                <AlertTriangleIcon className="size-4 sm:size-5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-caption sm:text-body-sm font-black leading-tight">{lastFeedback.title}</p>
              <p className="text-[11px] sm:text-caption opacity-90 leading-tight mt-0.5 sm:mt-1">{lastFeedback.subtitle}</p>
            </div>
            <button
              type="button"
              onClick={() => setLastFeedback(null)}
              className="text-white/60 hover:text-white p-1 cursor-pointer"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Main Center Content: Camera Viewfinder or Manual Form ── */}
      <div className="relative flex-1 w-full h-full flex flex-col items-center justify-center">
        {umatMode === "camera" ? (
          <div className="w-full h-full flex items-center justify-center">
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
          <div className="w-full max-w-sm mx-auto p-4 sm:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="rounded-3xl border border-white/20 bg-zinc-950/85 p-5 sm:p-6 shadow-2xl backdrop-blur-xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <KeyboardIcon className="size-5" />
                </div>
                <div>
                  <h4 className="text-caption-bold sm:text-body-md text-white">Masukkan Kode Presensi</h4>
                  <p className="text-[11px] sm:text-caption text-zinc-400">Ketik kode unik dari QR Event Vihara</p>
                </div>
              </div>

              <form onSubmit={handleUmatManualSubmit} className="space-y-4 pt-2">
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
                    className="w-full rounded-2xl border border-white/20 bg-black/60 px-4 py-3.5 text-center font-mono text-title-sm sm:text-title-md tracking-widest text-amber-300 placeholder:text-zinc-600 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 uppercase"
                    autoFocus
                  />
                  {codeError && (
                    <p className="flex items-center gap-1.5 text-[11px] sm:text-caption font-semibold text-rose-400 bg-rose-950/60 p-2.5 rounded-xl border border-rose-500/30">
                      <AlertTriangleIcon className="size-4 shrink-0" />
                      <span>{codeError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !codeInput.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 py-3 sm:py-3.5 text-caption-bold sm:text-body-sm font-black text-black shadow-lg hover:from-amber-300 hover:to-amber-400 transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2Icon className="size-4 sm:size-5" />
                  <span>{submitting ? "Memverifikasi..." : "Konfirmasi Kehadiran"}</span>
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Floating Bottom Action Dock ── */}
      <div className="absolute bottom-0 inset-x-0 z-30 flex items-center justify-center gap-2 p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black/90 via-black/50 to-transparent">
        {/* Toggle Mode Button (Camera vs Manual) */}
        <button
          type="button"
          onClick={() => {
            setUmatMode((prev) => (prev === "camera" ? "manual" : "camera"))
            setCodeError("")
          }}
          className={`flex items-center gap-1.5 sm:gap-2 rounded-full px-3.5 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-caption font-bold backdrop-blur-xl border transition-all cursor-pointer shadow-lg active:scale-95 ${
            umatMode === "manual"
              ? "bg-amber-400 text-black border-amber-300"
              : "bg-black/75 text-white border-white/25 hover:bg-white/20"
          }`}
        >
          {umatMode === "manual" ? (
            <>
              <CameraIcon className="size-3.5 sm:size-4 text-black shrink-0" />
              <span>Buka Kamera</span>
            </>
          ) : (
            <>
              <KeyboardIcon className="size-3.5 sm:size-4 text-amber-300 shrink-0" />
              <span>Input Kode Manual</span>
            </>
          )}
        </button>

        {/* Upload Photo Button */}
        <button
          type="button"
          onClick={() => uploadInputRef.current?.click()}
          className="flex items-center gap-1.5 sm:gap-2 rounded-full bg-black/75 text-white border border-white/25 px-3.5 sm:px-4 py-2 sm:py-2.5 text-[11px] sm:text-caption font-bold backdrop-blur-xl hover:bg-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
          title="Scan dari Foto / Screenshot QR"
        >
          <ImageIcon className="size-3.5 sm:size-4 text-cyan-400 shrink-0" />
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
            const tempScanner = new Html5Qrcode("temp-qr-div-umat-" + Math.random(), { verbose: false })
            const decoded = await tempScanner.scanFile(file, true)
            processUmatQrText(decoded)
          } catch {
            triggerFeedback("error", "Gagal Membaca QR", "Gambar tidak memuat QR Code yang jelas.")
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
