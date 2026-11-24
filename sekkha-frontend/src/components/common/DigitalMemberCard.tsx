import { useState } from "react"
import QRCode from "react-qr-code"
import {
  CopyIcon,
  CheckIcon,
  Maximize2Icon,
  Minimize2Icon,
  PrinterIcon,
  ShieldCheckIcon,
  SparklesIcon,
  FlameIcon,
  GraduationCapIcon,
} from "lucide-react"
import { Button } from "@/components/base"
import { MemberQrModal } from "@/components/common/MemberQrModal"

export interface DigitalMemberCardProps {
  name: string
  userNumber?: number | string | null
  role?: string | null
  school?: string | null
  joinedAt?: string | null
  username?: string | null
  points?: number
  currentStreak?: number
  streakStatus?: "active" | "paused" | "inactive" | "expired"
  isClaimed?: boolean
  inlineEnlargeQr?: boolean
  onCopyMemberId?: (memberId: string) => void
}

const ROLE_DISPLAY_NAMES: Record<string, string> = {
  member: "Community Member",
  activist: "Dhamma Activist",
  organizer: "Temple Organizer",
  admin: "System Master",
}

const ROLE_CARD_STYLES: Record<
  string,
  {
    cardBg: string
    headerSub: string
    badge: string
    numberText: string
    subtext: string
    footerText: string
    accentGlow: string
  }
> = {
  member: {
    cardBg:
      "bg-gradient-to-br from-[#FDFBF7] via-[#FAF6ED] to-[#F2EADB] text-[#1C1A17] border-[#E5D9C3] shadow-md ring-1 ring-black/5",
    headerSub: "text-[#7A7365]",
    badge: "bg-[#EFE8D8] text-[#4A4437] border-[#DDD3BF]",
    numberText: "text-[#1C1A17]",
    subtext: "text-[#7A7365]",
    footerText: "text-[#8C8474]",
    accentGlow: "from-amber-200/20 via-transparent to-transparent",
  },
  activist: {
    cardBg:
      "bg-gradient-to-br from-[#064E3B] via-[#043E2F] to-[#022C22] text-white border-[#10B981]/40 shadow-lg ring-1 ring-emerald-500/20",
    headerSub: "text-[#A7F3D0]",
    badge: "bg-[#10B981]/25 text-[#6EE7B7] border-[#10B981]/50",
    numberText: "text-[#F0FDF4]",
    subtext: "text-[#A7F3D0]",
    footerText: "text-[#6EE7B7]/80",
    accentGlow: "from-emerald-400/15 via-transparent to-transparent",
  },
  organizer: {
    cardBg:
      "bg-gradient-to-br from-[#1E293B] via-[#131D2E] to-[#0F172A] text-white border-[#3B82F6]/40 shadow-lg ring-1 ring-blue-500/20",
    headerSub: "text-[#93C5FD]",
    badge: "bg-[#3B82F6]/25 text-[#93C5FD] border-[#3B82F6]/50",
    numberText: "text-[#F8FAFC]",
    subtext: "text-[#93C5FD]",
    footerText: "text-[#93C5FD]/80",
    accentGlow: "from-blue-400/15 via-transparent to-transparent",
  },
  admin: {
    cardBg:
      "bg-gradient-to-br from-[#18181B] via-[#111113] to-[#09090B] text-[#FAFAFA] border-[#E8B94A]/40 shadow-xl ring-1 ring-amber-500/20",
    headerSub: "text-[#E8B94A]",
    badge: "bg-[#E8B94A]/20 text-[#F6D87C] border-[#E8B94A]/50",
    numberText: "text-[#FFFFFF]",
    subtext: "text-[#D4AF37]",
    footerText: "text-[#E8B94A]/80",
    accentGlow: "from-[#E8B94A]/15 via-transparent to-transparent",
  },
}

/**
 * Reusable Digital Membership Pass card (Clay visual language + Apple HIG touch ergonomics).
 */
