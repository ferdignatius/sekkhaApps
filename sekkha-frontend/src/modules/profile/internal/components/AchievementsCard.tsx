// feature/profile/components/AchievementsCard
// Displays user badges in a compact grid (first 4 shown).
// "Lihat Semua" navigates to a dedicated achievements page.
// Clickable badges show detail overlay.

import { AwardIcon, XIcon, ChevronRightIcon } from "lucide-react"
import { useState } from "react"
import { Link } from "@tanstack/react-router"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Badge {
  badge_id: string
  name: string
  icon_url: string // emoji or image URL
  description: string
  earned_at: string | null // null = locked
}

interface AchievementsCardProps {
  badges: Badge[]
  totalPoints: number
  rank: number
}

// ─── Dummy badges (replace with API data) ────────────────────────────────────

export const DUMMY_BADGES: Badge[] = [
  { badge_id: "b1", name: "Pertama Hadir", icon_url: "🎯", description: "Hadir di kebaktian pertama kamu.", earned_at: "2025-01-19" },
  { badge_id: "b2", name: "Streak 5", icon_url: "🔥", description: "Hadir 5 minggu berturut-turut.", earned_at: "2025-03-02" },
  { badge_id: "b3", name: "Loyal", icon_url: "❤️", description: "Aktif selama 3 bulan tanpa putus.", earned_at: "2025-04-15" },
  { badge_id: "b4", name: "Streak 10", icon_url: "⚡", description: "Hadir 10 minggu berturut-turut.", earned_at: "2025-06-01" },
  { badge_id: "b5", name: "Rajin", icon_url: "📚", description: "Hadir 4 kali berturut-turut di event rutin.", earned_at: "2025-06-20" },
  { badge_id: "b6", name: "100 Poin", icon_url: "⭐", description: "Kumpulkan total 100 poin.", earned_at: "2025-07-01" },
  { badge_id: "b7", name: "Streak 20", icon_url: "💎", description: "Hadir 20 minggu berturut-turut.", earned_at: null },
  { badge_id: "b8", name: "500 Poin", icon_url: "🏆", description: "Kumpulkan total 500 poin.", earned_at: null },
  { badge_id: "b9", name: "1000 Poin", icon_url: "👑", description: "Kumpulkan total 1000 poin.", earned_at: null },
  { badge_id: "b10", name: "Sosial", icon_url: "🤝", description: "Ikut 3 kegiatan bakti sosial.", earned_at: null },
]

// ─── Constants ───────────────────────────────────────────────────────────────

const PREVIEW_COUNT = 4

// ─── Badge Item ──────────────────────────────────────────────────────────────

export function BadgeItem({
  badge,
  onSelect,
}: {
  badge: Badge
  onSelect: (b: Badge) => void
}) {
  const isLocked = badge.earned_at === null
  return (
    <button
      type="button"
      onClick={() => onSelect(badge)}
      className="flex flex-col items-center gap-1.5 rounded-lg p-2 transition-colors hover:bg-sekkha-surface active:bg-sekkha-hairline-soft"
      aria-label={`${badge.name}${isLocked ? " (terkunci)" : ""}`}
    >
      <div
        className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl ring-2 ${
          isLocked
            ? "bg-sekkha-surface opacity-40 ring-sekkha-hairline-soft grayscale"
            : "bg-sekkha-surface ring-sekkha-brand-yellow/40"
        }`}
      >
        {badge.icon_url.startsWith("http") ? (
          <img
            src={badge.icon_url}
            alt={badge.name}
            className={`h-8 w-8 object-contain ${isLocked ? "grayscale" : ""}`}
          />
        ) : (
          <span>{badge.icon_url}</span>
        )}
      </div>
      <p
        className={`w-full truncate text-center text-caption ${
          isLocked ? "text-sekkha-muted" : "text-sekkha-ink"
        }`}
      >
        {badge.name}
      </p>
    </button>
  )
}

// ─── Badge Detail Overlay ────────────────────────────────────────────────────

export function BadgeDetailOverlay({
  badge,
  onClose,
}: {
  badge: Badge
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="badge-detail-title"
    >
      <div
        className="relative w-full max-w-xs rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full p-1 text-sekkha-muted hover:bg-sekkha-surface"
          aria-label="Tutup"
        >
          <XIcon className="size-4" />
        </button>

        <div className="flex flex-col items-center gap-3">
          <div
            className={`flex h-20 w-20 items-center justify-center rounded-full text-4xl ring-4 ${
              badge.earned_at === null
                ? "bg-sekkha-surface opacity-50 ring-sekkha-hairline-soft grayscale"
                : "bg-sekkha-surface-yellow ring-sekkha-brand-yellow/30"
            }`}
          >
            <span>{badge.icon_url}</span>
          </div>

          <h3
            id="badge-detail-title"
            className="text-heading-5 text-sekkha-ink"
          >
            {badge.name}
          </h3>

          <p className="text-center text-body-sm text-sekkha-slate">
            {badge.description}
          </p>

          {badge.earned_at ? (
            <span className="rounded-full bg-sekkha-teal-light px-3 py-1 text-caption-bold text-sekkha-brand-blue">
              Didapat {new Date(badge.earned_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </span>
          ) : (
            <span className="rounded-full bg-sekkha-surface px-3 py-1 text-caption-bold text-sekkha-muted">
              🔒 Belum didapatkan
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AchievementsCard({ badges }: AchievementsCardProps) {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)

  const earnedCount = badges.filter((b) => b.earned_at !== null).length
  const previewBadges = badges.slice(0, PREVIEW_COUNT)
  const hasMore = badges.length > PREVIEW_COUNT

  return (
    <section
      aria-labelledby="achievements-heading"
      className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AwardIcon className="size-5 text-sekkha-brand-yellow" aria-hidden="true" />
          <h2 id="achievements-heading" className="text-body-sm-medium text-sekkha-ink">
            Achievements
          </h2>
        </div>
        <span className="rounded-full bg-sekkha-surface px-2.5 py-0.5 text-caption-bold text-sekkha-slate">
          {earnedCount}/{badges.length}
        </span>
      </div>

      {/* Progress indicator */}
      <p className="mb-4 text-caption text-sekkha-muted">
        Terus hadir untuk membuka badge baru!
      </p>

      {/* Badge grid — preview */}
      <div className="grid grid-cols-4 gap-4">
        {previewBadges.map((badge) => (
          <BadgeItem key={badge.badge_id} badge={badge} onSelect={setSelectedBadge} />
        ))}
      </div>

      {/* See all — link to dedicated page */}
      {hasMore && (
        <Link
          to="/home/achievements"
          className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-full border border-sekkha-hairline-strong py-2 text-body-sm-medium text-sekkha-ink transition-colors hover:bg-sekkha-surface active:bg-sekkha-hairline-soft"
        >
          Lihat Semua ({badges.length})
          <ChevronRightIcon className="size-4 text-sekkha-muted" aria-hidden="true" />
        </Link>
      )}

      {/* Badge detail overlay */}
      {selectedBadge && (
        <BadgeDetailOverlay badge={selectedBadge} onClose={() => setSelectedBadge(null)} />
      )}
    </section>
  )
}
