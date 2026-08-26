// feature/events/components/EventCard
// Event card in the list — dynamic category colors from Master Data using Base components.

import { CalendarIcon, MapPinIcon, ChevronRightIcon, LockIcon } from "lucide-react"
import { Badge } from "@/components/base/Badge"
import type { EventListItem } from "../types"
import { getCategoryColor } from "../masterdata"

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

// ─── Component ───────────────────────────────────────────────────────────────

export function EventCard({ event, onClick }: EventCardProps) {
  const { day, time } = formatDate(event.event_date)
  const tag = event.tag ?? event.event_type ?? "rutin"
  const colorInfo = getCategoryColor(tag)
  const isLive = isTodayEvent(event.event_date)
  const status = event.status ?? "published"

  return (
    <div className="py-2.5 first:pt-0 last:pb-0 border-b border-sekkha-hairline-soft last:border-b-0 text-left font-sans">
      <button
        type="button"
        onClick={onClick}
        className="group relative w-full overflow-hidden rounded-2xl bg-sekkha-canvas hover:bg-white p-3.5 sm:p-4 text-left transition-all hover:shadow-xs active:scale-[0.99] border border-sekkha-hairline hover:border-sekkha-brand-blue/40 cursor-pointer"
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
                className="rounded-full px-2.5 py-0.5 text-micro font-bold capitalize border shadow-2xs"
                style={colorInfo.bgStyle}
              >
                {colorInfo.name}
              </span>

              {/* Status: Active */}
              {status === "active" && (
                <Badge variant="emerald" className="animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 mr-1" />
                  Presensi Aktif
                </Badge>
              )}

              {/* Status: Closed */}
              {(status === "closed" || status === "done") && (
                <Badge variant="slate">
                  <LockIcon className="size-3 text-slate-500 mr-1" />
                  Selesai
                </Badge>
              )}

              {/* Status: Cancelled */}
              {status === "cancelled" && (
                <Badge variant="coral">
                  Dibatalkan
                </Badge>
              )}

              {/* Status: Draft */}
              {status === "draft" && (
                <Badge variant="yellow">
                  Draft
                </Badge>
              )}

              {/* Status: Published / Upcoming */}
              {status === "published" && !isLive && (
                <Badge variant="blue">
                  Terjadwal
                </Badge>
              )}

              {/* Live today indicator */}
              {status === "published" && isLive && (
                <Badge variant="blue">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 mr-1" />
                  Hari Ini
                </Badge>
              )}
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
