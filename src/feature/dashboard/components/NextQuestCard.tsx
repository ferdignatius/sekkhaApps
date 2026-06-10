// feature/dashboard/components/NextQuestCard
// Shows the next upcoming event as a "quest" the user can join.
// Data shape: GET /events (first published future event)

import { CalendarIcon, MapPinIcon, UsersIcon, StarIcon } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UpcomingEvent {
  id: string
  title: string
  location: string
  event_date: string  // ISO 8601
  event_type: "rutin" | "special"
  rsvp_count: number
  /** RSVP status if already submitted (from GET /events/:id my_rsvp) */
  my_rsvp?: "hadir" | "tidak_hadir" | null
}

interface NextQuestCardProps {
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
    timeZone: "Asia/Jakarta",
  }) + " WIB"
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NextQuestCard({ event }: NextQuestCardProps) {
  return (
    <section
      aria-labelledby="quest-heading"
      className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <StarIcon className="size-4 text-sekkha-brand-yellow" aria-hidden="true" />
        <h2
          id="quest-heading"
          className="text-body-sm-medium text-sekkha-ink"
        >
          Quest Berikutnya
        </h2>
      </div>

      {/* Content */}
      {!event ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CalendarIcon className="size-8 text-sekkha-muted" aria-hidden="true" />
          <p className="text-caption text-sekkha-muted">
            Tidak ada event yang dijadwalkan.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-sekkha-surface">
          {/* Color band by event type */}
          <div
            className={`h-1.5 w-full ${
              event.event_type === "special"
                ? "bg-sekkha-brand-yellow"
                : "bg-sekkha-brand-blue"
            }`}
            aria-hidden="true"
          />

          <div className="p-4">
            {/* Type tag */}
            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-caption-bold ${
                event.event_type === "special"
                  ? "bg-sekkha-surface-yellow text-yellow-700"
                  : "bg-sekkha-teal-light text-sekkha-brand-blue"
              }`}
            >
              {event.event_type === "special" ? "Event Spesial" : "Rutin"}
            </span>

            {/* Title */}
            <p className="mt-2 text-body-sm-medium text-sekkha-ink">
              {event.title}
            </p>

            {/* Meta */}
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="size-3.5 shrink-0 text-sekkha-muted" aria-hidden="true" />
                <span className="text-caption text-sekkha-slate">
                  {formatEventDate(event.event_date)}, {formatEventTime(event.event_date)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPinIcon className="size-3.5 shrink-0 text-sekkha-muted" aria-hidden="true" />
                <span className="text-caption text-sekkha-slate">{event.location}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <UsersIcon className="size-3.5 shrink-0 text-sekkha-muted" aria-hidden="true" />
                <span className="text-caption text-sekkha-slate">
                  {event.rsvp_count} orang akan hadir
                </span>
              </div>
            </div>

            {/* RSVP status / CTA */}
            <div className="mt-4">
              {event.my_rsvp === "hadir" ? (
                <div className="flex items-center gap-2 rounded-lg bg-sekkha-teal-light px-3 py-2">
                  <span className="text-caption-bold text-sekkha-brand-blue">
                    ✓ Kamu sudah RSVP hadir
                  </span>
                </div>
              ) : event.my_rsvp === "tidak_hadir" ? (
                <div className="flex items-center gap-2 rounded-lg bg-sekkha-surface px-3 py-2">
                  <span className="text-caption text-sekkha-slate">
                    Kamu tidak hadir di event ini
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-dashed border-sekkha-hairline-strong px-3 py-2">
                  <span className="text-caption text-sekkha-muted">
                    Belum RSVP — buka event untuk konfirmasi
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
