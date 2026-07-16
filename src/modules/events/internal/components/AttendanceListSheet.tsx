// feature/events/components/AttendanceListSheet
// Displays the list of attendance records for an event.
// Accessible to all roles — pengurus sees method badge.

import { CheckCircleIcon, QrCodeIcon, UserIcon } from "lucide-react"
import type { AttendanceRecord, UserRole } from "../types"

interface AttendanceListSheetProps {
  records: AttendanceRecord[]
  role: UserRole | null
  totalRsvp: number
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit",
  })
}

export function AttendanceListSheet({ records, role, totalRsvp }: AttendanceListSheetProps) {
  const isPengurus = role === "pengurus" || role === "admin"

  return (
    <div className="flex flex-col gap-3">
      {/* Summary */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="size-4 text-sekkha-brand-blue" aria-hidden="true" />
          <span className="text-body-sm-medium text-sekkha-ink">
            Kehadiran
          </span>
        </div>
        <span className="text-caption text-sekkha-slate">
          {records.length} hadir · {totalRsvp} RSVP
        </span>
      </div>

      {/* List */}
      {records.length === 0 ? (
        <p className="py-4 text-center text-caption text-sekkha-muted">
          Belum ada yang tercatat hadir.
        </p>
      ) : (
        <ul className="divide-y divide-sekkha-hairline-soft" role="list">
          {records.map((rec, i) => (
            <li key={`${rec.user_id}-${i}`} className="flex items-center gap-3 py-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sekkha-surface">
                <UserIcon className="size-3.5 text-sekkha-slate" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm text-sekkha-ink">{rec.name}</p>
                <p className="text-caption text-sekkha-muted">{formatTime(rec.scanned_at)}</p>
              </div>
              {/* Method badge — pengurus only */}
              {isPengurus && (
                <span
                  className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-caption-bold ${
                    rec.method === "qr"
                      ? "bg-sekkha-teal-light text-sekkha-brand-blue"
                      : "bg-sekkha-surface text-sekkha-slate"
                  }`}
                >
                  {rec.method === "qr"
                    ? <><QrCodeIcon className="size-3" aria-hidden="true" /> QR</>
                    : "Manual"}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
