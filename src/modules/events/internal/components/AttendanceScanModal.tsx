// feature/events/components/AttendanceScanModal
// Hybrid Attendance System supporting:
// 1. Pengurus: Camera scanning of Umat's physical/digital Member QR Card
// 2. Pengurus: Quick name search / manual entry for elders or members without cards
// 3. Umat: Self-scanning of Vihara Event QR Code

import { useState } from "react"
import {
  ScanLineIcon,
  UserPlusIcon,
  XIcon,
  CheckCircleIcon,
  CameraIcon,
  SearchIcon,
  QrCodeIcon,
} from "lucide-react"
import type { AttendanceMethod, UserRole } from "../types"

interface ScanResult {
  name: string
  method: AttendanceMethod
  scanned_at: string
}

interface AttendanceScanModalProps {
  role: UserRole | null
  eventCode: string
  onRecord: (result: ScanResult) => void
  onClose: () => void
}

// Preset dummy members for quick search autofill by Pengurus
const MEMBER_DATABASE = [
  { id: "user-1", name: "Dewi Lestari", cardCode: "SKH-8821" },
  { id: "user-2", name: "Rudi Wijaya", cardCode: "SKH-4492" },
  { id: "user-3", name: "Budi Santoso", cardCode: "SKH-1039" },
  { id: "user-4", name: "Siti Rahmawati", cardCode: "SKH-7712" },
  { id: "user-5", name: "Hendra Tan", cardCode: "SKH-9920" },
]

