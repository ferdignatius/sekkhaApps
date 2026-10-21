// feature/profile/components/AchievementsPage
// Full achievements page — all badges in a grid with locked/unlocked states.

import { useEffect, useState } from "react"
import { AwardIcon } from "lucide-react"
import { z } from "zod"
import { api } from "@/lib/api"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { BadgeItem, BadgeDetailOverlay } from "./AchievementsCard"
import type { Badge } from "./AchievementsCard"

const BadgesResponseSchema = z.array(
  z.object({
    badge_id: z.string(),
    name: z.string(),
    icon_url: z.string(),
    description: z.string(),
    earned_at: z.string().nullable(),
  })
)

export function AchievementsPage() {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Badge[]>("/users/me/badges", { schema: BadgesResponseSchema })
      .then(setBadges)
      .catch(() => setError("Unable to load achievements."))
      .finally(() => setLoading(false))
  }, [])

  const earnedCount = badges.filter((b) => b.earned_at !== null).length

  return (
    <main>
      <PageBreadcrumb
        items={[
          { label: "Profile", href: "/home/profile" },
          { label: "Achievements" },
        ]}
      />
      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-8xl space-y-5">
          {/* Header */}
          <div className="flex items-center gap-2">
            <AwardIcon
              className="size-5 text-sekkha-brand-yellow"
              aria-hidden="true"
            />
            <h1 className="text-heading-5 text-sekkha-ink">Achievements</h1>
          </div>

          {loading && <p className="text-body-sm text-sekkha-muted">Loading achievements...</p>}
          {error && <p className="text-body-sm text-red-700">{error}</p>}

          {/* Stats summary */}
          <div className="flex items-center gap-4">
            <div className="bg-sekkha-surface-yellow rounded-xl px-4 py-3 text-center">
              <p className="text-heading-4 font-semibold text-sekkha-ink">
                {earnedCount}
              </p>
              <p className="text-caption text-sekkha-slate">Earned</p>
            </div>
            <div className="rounded-xl bg-sekkha-surface px-4 py-3 text-center">
              <p className="text-heading-4 font-semibold text-sekkha-muted">
                {badges.length - earnedCount}
              </p>
              <p className="text-caption text-sekkha-slate">Locked</p>
            </div>
          </div>

          {/* Badge grid — full */}
          {!loading && !error && <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
            <div className="grid grid-cols-4 gap-4 sm:grid-cols-5 lg:grid-cols-6">
              {badges.map((badge) => (
                <BadgeItem
                  key={badge.badge_id}
                  badge={badge}
                  onSelect={setSelectedBadge}
                />
              ))}
            </div>
          </div>}
        </div>
      </div>

      {/* Badge detail overlay */}
      {selectedBadge && (
        <BadgeDetailOverlay
          badge={selectedBadge}
          onClose={() => setSelectedBadge(null)}
        />
      )}
    </main>
  )
}
