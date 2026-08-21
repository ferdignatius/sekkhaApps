// feature/dashboard/components/NextEventCard
// Shows the next upcoming event with direct RSVP buttons (Hadir / Tidak Hadir).

import { CalendarIcon, MapPinIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UpcomingEvent {
  id: string
  title: string
  location: string
  event_date: string // ISO 8601
  event_type: "rutin" | "special"
}

interface NextEventCardProps {
  event: UpcomingEvent | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEventDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatEventTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NextEventCard({ event }: NextEventCardProps) {

  return (
    <section
      aria-labelledby="next-event-heading"
      className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <CalendarIcon className="size-4 text-sekkha-brand-blue" aria-hidden="true" />
        <h2
          id="next-event-heading"
          className="text-body-sm-medium text-sekkha-ink"
        >
          Kegiatan Mendatang
        </h2>
      </div>

      {/* Content */}
      {!event ? (
        <p className="text-caption text-sekkha-muted">
          Tidak ada kegiatan yang dijadwalkan.
        </p>
      ) : (
        <div className="rounded-lg bg-sekkha-surface p-4">
          {/* Event type badge + title */}
          <div className="flex items-start gap-2">
            <span
              className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-micro ${
                event.event_type === "rutin"
                  ? "bg-sekkha-teal-light text-sekkha-moss-dark"
                  : "bg-sekkha-brand-yellow/20 text-sekkha-yellow-dark"
              }`}
            >
              {event.event_type === "rutin" ? "Rutin" : "Special"}
            </span>
            <p className="text-body-sm-medium text-sekkha-ink">{event.title}</p>
          </div>

          {/* Date & time */}
          <div className="mt-3 flex items-center gap-1.5">
            <CalendarIcon className="size-3.5 text-sekkha-muted" aria-hidden="true" />
            <span className="text-caption text-sekkha-slate">
              {formatEventDate(event.event_date)} · {formatEventTime(event.event_date)}
            </span>
          </div>

          {/* Location */}
          <div className="mt-1.5 flex items-center gap-1.5">
            <MapPinIcon className="size-3.5 text-sekkha-muted" aria-hidden="true" />
            <span className="text-caption text-sekkha-slate">{event.location}</span>
          </div>

          {/* Action button */}
          <div className="mt-4">
            <Link
              to="/events"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue py-2.5 px-4 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-[0.99]"
            >
              <span>Lihat Detail Event</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