export function AttendanceScanModal({
  role,
  eventCode,
  onRecord,
  onClose,
}: AttendanceScanModalProps) {
  const isPengurus = role === "pengurus" || role === "admin"

  // Mode for Pengurus: 'camera' | 'search'
  const [pengurusMode, setPengurusMode] = useState<"camera" | "search">("camera")

  // Umat state (Self Scan)
  const [codeInput, setCodeInput] = useState("")
  const [codeError, setCodeError] = useState("")

  // Pengurus Camera Simulation state
  const [scannedCardCode, setScannedCardCode] = useState("")

  // Pengurus Search state
  const [searchQuery, setSearchQuery] = useState("")
  const [manualName, setManualName] = useState("")
  const [manualError, setManualError] = useState("")

  // Success feedback
  const [success, setSuccess] = useState<ScanResult | null>(null)

  // Umat Self Scan Event QR
  function handleUmatScan(e: React.FormEvent) {
    e.preventDefault()
    if (!codeInput.trim()) { setCodeError("Masukkan kode terlebih dahulu"); return }
    if (codeInput.trim().toUpperCase() !== eventCode.toUpperCase()) {
      setCodeError("Kode tidak valid atau tidak sesuai event ini")
      return
    }
    const result: ScanResult = {
      name: "Kamu (Presensi Mandiri)",
      method: "qr",
      scanned_at: new Date().toISOString(),
    }
    setSuccess(result)
    onRecord(result)
  }

  // Pengurus Camera Scan Umat's Member Card QR
  function handlePengurusCameraScan(e: React.FormEvent) {
    e.preventDefault()
    if (!scannedCardCode.trim()) return

    // Find in database or fallback
    const matched = MEMBER_DATABASE.find(
      m => m.cardCode.toLowerCase() === scannedCardCode.trim().toLowerCase(),
    )
    const attendeeName = matched ? matched.name : `Umat (${scannedCardCode.toUpperCase()})`

    const result: ScanResult = {
      name: attendeeName,
      method: "qr",
      scanned_at: new Date().toISOString(),
    }
    setSuccess(result)
    onRecord(result)
    setScannedCardCode("")
  }

  // Pengurus Manual Search / Entry
  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!manualName.trim()) { setManualError("Masukkan nama atau pilih dari pencarian"); return }
    const result: ScanResult = {
      name: manualName.trim(),
      method: "manual",
      scanned_at: new Date().toISOString(),
    }
    setSuccess(result)
    onRecord(result)
    setManualName("")
    setSearchQuery("")
    setManualError("")
  }

  const filteredMembers = searchQuery.trim()
    ? MEMBER_DATABASE.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
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
              ? "Scan Kartu QR Umat atau cari nama untuk mencatat kehadiran"
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
              {success.name} · {success.method === "qr" ? "QR Card Scan" : "Input Manual"}
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
            className="w-full rounded-xl bg-sekkha-brand-blue py-2.5 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-[0.99]"
          >
            Konfirmasi Presensi Mandiri
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
              onClick={() => setPengurusMode("camera")}
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
              onClick={() => setPengurusMode("search")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-micro-bold transition-all ${
                pengurusMode === "search"
                  ? "bg-sekkha-brand-blue text-white shadow-xs"
                  : "text-sekkha-slate hover:text-sekkha-ink"
              }`}
            >
              <SearchIcon className="size-3.5" />
              <span>✍️ Cari / Input Nama Umat</span>
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
                  <p className="text-micro text-sekkha-slate mt-0.5">Mendukung Kartu Fisik Cetak atau QR Aplikasi Umat</p>
                </div>
              </div>

              {/* Quick Simulator Bar for testing */}
              <form onSubmit={handlePengurusCameraScan} className="flex gap-2">
                <input
                  type="text"
                  value={scannedCardCode}
                  onChange={e => setScannedCardCode(e.target.value)}
                  placeholder="Kode Kartu (misal: SKH-8821 atau SKH-4492)"
                  className="flex-1 rounded-xl border border-sekkha-hairline bg-white px-3 py-2 text-micro text-sekkha-ink outline-none focus:border-sekkha-brand-blue shadow-2xs"
                />
                <button
                  type="submit"
                  className="rounded-xl bg-sekkha-brand-blue px-3.5 py-2 text-micro-bold text-white hover:bg-blue-700 transition-all shadow-2xs"
                >
                  Scan QR
                </button>
              </form>
            </div>
          )}

          {/* Option B: Search / Manual Entry for Elders without phones */}
          {pengurusMode === "search" && (
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="manual-name" className="flex items-center gap-1.5 text-caption font-semibold text-sekkha-ink">
                  <UserPlusIcon className="size-4 text-sekkha-brand-blue" aria-hidden="true" />
                  <span>Cari Nama Umat dari Master Data / Ketik Manual</span>
                </label>
                
                <input
                  id="manual-name"
                  type="text"
                  value={manualName || searchQuery}
                  onChange={e => {
                    setManualName(e.target.value)
                    setSearchQuery(e.target.value)
                    setManualError("")
                  }}
                  placeholder="Ketik Nama Umat (misal: Dewi Lestari, Rudi Wijaya)"
                  className="rounded-xl border border-sekkha-hairline bg-white px-3.5 py-2.5 text-caption text-sekkha-ink outline-none focus:border-sekkha-brand-blue shadow-2xs"
                />
                {manualError && <p className="text-micro text-rose-500 font-semibold">{manualError}</p>}
              </div>

              {/* Autofill Search Results Dropdown */}
              {filteredMembers.length > 0 && (
                <div className="rounded-xl border border-sekkha-hairline bg-white p-1.5 shadow-md space-y-1">
                  <p className="text-micro-bold text-sekkha-slate px-2 py-1 border-b border-sekkha-hairline-soft">
                    Hasil Pencarian Master Data Umat:
                  </p>
                  {filteredMembers.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setManualName(m.name)
                        setSearchQuery("")
                      }}
                      className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-caption text-sekkha-ink hover:bg-blue-50 transition-colors"
                    >
                      <span className="font-bold">{m.name}</span>
                      <span className="text-micro font-mono text-sekkha-brand-blue font-semibold">{m.cardCode}</span>
                    </button>
                  ))}
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-xl bg-sekkha-brand-blue py-2.5 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-[0.99]"
              >
                Tandai Umat Hadir
              </button>
            </form>
          )}

        </div>
      )}

    </div>
  )
}
