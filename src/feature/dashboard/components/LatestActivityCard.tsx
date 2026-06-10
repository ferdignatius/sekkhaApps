// feature/dashboard/components/LatestActivityCard
// Shows the user's recent attendance history.
// Data shape: GET /users/me/attendances

import { CheckCircleIcon, CalendarIcon } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LatestActivityCard({ activities }: LatestActivityCardProps) {
  return (
    <section
      aria-labelledby="activity-heading"
      className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <CheckCircleIcon className="size-4 text-sekkha-brand-blue" aria-hidden="true" />
        <h2
          id="activity-heading"
          className="text-body-sm-medium text-sekkha-ink"
        >
          Aktivitas Terakhir
        </h2>
      </div>

      {/* List */}
      {activities.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <CalendarIcon className="size-8 text-sekkha-muted" aria-hidden="true" />
          <p className="text-caption text-sekkha-muted">
            Belum ada aktivitas kehadiran.
          </p>
        </div>
      ) : (
        <ul className="space-y-0" role="list">
          {activities.map((item, idx) => (
            <li key={item.event_id + item.scanned_at}>
              {idx > 0 && (
                <div
                  className="mx-0 my-0 h-px bg-sekkha-hairline-soft"
                  aria-hidden="true"
                />
              )}
              <div className="flex items-center gap-3 py-3">
                {/* Icon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sekkha-teal-light">
                  <CheckCircleIcon
                    className="size-4 text-sekkha-brand-blue"
                    aria-hidden="true"
                  />
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-body-sm-medium text-sekkha-ink">
                    {item.event_title}
                  </p>
                  <p className="text-caption text-sekkha-muted">
                    {formatDate(item.event_date)}
                  </p>
                </div>

                {/* Method badge */}
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-caption-bold ${
                    item.method === "qr"
                      ? "bg-sekkha-teal-light text-sekkha-brand-blue"
                      : "bg-sekkha-surface text-sekkha-slate"
                  }`}
                >
                  {item.method === "qr" ? "QR" : "Manual"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
