// feature/events/components/AttendanceScanModal
// Umat: enter the QR code printed on screen to record attendance.
// Pengurus: input a user name/ID manually.
// In production the umat flow would use a camera scanner.

import { useState } from "react"
import { ScanLineIcon, UserPlusIcon, XIcon, CheckCircleIcon } from "lucide-react"
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

export function AttendanceScanModal({
  role,
  eventCode,
  onRecord,
  onClose,
}: AttendanceScanModalProps) {
  const isPengurus = role === "pengurus" || role === "admin"

  // Umat state
  const [codeInput, setCodeInput] = useState("")
  const [codeError, setCodeError] = useState("")

  // Manual entry state (pengurus)
  const [manualName, setManualName] = useState("")
  const [manualError, setManualError] = useState("")

  // Success feedback
  const [success, setSuccess] = useState<ScanResult | null>(null)

  function handleScan(e: React.FormEvent) {
    e.preventDefault()
    if (!codeInput.trim()) { setCodeError("Masukkan kode terlebih dahulu"); return }
    if (codeInput.trim().toUpperCase() !== eventCode.toUpperCase()) {
      setCodeError("Kode tidak valid atau tidak sesuai event ini")
      return
    }
    const result: ScanResult = {
      name: "Kamu",  // replaced by real user name from auth context in production
      method: "qr",
      scanned_at: new Date().toISOString(),
    }
    setSuccess(result)
    onRecord(result)
  }

  function handleManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manualName.trim()) { setManualError("Masukkan nama umat"); return }
    const result: ScanResult = {
      name: manualName.trim(),
      method: "manual",
      scanned_at: new Date().toISOString(),
    }
    setSuccess(result)
    onRecord(result)
    setManualName("")
    setManualError("")
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Catat Kehadiran"
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-body-sm-medium text-sekkha-ink">Catat Kehadiran</h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="rounded-full p-1.5 text-sekkha-muted hover:bg-sekkha-surface hover:text-sekkha-ink"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {/* Success state */}
      {success && (
        <div className="flex items-center gap-3 rounded-xl bg-sekkha-teal-light px-4 py-3">
          <CheckCircleIcon className="size-5 shrink-0 text-sekkha-brand-blue" />
          <div>
            <p className="text-body-sm-medium text-sekkha-ink">
              {success.method === "qr" ? "Kehadiran berhasil dicatat!" : `${success.name} berhasil dicatat`}
            </p>
            <p className="text-caption text-sekkha-slate capitalize">{success.method} scan</p>
          </div>
        </div>
      )}

      {/* Umat: QR code entry */}
      {!isPengurus && (
        <form onSubmit={handleScan} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="scan-code" className="flex items-center gap-1.5 text-caption text-sekkha-slate">
              <ScanLineIcon className="size-3.5" aria-hidden="true" />
              Masukkan kode dari QR event
            </label>
            <input
              id="scan-code"
              type="text"
              value={codeInput}
              onChange={e => { setCodeInput(e.target.value); setCodeError("") }}
              placeholder={eventCode.replace(/./g, "·")}
              className="rounded-lg border border-sekkha-hairline-strong px-3 py-2.5 font-mono text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
              autoFocus
              autoComplete="off"
            />
            {codeError && <p className="text-caption text-red-500">{codeError}</p>}
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-sekkha-primary py-2.5 text-body-sm-medium text-white"
          >
            Konfirmasi Kehadiran
          </button>
        </form>
      )}

      {/* Pengurus: manual entry */}
      {isPengurus && (
        <form onSubmit={handleManual} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="manual-name" className="flex items-center gap-1.5 text-caption text-sekkha-slate">
              <UserPlusIcon className="size-3.5" aria-hidden="true" />
              Input manual — nama umat
            </label>
            <input
              id="manual-name"
              type="text"
              value={manualName}
              onChange={e => { setManualName(e.target.value); setManualError("") }}
              placeholder="Budi Santoso"
              className="rounded-lg border border-sekkha-hairline-strong px-3 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
            />
            {manualError && <p className="text-caption text-red-500">{manualError}</p>}
          </div>
          <button
            type="submit"
            className="w-full rounded-full bg-sekkha-primary py-2.5 text-body-sm-medium text-white"
          >
            Catat Manual
          </button>
        </form>
      )}
    </div>
  )
}
