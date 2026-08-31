import { useState } from "react"
import {
  XIcon,
  UserIcon,
  PhoneIcon,
  MailIcon,
  SchoolIcon,
  CalendarIcon,
  QrCodeIcon,
  KeyIcon,
  ShieldCheckIcon,
  Trash2Icon,
  CopyIcon,
  CheckIcon,
  PrinterIcon,
  Share2Icon,
  SparklesIcon,
  AwardIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
} from "lucide-react"
import QRCode from "react-qr-code"
import type { MemberDto } from "../api/teamsApi"

interface MemberDetailSheetProps {
  member: MemberDto
  isPengurusOrAdmin: boolean
  isAdmin: boolean
  onClose: () => void
  onResetPassword: (member: MemberDto) => void
  onChangeRole: (member: MemberDto) => void
  onDeleteMember: (member: MemberDto) => void
}

export function MemberDetailSheet({
  member,
  isPengurusOrAdmin,
  isAdmin,
  onClose,
  onResetPassword,
  onChangeRole,
  onDeleteMember,
}: MemberDetailSheetProps) {
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"profile" | "card">("profile")

  const initials =
    member.name
      .split(" ")
      .slice(0, 2)
      .map((w) => (w[0] ? w[0].toUpperCase() : ""))
      .join("") || "UM"

  const roleBadgeStyle: Record<string, string> = {
    admin: "bg-[#ff4d8b]/15 text-[#ff4d8b] border-[#ff4d8b]/30 font-semibold",
    pengurus: "bg-[#1a3a3a] text-white border-[#1a3a3a] font-semibold",
    aktivis: "bg-[#b8a4ed]/30 text-[#0a0a0a] border-[#b8a4ed]/50 font-semibold",
    umat: "bg-[#f5f0e0] text-[#0a0a0a] border-[#e5e5e5] font-semibold",
  }

  function handleCopy(text?: string | null) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const cleanPhone = member.phone ? member.phone.replace(/[^0-9]/g, "") : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-6 shadow-2xl space-y-5 text-left">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-[8px] bg-[#0a0a0a] text-white shadow-xs">
              <UserIcon className="size-4 text-[#e8b94a]" />
            </span>
            <h2 className="text-base font-bold text-[#0a0a0a]">Member Profile & Details</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] cursor-pointer"
            title="Close"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* Member Profile Banner */}
        <div className="rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-[#e8b94a] text-lg font-bold text-[#0a0a0a] shadow-xs uppercase">
                {initials}
              </div>
              <div className="min-w-0 space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-[#0a0a0a] leading-tight break-words">
                  {member.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2">
                  {member.username && (
                    <span className="font-mono text-xs font-bold text-[#1a3a3a] bg-[#1a3a3a]/10 px-2 py-0.5 rounded-[6px]">
                      @{member.username}
                    </span>
                  )}
                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadgeStyle[member.role] || roleBadgeStyle.umat}`}>
                    {member.role}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${member.is_claimed ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
                    {member.is_claimed ? "Claimed Account" : "Unclaimed"}
                  </span>
                </div>
              </div>
            </div>

            {/* Member ID pill */}
            {member.user_number && (
              <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-[#e5e5e5] pt-2 sm:pt-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a]">Member ID</span>
                <button
                  type="button"
                  onClick={() => handleCopy(member.user_number)}
                  className="flex items-center gap-1.5 font-mono text-xs font-bold text-[#0a0a0a] bg-[#fffaf0] hover:bg-[#f5f0e0] border border-[#e5e5e5] px-2.5 py-1 rounded-[8px] transition-colors cursor-pointer"
                  title="Click to copy ID"
                >
                  <span>{member.user_number}</span>
                  {copied ? <CheckIcon className="size-3 text-emerald-600" /> : <CopyIcon className="size-3 text-[#6a6a6a]" />}
                </button>
              </div>
            )}
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-[#e5e5e5]">
            <div className="rounded-[12px] bg-[#fffaf0] border border-[#e5e5e5] p-2.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a] block">Attendance</span>
              <span className="text-base font-bold text-[#0a0a0a]">{member.total_attendance || 0} Events</span>
            </div>
            <div className="rounded-[12px] bg-[#fffaf0] border border-[#e5e5e5] p-2.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a] block">Points Earned</span>
              <span className="text-base font-bold text-[#0a0a0a]">{member.points || 0} Pts</span>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-[12px] bg-[#fffaf0] border border-[#e5e5e5] p-2.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a] block">Gender</span>
              <span className="text-base font-bold text-[#0a0a0a]">
                {member.gender === "L" ? "Male" : member.gender === "P" ? "Female" : "Not set"}
              </span>
            </div>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex items-center gap-1 rounded-[12px] bg-[#faf5e8] p-1 border border-[#e5e5e5]">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "profile"
                ? "bg-[#0a0a0a] text-white shadow-xs"
                : "text-[#6a6a6a] hover:text-[#0a0a0a]"
            }`}
          >
            <UserIcon className="size-3.5" />
            <span>Profile Information</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("card")}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-2 text-xs font-bold transition-all cursor-pointer ${
              activeTab === "card"
                ? "bg-[#0a0a0a] text-white shadow-xs"
                : "text-[#6a6a6a] hover:text-[#0a0a0a]"
            }`}
          >
            <QrCodeIcon className="size-3.5" />
            <span>Digital ID & QR Card</span>
          </button>
        </div>

        {/* Tab 1: Detailed Profile Info */}
        {activeTab === "profile" && (
          <div className="space-y-3">
            <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] divide-y divide-[#f0f0f0] overflow-hidden text-xs">
              
              {/* Phone / WhatsApp */}
              <div className="flex items-center justify-between p-3 sm:px-4">
                <div className="flex items-center gap-2.5 text-[#6a6a6a]">
                  <PhoneIcon className="size-4 text-[#0a0a0a]" />
                  <span className="font-semibold">Phone / WhatsApp</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[#0a0a0a]">{member.phone || "—"}</span>
                  {cleanPhone && (
                    <a
                      href={`https://wa.me/${cleanPhone}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-[6px] hover:bg-emerald-100 transition-colors"
                      title="Open in WhatsApp"
                    >
                      <span>WhatsApp</span>
                      <ExternalLinkIcon className="size-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center justify-between p-3 sm:px-4">
                <div className="flex items-center gap-2.5 text-[#6a6a6a]">
                  <MailIcon className="size-4 text-[#0a0a0a]" />
                  <span className="font-semibold">Email</span>
                </div>
                <span className="font-medium text-[#0a0a0a]">{member.email || "—"}</span>
              </div>

              {/* School / College */}
              <div className="flex items-center justify-between p-3 sm:px-4">
                <div className="flex items-center gap-2.5 text-[#6a6a6a]">
                  <SchoolIcon className="size-4 text-[#0a0a0a]" />
                  <span className="font-semibold">School / College</span>
                </div>
                <span className="font-medium text-[#0a0a0a]">{member.school || "—"}</span>
              </div>

              {/* Birth Date */}
              <div className="flex items-center justify-between p-3 sm:px-4">
                <div className="flex items-center gap-2.5 text-[#6a6a6a]">
                  <CalendarIcon className="size-4 text-[#0a0a0a]" />
                  <span className="font-semibold">Birth Date</span>
                </div>
                <span className="font-medium text-[#0a0a0a]">
                  {member.birth_date
                    ? new Date(member.birth_date).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>

              {/* Registered Date */}
              <div className="flex items-center justify-between p-3 sm:px-4">
                <div className="flex items-center gap-2.5 text-[#6a6a6a]">
                  <SparklesIcon className="size-4 text-[#0a0a0a]" />
                  <span className="font-semibold">Member Since</span>
                </div>
                <span className="font-medium text-[#0a0a0a]">
                  {member.created_at
                    ? new Date(member.created_at).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>

            </div>
          </div>
        )}

        {/* Tab 2: Digital ID Card & QR Code */}
        {activeTab === "card" && (
          <div className="space-y-3">
            <div className="rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2.5">
                <div>
                  <p className="text-xs font-bold text-[#0a0a0a]">Sekkha Community</p>
                  <p className="text-[11px] font-medium text-[#6a6a6a]">Official Membership ID Card</p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadgeStyle[member.role] || roleBadgeStyle.umat}`}>
                  {member.role}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center py-2 space-y-3">
                <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 shadow-xs">
                  <QRCode
                    value={member.user_number || member.id}
                    size={140}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox="0 0 256 256"
                  />
                </div>

                <div className="text-center space-y-0.5">
                  <p className="text-sm sm:text-base font-bold text-[#0a0a0a]">{member.name}</p>
                  <p className="font-mono text-xs font-bold text-[#1a3a3a]">{member.user_number || "—"}</p>
                  {member.school && <p className="text-xs text-[#6a6a6a]">🏫 {member.school}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6a6a6a] pt-2 border-t border-[#e5e5e5]">
                <span>Status: {member.is_claimed ? "✅ Active Account" : "⚠️ Unclaimed"}</span>
                <span>Total Attendance: {member.total_attendance || 0}x</span>
              </div>
            </div>

            {/* Print & Copy Card buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCopy(member.user_number)}
                className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
              >
                {copied ? <CheckIcon className="size-4 text-emerald-600" /> : <CopyIcon className="size-4 text-[#6a6a6a]" />}
                <span>{copied ? "Copied!" : "Copy Member ID"}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer"
              >
                <PrinterIcon className="size-4" />
                <span>Print Card</span>
              </button>
            </div>
          </div>
        )}

        {/* Pengurus / Admin Management Actions Toolbar */}
        {isPengurusOrAdmin && (
          <div className="space-y-2.5 pt-2 border-t border-[#e5e5e5]">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a]">
              Administrative Actions
            </p>
            <div className="grid grid-cols-3 gap-2">
              {/* Reset Password */}
              <button
                type="button"
                onClick={() => onResetPassword(member)}
                className="h-11 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-[12px] border border-[#e8b94a]/50 bg-[#e8b94a]/15 px-2 text-xs font-bold text-[#0a0a0a] hover:bg-[#e8b94a]/25 transition-all cursor-pointer"
                title="Reset Password to default (sekkha123)"
              >
                <KeyIcon className="size-3.5 text-[#0a0a0a]" />
                <span className="text-[11px] sm:text-xs">Reset Pass</span>
              </button>

              {/* Change Role */}
              <button
                type="button"
                onClick={() => onChangeRole(member)}
                className="h-11 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-2 text-xs font-bold text-[#0a0a0a] hover:bg-[#faf5e8] transition-all cursor-pointer"
                title="Change Account Role"
              >
                <ShieldCheckIcon className="size-3.5 text-[#0a0a0a]" />
                <span className="text-[11px] sm:text-xs">Change Role</span>
              </button>

              {/* Delete Member */}
              <button
                type="button"
                onClick={() => onDeleteMember(member)}
                className="h-11 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-[12px] border border-rose-200 bg-rose-50 px-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                title="Delete Member"
              >
                <Trash2Icon className="size-3.5" />
                <span className="text-[11px] sm:text-xs">Delete</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
