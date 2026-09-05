// feature/dashboard/components/ProfileSummaryCard
// Profile summary card: avatar/initials, name, tiered flame streak, total points.
// Flame tier escalates at 4 / 8 / 12+ streaks — icon grows and changes color.

import { StarIcon } from "lucide-react"

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

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function getFlameConfig(streak: number): {
  size: string
  colorClass: string
  bgClass: string
  label: string
  emoji: string
} {
  if (streak >= 12) {
    return {
      size: "size-10",
      colorClass: "text-red-500",
      bgClass: "bg-red-50 border-red-200",
      label: "Blazing streak",
      emoji: "🔥",
    }
  }
  if (streak >= 8) {
    return {
      size: "size-9",
      colorClass: "text-orange-500",
      bgClass: "bg-orange-50 border-orange-200",
      label: "Hot streak",
      emoji: "🔥",
    }
  }
  if (streak >= 4) {
    return {
      size: "size-8",
      colorClass: "text-amber-500",
      bgClass: "bg-[#ffb084]/20 border-[#ffb084]/40",
      label: "Warming up",
      emoji: "🔥",
    }
  }
  return {
    size: "size-7",
    colorClass: "text-[#e8b94a]",
    bgClass: "bg-[#faf5e8] border-[#e5e5e5]",
    label: "Keep going",
    emoji: "🔥",
  }
}

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
    <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs font-sans text-left">
      <div className="flex items-center gap-4">
        {/* Avatar */}
        <div className="shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Profile picture for ${name}`}
              className="h-14 w-14 rounded-full object-cover ring-2 ring-[#e5e5e5]"
            />
          ) : (
            <div
              aria-label={`Initials for ${name}`}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e8b94a] text-lg font-bold text-[#0a0a0a]"
            >
              {getInitials(name)}
            </div>
          )}
        </div>

        {/* Name + level */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-bold text-[#0a0a0a]">{name}</p>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="rounded-full bg-[#f5f0e0] border border-[#e5e5e5] px-2.5 py-0.5 text-xs font-bold text-[#0a0a0a]">
              Lv.{level}
            </span>
            <span className="text-xs text-[#6a6a6a]">·</span>
            <span className="text-xs font-semibold text-[#1a3a3a]">{levelLabel}</span>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* Flame streak */}
        <div
          className={`flex items-center gap-3 rounded-[12px] border ${flame.bgClass} px-3.5 py-2.5 shadow-2xs`}
        >
          <FlameIcon className={`shrink-0 ${flame.size} ${flame.colorClass}`} />
          <div className="min-w-0">
            <p className={`text-lg font-bold leading-none ${flame.colorClass}`}>
              {currentStreak}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#6a6a6a] truncate">
              {currentStreak === 1 ? "week streak" : "weeks streak"}
            </p>
          </div>
        </div>

        {/* Points */}
        <div className="flex items-center gap-3 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] px-3.5 py-2.5 shadow-2xs">
          <StarIcon
            className="size-7 shrink-0 text-[#e8b94a]"
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p className="text-lg font-bold leading-none text-[#0a0a0a]">
              {totalPoints.toLocaleString("en-US")}
            </p>
            <p className="mt-1 text-[11px] font-medium text-[#6a6a6a] truncate">total points</p>
          </div>
        </div>
      </div>
    </div>
  )
}
