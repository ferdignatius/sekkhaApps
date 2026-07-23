// feature/profile/components/AchievementsPage
// Full achievements page — all badges in a grid with locked/unlocked states.

import { useState } from "react"
import { AwardIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { DUMMY_BADGES, BadgeItem, BadgeDetailOverlay } from "./AchievementsCard"
import type { Badge } from "./AchievementsCard"

export function AchievementsPage() {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)

  const badges = DUMMY_BADGES
  const earnedCount = badges.filter((b) => b.earned_at !== null).length

  return (
    <main>
      <PageBreadcrumb items={[{ label: "Profil", href: "/home/profile" }, { label: "Achievements" }]} />
      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-8xl space-y-5">

          {/* Header */}
          <div className="flex items-center gap-2">
            <AwardIcon className="size-5 text-sekkha-brand-yellow" aria-hidden="true" />
            <h1 className="text-heading-5 text-sekkha-ink">Semua Badge</h1>
          </div>

          {/* Stats summary */}
          <div className="flex items-center gap-4">
            <div className="rounded-xl bg-sekkha-surface-yellow px-4 py-3 text-center">
              <p className="text-heading-4 font-semibold text-sekkha-ink">{earnedCount}</p>
              <p className="text-caption text-sekkha-slate">Didapatkan</p>
            </div>
            <div className="rounded-xl bg-sekkha-surface px-4 py-3 text-center">
              <p className="text-heading-4 font-semibold text-sekkha-muted">{badges.length - earnedCount}</p>
              <p className="text-caption text-sekkha-slate">Terkunci</p>
            </div>
          </div>

          {/* Badge grid — full */}
          <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
            <div className="grid grid-cols-4 gap-4 sm:grid-cols-5 lg:grid-cols-6">
              {badges.map((badge) => (
                <BadgeItem key={badge.badge_id} badge={badge} onSelect={setSelectedBadge} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Badge detail overlay */}
      {selectedBadge && (
        <BadgeDetailOverlay badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </main>
  )
}
