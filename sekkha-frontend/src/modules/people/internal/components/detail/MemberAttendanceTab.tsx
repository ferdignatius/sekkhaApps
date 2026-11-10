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
  const recentAttendancePoints = recentAttendances.reduce(
    (sum, att) => sum + (att.points_earned || 0),
    0
  )

  return (
    <div className="space-y-4">
      {/* Mini Summary Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card
          variant="soft"
          className="rounded-lg border-hairline bg-surface-soft p-3.5"
        >
          <span className="block text-[10px] font-bold tracking-wider text-text-muted uppercase">
            Events Attended
          </span>
          <p className="mt-1 text-lg font-bold text-ink">{lifetimeCount}</p>
        </Card>

        <Card
          variant="soft"
          className="rounded-lg border-hairline bg-surface-soft p-3.5"
        >
          <span className="block text-[10px] font-bold tracking-wider text-text-muted uppercase">
            Recent Karma Earned
          </span>
          <p className="mt-1 text-lg font-bold text-ink">
            +{recentAttendancePoints.toLocaleString("en-US")} Pts
          </p>
        </Card>

        <Card
          variant="soft"
          className="col-span-2 rounded-lg border-hairline bg-surface-soft p-3.5 sm:col-span-1"
        >
          <span className="block text-[10px] font-bold tracking-wider text-text-muted uppercase">
            Latest Activity
          </span>
          <p className="mt-1 truncate text-sm font-bold text-ink">
            {recentAttendances[0]
              ? new Date(
                  recentAttendances[0].scanned_at ||
                    recentAttendances[0].event_date
                ).toLocaleDateString("en-US", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : "No check-ins"}
          </p>
        </Card>
      </div>

      {/* Recent Attendance Records Card (Strict Last 5 Cap) */}
      <Card
        variant="outlined"
        className="overflow-hidden rounded-xl border-hairline bg-canvas shadow-xs"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline bg-surface-soft px-4 py-3 sm:px-5">
          <h3 className="text-title-sm flex items-center gap-2 text-sm font-bold text-ink">
            <CalendarCheckIcon
              className="size-4 text-clay-teal"
              aria-hidden="true"
            />
            <span>Recent Attendance (Last 5 Events)</span>
          </h3>
          <span className="text-xs font-semibold text-text-muted">
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
                  className="flex flex-col justify-between gap-3 p-4 transition-colors hover:bg-surface-soft/70 sm:flex-row sm:items-center sm:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    {/* Calendar Tile */}
                    <div
                      className="flex size-12 shrink-0 flex-col items-center justify-center rounded-md border border-hairline bg-surface-soft text-center"
                      aria-hidden="true"
                    >
                      <span className="text-[9px] font-bold tracking-wider text-text-muted uppercase">
                        {monthShort}
                      </span>
                      <span className="text-sm leading-tight font-extrabold text-ink">
                        {dayNum}
                      </span>
                    </div>

                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-bold text-ink">
                        {att.event_title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                        <span className="inline-flex items-center gap-1">
                          <ClockIcon className="size-3" aria-hidden="true" />
                          <span>
                            {fullDateStr} · {timeStr}
                          </span>
                        </span>
                        <Badge
                          variant="secondary"
                          size="sm"
                          icon={
                            <QrCodeIcon
                              className="size-3"
                              aria-hidden="true"
                            />
                          }
                        >
                          {formatAttendanceMethodLabel(att.method)}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center self-end sm:self-center">
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
          <div className="space-y-2 px-6 py-12 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-lg border border-hairline bg-surface-soft text-text-muted">
              <ClockIcon className="size-6" aria-hidden="true" />
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
    </div>
  )
}
