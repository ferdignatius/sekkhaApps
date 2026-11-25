import { Bolt } from "lucide-react"
import { SuccessLottie } from "@/components/common/SuccessLottie"
import type { AttendanceCheckInNotification } from "@/hooks/useAttendanceCheckInListener"

export interface QrCheckInSuccessOverlayProps {
  notification: AttendanceCheckInNotification | null
  onDismiss: () => void
}

/**
 * Overlay rendered directly over a member's QR code / card when an organizer
 * records their attendance, playing `SuccessLottie` with event & point details.
 */
export function QrCheckInSuccessOverlay({
  notification,
  onDismiss,
}: QrCheckInSuccessOverlayProps) {
  if (!notification) return null

  return (
    <div
      data-testid="qr-checkin-success-overlay"
      role="status"
      aria-live="polite"
      onClick={onDismiss}
      className="absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center rounded-[22px] border border-emerald-200 bg-[#fffaf0]/95 p-5 text-center backdrop-blur-sm animate-in duration-200 fade-in zoom-in-95"
    >
      <SuccessLottie className="size-24" />
      <p className="mt-1 text-lg font-extrabold tracking-tight text-ink">
        Checked In!
      </p>
      <p className="mt-0.5 max-w-[260px] truncate text-xs font-semibold text-text-muted">
        {notification.eventTitle}
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
            notification.isLate
              ? "bg-amber-100 text-amber-900"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {notification.isLate ? "Late" : "On Time"}
        </span>

        {notification.pointsEarned > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF0DF] px-2.5 py-0.5 text-[11px] font-bold text-[#9a6b0d] tabular-nums">
            <Bolt className="size-3" />+{notification.pointsEarned} pts
          </span>
        )}
      </div>
    </div>
  )
}
