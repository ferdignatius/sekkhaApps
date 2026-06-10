// feature/profile/components/AchievementsCard
// Displays the user's earned badges in a grid — icon + label.
// Data shape: GET /users/me/badges

import { AwardIcon } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Badge {
  badge_id: string
  name: string
  icon_url: string  // emoji or image URL
  earned_at: string
}

interface AchievementsCardProps {
  badges: Badge[]
  totalPoints: number
  rank: number
}

// ─── Dummy badges (replace with API data) ────────────────────────────────────

export const DUMMY_BADGES: Badge[] = [
  { badge_id: "b1", name: "Pertama Hadir",  icon_url: "🎯", earned_at: "2025-01-19" },
  { badge_id: "b2", name: "Streak 5",       icon_url: "🔥", earned_at: "2025-03-02" },
  { badge_id: "b3", name: "Loyal",          icon_url: "❤️", earned_at: "2025-04-15" },
  { badge_id: "b4", name: "Streak 10",      icon_url: "⚡", earned_at: "2025-06-01" },
  { badge_id: "b5", name: "Rajin",          icon_url: "📚", earned_at: "2025-06-20" },
  { badge_id: "b6", name: "100 Poin",       icon_url: "⭐", earned_at: "2025-07-01" },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function AchievementsCard({ badges, totalPoints, rank }: AchievementsCardProps) {
  return (
    <section
      aria-labelledby="achievements-heading"
      className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AwardIcon className="size-4 text-sekkha-brand-yellow" aria-hidden="true" />
          <h2 id="achievements-heading" className="text-body-sm-medium text-sekkha-ink">
            Achievements
          </h2>
        </div>
        <div className="flex items-center gap-3 text-caption text-sekkha-slate">
          <span>{totalPoints.toLocaleString("id-ID")} pts</span>
          <span>|</span>
          <span>#{rank}</span>
        </div>
      </div>

      {/* Subtitle */}
      <p className="mb-4 text-caption text-sekkha-muted">
        Kumpulkan badge dengan hadir dan ikut kegiatan komunitas
      </p>

      {/* Badge grid */}
      {badges.length === 0 ? (
        <div className="py-6 text-center">
          <p className="text-body-sm text-sekkha-muted">Belum ada badge. Mulai hadir untuk mendapatkan!</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4">
          {badges.map(badge => (
            <div
              key={badge.badge_id}
              className="flex flex-col items-center gap-1.5"
              title={`Didapat: ${new Date(badge.earned_at).toLocaleDateString("id-ID")}`}
            >
              {/* Icon circle */}
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sekkha-surface text-2xl ring-2 ring-sekkha-hairline-soft">
                {badge.icon_url.startsWith("http") ? (
                  <img src={badge.icon_url} alt={badge.name} className="h-8 w-8 object-contain" />
                ) : (
                  <span>{badge.icon_url}</span>
                )}
              </div>
              {/* Label */}
              <p className="w-full truncate text-center text-caption text-sekkha-ink">{badge.name}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