export function DigitalMemberCard({
  name,
  userNumber,
  role = "member",
  school,
  joinedAt,
  username,
  points,
  currentStreak,
  streakStatus = "active",
  isClaimed,
  inlineEnlargeQr = false,
  onCopyMemberId,
}: DigitalMemberCardProps) {
  const [copied, setCopied] = useState(false)
  const [showEnlargeQr, setShowEnlargeQr] = useState(false)

  const memberIdStr = userNumber ? String(userNumber) : ""

  function handleCopyId() {
    if (!memberIdStr) return
    navigator.clipboard
      .writeText(memberIdStr)
      .then(() => {
        setCopied(true)
        onCopyMemberId?.(memberIdStr)
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {})
  }

  function handlePrint() {
    window.print()
  }

  const memberSince = joinedAt
    ? new Date(joinedAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null

  const normalizedRole = (role || "member").toLowerCase()
  const roleCardStyles =
    ROLE_CARD_STYLES[normalizedRole] || ROLE_CARD_STYLES.member

  return (
    <div className="w-full max-w-full min-w-0 space-y-3.5">
      {inlineEnlargeQr && showEnlargeQr ? (
        /* ── INLINE ENLARGED QR VIEW (Used Inside Drawer — No Stacked Second Popup) ── */
        <div
          data-testid="digital-member-card-enlarged-qr"
          className="flex flex-col items-center justify-center rounded-[22px] border border-hairline bg-surface-soft p-5 text-center shadow-xs"
        >
          <p className="text-[11px] font-bold tracking-wider text-text-muted uppercase">
            Check-In QR Code
          </p>
          <div className="mt-3 rounded-[18px] border-2 border-ink bg-white p-4 shadow-md">
            {memberIdStr ? (
              <QRCode
                value={memberIdStr}
                size={196}
                className="size-[180px] sm:size-[196px]"
                viewBox="0 0 256 256"
              />
            ) : (
              <div className="flex size-[180px] items-center justify-center text-xs font-semibold text-text-muted">
                QR Code unavailable
              </div>
            )}
          </div>
          <p className="mt-3 font-mono text-base font-black tracking-widest text-ink">
            {memberIdStr || "—"}
          </p>
          <p className="mt-0.5 max-w-full truncate text-xs font-semibold text-text-muted">
            {name || "Community Member"}
          </p>
        </div>
      ) : (
        /* ── HIG PHYSICAL/DIGITAL MEMBER CARD (Responsive, Never Clipped) ── */
        <div
          className={`relative w-full max-w-full overflow-hidden rounded-[22px] border p-4 transition-all duration-300 sm:p-5 ${roleCardStyles.cardBg}`}
        >
          {/* Subtle Specular Top Highlight */}
          <div
            className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${roleCardStyles.accentGlow}`}
          />

          <div className="relative z-10 flex w-full min-w-0 flex-col justify-between gap-3.5 sm:gap-4">
            {/* Card Top: Logo, Subtitle & Role Chip */}
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-[10px] bg-white/90 p-1.5 shadow-xs">
                  <img
                    src="/sekkha_logo.svg"
                    alt="Sekkha"
                    className="size-full object-contain"
                    onError={(e) => {
                      ;(e.target as HTMLElement).style.display = "none"
                    }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-[9px] font-bold tracking-wider uppercase sm:text-[10px] ${roleCardStyles.headerSub}`}
                  >
                    Sekkha Dhamma Community
                  </p>
                  <h4 className="truncate text-[11px] font-black tracking-tight uppercase sm:text-xs">
                    Official Identity Pass
                  </h4>
                </div>
              </div>

              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize sm:px-2.5 sm:text-[11px] ${roleCardStyles.badge}`}
              >
                <ShieldCheckIcon className="size-3 shrink-0" />
                <span>{ROLE_DISPLAY_NAMES[normalizedRole] || normalizedRole}</span>
              </span>
            </div>

            {/* Card Middle: Member Name & Tap-to-Enlarge High-Contrast QR Code */}
            <div className="flex min-w-0 items-center justify-between gap-3 py-0.5">
              <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
                <p
                  className={`text-[10px] font-medium tracking-wider uppercase ${roleCardStyles.subtext}`}
                >
                  Cardholder Name
                </p>
                <h3 className="truncate text-base font-bold tracking-tight sm:text-xl">
                  {name || "Community Member"}
                </h3>

                {username && (
                  <p
                    className={`truncate font-mono text-xs font-semibold ${roleCardStyles.subtext}`}
                  >
                    @{username}
                  </p>
                )}

                <div className="pt-1.5">
                  <p
                    className={`text-[9px] font-medium tracking-widest uppercase ${roleCardStyles.subtext}`}
                  >
                    Member ID
                  </p>
                  <p
                    className={`truncate font-mono text-sm font-black tracking-widest sm:text-base ${roleCardStyles.numberText}`}
                  >
                    {memberIdStr || "—"}
                  </p>
                </div>

                {school && (
                  <div className="flex min-w-0 items-center gap-1.5 pt-0.5 text-xs">
                    <GraduationCapIcon
                      className={`size-3.5 shrink-0 ${roleCardStyles.subtext}`}
                    />
                    <span
                      className={`min-w-0 flex-1 truncate text-xs font-medium ${roleCardStyles.subtext}`}
                      title={school}
                    >
                      {school}
                    </span>
                  </div>
                )}

                {(points !== undefined || currentStreak !== undefined) && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                    {points !== undefined && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${roleCardStyles.badge}`}
                      >
                        <SparklesIcon className="size-2.5 shrink-0" />
                        <span>{points.toLocaleString("en-US")} Pts</span>
                      </span>
                    )}
                    {currentStreak !== undefined && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${roleCardStyles.badge}`}
                      >
                        <FlameIcon className="size-2.5 shrink-0 fill-current" />
                        <span>
                          {streakStatus === "paused" && currentStreak > 0
                            ? `${currentStreak} Wk Paused`
                            : `${currentStreak} Wk Streak`}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Interactive Tap-to-Enlarge QR Code Container */}
              <button
                type="button"
                onClick={() => memberIdStr && setShowEnlargeQr(true)}
                disabled={!memberIdStr}
                aria-label="Tap QR code to enlarge"
                title="Tap to enlarge QR code"
                className="group flex shrink-0 cursor-pointer flex-col items-center rounded-[14px] focus-visible:ring-2 focus-visible:ring-clay-ochre focus-visible:outline-none disabled:cursor-default"
              >
                <div className="rounded-[12px] border border-black/10 bg-white p-1.5 shadow-sm transition-transform group-hover:scale-105 group-active:scale-95 sm:p-2">
                  {memberIdStr ? (
                    <QRCode
                      value={memberIdStr}
                      size={84}
                      className="size-[72px] sm:size-[84px]"
                      viewBox="0 0 256 256"
                    />
                  ) : (
                    <div className="flex size-[72px] items-center justify-center text-[10px] font-semibold text-neutral-400 sm:size-[84px]">
                      No QR
                    </div>
                  )}
                </div>
                <p className="mt-1 text-[9px] font-bold tracking-widest text-neutral-400 uppercase">
                  Tap QR
                </p>
              </button>
            </div>

            {/* Card Footer: Joined Date & Account Status */}
            <div
              className={`flex min-w-0 items-center justify-between gap-2 border-t border-black/5 pt-2.5 text-[10px] font-medium sm:text-xs ${roleCardStyles.footerText}`}
            >
              <span className="truncate">
                {memberSince ? `Member since ${memberSince}` : "Active Member"}
              </span>
              <span className="flex shrink-0 items-center gap-1 font-mono text-[10px] tracking-wider uppercase opacity-80">
                <SparklesIcon className="size-2.5 shrink-0" />
                {isClaimed === false ? "Pre-Provisioned Pass" : "Secured Pass"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── CARD ACTION BUTTONS ── */}
      <div className="grid grid-cols-3 gap-2 pt-0.5 sm:gap-2.5">
        <Button
          variant="outlined"
          type="button"
          onClick={handleCopyId}
          disabled={!memberIdStr}
          className="h-11 w-full justify-center gap-1.5 rounded-[12px] px-2 text-xs font-semibold sm:px-3"
        >
          {copied ? (
            <CheckIcon className="size-4 shrink-0 text-emerald-600" />
          ) : (
            <CopyIcon className="size-4 shrink-0" />
          )}
          <span className="truncate">{copied ? "Copied!" : "Copy ID"}</span>
        </Button>

        <Button
          variant="filled"
          type="button"
          onClick={() => setShowEnlargeQr((prev) => (inlineEnlargeQr ? !prev : true))}
          disabled={!memberIdStr}
          className="h-11 w-full justify-center gap-1.5 rounded-[12px] px-2 text-xs font-semibold sm:px-3"
        >
          {inlineEnlargeQr && showEnlargeQr ? (
            <>
              <Minimize2Icon className="size-4 shrink-0" />
              <span className="truncate">Show Card</span>
            </>
          ) : (
            <>
              <Maximize2Icon className="size-4 shrink-0" />
              <span className="truncate">Enlarge QR</span>
            </>
          )}
        </Button>

        <Button
          variant="outlined"
          type="button"
          onClick={handlePrint}
          className="h-11 w-full justify-center gap-1.5 rounded-[12px] px-2 text-xs font-semibold sm:px-3"
        >
          <PrinterIcon className="size-4 shrink-0" />
          <span className="truncate">Print</span>
        </Button>
      </div>

      {!inlineEnlargeQr && (
        <MemberQrModal
          open={showEnlargeQr}
          onClose={() => setShowEnlargeQr(false)}
          userNumber={memberIdStr}
          name={name}
        />
      )}
    </div>
  )
}

