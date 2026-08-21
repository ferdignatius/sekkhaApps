// feature/events/components/EventDetailSheet
// Modern Glassmorphism Event Detail View with responsive, highly informative cards,
// gamified RSVP rewards, and role-based attendance management with full Event Lifecycle status.

import { useState } from "react"
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  ClipboardListIcon,
  GiftIcon,
  SparklesIcon,
  PencilIcon,
  ClockIcon,
  CopyIcon,
  Trash2Icon,
  PlayIcon,
  LockIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
} from "lucide-react"
import { AttendanceScanModal } from "./AttendanceScanModal"
import { AttendanceListSheet } from "./AttendanceListSheet"
import type { EventListItem, UserRole, AttendanceRecord, EventStatus } from "../types"
import { getCategoryColor } from "../masterdata"

interface EventDetailSheetProps {
  event: EventListItem
  role: UserRole | null
  onClose?: () => void
  onEdit?: (event: EventListItem) => void
  onDelete?: (event: EventListItem) => void
  onDuplicate?: (event: EventListItem) => void
  onStatusChange?: (eventId: string, status: EventStatus) => void
  attendances?: AttendanceRecord[]
  onRecordAttendance?: (eventId: string, record: AttendanceRecord) => void
  onDeleteAttendance?: (userId: string) => void
}

function formatFullDate(iso: string) {
  const d = new Date(iso)
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ]

  const dayName = days[d.getDay()]
  const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  const hours = String(d.getHours()).padStart(2, "0")
  const mins = String(d.getMinutes()).padStart(2, "0")
  const timeStr = `${hours}.${mins} WIB`

  return { dayName, dateStr, timeStr }
}

