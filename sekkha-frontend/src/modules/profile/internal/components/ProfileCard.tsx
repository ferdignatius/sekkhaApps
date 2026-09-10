// feature/profile/components/ProfileCard
// Profile header card — left-aligned layout with avatar (camera overlay),
// name, school, user number, role badge, and working "Edit Profil" trigger.

import { useState } from "react"
import {
  PencilIcon,
  CalendarIcon,
  ShieldCheckIcon,
  CopyIcon,
  CheckIcon,
  PhoneIcon,
  MailIcon,
} from "lucide-react"

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
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "UM"
  )
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

  const roleLabel =
    role === "admin"
      ? "Admin Vihara"
      : role === "pengurus"
        ? "Pengurus"
        : role === "aktivis"
          ? "Aktivis"
          : "Umat"
  const roleBadgeStyle: Record<string, string> = {
    admin: "bg-red-50 text-red-700 border-red-200",
    pengurus: "bg-purple-50 text-purple-700 border-purple-200",
    aktivis: "bg-blue-50 text-blue-700 border-blue-200",
    umat: "bg-emerald-50 text-emerald-700 border-emerald-200",
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border border-white/80 bg-gradient-to-br from-white via-white/95 to-blue-50/40 p-5 shadow-xs backdrop-blur-md transition-all hover:shadow-md sm:p-6">
      {/* Decorative Glow */}
      <div className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full bg-sekkha-brand-blue/10 blur-2xl" />

      {/* Edit button — top right */}
      <button
        type="button"
        onClick={onEditProfile}
        className="text-caption-bold absolute top-4 right-4 flex cursor-pointer items-center gap-1.5 rounded-xl border border-sekkha-hairline-strong bg-white/90 px-3.5 py-1.5 text-sekkha-ink shadow-2xs transition-all hover:border-sekkha-brand-blue hover:bg-sekkha-brand-blue hover:text-white active:scale-95"
        aria-label="Edit profil"
      >
        <PencilIcon className="size-3.5" aria-hidden="true" />
        <span>Edit Profil</span>
      </button>

      {/* Content: responsive column on mobile, row on tablet/desktop */}
      <div className="flex flex-col items-start gap-4 pt-1 sm:flex-row sm:items-center sm:gap-6 sm:pt-0">
        {/* Avatar with initials */}
        <div className="relative shrink-0">
          <div
            aria-label={`Inisial ${name}`}
            className="text-heading-3 flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-sekkha-brand-blue via-blue-600 to-indigo-700 font-extrabold text-white uppercase shadow-md ring-4 ring-blue-100 sm:size-24"
          >
            {getInitials(name)}
          </div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-heading-5 truncate font-black text-sekkha-ink">
              {name}
            </h2>
            <span
              className={`text-micro-bold inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 capitalize ${roleBadgeStyle[role] || roleBadgeStyle.umat}`}
            >
              <ShieldCheckIcon className="size-3" />
              <span>{roleLabel}</span>
            </span>
          </div>

          {/* User Number + School */}
          <div className="text-caption flex flex-wrap items-center gap-3 text-sekkha-slate">
            {userNumber && (
              <div className="text-caption-bold flex items-center gap-1 rounded-lg border border-blue-200/60 bg-blue-50/80 px-2.5 py-0.5 font-mono text-sekkha-brand-blue">
                <span>{userNumber}</span>
                <button
                  type="button"
                  onClick={handleCopyNumber}
                  className="ml-1 cursor-pointer p-0.5 text-slate-400 hover:text-sekkha-brand-blue"
                  title="Salin Nomor Unik"
                >
                  {copied ? (
                    <CheckIcon className="size-3 text-emerald-600" />
                  ) : (
                    <CopyIcon className="size-3" />
                  )}
                </button>
              </div>
            )}
            {school && (
              <span className="truncate font-medium">🏫 {school}</span>
            )}
          </div>

          {/* Contact Details (Phone & Email) */}
          <div className="text-micro flex flex-wrap items-center gap-3 pt-0.5 text-sekkha-slate">
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
