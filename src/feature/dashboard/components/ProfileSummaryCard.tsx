// feature/dashboard/components/ProfileSummaryCard
// Profile summary card: avatar/initials, name, tiered flame streak, total points.
// Flame tier escalates at 4 / 8 / 12+ streaks — icon grows and changes color.

import { StarIcon } from "lucide-react"

// ─── Types (shaped after GET /users/me + /users/me/streak + /users/me/level) ──

interface ProfileSummaryCardProps {
  name: string
  avatarUrl?: string
  /** current_streak from GET /users/me/streak */
  currentStreak: number
  /** total_points from GET /users/me/level */
  totalPoints: number
  /** level from GET /users/me/level */
  level: number
  /** level_label from GET /users/me/level */
  levelLabel: string
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

/**
 * Returns flame tier config based on streak count.
 * Tier 1: 1–3   → small dim flame
 * Tier 2: 4–7   → medium warm flame
 * Tier 3: 8–11  → large bright flame
 * Tier 4: 12+   → max blazing flame (same icon, stronger visual)
 */
function getFlameConfig(streak: number): {
  size: string
  colorClass: string
  bgClass: string
  label: string
  emoji: string
} {
  if (streak >= 12) {
    return {
      size: "size-12",
      colorClass: "text-red-500",
      bgClass: "bg-red-50",
      label: "Blazing streak",
      emoji: "🔥",
    }
  }
  if (streak >= 8) {
    return {
      size: "size-10",
      colorClass: "text-orange-500",
      bgClass: "bg-orange-50",
      label: "Hot streak",
      emoji: "🔥",
    }
  }
  if (streak >= 4) {
    return {
      size: "size-8",
      colorClass: "text-amber-500",
      bgClass: "bg-amber-50",
      label: "Warming up",
      emoji: "🔥",
    }
  }
  return {
    size: "size-6",
    colorClass: "text-amber-300",
    bgClass: "bg-amber-50/60",
    label: "Keep going",
    emoji: "🔥",
  }
}

// ─── Flame SVG (custom, three-tier visual) ────────────────────────────────────
// Using a direct SVG so we can animate / style the fill independently per tier.

function FlameIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2C12 2 9 7 9 10.5C9 12.4 10.3 14 12 14C13.7 14 15 12.4 15 10.5C15 10.5 16 12 16 14C16 17.3 14.2 20 12 20C9.8 20 8 17.3 8 14C8 9.5 12 2 12 2Z" />
      <path
        d="M12 14C10.3 14 9 12.4 9 10.5C9 10.5 8 12.5 8 14C8 17.3 9.8 20 12 20C14.2 20 16 17.3 16 14C16 12 15 10.5 15 10.5C15 12.4 13.7 14 12 14Z"
        opacity="0.6"
      />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProfileSummaryCard({
  name,
  avatarUrl,
  currentStreak,
  totalPoints,
  level,
  levelLabel,
}: ProfileSummaryCardProps) {
  const flame = getFlameConfig(currentStreak)

  return (
    <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Foto profil ${name}`}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-sekkha-hairline-soft"
            />
          ) : (
            <div
              aria-label={`Inisial ${name}`}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-sekkha-brand-yellow text-heading-5 font-semibold text-sekkha-ink"
            >
              {getInitials(name)}
            </div>
          )}
        </div>

        {/* Name + level */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-body-md-medium text-sekkha-ink">{name}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="text-caption-bold text-sekkha-brand-blue">
              Lv.{level}
            </span>
            <span className="text-caption text-sekkha-muted">·</span>
            <span className="text-caption text-sekkha-slate">{levelLabel}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 flex items-center gap-3">
        {/* Flame streak — the main visual */}
        <div
          className={`flex flex-1 items-center gap-3 rounded-xl ${flame.bgClass} px-4 py-3`}
        >
          <FlameIcon className={`shrink-0 ${flame.size} ${flame.colorClass}`} />
          <div>
            <p className={`text-heading-4 font-semibold leading-none ${flame.colorClass}`}>
              {currentStreak}
            </p>
            <p className="mt-0.5 text-caption text-sekkha-slate">
              {currentStreak === 1 ? "minggu streak" : "minggu streak"}
            </p>
          </div>
        </div>

        {/* Points */}
        <div className="flex flex-1 items-center gap-3 rounded-xl bg-sekkha-surface px-4 py-3">
          <StarIcon
            className="size-7 shrink-0 text-sekkha-brand-yellow"
            aria-hidden="true"
          />
          <div>
            <p className="text-heading-4 font-semibold leading-none text-sekkha-ink">
              {totalPoints.toLocaleString("id-ID")}
            </p>
            <p className="mt-0.5 text-caption text-sekkha-slate">total poin</p>
          </div>
        </div>
      </div>
    </div>
  )
}