export function EventDetailSheet({
  event,
  role,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
  attendances = [],
  onRecordAttendance,
  onDeleteAttendance,
}: EventDetailSheetProps) {
  const isPengurus = role === "pengurus" || role === "admin"
  const [showScan, setShowScan] = useState(false)
  const [warningModalOpen, setWarningModalOpen] = useState(false)

  // Status lifecycle
  const currentStatus: EventStatus = event.status ?? "published"
  const isActive = currentStatus === "active"
  const isClosed = currentStatus === "closed" || currentStatus === "done"
  const canEdit = isPengurus && !isActive && !isClosed

  const { dayName, dateStr, timeStr } = formatFullDate(event.event_date)
  const tag = event.tag ?? event.event_type ?? "rutin"
  const colorInfo = getCategoryColor(tag)

  // Handle Activation Trigger
  function handleActivateClick() {
    const eventTime = new Date(event.event_date).getTime()
    const nowTime = Date.now()

    // Condition 1: Check if current time >= start date/time
    if (nowTime < eventTime) {
      setWarningModalOpen(true)
    } else {
      executeStatusChange("active")
    }
  }

  function executeStatusChange(newStatus: EventStatus) {
    if (onStatusChange) {
      onStatusChange(event.id, newStatus)
    } else {
      event.status = newStatus
    }
    setWarningModalOpen(false)
  }

  function handleRecord(result: { name: string; method: "qr" | "manual"; scanned_at: string }) {
    if (!onRecordAttendance) return
    onRecordAttendance(event.id, {
      user_id: `user-${Date.now()}`,
      name: result.name,
      method: result.method,
      scanned_at: result.scanned_at,
    })
    setTimeout(() => {
      setShowScan(false)
    }, 1500)
  }

  return (
    <div className="space-y-4 text-left font-sans">
      
      {/* ── 1. Glassmorphism Header Banner ── */}
      <div className="relative rounded-2xl border border-sekkha-hairline bg-gradient-to-br from-white/95 via-sekkha-surface/90 to-blue-50/50 p-4 sm:p-5 backdrop-blur-md shadow-xs space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            {/* Tag Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-micro-bold capitalize border font-extrabold shadow-2xs"
                style={colorInfo.bgStyle}
              >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={colorInfo.dotStyle} />
                {colorInfo.name}
              </span>

              {/* Status Badge */}
              {isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-micro-bold text-emerald-800 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Kegiatan Aktif
                </span>
              )}

              {isClosed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-micro-bold text-slate-700">
                  <LockIcon className="size-3 text-slate-500" />
                  Selesai (Read-Only)
                </span>
              )}
            </div>

            {/* Title */}
            <h2 id="event-detail-title" className="text-body-base sm:text-heading-5 font-extrabold text-sekkha-ink tracking-tight leading-snug">
              {event.title}
            </h2>
          </div>

          {/* Pengurus Lifecycle Action Button */}
          {isPengurus && (
            <div className="shrink-0">
              {!isActive && !isClosed && (
                <button
                  type="button"
                  onClick={handleActivateClick}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 text-micro-bold sm:text-caption-bold transition-all shadow-xs active:scale-[0.98]"
                  title="Aktifkan presensi kegiatan ini"
                >
                  <PlayIcon className="size-4 fill-white" />
                  <span>Aktifkan Kegiatan Ini</span>
                </button>
              )}

              {isActive && (
                <button
                  type="button"
                  onClick={() => executeStatusChange("closed")}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 text-micro-bold sm:text-caption-bold transition-all shadow-xs active:scale-[0.98]"
                  title="Selesaikan & Tutup Presensi Event"
                >
                  <LockIcon className="size-4" />
                  <span>Tutup & Selesaikan Event</span>
                </button>
              )}

              {isClosed && (
                <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-300 px-3 py-2 text-micro-bold text-slate-700">
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                  <span>Event Selesai</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top Management Toolbar (Edit, Duplicate, Delete) */}
        {isPengurus && (
          <div className="flex items-center gap-2 pt-2 border-t border-sekkha-hairline-soft/80">
            {/* Edit Button — Disabled if active or closed */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && onEdit?.(event)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 px-2 text-xs font-bold transition-all shadow-2xs ${
                canEdit
                  ? "border-sekkha-hairline bg-white/90 text-sekkha-ink hover:bg-sekkha-surface active:scale-[0.98]"
                  : "border-slate-200 bg-slate-100/70 text-slate-400 cursor-not-allowed"
              }`}
              title={canEdit ? "Edit Event" : "Event yang sedang aktif atau selesai tidak dapat di-edit"}
            >
              <PencilIcon className={`size-3.5 ${canEdit ? "text-sekkha-brand-blue" : "text-slate-400"}`} />
              <span>Edit {isActive ? "(Terkunci)" : isClosed ? "(Selesai)" : ""}</span>
            </button>

            {/* Duplicate Button */}
            <button
              type="button"
              onClick={() => onDuplicate?.(event)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-sekkha-hairline bg-white/90 py-2 px-2 text-xs font-bold text-sekkha-ink hover:bg-sekkha-surface transition-all shadow-2xs active:scale-[0.98]"
              title="Duplikasi Event"
            >
              <CopyIcon className="size-3.5 text-amber-600" />
              <span>Duplikasi</span>
            </button>

            {/* Delete Button — ALWAYS AVAILABLE even if closed */}
            <button
              type="button"
              onClick={() => onDelete?.(event)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/90 py-2 px-2 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all shadow-2xs active:scale-[0.98]"
              title="Hapus Event"
            >
              <Trash2Icon className="size-3.5 text-rose-600" />
              <span>Hapus</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 2. Highly Informative Responsive Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="flex items-start gap-3 rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/90 p-3.5 shadow-2xs">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <CalendarIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-micro font-bold uppercase tracking-wider text-sekkha-slate">Waktu Pelaksanaan</p>
            <p className="text-caption-bold text-sekkha-ink mt-0.5">{dayName}, {dateStr}</p>
            <p className="flex items-center gap-1 text-micro font-semibold text-sekkha-brand-blue mt-0.5">
              <ClockIcon className="size-3" />
              <span>{timeStr}</span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/90 p-3.5 shadow-2xs">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
            <MapPinIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-micro font-bold uppercase tracking-wider text-sekkha-slate">Lokasi Tempat</p>
            <p className="text-caption-bold text-sekkha-ink mt-0.5 truncate">{event.location}</p>
            <p className="text-micro font-medium text-sekkha-slate mt-0.5">Vihara Sekkha</p>
          </div>
        </div>

        {/* Card 3: Total Yang Datang */}
        <div className="flex items-start gap-3 rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/90 p-3.5 shadow-2xs sm:col-span-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <UsersIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-micro font-bold uppercase tracking-wider text-sekkha-slate">Total Yang Datang</p>
            <p className="text-caption-bold text-sekkha-ink mt-0.5">
              {attendances.length} Orang
            </p>
            <p className="text-micro font-medium text-emerald-600 mt-0.5">Tercatat Presensi</p>
          </div>
        </div>
      </div>

      {/* ── 3. Event Description ── */}
      {event.description && (
        <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/90 p-4 shadow-2xs space-y-1.5">
          <h4 className="text-caption-bold text-sekkha-ink flex items-center gap-1.5">
            <SparklesIcon className="size-3.5 text-sekkha-brand-blue" />
            <span>Keterangan Event</span>
          </h4>
          <p className="text-caption text-sekkha-slate leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* ── 4. Petunjuk & Imbauan Peserta ── */}
      <div className="rounded-2xl border border-sekkha-hairline bg-gradient-to-br from-blue-50/40 via-white to-sekkha-canvas p-4 shadow-2xs space-y-3">
        <div>
          <h4 className="text-caption-bold text-sekkha-ink flex items-center gap-1.5 mb-2">
            <GiftIcon className="size-3.5 text-sekkha-brand-blue" />
            <span>Petunjuk & Imbauan Peserta</span>
          </h4>
          <ul className="space-y-2 text-caption text-sekkha-slate">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sekkha-brand-blue mt-1.5 shrink-0" />
              <span>Berpakaian sopan dan rapi (diutamakan nuansa putih/bebas rapi).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sekkha-brand-blue mt-1.5 shrink-0" />
              <span>Tunjukkan Kartu QR Anggota Digital / Cetak Fisik kepada Pengurus untuk presensi.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sekkha-brand-blue mt-1.5 shrink-0" />
              <span>Presensi tepat waktu untuk klaim <strong>+50 Poin Sekkha</strong>.</span>
            </li>
          </ul>
        </div>

        <div className="pt-2 border-t border-sekkha-hairline-soft/80">
          <p className="text-micro font-medium text-sekkha-slate">
            ℹ️ Butuh bantuan? Hubungi sekretariat atau pengurus Vihara Sekkha.
          </p>
        </div>
      </div>

      {/* ── 5. Presensi & Kehadiran Peserta ── */}
      <div className="space-y-3 rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/90 p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-caption-bold text-sekkha-ink flex items-center gap-1.5">
            <ClipboardListIcon className="size-4 text-sekkha-brand-blue" />
            <span>Presensi & Kehadiran Peserta</span>
          </h4>
        </div>

        {/* Condition Check for Adding Attendance */}
        {isPengurus && (
          <div>
            {!isActive && !isClosed && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-caption text-amber-900 flex items-center gap-2 shadow-2xs">
                <AlertTriangleIcon className="size-4 text-amber-600 shrink-0" />
                <span>Tekan tombol <strong>"Aktifkan Kegiatan Ini"</strong> di atas terlebih dahulu untuk mulai membuka presensi Umat.</span>
              </div>
            )}

            {isClosed && (
              <div className="rounded-xl border border-slate-200 bg-slate-100/90 p-3 text-caption text-slate-700 flex items-center gap-2 shadow-2xs">
                <LockIcon className="size-4 text-slate-500 shrink-0" />
                <span>Presensi kegiatan ini telah ditutup (Read-Only).</span>
              </div>
            )}

            {isActive && !showScan && (
              <button
                type="button"
                onClick={() => setShowScan(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue py-2.5 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-[0.99]"
              >
                <UsersIcon className="size-4" /> 📷 Scan QR Kartu Umat / Input Presensi
              </button>
            )}
          </div>
        )}

        {/* Modal Scanner */}
        {showScan && isActive && (
          <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-canvas p-3.5 shadow-xs">
            <AttendanceScanModal
              eventId={event.id}
              role={role}
              eventCode={event.qr_code?.code ?? "SKH-EVENT"}
              onRecord={handleRecord}
              onClose={() => setShowScan(false)}
            />
          </div>
        )}

        {/* Attendance Table */}
        <AttendanceListSheet
          records={attendances}
          role={role}
          isClosed={isClosed}
          onDeleteRecord={onDeleteAttendance}
        />
      </div>

      {/* ── Warning Modal Alert (When Activating Before Event Date) ── */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-sekkha-hairline bg-white p-5 shadow-2xl space-y-4 text-left font-sans animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shrink-0">
                <AlertTriangleIcon className="size-5" />
              </div>
              <div>
                <h3 className="text-caption-bold text-sekkha-ink">Peringatan Waktu Pelaksanaan</h3>
                <p className="text-micro text-sekkha-slate">Event Belum Memasuki Jadwal</p>
              </div>
            </div>

            <p className="text-caption text-sekkha-slate leading-relaxed">
              Jadwal pelaksanaan kegiatan ini adalah <strong>{dayName}, {dateStr} ({timeStr})</strong>. Waktu saat ini belum memasuki jadwal tersebut.
              <br /><br />
              Apakah Anda yakin ingin tetap <strong>Mengaktifkan Presensi Kegiatan</strong> sekarang?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-sekkha-hairline-soft">
              <button
                type="button"
                onClick={() => setWarningModalOpen(false)}
                className="rounded-xl border border-sekkha-hairline bg-white px-4 py-2 text-caption-bold text-sekkha-slate hover:bg-sekkha-surface transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => executeStatusChange("active")}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-caption-bold text-white hover:bg-emerald-700 transition-all shadow-2xs"
              >
                Ya, Tetap Aktifkan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
