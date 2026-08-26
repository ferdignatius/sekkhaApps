// feature/profile/components/ProfileCard
// Profile header card — left-aligned layout with avatar (camera overlay),
// name, school, user number, role badge, and working "Edit Profil" trigger.

import { useState } from "react"
import { CameraIcon, PencilIcon, CalendarIcon, ShieldCheckIcon, CopyIcon, CheckIcon, PhoneIcon, MailIcon } from "lucide-react"

interface ProfileCardProps {
  name: string
  school?: string | null
  phone?: string | null
  email?: string | null
  role?: string
  userNumber?: string | null
  avatarUrl?: string
  joinedAt?: string // ISO date
  equippedBadge?: { name: string; icon: string } | null
  onEditProfile?: () => void
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "UM"
}

function formatJoinDate(iso?: string): string {
  if (!iso) return "Juli 2025"
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    })
  } catch {
    return "Juli 2025"
  }
}

export function ProfileCard({
  name,
  school,
  phone,
  email,
  role = "umat",
  userNumber,
  avatarUrl,
  joinedAt = "2025-07-01",
  onEditProfile,
}: ProfileCardProps) {
  const [copied, setCopied] = useState(false)

  function handleCopyNumber() {
    if (!userNumber) return
    navigator.clipboard.writeText(userNumber)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const roleLabel = role === "admin" ? "Admin Vihara" : role === "pengurus" ? "Pengurus" : role === "aktivis" ? "Aktivis" : "Umat"
  const roleBadgeStyle: Record<string, string> = {
    admin: "bg-red-50 text-red-700 border-red-200",
    pengurus: "bg-purple-50 text-purple-700 border-purple-200",
    aktivis: "bg-blue-50 text-blue-700 border-blue-200",
    umat: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-white via-white/95 to-blue-50/40 backdrop-blur-md p-5 sm:p-6 shadow-xs transition-all hover:shadow-md">
      {/* Decorative Glow */}
      <div className="absolute -top-10 -right-10 size-36 rounded-full bg-sekkha-brand-blue/10 blur-2xl pointer-events-none" />

      {/* Edit button — top right */}
      <button
        type="button"
        onClick={onEditProfile}
        className="absolute right-4 top-4 flex items-center gap-1.5 rounded-xl border border-sekkha-hairline-strong bg-white/90 px-3.5 py-1.5 text-caption-bold text-sekkha-ink shadow-2xs transition-all hover:bg-sekkha-brand-blue hover:text-white hover:border-sekkha-brand-blue active:scale-95 cursor-pointer"
        aria-label="Edit profil"
      >
        <PencilIcon className="size-3.5" aria-hidden="true" />
        <span>Edit Profil</span>
      </button>

      {/* Content: responsive column on mobile, row on tablet/desktop */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 pt-1 sm:pt-0">
        {/* Avatar with camera overlay */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`Foto profil ${name}`}
              className="size-20 sm:size-24 rounded-2xl object-cover ring-4 ring-sekkha-hairline-soft shadow-xs"
            />
          ) : (
            <div
              aria-label={`Inisial ${name}`}
              className="flex size-20 sm:size-24 items-center justify-center rounded-2xl bg-gradient-to-br from-sekkha-brand-blue via-blue-600 to-indigo-700 text-heading-3 font-extrabold text-white ring-4 ring-blue-100 shadow-md uppercase"
            >
              {getInitials(name)}
            </div>
          )}
          {/* Camera overlay indicator */}
          <button
            type="button"
            onClick={onEditProfile}
            className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-xl border-2 border-white bg-sekkha-brand-blue text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
            aria-label="Ubah foto profil"
            title="Ubah profil & foto"
          >
            <CameraIcon className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-heading-5 font-black text-sekkha-ink">{name}</h2>
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-micro-bold capitalize ${roleBadgeStyle[role] || roleBadgeStyle.umat}`}>
              <ShieldCheckIcon className="size-3" />
              <span>{roleLabel}</span>
            </span>
          </div>

          {/* User Number + School */}
          <div className="flex flex-wrap items-center gap-3 text-caption text-sekkha-slate">
            {userNumber && (
              <div className="flex items-center gap-1 font-mono text-caption-bold text-sekkha-brand-blue bg-blue-50/80 px-2.5 py-0.5 rounded-lg border border-blue-200/60">
                <span>{userNumber}</span>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  className="text-slate-400 hover:text-sekkha-brand-blue p-0.5 cursor-pointer ml-1"
                  title="Salin Nomor Unik"
                >
                  {copied ? <CheckIcon className="size-3 text-emerald-600" /> : <CopyIcon className="size-3" />}
                </button>
              </div>
            )}
            {school && (
              <span className="truncate font-medium">🏫 {school}</span>
            )}
          </div>

          {/* Contact Details (Phone & Email) */}
          <div className="flex flex-wrap items-center gap-3 text-micro text-sekkha-slate pt-0.5">
            {phone && (
              <span className="flex items-center gap-1">
                <PhoneIcon className="size-3 text-sekkha-slate" />
                <span>{phone}</span>
              </span>
            )}
            {email && (
              <span className="flex items-center gap-1">
                <MailIcon className="size-3 text-sekkha-slate" />
                <span>{email}</span>
              </span>
            )}
            <div className="flex items-center gap-1 text-sekkha-muted">
              <CalendarIcon className="size-3" aria-hidden="true" />
              <span>Bergabung sejak {formatJoinDate(joinedAt)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

