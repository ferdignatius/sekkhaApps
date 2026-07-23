// feature/events/components/EventCard
// Event card in the list — glassmorphic style with rich visual indicators.

import { CalendarIcon, MapPinIcon, UsersIcon, ChevronRightIcon } from "lucide-react"
import type { EventListItem, EventTag } from "../types"
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

// ─── Component ───────────────────────────────────────────────────────────────

export function EventCard({ event, onClick }: EventCardProps) {
  const { day, time } = formatDate(event.event_date)
  const tag = (event.tag ?? event.event_type) as EventTag
  const tagColors = EVENT_TAG_COLORS[tag] ?? EVENT_TAG_COLORS.rutin

  return (
    <div className="py-2.5 first:pt-0 last:pb-0 border-b border-sekkha-hairline-soft last:border-b-0">
      <button
        type="button"
        onClick={onClick}
        className="group relative w-full overflow-hidden rounded-xl bg-sekkha-canvas hover:bg-white p-3.5 sm:p-4 text-left transition-all hover:shadow-xs active:scale-[0.99] border border-sekkha-hairline hover:border-sekkha-brand-blue/40"
      >
        <div className="flex items-center gap-3.5">
          {/* Pastel Color Accent Bar */}
          <div
            className={`h-11 w-1.5 shrink-0 rounded-full ${tagColors.dot}`}
            aria-hidden="true"
          />

          {/* Content — left */}
          <div className="min-w-0 flex-1">
            {/* Type tag */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-micro-bold capitalize ${tagColors.bg} ${tagColors.text}`}
              >
                {tag}
              </span>
            </div>

            {/* Title */}
            <h3 className="mt-1 text-body-base font-bold text-sekkha-ink group-hover:text-sekkha-brand-blue transition-colors truncate">
              {event.title}
            </h3>

            {/* Meta row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-caption text-sekkha-slate">
              <div className="flex items-center gap-1.5 font-medium">
                <CalendarIcon className="size-3.5 shrink-0 text-sekkha-brand-blue" aria-hidden="true" />
                <span>{day} · {time}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <MapPinIcon className="size-3.5 shrink-0 text-sekkha-brand-blue" aria-hidden="true" />
                <span className="truncate">{event.location}</span>
              </div>
              <div className="flex items-center gap-1.5 text-micro-bold text-sekkha-slate/80">
                <UsersIcon className="size-3.5 shrink-0 text-amber-500" aria-hidden="true" />
                <span>{event.rsvp_count} Peserta Hadir</span>
              </div>
            </div>
          </div>

          {/* Action — right */}
          <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-sekkha-surface/80 border border-sekkha-hairline-soft px-3 py-2 transition-all group-hover:bg-sekkha-brand-blue group-hover:text-white">
            <span className="hidden text-xs font-bold sm:inline group-hover:text-white">
              Detail
            </span>
            <ChevronRightIcon
              className="size-4 text-sekkha-slate transition-transform group-hover:translate-x-0.5 group-hover:text-white"
              aria-hidden="true"
            />
          </div>
        </div>
      </button>
    </div>
  )
}
