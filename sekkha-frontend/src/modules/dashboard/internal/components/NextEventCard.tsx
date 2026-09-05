// feature/dashboard/components/NextEventCard
// Shows the next upcoming event with direct action link.

import { CalendarIcon, MapPinIcon } from "lucide-react"
import { Link } from "@tanstack/react-router"

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

function formatEventDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatEventTime(isoDate: string): string {
  return new Date(isoDate).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function NextEventCard({ event }: NextEventCardProps) {
  return (
    <section
      aria-labelledby="next-event-heading"
      className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs font-sans text-left"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <CalendarIcon className="size-4 text-[#1a3a3a]" aria-hidden="true" />
        <h2
          id="next-event-heading"
          className="text-sm font-bold text-[#0a0a0a]"
        >
          Upcoming Event
        </h2>
      </div>

      {/* Content */}
      {!event ? (
        <p className="text-xs font-medium text-[#6a6a6a] py-2">
          No upcoming events scheduled.
        </p>
      ) : (
        <div className="rounded-[16px] bg-[#faf5e8] border border-[#e5e5e5] p-4 space-y-3">
          {/* Event type badge + title */}
          <div className="flex items-start gap-2">
            <span
              className={`mt-0.5 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                event.event_type === "rutin"
                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                  : "bg-[#ffb084]/25 text-[#0a0a0a] border border-[#ffb084]/50"
              }`}
            >
              {event.event_type === "rutin" ? "Routine" : "Special"}
            </span>
            <p className="text-sm font-bold text-[#0a0a0a] leading-snug">{event.title}</p>
          </div>

          {/* Date & time */}
          <div className="flex items-center gap-1.5 text-xs text-[#6a6a6a]">
            <CalendarIcon className="size-3.5 text-[#6a6a6a]" aria-hidden="true" />
            <span>
              {formatEventDate(event.event_date)} · {formatEventTime(event.event_date)}
            </span>
          </div>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-[#6a6a6a]">
            <MapPinIcon className="size-3.5 text-[#6a6a6a]" aria-hidden="true" />
            <span>{event.location}</span>
          </div>

          {/* Action button */}
          <div className="pt-2 border-t border-[#e5e5e5]">
            <Link
              to="/events"
              className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all active:scale-[0.99]"
            >
              <span>View Event Details</span>
            </Link>
          </div>
        </div>
      )}
    </section>
  )
}
