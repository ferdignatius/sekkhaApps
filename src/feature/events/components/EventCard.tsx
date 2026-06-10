// feature/events/components/EventCard
// Single event row in the list — shows type, title, date, location, rsvp badge.

import { CalendarIcon, MapPinIcon, UsersIcon } from "lucide-react"
import type { EventListItem, RsvpStatus, EventTag } from "../types"
import { EVENT_TAG_COLORS } from "../types"

interface EventCardProps {
  event: EventListItem
  onClick: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" }),
    time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }) + " WIB",
  }
}

function RsvpBadge({ status }: { status: RsvpStatus | null | undefined }) {
  if (!status) return null
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-caption-bold ${
        status === "hadir"
          ? "bg-sekkha-teal-light text-sekkha-brand-blue"
          : "bg-sekkha-surface text-sekkha-slate"
      }`}
    >
      {status === "hadir" ? "✓ Hadir" : "✗ Tidak Hadir"}
    </span>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EventCard({ event, onClick }: EventCardProps) {
  const { day, time } = formatDate(event.event_date)
  const tag = (event.tag ?? event.event_type) as EventTag
  const tagColors = EVENT_TAG_COLORS[tag] ?? EVENT_TAG_COLORS.rutin

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4 text-left transition-shadow hover:shadow-sm active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        {/* Color dot */}
        <div
          className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${tagColors.dot}`}
          aria-hidden="true"
        />

        <div className="min-w-0 flex-1">
          {/* Type tag + RSVP badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-caption-bold ${tagColors.bg} ${tagColors.text}`}
            >
              {tag}
            </span>
            <RsvpBadge status={event.my_rsvp} />
          </div>

          {/* Title */}
          <p className="mt-1.5 text-body-sm-medium text-sekkha-ink">{event.title}</p>

          {/* Meta */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 shrink-0 text-sekkha-muted" aria-hidden="true" />
              <span className="text-caption text-sekkha-slate">{day} · {time}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPinIcon className="size-3.5 shrink-0 text-sekkha-muted" aria-hidden="true" />
              <span className="truncate text-caption text-sekkha-slate">{event.location}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <UsersIcon className="size-3.5 shrink-0 text-sekkha-muted" aria-hidden="true" />
              <span className="text-caption text-sekkha-slate">{event.rsvp_count} RSVP</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
