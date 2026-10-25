import { useState } from "react"
import QRCode from "react-qr-code"
import {
  CopyIcon,
  CheckIcon,
  Maximize2Icon,
  PrinterIcon,
  ShieldCheckIcon,
  SparklesIcon,
  XIcon,
  GraduationCapIcon,
} from "lucide-react"
import { Button } from "@/components/base"
import type { UserRole } from "../api/userApi"

interface DigitalMemberCardProps {
  name: string
  userNumber?: number | string | null
  role: UserRole | string
  school?: string | null
  joinedAt?: string
  username?: string | null
  onToast?: (message: string, type?: "success" | "error") => void
}

export function DigitalMemberCard({
  name,
  userNumber,
  role = "member",
  school,
  joinedAt,
  username,
  onToast,
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
        onToast?.("Member ID copied to clipboard!")
        setTimeout(() => setCopied(false), 2000)
      })
      .catch(() => {
        onToast?.("Failed to copy Member ID", "error")
      })
  }

  function handlePrint() {
    window.print()
  }

  // Format joined date
  const memberSince = joinedAt
    ? new Date(joinedAt).toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      })
    : null

  // Normalize role
  const normalizedRole = (role || "member").toLowerCase()

  // HIG Role-Specific Styles
  const roleCardStyles = {
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
  }[normalizedRole] || {
    cardBg:
      "bg-gradient-to-br from-[#FDFBF7] via-[#FAF6ED] to-[#F2EADB] text-[#1C1A17] border-[#E5D9C3] shadow-md ring-1 ring-black/5",
    headerSub: "text-[#7A7365]",
    badge: "bg-[#EFE8D8] text-[#4A4437] border-[#DDD3BF]",
    numberText: "text-[#1C1A17]",
    subtext: "text-[#7A7365]",
    footerText: "text-[#8C8474]",
    accentGlow: "from-amber-200/20 via-transparent to-transparent",
  }

  const roleDisplayNames: Record<string, string> = {
    member: "Community Member",
    activist: "Dhamma Activist",
    organizer: "Temple Organizer",
    admin: "System Master",
  }

  return (
    <div className="space-y-4">
      {/* ── HIG PHYSICAL/DIGITAL MEMBER CARD (1.586 : 1 Standard Ratio) ── */}
      <div
        className={`relative overflow-hidden rounded-[22px] border p-5 transition-all duration-300 sm:p-6 ${roleCardStyles.cardBg}`}
        style={{ minHeight: "220px" }}
      >
        {/* Subtle Specular Top Highlight */}
        <div
          className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${roleCardStyles.accentGlow}`}
        />

        <div className="relative z-10 flex h-full flex-col justify-between gap-5">
          {/* Card Top: Logo, Subtitle & Role Chip */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/90 p-1.5 shadow-xs">
                <img
                  src="/sekkha_logo.svg"
                  alt="Sekkha"
                  className="size-full object-contain"
                  onError={(e) => {
                    // Fallback to minimal glyph if logo svg is unavailable
                    ;(e.target as HTMLElement).style.display = "none"
                  }}
                />
              </div>
              <div>
                <p
                  className={`text-[10px] font-bold tracking-widest uppercase sm:text-[11px] ${roleCardStyles.headerSub}`}
                >
                  Sekkha Dhamma Community
                </p>
                <h4 className="text-xs font-black tracking-tight uppercase sm:text-sm">
                  Official Identity Pass
                </h4>
              </div>
            </div>

            {/* Role Badge */}
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-bold capitalize sm:text-xs ${roleCardStyles.badge}`}
            >
              <ShieldCheckIcon className="size-3" />
              <span>{roleDisplayNames[normalizedRole] || normalizedRole}</span>
            </span>
          </div>

          {/* Card Middle: Member Name & High-Contrast QR Code */}
          <div className="flex items-center justify-between gap-4 py-1">
            <div className="min-w-0 flex-1 space-y-1">
              <p
                className={`text-[11px] font-medium tracking-wider uppercase ${roleCardStyles.subtext}`}
              >
                Cardholder Name
              </p>
              <h3 className="truncate text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
                {name || "Community Member"}
              </h3>

              {username && (
                <p
                  className={`font-mono text-xs font-semibold ${roleCardStyles.subtext}`}
                >
                  @{username}
                </p>
              )}

              {/* Monospace User Number */}
              <div className="pt-2">
                <p
                  className={`text-[10px] font-medium tracking-widest uppercase ${roleCardStyles.subtext}`}
                >
                  Member ID
                </p>
                <p
                  className={`font-mono text-sm font-black tracking-widest sm:text-base ${roleCardStyles.numberText}`}
                >
                  {memberIdStr || "—"}
                </p>
              </div>

              {school && (
                <div className="flex items-center gap-1.5 pt-1 text-xs">
                  <GraduationCapIcon
                    className={`size-3.5 ${roleCardStyles.subtext}`}
                  />
                  <span
                    className={`truncate text-xs font-medium ${roleCardStyles.subtext}`}
                  >
                    {school}
                  </span>
                </div>
              )}
            </div>

            {/* High-Contrast QR Code Container (HIG standard: pure white surface) */}
            <div className="flex shrink-0 flex-col items-center">
              <div className="rounded-[14px] border border-black/10 bg-white p-2.5 shadow-sm transition-transform hover:scale-105">
                {memberIdStr ? (
                  <QRCode
                    value={memberIdStr}
                    size={96}
                    style={{
                      height: "auto",
                      maxWidth: "100%",
                      width: "96px",
                    }}
                    viewBox="0 0 256 256"
                  />
                ) : (
                  <div className="flex size-24 items-center justify-center text-[10px] font-semibold text-neutral-400">
                    No QR
                  </div>
                )}
              </div>
              <p className="mt-1 text-[9px] font-bold tracking-widest text-neutral-400 uppercase">
                Scan Code
              </p>
            </div>
          </div>

          {/* Card Footer: Joined Date & Security Watermark */}
          <div
            className={`flex items-center justify-between border-t border-black/5 pt-2.5 text-[10px] font-medium sm:text-xs ${roleCardStyles.footerText}`}
          >
            <span>
              {memberSince ? `Member since ${memberSince}` : "Active Member"}
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] tracking-wider uppercase opacity-80">
              <SparklesIcon className="size-2.5" />
              Secured Pass
            </span>
          </div>
        </div>
      </div>

      {/* ── CARD ACTION BUTTONS ── */}
      <div className="flex flex-wrap gap-2.5 pt-1">
        <Button
          variant="outlined"
          type="button"
          onClick={handleCopyId}
          className="flex-1 gap-1.5 rounded-[12px] text-xs font-semibold sm:text-sm"
        >
          {copied ? (
            <CheckIcon className="size-4 text-emerald-600" />
          ) : (
            <CopyIcon className="size-4" />
          )}
          <span>{copied ? "Copied!" : "Copy Member ID"}</span>
        </Button>

        <Button
          variant="outlined"
          type="button"
          onClick={() => setShowEnlargeQr(true)}
          className="flex-1 gap-1.5 rounded-[12px] text-xs font-semibold sm:text-sm"
        >
          <Maximize2Icon className="size-4" />
          <span>Enlarge QR</span>
        </Button>

        <Button
          variant="filled"
          type="button"
          onClick={handlePrint}
          className="flex-1 gap-1.5 rounded-[12px] text-xs font-semibold sm:text-sm"
        >
          <PrinterIcon className="size-4" />
          <span>Print Card</span>
        </Button>
      </div>

      {/* ── MODAL: ENLARGE QR FOR EVENT DOOR SCAN ── */}
      {showEnlargeQr && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/70 p-4 backdrop-blur-xs fade-in">
          <div className="relative w-full max-w-sm space-y-4 rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-6 text-center shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="text-left">
                <h3 className="text-base font-bold text-[#0a0a0a]">
                  Check-in QR Code
                </h3>
                <p className="text-xs text-[#6a6a6a]">
                  Show this code to organizers at the entrance
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowEnlargeQr(false)}
                className="cursor-pointer rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8]"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="flex flex-col items-center justify-center py-4">
              <div className="rounded-[18px] border-2 border-[#0a0a0a] bg-white p-4 shadow-lg">
                {memberIdStr ? (
                  <QRCode
                    value={memberIdStr}
                    size={200}
                    style={{
                      height: "auto",
                      maxWidth: "100%",
                      width: "200px",
                    }}
                    viewBox="0 0 256 256"
                  />
                ) : (
                  <p className="text-xs text-[#6a6a6a]">QR Code unavailable</p>
                )}
              </div>
              <p className="mt-3 font-mono text-base font-black tracking-widest text-[#0a0a0a]">
                {memberIdStr}
              </p>
              <p className="text-xs font-medium text-[#6a6a6a]">{name}</p>
            </div>

            <Button
              variant="filled"
              type="button"
              onClick={() => setShowEnlargeQr(false)}
              className="w-full rounded-[12px]"
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
