// feature/events/components/EventCard
// Event card in the list adhering strictly to Clay Design System tokens.

import { CalendarIcon, MapPinIcon, ChevronRightIcon, LockIcon } from "lucide-react"
import { Badge } from "@/components/base/Badge"
import type { EventListItem } from "../types"
import { getCategoryColor } from "../masterdata"

interface EventCardProps {
  event: EventListItem
  onClick: () => void
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  }
}

function isTodayEvent(iso: string): boolean {
  if (!iso) return false
  const evDate = new Date(iso)
  const today = new Date()
  return (
    evDate.getFullYear() === today.getFullYear() &&
    evDate.getMonth() === today.getMonth() &&
    evDate.getDate() === today.getDate()
  )
}

export function EventCard({ event, onClick }: EventCardProps) {
  const { day, time } = formatDate(event.event_date)
  const tag = event.tag ?? event.event_type ?? "rutin"
  const colorInfo = getCategoryColor(tag)
  const isLive = isTodayEvent(event.event_date)
  const status = event.status ?? "published"

  return (
    <div className="py-2 first:pt-0 last:pb-0 border-b border-[#f0f0f0] last:border-b-0 text-left font-sans">
      <button
        type="button"
        onClick={onClick}
        className="group relative w-full overflow-hidden rounded-[16px] bg-[#fffaf0] hover:bg-[#faf5e8] p-3.5 sm:p-4 text-left transition-all hover:shadow-xs active:scale-[0.99] border border-[#e5e5e5] cursor-pointer"
      >
        <div className="flex items-center gap-3.5">
          {/* Dynamic Color Accent Bar */}
          <div
            className="h-11 w-1.5 shrink-0 rounded-full transition-all"
            style={colorInfo.dotStyle}
            aria-hidden="true"
          />

          {/* Content — left */}
          <div className="min-w-0 flex-1">
            {/* Type tag & Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize border shadow-2xs"
                style={colorInfo.bgStyle}
              >
                {colorInfo.name}
              </span>

              {/* Status: Active */}
              {status === "active" && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mr-0.5" />
                  Active Check-In
                </span>
              )}

              {/* Status: Closed */}
              {(status === "closed" || status === "done") && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-0.5 text-xs font-semibold text-[#6a6a6a]">
                  <LockIcon className="size-3 text-[#6a6a6a] mr-0.5" />
                  Completed
                </span>
              )}

              {/* Status: Cancelled */}
              {status === "cancelled" && (
                <Badge variant="destructive">
                  Cancelled
                </Badge>
              )}

              {/* Status: Draft */}
              {status === "draft" && (
                <span className="inline-flex items-center rounded-full bg-[#f5f0e0] border border-[#e5e5e5] px-2.5 py-0.5 text-xs font-semibold text-[#0a0a0a]">
                  Draft
                </span>
              )}

              {/* Status: Published / Upcoming */}
              {status === "published" && !isLive && (
                <span className="inline-flex items-center rounded-full bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-0.5 text-xs font-semibold text-[#0a0a0a]">
                  Scheduled
                </span>
              )}

              {/* Live today indicator */}
              {status === "published" && isLive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#e8b94a]/20 border border-[#e8b94a]/40 px-2.5 py-0.5 text-xs font-bold text-[#0a0a0a]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#e8b94a] mr-0.5" />
                  Today
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="mt-1 text-sm sm:text-base font-bold text-[#0a0a0a] group-hover:text-[#1a3a3a] transition-colors truncate">
              {event.title}
            </h3>

            {/* Meta row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6a6a6a]">
              <div className="flex items-center gap-1.5 font-medium">
                <CalendarIcon className="size-3.5 shrink-0 text-[#1a3a3a]" aria-hidden="true" />
                <span>{day} · {time}</span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <MapPinIcon className="size-3.5 shrink-0 text-[#6a6a6a]" aria-hidden="true" />
                <span className="truncate">{event.location}</span>
              </div>
            </div>
          </div>

          {/* Action — right */}
          <div className="flex shrink-0 items-center gap-1.5 rounded-[10px] bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-1.5 transition-all group-hover:bg-[#0a0a0a] group-hover:text-white group-hover:border-[#0a0a0a]">
            <span className="hidden text-xs font-bold sm:inline group-hover:text-white">
              Details
            </span>
            <ChevronRightIcon
              className="size-4 text-[#6a6a6a] transition-transform group-hover:translate-x-0.5 group-hover:text-white"
              aria-hidden="true"
            />
          </div>
        </div>
      </button>
    </div>
  )
}
