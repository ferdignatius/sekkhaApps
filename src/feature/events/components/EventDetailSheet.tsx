// feature/events/components/EventDetailSheet
// Bottom-sheet / modal showing full event detail + RSVP controls for umat,
// and edit/delete affordances for pengurus+.

import { CalendarIcon, MapPinIcon, UsersIcon, XIcon } from "lucide-react"
import type { EventListItem, RsvpStatus, UserRole } from "../types"

interface EventDetailSheetProps {
  event: EventListItem
  role: UserRole | null
  onClose: () => void
  onRsvp: (eventId: string, status: RsvpStatus) => void
  onEdit?: (event: EventListItem) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFullDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  }) + ", " + d.toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta",
  }) + " WIB"
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EventDetailSheet({
  event,
  role,
  onClose,
  onRsvp,
  onEdit,
}: EventDetailSheetProps) {
  const isPengurus = role === "pengurus" || role === "admin"
  const isSpecial = event.event_type === "special"

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
      className="flex flex-col gap-4"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <span
            className={`inline-flex rounded-full px-2.5 py-0.5 text-caption-bold ${
              isSpecial
                ? "bg-sekkha-surface-yellow text-yellow-700"
                : "bg-sekkha-teal-light text-sekkha-brand-blue"
            }`}
          >
            {isSpecial ? "Event Spesial" : "Rutin"}
          </span>
          <h2
            id="event-detail-title"
            className="mt-2 text-heading-5 text-sekkha-ink"
          >
            {event.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="mt-0.5 rounded-full p-1.5 text-sekkha-muted transition-colors hover:bg-sekkha-surface hover:text-sekkha-ink"
        >
          <XIcon className="size-5" />
        </button>
      </div>

      {/* Meta */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-4 shrink-0 text-sekkha-muted" aria-hidden="true" />
          <span className="text-body-sm text-sekkha-slate">
            {formatFullDate(event.event_date)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <MapPinIcon className="size-4 shrink-0 text-sekkha-muted" aria-hidden="true" />
          <span className="text-body-sm text-sekkha-slate">{event.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <UsersIcon className="size-4 shrink-0 text-sekkha-muted" aria-hidden="true" />
          <span className="text-body-sm text-sekkha-slate">
            {event.rsvp_count} orang RSVP hadir
          </span>
        </div>
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-body-sm text-sekkha-slate">{event.description}</p>
      )}

      <div className="h-px bg-sekkha-hairline-soft" aria-hidden="true" />

      {/* RSVP section — visible to all */}
      <div>
        <p className="mb-3 text-body-sm-medium text-sekkha-ink">Konfirmasi kehadiran</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onRsvp(event.id, "hadir")}
            className={`flex-1 rounded-full py-2.5 text-body-sm-medium transition-colors ${
              event.my_rsvp === "hadir"
                ? "bg-sekkha-brand-blue text-white"
                : "border border-sekkha-hairline-strong bg-sekkha-canvas text-sekkha-ink hover:bg-sekkha-surface"
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
                : "border border-sekkha-hairline-strong bg-sekkha-canvas text-sekkha-ink hover:bg-sekkha-surface"
            }`}
          >
            ✗ Tidak Hadir
          </button>
        </div>
      </div>

      {/* Pengurus actions */}
      {isPengurus && onEdit && (
        <>
          <div className="h-px bg-sekkha-hairline-soft" aria-hidden="true" />
          <button
            type="button"
            onClick={() => onEdit(event)}
            className="w-full rounded-full border border-sekkha-hairline-strong py-2.5 text-body-sm-medium text-sekkha-ink transition-colors hover:bg-sekkha-surface"
          >
            Edit Event
          </button>
        </>
      )}
    </div>
  )
}
