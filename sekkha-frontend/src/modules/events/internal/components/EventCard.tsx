// feature/events/components/EventCard
// Event card in the list adhering strictly to Clay Design System tokens.

import {
  CalendarIcon,
  MapPinIcon,
  ChevronRightIcon,
  LockIcon,
} from "lucide-react"
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
    day: d.toLocaleDateString("en-US", {
      weekday: "short",
      day: "numeric",
      month: "short",
    }),
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
    <div className="py-2 text-left font-sans first:pt-0 last:pb-0">
      <button
        type="button"
        onClick={onClick}
        className="group relative w-full cursor-pointer overflow-hidden rounded-[20px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-3.5 text-left shadow-2xs ring-1 ring-black/[0.03] backdrop-blur-md transition-all hover:border-[#d9cfb8] hover:bg-[#faf5e8] hover:shadow-xs active:scale-[0.985] sm:p-4"
      >
        <div className="flex items-center gap-3.5">
          {/* Dynamic Color Accent Bar */}
          <div
            className="h-11 w-1.5 shrink-0 rounded-full shadow-2xs transition-all"
            style={colorInfo.dotStyle}
            aria-hidden="true"
          />

          {/* Content — left */}
          <div className="min-w-0 flex-1">
            {/* Type tag & Status Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-full border border-black/[0.06] px-2.5 py-0.5 text-xs font-semibold capitalize shadow-2xs backdrop-blur-md"
                style={colorInfo.bgStyle}
              >
                {colorInfo.name}
              </span>

              {/* Status: Active */}
              {status === "active" && (
                <Badge
                  variant="emerald"
                  glass
                  className="animate-pulse font-semibold"
                >
                  <span className="mr-0.5 h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Active Check-In
                </Badge>
              )}

              {/* Status: Closed */}
              {(status === "closed" || status === "done") && (
                <Badge
                  variant="secondary"
                  glass
                  className="font-semibold text-[#6a6a6a]"
                >
                  <LockIcon className="mr-0.5 size-3 text-[#6a6a6a]" />
                  Completed
                </Badge>
              )}

              {/* Status: Cancelled */}
              {status === "cancelled" && (
                <Badge variant="destructive" glass>
                  Cancelled
                </Badge>
              )}

              {/* Status: Draft */}
              {status === "draft" && (
                <Badge variant="outline" glass>
                  Draft
                </Badge>
              )}

              {/* Status: Published / Upcoming */}
              {status === "published" && !isLive && (
                <Badge variant="secondary" glass>
                  Scheduled
                </Badge>
              )}

              {/* Live today indicator */}
              {status === "published" && isLive && (
                <Badge variant="ochre" glass className="font-bold">
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-[#e8b94a]" />
                  Today
                </Badge>
              )}
            </div>

            {/* Title */}
            <h3 className="mt-1 truncate text-sm font-bold text-[#0a0a0a] transition-colors group-hover:text-[#1a3a3a] sm:text-base">
              {event.title}
            </h3>

            {/* Meta row */}
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6a6a6a]">
              <div className="flex items-center gap-1.5 font-medium">
                <CalendarIcon
                  className="size-3.5 shrink-0 text-[#1a3a3a]"
                  aria-hidden="true"
                />
                <span>
                  {day} · {time}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <MapPinIcon
                  className="size-3.5 shrink-0 text-[#6a6a6a]"
                  aria-hidden="true"
                />
                <span className="truncate">{event.location}</span>
              </div>
            </div>
          </div>

          {/* Action — right */}
          <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#ded6c2] bg-[#faf5e8] px-3 py-1.5 text-xs font-semibold text-[#1a3a3a] shadow-2xs transition-all group-hover:border-[#0a0a0a] group-hover:bg-[#0a0a0a] group-hover:text-white sm:min-h-[36px]">
            <span className="hidden font-bold group-hover:text-white sm:inline">
              Details
            </span>
            <ChevronRightIcon
              className="size-3.5 text-[#6a6a6a] transition-transform group-hover:translate-x-0.5 group-hover:text-white"
              aria-hidden="true"
            />
          </div>
        </div>
      </button>
    </div>
  )
}
