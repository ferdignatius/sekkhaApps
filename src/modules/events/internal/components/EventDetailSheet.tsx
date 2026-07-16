// feature/events/components/EventDetailSheet
// Gamification-focused event detail with:
//  1. Colorful RSVP buttons (green hadir, grey tidak hadir) with icons
//  2. Capsule tab buttons with colored icons
//  3. Reward preview motivator
//  4. Role-separated view (no edit button for anggota)
//  5. Colorful info cards with large icons

import { useState } from "react"
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  XIcon,
  QrCodeIcon,
  ClipboardListIcon,
  ThumbsUpIcon,
  XCircleIcon,
  GiftIcon,
  SparklesIcon,
} from "lucide-react"
import { EventQrDisplay } from "./EventQrDisplay"
import { AttendanceScanModal } from "./AttendanceScanModal"
import { AttendanceListSheet } from "./AttendanceListSheet"
import type { EventListItem, RsvpStatus, UserRole, AttendanceRecord } from "../types"

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

  const qrCode = event.qr_code ?? null

  function handleRegenerate() {
    onRegenerateQr?.(event.id)
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
      setTab("attendance")
    }, 1500)
  }

  // ── Tab config with colored icons (fix #2) ─────────────────────────────────
  const TABS: { id: Tab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: "detail", label: "Detail", icon: <SparklesIcon className="size-4" />, color: "text-sekkha-brand-yellow-deep" },
    { id: "attendance", label: "Kehadiran", icon: <ClipboardListIcon className="size-4" />, color: "text-sekkha-brand-blue" },
    ...(isPengurus && qrCode ? [{ id: "qr" as Tab, label: "QR Code", icon: <QrCodeIcon className="size-4" />, color: "text-purple-500" }] : []),
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
      className="flex flex-col gap-0"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-4">
        <div>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-caption-bold ${
            isSpecial ? "bg-yellow-50 text-yellow-700" : "bg-sekkha-teal-light text-sekkha-brand-blue"
          }`}>
            {isSpecial ? "🌟 Event Spesial" : "📅 Rutin"}
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

      {/* Tab bar — capsule buttons with colored icons (fix #2) */}
      <div className="mb-5 flex gap-2">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-body-sm-medium transition-all ${
              tab === t.id
                ? "bg-sekkha-primary text-white shadow-md"
                : "border border-sekkha-hairline-strong bg-sekkha-canvas text-sekkha-slate hover:bg-sekkha-surface"
            }`}
          >
            <span className={tab === t.id ? "text-white" : t.color}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Detail tab ──────────────────────────────────────────────────────── */}
      {tab === "detail" && (
        <div className="flex flex-col gap-4">

          {/* Info cards — proportional grid (fix #1) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-sekkha-teal-light px-3 py-4 text-center">
              <CalendarIcon className="size-5 text-sekkha-brand-blue" aria-hidden="true" />
              <p className="text-micro text-sekkha-slate">Tanggal</p>
              <p className="text-caption-bold text-sekkha-ink">{formatFullDate(event.event_date)}</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-sekkha-rose-light px-3 py-4 text-center">
              <MapPinIcon className="size-5 text-pink-500" aria-hidden="true" />
              <p className="text-micro text-sekkha-slate">Lokasi</p>
              <p className="text-caption-bold text-sekkha-ink">{event.location}</p>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-xl bg-sekkha-surface-yellow px-3 py-4 text-center">
              <UsersIcon className="size-5 text-amber-500" aria-hidden="true" />
              <p className="text-micro text-sekkha-slate">RSVP</p>
              <p className="text-caption-bold text-sekkha-ink">{event.rsvp_count} hadir</p>
            </div>
          </div>

          {event.description && (
            <p className="text-body-sm text-sekkha-slate">{event.description}</p>
          )}

          <div className="h-px bg-sekkha-hairline-soft" />

          {/* RSVP — colorful buttons (fix #1, #3 — Tidak Hadir merah, fix #4) */}
          <div>
            <p className="mb-3 text-body-sm-medium text-sekkha-ink">Konfirmasi kehadiran</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => onRsvp(event.id, "hadir")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-body-sm-medium font-semibold transition-all ${
                  event.my_rsvp === "hadir"
                    ? "bg-green-500 text-white shadow-md"
                    : "border-2 border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                }`}
              >
                <ThumbsUpIcon className="size-4" />
                Hadir 🔥
              </button>
              <button
                type="button"
                onClick={() => onRsvp(event.id, "tidak_hadir")}
                className={`flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 text-body-sm-medium font-semibold transition-all ${
                  event.my_rsvp === "tidak_hadir"
                    ? "bg-red-500 text-white shadow-md"
                    : "border-2 border-red-200 bg-red-50 text-red-500 hover:bg-red-100"
                }`}
              >
                <XCircleIcon className="size-4" />
                Tidak Hadir
              </button>
            </div>

            {/* Reward preview — below RSVP buttons (fix #4 position) */}
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-sekkha-surface-yellow px-3 py-2">
              <GiftIcon className="size-4 shrink-0 text-sekkha-brand-yellow-deep" aria-hidden="true" />
              <p className="text-caption text-sekkha-charcoal">
                🎁 Datang = <span className="font-semibold text-sekkha-brand-blue">+50 Poin</span> & <span className="font-semibold text-orange-500">+1 Streak!</span>
              </p>
            </div>
          </div>

          {/* Pengurus-only: Edit button (fix #4 — hidden for anggota) */}
          {isPengurus && onEdit && (
            <>
              <div className="h-px bg-sekkha-hairline-soft" />
              <button
                type="button"
                onClick={() => onEdit(event)}
                className="w-full rounded-full border border-sekkha-hairline-strong py-2.5 text-body-sm-medium text-sekkha-ink hover:bg-sekkha-surface"
              >
                ✏️ Edit Event
              </button>
            </>
          )}
        </div>
      )}

      {/* ── Attendance tab ──────────────────────────────────────────────────── */}
      {tab === "attendance" && (
        <div className="flex flex-col gap-4">
          {qrCode && !showScan && (
            <button
              type="button"
              onClick={() => setShowScan(true)}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-sekkha-primary py-3 text-body-sm-medium text-white shadow-sm"
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
