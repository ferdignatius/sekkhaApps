// feature/dashboard/components/LatestActivityCard
// Shows the user's recent attendance history.
// Data shape: GET /users/me/attendances

import { CheckCircleIcon, CalendarIcon } from "lucide-react"

export interface AttendanceItem {
  event_id: string
  event_title: string
  event_date: string  // ISO 8601
  method: "qr" | "manual"
  scanned_at: string  // ISO 8601
}

interface LatestActivityCardProps {
  activities: AttendanceItem[]
}

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function LatestActivityCard({ activities }: LatestActivityCardProps) {
  return (
    <section
      aria-labelledby="activity-heading"
      className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs font-sans text-left"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <CheckCircleIcon className="size-4 text-[#1a3a3a]" aria-hidden="true" />
        <h2
          id="activity-heading"
          className="text-sm font-bold text-[#0a0a0a]"
        >
          Recent Activity
        </h2>
      </div>

      {/* List */}
      {activities.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CalendarIcon className="size-8 text-[#6a6a6a]/50" aria-hidden="true" />
          <p className="text-xs font-medium text-[#6a6a6a]">
            No recent attendance activity recorded.
          </p>
        </div>
      ) : (
        <ul className="space-y-0 divide-y divide-[#f0f0f0]" role="list">
          {activities.map((item) => (
            <li key={item.event_id + item.scanned_at}>
              <div className="flex items-center gap-3 py-3">
                {/* Icon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a3a3a]/10 text-[#1a3a3a]">
                  <CheckCircleIcon
                    className="size-4"
                    aria-hidden="true"
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#0a0a0a]">
                    {item.event_title}
                  </p>
                  <p className="text-[11px] text-[#6a6a6a] mt-0.5">
                    {formatDate(item.event_date)}
                  </p>
                </div>

                {/* Method badge */}
                <span
                  className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                    item.method === "qr"
                      ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                      : "border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a]"
                  }`}
                >
                  {item.method === "qr" ? "QR Scan" : "Manual"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
