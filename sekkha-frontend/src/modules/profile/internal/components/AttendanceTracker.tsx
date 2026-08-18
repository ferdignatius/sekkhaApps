// feature/profile/components/AttendanceTracker
// Monthly attendance tracker — streak in weeks (event 1x/week).
// Shows a 4-week (1 month) grid of attendance check-ins.

import { FlameIcon, CheckCircleIcon } from "lucide-react"

interface AttendanceTrackerProps {
  /** Current streak in weeks */
  currentStreak: number
  /** Longest streak in weeks */
  longestStreak: number
  /** 4 booleans representing each week of the current month (week 1–4) */
  monthlyCheckins: boolean[]
  /** Current month label e.g. "Juli 2025" */
  monthLabel?: string
}

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
  monthlyCheckins,
  monthLabel = "Juli 2025",
}: AttendanceTrackerProps) {
  const flameColor = getFlameColor(currentStreak)
  const flameBg = getFlameBg(currentStreak)
  const attendedThisMonth = monthlyCheckins.filter(Boolean).length

  return (
    <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
      {/* Header */}
      <div className="mb-5 flex items-center gap-2">
        <FlameIcon className={`size-5 ${flameColor}`} aria-hidden="true" />
        <h2 className="text-body-sm-medium text-sekkha-ink">Streak & Kehadiran</h2>
      </div>

      {/* Stats row — proportional layout */}
      <div className="grid grid-cols-3 gap-3">
        {/* Current streak */}
        <div className={`flex flex-col items-center justify-center rounded-xl ${flameBg} px-3 py-4`}>
          <p className={`text-heading-3 font-semibold leading-none ${flameColor}`}>
            {currentStreak}
          </p>
          <p className={`mt-1 text-caption ${flameColor}`}>🔥 Minggu</p>
          <p className="mt-0.5 text-micro text-sekkha-slate">Streak aktif</p>
        </div>

        {/* Longest streak */}
        <div className="flex flex-col items-center justify-center rounded-xl bg-sekkha-surface px-3 py-4">
          <p className="text-heading-3 font-semibold leading-none text-sekkha-ink">
            {longestStreak}
          </p>
          <p className="mt-1 text-caption text-sekkha-slate">Minggu</p>
          <p className="mt-0.5 text-micro text-sekkha-muted">Terpanjang</p>
        </div>

        {/* This month attendance rate */}
        <div className="flex flex-col items-center justify-center rounded-xl bg-sekkha-teal-light px-3 py-4">
          <p className="text-heading-3 font-semibold leading-none text-sekkha-brand-blue">
            {attendedThisMonth}/{monthlyCheckins.length}
          </p>
          <p className="mt-1 text-caption text-sekkha-brand-blue">Hadir</p>
          <p className="mt-0.5 text-micro text-sekkha-slate">Bulan ini</p>
        </div>
      </div>

      {/* Monthly check-in calendar (per week) */}
      <div className="mt-5">
        <p className="mb-3 text-caption-bold text-sekkha-slate">{monthLabel}</p>
        <div className="grid grid-cols-4 gap-3">
          {monthlyCheckins.map((checked, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center gap-2 rounded-xl border px-3 py-3 ${
                checked
                  ? "border-sekkha-brand-blue/20 bg-sekkha-teal-light"
                  : "border-sekkha-hairline-soft bg-sekkha-surface"
              }`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  checked
                    ? "bg-sekkha-brand-blue text-white"
                    : "bg-sekkha-hairline-soft text-sekkha-muted"
                }`}
              >
                {checked ? (
                  <CheckCircleIcon className="size-5" />
                ) : (
                  <span className="text-body-sm">—</span>
                )}
              </div>
              <span className={`text-caption ${checked ? "text-sekkha-brand-blue font-medium" : "text-sekkha-muted"}`}>
                Minggu {idx + 1}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
