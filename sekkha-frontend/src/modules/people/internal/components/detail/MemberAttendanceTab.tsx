import {
  CalendarCheckIcon,
  ClockIcon,
  QrCodeIcon,
  SparklesIcon,
} from "lucide-react"
import { Badge, Card } from "@/components/base"
import type { MemberDetailDto } from "../../api/peopleApi"
import { formatAttendanceMethodLabel } from "../../utils/memberFormatters"

export interface MemberAttendanceTabProps {
  attendances: MemberDetailDto["attendances"]
  totalAttendances?: number
}

const MAX_RECENT_ATTENDANCES = 5

/**
 * Lightweight attendance timeline tab displaying only the latest 5 events
 * while preserving lifetime attendance totals from user stats.
 */
export function MemberAttendanceTab({
  attendances,
  totalAttendances,
}: MemberAttendanceTabProps) {
  const recentAttendances = (attendances || []).slice(0, MAX_RECENT_ATTENDANCES)
  const lifetimeCount = totalAttendances ?? (attendances || []).length

  return (
    <Card
      variant="outlined"
      className="overflow-hidden rounded-[24px] border-hairline bg-canvas shadow-xs"
    >
      <div className="flex items-center justify-between gap-3 border-b border-hairline bg-surface-soft px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 text-sm font-bold text-ink">
            <CalendarCheckIcon
              className="size-4 shrink-0 text-clay-teal"
              aria-hidden="true"
            />
            <span className="truncate">Recent Attendance</span>
          </h3>
          <p className="mt-0.5 pl-6 text-[11px] font-medium text-text-muted">
            Last 5 Events
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-hairline bg-canvas px-2.5 py-0.5 text-[11px] font-semibold text-text-muted">
          {lifetimeCount > recentAttendances.length
            ? `Showing latest ${recentAttendances.length} of ${lifetimeCount}`
            : `${recentAttendances.length} ${recentAttendances.length === 1 ? "Event" : "Events"}`}
        </span>
      </div>

      {recentAttendances.length > 0 ? (
        <ul role="list" className="divide-y divide-hairline-soft">
          {recentAttendances.map((att) => {
            const displayDate = new Date(att.scanned_at || att.event_date)
            const monthShort = displayDate.toLocaleDateString("en-US", {
              month: "short",
            })
            const dayNum = displayDate.toLocaleDateString("en-US", {
              day: "2-digit",
            })
            const timeStr = displayDate.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })
            const fullDateStr = displayDate.toLocaleDateString("en-US", {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })

            return (
              <li
                key={att.id}
                className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-surface-soft/70 sm:px-5 sm:py-4"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  {/* Calendar Tile */}
                  <div
                    className="flex size-11 shrink-0 flex-col items-center justify-center rounded-xl border border-hairline bg-surface-soft text-center"
                    aria-hidden="true"
                  >
                    <span className="text-[9px] font-bold tracking-wider text-text-muted uppercase">
                      {monthShort}
                    </span>
                    <span className="text-sm leading-tight font-extrabold text-ink">
                      {dayNum}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-bold text-ink">
                      {att.event_title}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-text-muted">
                      <ClockIcon
                        className="size-3 shrink-0"
                        aria-hidden="true"
                      />
                      <span className="truncate">
                        {fullDateStr} · {timeStr}
                      </span>
                    </p>
                    <div className="pt-0.5">
                      <Badge
                        variant="secondary"
                        size="sm"
                        icon={
                          <QrCodeIcon className="size-3" aria-hidden="true" />
                        }
                      >
                        {formatAttendanceMethodLabel(att.method)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">
                  <Badge
                    variant="ochre"
                    size="sm"
                    icon={
                      <SparklesIcon className="size-3" aria-hidden="true" />
                    }
                    className="font-bold"
                  >
                    +{att.points_earned} Pts
                  </Badge>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="space-y-2 px-6 py-10 text-center">
          <div className="mx-auto flex size-11 items-center justify-center rounded-xl border border-hairline bg-surface-soft text-text-muted">
            <ClockIcon className="size-5" aria-hidden="true" />
          </div>
          <h4 className="text-sm font-bold text-ink">
            No recorded attendance yet
          </h4>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-text-muted">
            Check-ins and karma rewards will appear in this timeline once this
            member participates in an event.
          </p>
        </div>
      )}
    </Card>
  )
}
