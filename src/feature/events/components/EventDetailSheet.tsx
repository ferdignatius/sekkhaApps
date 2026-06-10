// feature/events/components/EventDetailSheet
// Full event detail sheet with:
//  - Metadata (date, location, RSVP count)
//  - RSVP buttons (all roles)
//  - QR code display (pengurus/admin)
//  - Attendance scan entry (all roles — umat enters code, pengurus inputs manual)
//  - Attendance list (all roles)
//  - Edit button (pengurus/admin)

import { useState } from "react"
import { CalendarIcon, MapPinIcon, UsersIcon, XIcon, QrCodeIcon, ClipboardListIcon } from "lucide-react"
import { EventQrDisplay } from "./EventQrDisplay"
import { AttendanceScanModal } from "./AttendanceScanModal"
import { AttendanceListSheet } from "./AttendanceListSheet"
import type { EventListItem, RsvpStatus, UserRole, AttendanceRecord, QrCode } from "../types"

interface EventDetailSheetProps {
  event: EventListItem
  role: UserRole | null
  onClose: () => void
  onRsvp: (eventId: string, status: RsvpStatus) => void
  onEdit?: (event: EventListItem) => void
  attendances?: AttendanceRecord[]
  onRecordAttendance?: (eventId: string, record: AttendanceRecord) => void
  onRegenerateQr?: (eventId: string) => void
}

type Tab = "detail" | "qr" | "attendance"

function formatFullDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }) + ", " + d.toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  }) + " WIB"
}

export function EventDetailSheet({
  event,
  role,
  onClose,
  onRsvp,
  onEdit,
  attendances = [],
  onRecordAttendance,
  onRegenerateQr,
}: EventDetailSheetProps) {
  const isPengurus = role === "pengurus" || role === "admin"
  const isSpecial = event.event_type === "special"
  const [tab, setTab] = useState<Tab>("detail")
  const [showScan, setShowScan] = useState(false)

  // ── QR ─────────────────────────────────────────────────────────────────────
  const qrCode = event.qr_code ?? null

  function handleRegenerate() {
    onRegenerateQr?.(event.id)
  }

  // ── Attendance record ───────────────────────────────────────────────────────
  function handleRecord(result: { name: string; method: "qr" | "manual"; scanned_at: string }) {
    if (!onRecordAttendance) return
    onRecordAttendance(event.id, {
      user_id: `user-${Date.now()}`,
      name: result.name,
      method: result.method,
      scanned_at: result.scanned_at,
    })
    // Auto-switch to attendance tab after recording
    setTimeout(() => {
      setShowScan(false)
      setTab("attendance")
    }, 1500)
  }

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "detail",     label: "Detail",     icon: <CalendarIcon className="size-3.5" /> },
    { id: "attendance", label: "Kehadiran",  icon: <ClipboardListIcon className="size-3.5" /> },
    ...(isPengurus && qrCode ? [{ id: "qr" as Tab, label: "QR Code", icon: <QrCodeIcon className="size-3.5" /> }] : []),
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
      className="flex flex-col gap-0"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3">
        <div>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-caption-bold ${
            isSpecial ? "bg-yellow-50 text-yellow-700" : "bg-sekkha-teal-light text-sekkha-brand-blue"
          }`}>
            {isSpecial ? "Event Spesial" : "Rutin"}
          </span>
          <h2 id="event-detail-title" className="mt-2 text-heading-5 text-sekkha-ink">
            {event.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="mt-0.5 rounded-full p-1.5 text-sekkha-muted hover:bg-sekkha-surface hover:text-sekkha-ink"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      {/* Tab bar */}
      <div className="mb-4 flex gap-1 rounded-full bg-sekkha-surface p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-1.5 text-caption-bold transition-colors ${
              tab === t.id
                ? "bg-sekkha-canvas text-sekkha-ink shadow-sm"
                : "text-sekkha-muted"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Detail tab ──────────────────────────────────────────────────────── */}
      {tab === "detail" && (
        <div className="flex flex-col gap-4">
          {/* Meta */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 shrink-0 text-sekkha-muted" aria-hidden="true" />
              <span className="text-body-sm text-sekkha-slate">{formatFullDate(event.event_date)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPinIcon className="size-4 shrink-0 text-sekkha-muted" aria-hidden="true" />
              <span className="text-body-sm text-sekkha-slate">{event.location}</span>
            </div>
            <div className="flex items-center gap-2">
              <UsersIcon className="size-4 shrink-0 text-sekkha-muted" aria-hidden="true" />
              <span className="text-body-sm text-sekkha-slate">{event.rsvp_count} orang RSVP hadir</span>
            </div>
          </div>

          {event.description && (
            <p className="text-body-sm text-sekkha-slate">{event.description}</p>
          )}

          <div className="h-px bg-sekkha-hairline-soft" />

          {/* RSVP */}
          <div>
            <p className="mb-3 text-body-sm-medium text-sekkha-ink">Konfirmasi kehadiran</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onRsvp(event.id, "hadir")}
                className={`flex-1 rounded-full py-2.5 text-body-sm-medium transition-colors ${
                  event.my_rsvp === "hadir"
                    ? "bg-sekkha-brand-blue text-white"
                    : "border border-sekkha-hairline-strong bg-sekkha-canvas text-sekkha-ink"
                }`}
              >
                ✓ Hadir
              </button>
              <button
                type="button"
                onClick={() => onRsvp(event.id, "tidak_hadir")}
                className={`flex-1 rounded-full py-2.5 text-body-sm-medium transition-colors ${
                  event.my_rsvp === "tidak_hadir"
                    ? "bg-sekkha-ink text-white"
                    : "border border-sekkha-hairline-strong bg-sekkha-canvas text-sekkha-ink"
                }`}
              >
                ✗ Tidak Hadir
              </button>
            </div>
          </div>

          {/* Pengurus edit */}
          {isPengurus && onEdit && (
            <>
              <div className="h-px bg-sekkha-hairline-soft" />
              <button
                type="button"
                onClick={() => onEdit(event)}
                className="w-full rounded-full border border-sekkha-hairline-strong py-2.5 text-body-sm-medium text-sekkha-ink"
              >
                Edit Event
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Attendance tab ──────────────────────────────────────────────────── */}
      {tab === "attendance" && (
        <div className="flex flex-col gap-4">
          {/* Scan / manual entry CTA */}
          {qrCode && !showScan && (
            <button
              type="button"
              onClick={() => setShowScan(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-sekkha-primary py-2.5 text-body-sm-medium text-white"
            >
              {isPengurus ? (
                <><UsersIcon className="size-4" /> Input Manual / Scan</>
              ) : (
                <><QrCodeIcon className="size-4" /> Scan QR (masukkan kode)</>
              )}
            </button>
          )}

          {showScan && qrCode && (
            <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface p-4">
              <AttendanceScanModal
                role={role}
                eventCode={qrCode.code}
                onRecord={handleRecord}
                onClose={() => setShowScan(false)}
              />
            </div>
          )}

          <AttendanceListSheet
            records={attendances}
            role={role}
            totalRsvp={event.rsvp_count}
          />
        </div>
      )}

      {/* ── QR tab (pengurus only) ──────────────────────────────────────────── */}
      {tab === "qr" && qrCode && (
        <EventQrDisplay
          eventTitle={event.title}
          qrCode={qrCode}
          onRegenerate={handleRegenerate}
        />
      )}
    </div>
  )
}
