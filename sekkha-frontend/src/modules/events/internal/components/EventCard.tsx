// feature/events/components/EventCard
// Event card in the list adhering strictly to Clay Design System tokens.

import { CalendarIcon, MapPinIcon, ChevronRightIcon } from "lucide-react"
import { Badge } from "@/components/base/Badge"
import type { EventListItem } from "../types"
import { getCategoryColor } from "../masterdata"

interface EventCardProps {
  event: EventListItem
  onClick?: () => void
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

function toWibDateKey(date: Date): string {
  if (isNaN(date.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function isTodayEvent(iso: string): boolean {
  if (!iso) return false
  const evKey = toWibDateKey(new Date(iso))
  const todayKey = toWibDateKey(new Date())
  return Boolean(evKey && todayKey && evKey === todayKey)
}

export function EventCard({ event, onClick }: EventCardProps) {
  const { day, time } = formatDate(event.event_date)
  const colorInfo = getCategoryColor(event)
  const isLive = isTodayEvent(event.event_date)
  const status = event.status ?? "scheduled"
  const pointsReward =
    event.point_reward ??
    (typeof event.event_type === "object"
      ? event.event_type?.default_point_reward
      : undefined) ??
    50

  return (
    <div className="py-2 text-left font-sans first:pt-0 last:pb-0">
      <button
        type="button"
        onClick={onClick}
        className={`group relative w-full cursor-pointer overflow-hidden rounded-[20px] border bg-[#fffaf0]/90 p-3.5 text-left shadow-2xs ring-1 backdrop-blur-md transition-all hover:border-[#d9cfb8] hover:bg-[#faf5e8] hover:shadow-xs active:scale-[0.985] sm:p-4 ${
          status === "active"
            ? "border-emerald-300/90 ring-emerald-500/20"
            : status === "closed"
              ? "border-[#e6decb]/80 opacity-80 ring-black/[0.03]"
              : status === "cancel"
                ? "border-rose-200/70 opacity-70 ring-black/[0.03]"
                : "border-[#e6decb]/80 ring-black/[0.03]"
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-3.5">
          {/* Dynamic Color Accent Bar */}
          <div
            className="h-11 w-1.5 shrink-0 rounded-full shadow-2xs transition-all"
            style={colorInfo.dotStyle}
          />

          {/* Main Info */}
          <div className="min-w-0 flex-1">
            {/* Top row: Category + Points + Status Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant="outline"
                className="gap-1.5 font-medium"
                style={colorInfo.bgStyle}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={colorInfo.dotStyle}
                />
                {colorInfo.name}
              </Badge>

              {/* Karma Points Reward Badge */}
              <Badge
                variant="outline"
                glass
                className="border-black/[0.08] text-[10px] font-bold text-[#0a0a0a] sm:text-[11px]"
                title="Karma points rewarded for attendance"
              >
                +{pointsReward} Pts
              </Badge>

              {/* Status: Active / Live */}
              {status === "active" && (
                <Badge
                  variant="emerald"
                  glass
                  className="animate-pulse font-semibold"
                >
                  <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Live Attendance
                </Badge>
              )}

              {/* Status: Closed */}
              {status === "closed" && (
                <Badge variant="slate" glass>
                  Closed
                </Badge>
              )}

              {/* Status: Cancelled */}
              {status === "cancel" && (
                <Badge variant="destructive" glass>
                  Cancelled
                </Badge>
              )}

              {/* Status: Scheduled / Upcoming */}
              {status === "scheduled" && !isLive && (
                <Badge
                  variant="secondary"
                  glass
                  className="font-semibold text-[#0a0a0a]"
                >
                  Scheduled
                </Badge>
              )}

              {/* Live today indicator */}
              {status === "scheduled" && isLive && (
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

          {/* Action — right (Slim on mobile, full pill on desktop) */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#ded6c2] bg-[#faf5e8] text-xs font-semibold text-[#1a3a3a] shadow-2xs transition-all group-hover:border-[#0a0a0a] group-hover:bg-[#0a0a0a] group-hover:text-white sm:h-9 sm:w-auto sm:px-3">
            <span className="hidden font-bold group-hover:text-white sm:inline sm:mr-1">
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
