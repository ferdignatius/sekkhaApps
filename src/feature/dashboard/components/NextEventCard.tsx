// feature/dashboard/components/NextEventCard
// Shows the next upcoming event on the dashboard.

import { CalendarIcon, MapPinIcon } from "lucide-react"

interface EventItem {
  id: string
  title: string
  date: string
  location: string
  description?: string
}

interface NextEventCardProps {
  event: EventItem | null
}

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
          Event Berikutnya
        </h2>
      </div>

      {/* Content */}
      {!event ? (
        <p className="text-caption text-sekkha-muted">
          Tidak ada event yang dijadwalkan.
        </p>
      ) : (
        <div className="rounded-lg bg-sekkha-surface p-4">
          {/* Event title */}
          <p className="text-body-sm-medium text-sekkha-ink">{event.title}</p>

          {/* Date */}
          <div className="mt-2 flex items-center gap-1.5">
            <CalendarIcon className="size-3.5 text-sekkha-muted" aria-hidden="true" />
            <span className="text-caption text-sekkha-slate">{event.date}</span>
          </div>

          {/* Location */}
          <div className="mt-1 flex items-center gap-1.5">
            <MapPinIcon className="size-3.5 text-sekkha-muted" aria-hidden="true" />
            <span className="text-caption text-sekkha-slate">{event.location}</span>
          </div>

          {/* Description */}
          {event.description && (
            <p className="mt-3 text-caption text-sekkha-slate">
              {event.description}
            </p>
          )}
        </div>
      )}
    </section>
  )
}
