// feature/profile/components/ProfileCard
// Profile header card — left-aligned layout with avatar (camera overlay),
// name, school, join date, and an "Edit Profil" button.

import { CameraIcon, PencilIcon, CalendarIcon } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface ProfileCardProps {
  name: string
  school: string
  avatarUrl?: string
  joinedAt?: string // ISO date
  equippedBadge?: { name: string; icon: string } | null
  onEditProfile?: () => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

function formatJoinDate(iso: string): string {
  return new Date(iso).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProfileCard({
  name,
  school,
  avatarUrl,
  joinedAt = "2025-07-01",
  equippedBadge = { name: "Loyal", icon: "❤️" },
  onEditProfile,
}: ProfileCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-sekkha-canvas/95 via-white/90 to-amber-50/50 backdrop-blur-md p-5 shadow-xs transition-all hover:shadow-md">
      {/* Decorative Glow */}
      <div className="absolute -top-10 -right-10 size-32 rounded-full bg-sekkha-brand-yellow/20 blur-2xl pointer-events-none" />
      {/* Edit button — top right */}
      <button
        type="button"
        onClick={onEditProfile}
        className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-sekkha-hairline-strong px-3 py-1.5 text-button-md text-sekkha-ink transition-colors hover:bg-sekkha-surface active:bg-sekkha-hairline-soft"
        aria-label="Edit profil"
      >
        <PencilIcon className="size-3.5" aria-hidden="true" />
        <span className="hidden sm:inline">Edit Profil</span>
      </button>

      {/* Content: left-aligned row */}
      <div className="flex items-center gap-5">
        {/* Avatar with camera overlay */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Foto profil ${name}`}
              className="h-20 w-20 rounded-full object-cover ring-4 ring-sekkha-hairline-soft"
            />
          ) : (
            <div
              aria-label={`Inisial ${name}`}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-sekkha-brand-yellow text-heading-3 font-semibold text-sekkha-ink ring-4 ring-sekkha-hairline-soft"
            >
              {getInitials(name)}
            </div>
          )}
          {/* Camera overlay indicator */}
          <button
            type="button"
            className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-sekkha-canvas bg-sekkha-brand-blue text-white shadow-sm"
            aria-label="Unggah foto profil"
          >
            <CameraIcon className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-heading-5 text-sekkha-ink">{name}</p>
          <p className="mt-0.5 text-body-sm text-sekkha-slate">{school}</p>

          {/* Meta row: join date + equipped badge */}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {/* Join date */}
            <div className="flex items-center gap-1 text-caption text-sekkha-muted">
              <CalendarIcon className="size-3" aria-hidden="true" />
              <span>Anggota sejak {formatJoinDate(joinedAt)}</span>
            </div>

            {/* Equipped badge */}
            {equippedBadge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-sekkha-surface-yellow px-2 py-0.5 text-caption-bold text-sekkha-yellow-dark">
                <span aria-hidden="true">{equippedBadge.icon}</span>
                {equippedBadge.name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
