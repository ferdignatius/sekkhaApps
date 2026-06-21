// feature/profile/components/AttendanceTracker
// Visual attendance tracker — flame streak counter + weekly check-in stickers.
// Shows the user's consistency in a fun, interactive way.

import { FlameIcon, CheckCircleIcon } from "lucide-react"

interface AttendanceTrackerProps {
  currentStreak: number
  longestStreak: number
  /** 7 booleans, index 0 = Senin, index 6 = Minggu */
  weeklyCheckins: boolean[]
}

const DAY_LABELS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]

// Flame tier colors
function getFlameColor(streak: number): string {
  if (streak >= 12) return "text-red-500"
  if (streak >= 8) return "text-orange-500"
  if (streak >= 4) return "text-amber-500"
  return "text-amber-300"
}

function getFlameBg(streak: number): string {
  if (streak >= 12) return "bg-red-50"
  if (streak >= 8) return "bg-orange-50"
  if (streak >= 4) return "bg-amber-50"
  return "bg-amber-50/60"
}

export function AttendanceTracker({
  currentStreak,
  longestStreak,
  weeklyCheckins,
}: AttendanceTrackerProps) {
  const flameColor = getFlameColor(currentStreak)
  const flameBg = getFlameBg(currentStreak)

  return (
    <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <FlameIcon className={`size-5 ${flameColor}`} aria-hidden="true" />
        <h2 className="text-body-sm-medium text-sekkha-ink">Streak & Kehadiran</h2>
      </div>

      {/* Streak stats row */}
      <div className="mb-5 flex items-center gap-4">
        {/* Current streak — big and bold */}
        <div className={`flex items-center gap-3 rounded-xl ${flameBg} px-5 py-3`}>
          <span className={`text-heading-2 font-semibold ${flameColor}`}>
            {currentStreak}
          </span>
          <div>
            <p className={`text-body-sm-medium ${flameColor}`}>🔥 Minggu</p>
            <p className="text-caption text-sekkha-slate">Streak aktif</p>
          </div>
        </div>

        {/* Longest streak */}
        <div className="flex flex-col items-center rounded-xl bg-sekkha-surface px-5 py-3">
          <p className="text-heading-4 font-semibold text-sekkha-ink">{longestStreak}</p>
          <p className="text-caption text-sekkha-slate">Terpanjang</p>
        </div>
      </div>

      {/* Weekly check-in calendar (sticker style) */}
      <div>
        <p className="mb-3 text-caption-bold text-sekkha-slate">Minggu Ini</p>
        <div className="grid grid-cols-7 gap-2">
          {DAY_LABELS.map((day, idx) => {
            const checked = weeklyCheckins[idx] ?? false
            return (
              <div
                key={day}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-transform ${
                    checked
                      ? "bg-sekkha-brand-blue text-white scale-100"
                      : "bg-sekkha-surface text-sekkha-muted"
                  }`}
                >
                  {checked ? (
                    <CheckCircleIcon className="size-5" />
                  ) : (
                    <span className="text-body-sm">—</span>
                  )}
                </div>
                <span className={`text-micro ${checked ? "text-sekkha-ink font-medium" : "text-sekkha-muted"}`}>
                  {day}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
