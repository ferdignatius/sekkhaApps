// feature/events/components/AttendanceScanModal
// Hybrid Attendance System supporting:
// 1. Pengurus: Camera scanning of Umat's physical/digital Member QR Card
// 2. Pengurus: Quick name / userNumber search restricted strictly to registered People users
// 3. Umat: Self-scanning of Vihara Event QR Code

import { useState, useEffect } from "react"
import {
  ScanLineIcon,
  UserPlusIcon,
  XIcon,
  CheckCircleIcon,
  CameraIcon,
  SearchIcon,
  QrCodeIcon,
  AlertCircleIcon,
} from "lucide-react"
import { api } from "@/lib/api"
import { teamsApi } from "@/modules/teams/internal/api/teamsApi"
import type { MemberDto } from "@/modules/teams/internal/api/teamsApi"
import type { AttendanceMethod, UserRole } from "../types"

interface ScanResult {
  name: string
  method: AttendanceMethod
  scanned_at: string
}

interface AttendanceScanModalProps {
  eventId?: string
  role: UserRole | null
  eventCode: string
  onRecord: (result: ScanResult) => void
  onClose: () => void
}

export function AttendanceScanModal({
  eventId,
  role,
  eventCode,
  onRecord,
  onClose,
}: AttendanceScanModalProps) {
  const isPengurus = role === "pengurus" || role === "admin"

  // Mode for Pengurus: 'camera' | 'search'
  const [pengurusMode, setPengurusMode] = useState<"camera" | "search">("camera")

  // Real People database loaded from backend
  const [peopleList, setPeopleList] = useState<MemberDto[]>([])
  const [loadingPeople, setLoadingPeople] = useState(false)

  // Umat state (Self Scan)
  const [codeInput, setCodeInput] = useState("")
  const [codeError, setCodeError] = useState("")

  // Pengurus Camera Simulation state
  const [scannedCardCode, setScannedCardCode] = useState("")

  // Pengurus Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMember, setSelectedMember] = useState<MemberDto | null>(null)
  const [manualError, setManualError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  // Success feedback
  const [success, setSuccess] = useState<ScanResult | null>(null)

  // Load People list for Pengurus manual presensi
  useEffect(() => {
    if (isPengurus) {
      setLoadingPeople(true)
      teamsApi.listMembers()
        .then(data => setPeopleList(data))
        .catch(err => console.error("Gagal memuat data People untuk presensi:", err))
        .finally(() => setLoadingPeople(false))
    }
  }, [isPengurus])

  // Umat Self Scan Event QR
  async function handleUmatScan(e: React.FormEvent) {
    e.preventDefault()
    if (!codeInput.trim()) { setCodeError("Masukkan kode terlebih dahulu"); return }
    if (codeInput.trim().toUpperCase() !== eventCode.toUpperCase()) {
      setCodeError("Kode tidak valid atau tidak sesuai event ini")
      return
    }

    try {
      setSubmitting(true)
      if (eventId) {
        await api.post(`/events/${eventId}/attendance`, { method: "qr" })
      }
      const result: ScanResult = {
        name: "Kamu (Presensi Mandiri)",
        method: "qr",
        scanned_at: new Date().toISOString(),
      }
      setSuccess(result)
      onRecord(result)
    } catch (err: any) {
      setCodeError(err.message || "Gagal mencatat presensi mandiri")
    } finally {
      setSubmitting(false)
    }
  }

  // Pengurus Camera Scan Umat's Member Card QR / User Number
  async function handlePengurusCameraScan(e: React.FormEvent) {
    e.preventDefault()
    const query = scannedCardCode.trim().toLowerCase()
    if (!query) return

    // Find in real People database by user_number or id or email
    const matched = peopleList.find(
      m =>
        (m.user_number && m.user_number.toLowerCase() === query) ||
        m.id.toLowerCase() === query ||
        m.email.toLowerCase() === query
    )

    if (!matched) {
      setCodeError(`Pengguna dengan kode "${scannedCardCode.toUpperCase()}" tidak ditemukan di data People.`)
      return
    }

    try {
      setSubmitting(true)
      if (eventId) {
        await api.post(`/events/${eventId}/attendance`, {
          method: "qr",
          user_id: matched.id,
        })
      }

      const result: ScanResult = {
        name: matched.name,
        method: "qr",
        scanned_at: new Date().toISOString(),
      }
      setSuccess(result)
      onRecord(result)
      setScannedCardCode("")
      setCodeError("")
    } catch (err: any) {
      setCodeError(err.message || "Gagal mencatat presensi QR")
    } finally {
      setSubmitting(false)
    }
  }

  // Pengurus Manual Search / Entry (Strictly restricted to People)
  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    setManualError("")

    let target = selectedMember

    if (!target) {
      const q = searchQuery.trim().toLowerCase()
      if (!q) {
        setManualError("Masukkan nama, email, atau No. Unik pengguna")
        return
      }
      // Try to find exact or single match in People list
      const matches = peopleList.filter(
        m =>
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          (m.user_number && m.user_number.toLowerCase().includes(q))
      )

      if (matches.length === 0) {
        setManualError("Pengguna tidak terdaftar dalam People. Hanya pengguna terdaftar yang bisa dicatat presensinya.")
        return
      } else if (matches.length === 1) {
        target = matches[0]!
      } else {
        setManualError("Ditemukan beberapa pengguna. Silakan klik salah satu opsi dari daftar pencarian.")
        return
      }
    }

    try {
      setSubmitting(true)
      if (eventId) {
        await api.post(`/events/${eventId}/attendance`, {
          method: "manual",
          user_id: target.id,
        })
      }

      const result: ScanResult = {
        name: target.name,
        method: "manual",
        scanned_at: new Date().toISOString(),
      }
      setSuccess(result)
      onRecord(result)
      setSelectedMember(null)
      setSearchQuery("")
      setManualError("")
    } catch (err: any) {
      setManualError(err.message || "Gagal mencatat presensi manual")
    } finally {
      setSubmitting(false)
    }
  }

  const filteredMembers = searchQuery.trim()
    ? peopleList.filter(
        m =>
          m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (m.user_number && m.user_number.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : []

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Catat Kehadiran"
      className="flex flex-col gap-4 text-left font-sans"
    >
      {/* Modal Header */}
      <div className="flex items-center justify-between pb-2 border-b border-sekkha-hairline-soft">
        <div>
          <h3 className="text-caption-bold text-sekkha-ink">
            {isPengurus ? "Scan QR Kartu Umat / Presensi" : "Scan Presensi Mandiri"}
          </h3>
          <p className="text-micro text-sekkha-slate">
            {isPengurus
              ? "Scan Kartu QR Umat atau cari nama pengguna terdaftar (People)"
              : "Masukkan kode QR event untuk klaim presensi"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="rounded-xl border border-sekkha-hairline p-1.5 text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink transition-colors shadow-2xs"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {/* Success Notification */}
      {success && (
        <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 shadow-2xs">
          <CheckCircleIcon className="size-5 shrink-0 text-emerald-600" />
          <div>
            <p className="text-caption-bold text-emerald-900">
              Presensi Berhasil Dicatat!
            </p>
            <p className="text-micro font-medium text-emerald-700">
              {success.name} · {success.method === "qr" ? "QR Card Scan" : "Input Manual (People)"}
            </p>
          </div>
        </div>
      )}

      {/* ── Mode 1: Umat Self Scan ────────────────────────────────────── */}
      {!isPengurus && (
        <form onSubmit={handleUmatScan} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="scan-code" className="flex items-center gap-1.5 text-caption font-semibold text-sekkha-ink">
              <ScanLineIcon className="size-4 text-sekkha-brand-blue" aria-hidden="true" />
              <span>Masukkan Kode dari QR Event Vihara</span>
            </label>
            <input
              id="scan-code"
              type="text"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeError("") }}
              placeholder={eventCode.replace(/./g, "·")}
              className="rounded-xl border border-sekkha-hairline bg-white px-3.5 py-2.5 font-mono text-caption text-sekkha-ink outline-none focus:border-sekkha-brand-blue shadow-2xs"
              autoFocus
              autoComplete="off"
            />
            {codeError && <p className="text-micro text-rose-500 font-semibold">{codeError}</p>}
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-sekkha-brand-blue py-2.5 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-[0.99] disabled:opacity-50"
          >
            {submitting ? "Memproses..." : "Konfirmasi Presensi Mandiri"}
          </button>
        </form>
      )}

      {/* ── Mode 2: Pengurus Hybrid Scanner (Camera QR vs Manual Search) ── */}
      {isPengurus && (
        <div className="space-y-3">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1.5 rounded-xl border border-sekkha-hairline bg-sekkha-surface p-1">
            <button
              type="button"
              onClick={() => { setPengurusMode("camera"); setCodeError("") }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-micro-bold transition-all ${
                pengurusMode === "camera"
                  ? "bg-sekkha-brand-blue text-white shadow-xs"
                  : "text-sekkha-slate hover:text-sekkha-ink"
              }`}
            >
              <CameraIcon className="size-3.5" />
              <span>📷 Scan QR Kartu Umat</span>
            </button>

            <button
              type="button"
              onClick={() => { setPengurusMode("search"); setManualError("") }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-micro-bold transition-all ${
                pengurusMode === "search"
                  ? "bg-sekkha-brand-blue text-white shadow-xs"
                  : "text-sekkha-slate hover:text-sekkha-ink"
              }`}
            >
              <SearchIcon className="size-3.5" />
              <span>✍️ Cari Umat dari People</span>
            </button>
          </div>

          {/* Option A: Camera QR Scan of Umat's Member Card */}
          {pengurusMode === "camera" && (
            <div className="space-y-3">
              <div className="relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-sekkha-brand-blue/40 bg-gradient-to-br from-blue-50/30 via-white to-sekkha-canvas p-6 text-center shadow-2xs space-y-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sekkha-brand-blue text-white shadow-xs animate-pulse">
                  <QrCodeIcon className="size-6" />
                </div>
                <div>
                  <p className="text-caption-bold text-sekkha-ink">Arahkan Kamera HP ke Kartu QR Umat</p>
                  <p className="text-micro text-sekkha-slate mt-0.5">Atau masukkan No. Unik (misal: 26082101)</p>
                </div>
              </div>

              {/* Quick Simulator Bar for testing */}
              <form onSubmit={handlePengurusCameraScan} className="space-y-1.5">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={scannedCardCode}
                    onChange={e => { setScannedCardCode(e.target.value); setCodeError("") }}
                    placeholder="Masukkan No. Unik (misal: 26082101)"
                    className="flex-1 rounded-xl border border-sekkha-hairline bg-white px-3 py-2 text-micro font-mono text-sekkha-ink outline-none focus:border-sekkha-brand-blue shadow-2xs"
                  />
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl bg-sekkha-brand-blue px-3.5 py-2 text-micro-bold text-white hover:bg-blue-700 transition-all shadow-2xs disabled:opacity-50"
                  >
                    {submitting ? "..." : "Scan QR"}
                  </button>
                </div>
                {codeError && (
                  <p className="flex items-center gap-1 text-micro-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                    <AlertCircleIcon className="size-3.5 shrink-0" />
                    <span>{codeError}</span>
                  </p>
                )}
              </form>
            </div>
          )}

          {/* Option B: Search / Manual Entry (Strictly from People) */}
          {pengurusMode === "search" && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="manual-name" className="flex items-center gap-1.5 text-caption font-semibold text-sekkha-ink">
                  <UserPlusIcon className="size-4 text-sekkha-brand-blue" aria-hidden="true" />
                  <span>Cari Nama / No. Unik Umat dari People</span>
                </label>
                
                <input
                  id="manual-name"
                  type="text"
                  value={selectedMember ? selectedMember.name : searchQuery}
                  onChange={e => {
                    setSelectedMember(null)
                    setSearchQuery(e.target.value)
                    setManualError("")
                  }}
                  placeholder={loadingPeople ? "Memuat data People..." : "Ketik Nama / Email / No. Unik (misal: 26082101)"}
                  className="rounded-xl border border-sekkha-hairline bg-white px-3.5 py-2.5 text-caption text-sekkha-ink outline-none focus:border-sekkha-brand-blue shadow-2xs"
                />
                {manualError && (
                  <p className="flex items-center gap-1 text-micro-bold text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200">
                    <AlertCircleIcon className="size-3.5 shrink-0" />
                    <span>{manualError}</span>
                  </p>
                )}
              </div>

              {/* Search Results Dropdown from People Database */}
              {filteredMembers.length > 0 && !selectedMember && (
                <div className="rounded-xl border border-sekkha-hairline bg-white p-1.5 shadow-md space-y-1 max-h-48 overflow-y-auto">
                  <p className="text-micro-bold text-sekkha-slate px-2 py-1 border-b border-sekkha-hairline-soft">
                    Hasil Pencarian Pengguna People ({filteredMembers.length}):
                  </p>
                  {filteredMembers.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedMember(m)
                        setSearchQuery(m.name)
                        setManualError("")
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-caption text-sekkha-ink hover:bg-blue-50 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <p className="font-bold truncate">{m.name}</p>
                        <p className="text-micro text-sekkha-slate truncate">{m.email}</p>
                      </div>
                      <span className="text-micro font-mono text-sekkha-brand-blue font-bold shrink-0 ml-2">
                        {m.user_number || "—"}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {selectedMember && (
                <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 p-2.5">
                  <div>
                    <p className="text-caption-bold text-sekkha-brand-blue">{selectedMember.name}</p>
                    <p className="text-micro text-sekkha-slate">{selectedMember.email} · No. Unik: {selectedMember.user_number}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedMember(null); setSearchQuery("") }}
                    className="text-micro-bold text-slate-500 hover:text-slate-800"
                  >
                    Ganti
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-sekkha-brand-blue py-2.5 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-[0.99] disabled:opacity-50 font-extrabold"
              >
                {submitting ? "Memproses..." : "Tandai Umat Hadir"}
              </button>
            </form>
          )}

        </div>
      )}

    </div>
  )
}
