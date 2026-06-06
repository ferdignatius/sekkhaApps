// feature/dashboard/components/ProfileSummaryCard
// Profile summary widget shown at the top of the dashboard.
// Displays avatar/initials, name, streak, and total points.

import { FlameIcon, StarIcon } from "lucide-react"

interface ProfileSummaryCardProps {
  name: string
  avatarUrl?: string
  streakDays: number
  totalPoints: number
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export function ProfileSummaryCard({
  name,
  avatarUrl,
  streakDays,
  totalPoints,
}: ProfileSummaryCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
      {/* Avatar */}
      <div className="relative shrink-0">
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

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-body-md-medium text-sekkha-ink">{name}</p>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          {/* Streak */}
          <div className="flex items-center gap-1.5">
            <FlameIcon className="size-4 text-orange-500" aria-hidden="true" />
            <span className="text-body-sm text-sekkha-slate">
              <span className="font-medium text-sekkha-ink">{streakDays}</span>
              &nbsp;hari streak
            </span>
          </div>

          {/* Points */}
          <div className="flex items-center gap-1.5">
            <StarIcon className="size-4 text-sekkha-brand-yellow" aria-hidden="true" />
            <span className="text-body-sm text-sekkha-slate">
              <span className="font-medium text-sekkha-ink">
                {totalPoints.toLocaleString("id-ID")}
              </span>
              &nbsp;poin
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
