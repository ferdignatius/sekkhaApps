// feature/profile/components/ProfileCard
// Large profile card shown at the top of the profile page.
// Shows avatar or initials, full name, and school.

interface ProfileCardProps {
  name: string
  school: string
  avatarUrl?: string
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("")
}

export function ProfileCard({ name, school, avatarUrl }: ProfileCardProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas px-6 py-8 text-center">
      {/* Avatar */}
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

      {/* Name */}
      <div className="space-y-1">
        <p className="text-heading-5 text-sekkha-ink">{name}</p>
        <p className="text-body-sm text-sekkha-slate">{school}</p>
      </div>
    </div>
  )
}
