import { useState, useEffect } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import {
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
  SparklesIcon,
  ExternalLinkIcon,
  ClockIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XIcon,
  Share2Icon,
} from "lucide-react"
import QRCode from "react-qr-code"
import { useAuth } from "@/modules/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { Skeleton } from "@/components/ui/skeleton"
import { teamsApi } from "../api/teamsApi"
import type { MemberDetailDto } from "../api/teamsApi"

export function formatRoleLabel(role?: string | null): string {
  if (!role) return "Member"
  const r = role.toLowerCase()
  switch (r) {
    case "admin":
      return "Admin"
    case "pengurus":
      return "Organizer"
    case "aktivis":
      return "Activist"
    case "umat":
    default:
      return "Member"
  }
}

export function MemberDetailPage({ memberId: propMemberId }: { memberId?: string }) {
  const navigate = useNavigate()
  const params = useParams({ strict: false })
  const memberId = propMemberId || (params as any)?.memberId

  const { authState } = useAuth()
  const isPengurusOrAdmin = authState.status === "authenticated" && (authState.role === "pengurus" || authState.role === "admin")
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const [member, setMember] = useState<MemberDetailDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [activeTab, setActiveTab] = useState<"profile" | "card" | "attendance">("profile")

  // Admin Modals
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newRole, setNewRole] = useState<"umat" | "aktivis" | "pengurus" | "admin">("umat")
  const [savingRole, setSavingRole] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [credentialModalData, setCredentialModalData] = useState<{
    memberName: string
    username: string
    defaultPassword: string
    userNumber?: string
    phone?: string | null
  } | null>(null)

  // Toast
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null)

  function showToast(text: string, type: "success" | "error" = "success") {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    if (memberId) {
      loadMember()
    }
  }, [memberId])

  async function loadMember() {
    if (!memberId) return
    setLoading(true)
    try {
      const res = await teamsApi.getMember(memberId)
      setMember(res)
      if (res.role) {
        setNewRole(res.role)
      }
    } catch (err: any) {
      console.error("Failed to load member detail:", err)
      showToast("Failed to load member details", "error")
    } finally {
      setLoading(false)
    }
  }

  function handleCopy(text?: string | null) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(true)
    showToast("Member ID copied to clipboard!")
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleResetPassword() {
    if (!member) return
    try {
      const res = await teamsApi.resetMemberPassword(member.id)
      setCredentialModalData({
        memberName: member.name,
        username: res.username || member.username || member.name.toLowerCase().replace(/\s+/g, ""),
        defaultPassword: res.default_password || "sekkha123",
        userNumber: member.user_number || undefined,
        phone: member.phone,
      })
      showToast("Password reset successfully!")
    } catch (err: any) {
      showToast(err.message || "Failed to reset password", "error")
    }
  }

  async function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault()
    if (!member) return
    setSavingRole(true)
    try {
      await teamsApi.updateMember(member.id, { role: newRole })
      setMember((prev) => (prev ? { ...prev, role: newRole } : null))
      setShowRoleModal(false)
      showToast("Member role updated!")
    } catch (err: any) {
      showToast(err.message || "Failed to update role", "error")
    } finally {
      setSavingRole(false)
    }
  }

  async function handleDeleteMember() {
    if (!member) return
    setDeleting(true)
    try {
      await teamsApi.deleteMember(member.id)
      showToast("Member deleted successfully!")
      setTimeout(() => {
        navigate({ to: "/teams" })
      }, 1000)
    } catch (err: any) {
      showToast(err.message || "Failed to delete member", "error")
      setDeleting(false)
    }
  }

  const initials =
    member?.name
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

  const cleanPhone = member?.phone ? member.phone.replace(/[^0-9]/g, "") : null

  return (
    <main className="min-h-screen bg-[#fffaf0] text-left font-sans">
      <PageBreadcrumb
        items={[
          { label: "People", href: "/teams" },
          { label: member?.name || "Member Details" },
        ]}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2.5 rounded-[12px] px-4 py-3 shadow-xl border ${
              toast.type === "success"
                ? "bg-[#0a0a0a] text-white border-emerald-500/50"
                : "bg-rose-600 text-white border-rose-500/50"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircleIcon className="size-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangleIcon className="size-5 text-white shrink-0" />
            )}
            <p className="text-xs font-bold">{toast.text}</p>
          </div>
        </div>
      )}

      <div className="px-3.5 py-4 pb-36 sm:pb-24 md:px-8 md:pb-12 max-w-4xl mx-auto space-y-5">
        
        {loading ? (
          <div className="space-y-4">
            <div className="rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-4">
                <Skeleton className="size-20 rounded-[16px]" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-7 w-48 rounded-[8px]" />
                  <Skeleton className="h-5 w-32 rounded-[6px]" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Skeleton className="h-20 rounded-[16px]" />
              <Skeleton className="h-20 rounded-[16px]" />
              <Skeleton className="h-20 rounded-[16px]" />
            </div>
          </div>
        ) : !member ? (
          <div className="rounded-[24px] border border-dashed border-[#e5e5e5] bg-[#faf5e8] p-10 text-center space-y-2">
            <UserIcon className="size-10 mx-auto text-[#6a6a6a]/40" />
            <h3 className="text-sm font-bold text-[#0a0a0a]">Member Not Found</h3>
            <p className="text-xs text-[#6a6a6a]">This member profile could not be found or has been deleted.</p>
          </div>
        ) : (
          <>
            {/* ── 1. CLAY HERO PROFILE BANNER ── */}
            <div className="rounded-[20px] sm:rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-5 sm:p-7 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex size-16 sm:size-20 shrink-0 items-center justify-center rounded-[16px] bg-[#e8b94a] text-xl sm:text-2xl font-bold text-[#0a0a0a] shadow-xs uppercase">
                    {initials}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h1 className="text-lg sm:text-2xl font-bold text-[#0a0a0a] leading-tight break-words">
                      {member.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                      {member.username && (
                        <span className="font-mono text-xs font-bold text-[#1a3a3a] bg-[#1a3a3a]/10 px-2 py-0.5 rounded-[6px]">
                          @{member.username}
                        </span>
                      )}
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeStyle[member.role] || roleBadgeStyle.umat}`}>
                        {formatRoleLabel(member.role)}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${member.is_claimed ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-amber-50 text-amber-800 border-amber-200"}`}>
                        {member.is_claimed ? "Claimed Account" : "Unclaimed"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Member ID Pill */}
                {member.user_number && (
                  <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 border-[#e5e5e5] pt-2 sm:pt-0 shrink-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a]">Member ID</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(member.user_number)}
                      className="flex items-center gap-1.5 font-mono text-xs sm:text-sm font-bold text-[#0a0a0a] bg-[#fffaf0] hover:bg-[#f5f0e0] border border-[#e5e5e5] px-3 py-1 rounded-[8px] transition-colors cursor-pointer"
                      title="Click to copy ID"
                    >
                      <span>{member.user_number}</span>
                      {copied ? <CheckIcon className="size-3.5 text-emerald-600" /> : <CopyIcon className="size-3.5 text-[#6a6a6a]" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[#e5e5e5]">
                <div className="rounded-[12px] bg-[#fffaf0] border border-[#e5e5e5] p-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a] block">Attendance</span>
                  <span className="text-base font-bold text-[#0a0a0a]">{member.attendances?.length ?? member.total_attendance ?? 0} Events</span>
                </div>
                <div className="rounded-[12px] bg-[#fffaf0] border border-[#e5e5e5] p-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a] block">Points Earned</span>
                  <span className="text-base font-bold text-[#0a0a0a]">{member.points || 0} Pts</span>
                </div>
                <div className="col-span-2 sm:col-span-1 rounded-[12px] bg-[#fffaf0] border border-[#e5e5e5] p-3 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a] block">Gender</span>
                  <span className="text-base font-bold text-[#0a0a0a]">
                    {member.gender === "L" ? "Male" : member.gender === "P" ? "Female" : "Not set"}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 2. SEGMENTED TAB SWITCHER ── */}
            <div className="flex items-center gap-1 rounded-[12px] bg-[#faf5e8] p-1 border border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-2 px-1 text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "profile"
                    ? "bg-[#0a0a0a] text-white shadow-xs"
                    : "text-[#6a6a6a] hover:text-[#0a0a0a]"
                }`}
              >
                <UserIcon className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Profile Information</span>
                <span className="sm:hidden">Profile</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("card")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-2 px-1 text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "card"
                    ? "bg-[#0a0a0a] text-white shadow-xs"
                    : "text-[#6a6a6a] hover:text-[#0a0a0a]"
                }`}
              >
                <QrCodeIcon className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Digital ID & QR Card</span>
                <span className="sm:hidden">ID Card</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("attendance")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-2 px-1 text-[11px] sm:text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === "attendance"
                    ? "bg-[#0a0a0a] text-white shadow-xs"
                    : "text-[#6a6a6a] hover:text-[#0a0a0a]"
                }`}
              >
                <ClockIcon className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Attendance ({member.attendances?.length || 0})</span>
                <span className="sm:hidden">History ({member.attendances?.length || 0})</span>
              </button>
            </div>

            {/* ── 3. TAB 1: PROFILE INFORMATION ── */}
            {activeTab === "profile" && (
              <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] divide-y divide-[#f0f0f0] overflow-hidden text-xs shadow-xs">
                
                {/* Phone / WhatsApp */}
                <div className="flex items-center justify-between p-3.5 sm:px-5">
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
                <div className="flex items-center justify-between p-3.5 sm:px-5">
                  <div className="flex items-center gap-2.5 text-[#6a6a6a]">
                    <MailIcon className="size-4 text-[#0a0a0a]" />
                    <span className="font-semibold">Email</span>
                  </div>
                  <span className="font-medium text-[#0a0a0a]">{member.email || "—"}</span>
                </div>

                {/* School / College */}
                <div className="flex items-center justify-between p-3.5 sm:px-5">
                  <div className="flex items-center gap-2.5 text-[#6a6a6a]">
                    <SchoolIcon className="size-4 text-[#0a0a0a]" />
                    <span className="font-semibold">School / College</span>
                  </div>
                  <span className="font-medium text-[#0a0a0a]">{member.school || "—"}</span>
                </div>

                {/* Birth Date */}
                <div className="flex items-center justify-between p-3.5 sm:px-5">
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
                <div className="flex items-center justify-between p-3.5 sm:px-5">
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
            )}

            {/* ── 4. TAB 2: DIGITAL ID & QR CARD ── */}
            {activeTab === "card" && (
              <div className="space-y-4">
                <div className="rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-5 sm:p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                    <div>
                      <p className="text-xs font-bold text-[#0a0a0a]">Sekkha Community</p>
                      <p className="text-[11px] font-medium text-[#6a6a6a]">Official Membership ID Card</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeStyle[member.role] || roleBadgeStyle.umat}`}>
                      {formatRoleLabel(member.role)}
                    </span>
                  </div>

                  <div className="flex flex-col items-center justify-center py-3 space-y-3">
                    <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs">
                      <QRCode
                        value={member.user_number || member.id}
                        size={150}
                        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                        viewBox="0 0 256 256"
                      />
                    </div>

                    <div className="text-center space-y-0.5">
                      <p className="text-sm sm:text-base font-bold text-[#0a0a0a]">{member.name}</p>
                      <p className="font-mono text-xs font-bold text-[#1a3a3a]">{member.user_number || "—"} ({member.school || "Member"})</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#6a6a6a] pt-2 border-t border-[#e5e5e5]">
                    <span>Status: {member.is_claimed ? "✅ Active Account" : "⚠️ Unclaimed"}</span>
                    <span>Total Attendance: {member.attendances?.length ?? member.total_attendance ?? 0}x</span>
                  </div>
                </div>

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

            {/* ── 5. TAB 3: ATTENDANCE HISTORY ── */}
            {activeTab === "attendance" && (
              <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2.5">
                  <h3 className="text-sm font-bold text-[#0a0a0a]">Event Attendance Records</h3>
                  <span className="text-xs text-[#6a6a6a]">Total {member.attendances?.length || 0} Events</span>
                </div>

                {member.attendances && member.attendances.length > 0 ? (
                  <div className="divide-y divide-[#f0f0f0]">
                    {member.attendances.map((att) => (
                      <div key={att.id} className="flex items-center justify-between py-3 px-1 hover:bg-[#faf5e8] rounded-[10px] transition-colors">
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-[#0a0a0a]">{att.event_title}</p>
                          <p className="text-xs text-[#6a6a6a]">
                            {new Date(att.scanned_at || att.event_date).toLocaleDateString("en-US", {
                              weekday: "short",
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })} • {att.location}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-0.5 text-xs font-bold text-[#0a0a0a]">
                          +{att.points_earned} Pts
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-[#6a6a6a] space-y-1">
                    <ClockIcon className="size-8 mx-auto text-[#6a6a6a]/40" />
                    <p className="font-bold text-[#0a0a0a]">No recorded attendance yet</p>
                    <p>This member has not checked into any events so far.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── 6. PENGURUS / ADMIN ACTIONS TOOLBAR ── */}
            {isPengurusOrAdmin && (
              <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-5 shadow-xs space-y-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a]">
                  Administrative Actions
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    className="h-11 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-[12px] border border-[#e8b94a]/50 bg-[#e8b94a]/15 px-2 text-xs font-bold text-[#0a0a0a] hover:bg-[#e8b94a]/25 transition-all cursor-pointer"
                    title="Reset Password to default (sekkha123)"
                  >
                    <KeyIcon className="size-3.5 text-[#0a0a0a]" />
                    <span className="text-[11px] sm:text-xs">Reset Pass</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowRoleModal(true)}
                    className="h-11 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] px-2 text-xs font-bold text-[#0a0a0a] hover:bg-[#f5f0e0] transition-all cursor-pointer"
                    title="Change Account Role"
                  >
                    <ShieldCheckIcon className="size-3.5 text-[#0a0a0a]" />
                    <span className="text-[11px] sm:text-xs">Change Role</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    className="h-11 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-[12px] border border-rose-200 bg-rose-50 px-2 text-xs font-bold text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                    title="Delete Member"
                  >
                    <Trash2Icon className="size-3.5" />
                    <span className="text-[11px] sm:text-xs">Delete</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}

      </div>

      {/* ── MODAL: CHANGE ROLE ── */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Change Member Role</h3>
              <button
                type="button"
                onClick={() => setShowRoleModal(false)}
                className="rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">Select New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none capitalize"
                >
                  <option value="umat">Umat (Regular Member)</option>
                  <option value="aktivis">Aktivis (Activist / Volunteer)</option>
                  <option value="pengurus">Pengurus (Organizer)</option>
                  {isAdmin && <option value="admin">Admin Vihara (Superadmin)</option>}
                </select>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#e5e5e5]">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="h-11 flex-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-bold text-[#0a0a0a] hover:bg-[#faf5e8] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingRole}
                  className="h-11 flex-1 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] disabled:opacity-50 cursor-pointer"
                >
                  {savingRole ? "Saving..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: DELETE CONFIRMATION ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-2xl space-y-4 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-[12px] bg-rose-50 text-rose-600 border border-rose-200">
              <Trash2Icon className="size-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-[#0a0a0a]">Delete Member?</h3>
              <p className="text-xs text-[#6a6a6a]">
                Are you sure you want to delete <strong>{member?.name}</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-2 pt-2 border-t border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="h-11 flex-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-bold text-[#0a0a0a] hover:bg-[#faf5e8] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteMember}
                className="h-11 flex-1 rounded-[12px] bg-rose-600 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREDENTIALS POPUP AFTER RESET ── */}
      {credentialModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2">
                <KeyIcon className="size-4.5 text-[#0a0a0a]" />
                <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Account Reset Credentials</h3>
              </div>
              <button
                type="button"
                onClick={() => setCredentialModalData(null)}
                className="rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <div className="rounded-[16px] bg-[#faf5e8] border border-[#e5e5e5] p-4 space-y-3">
              <div>
                <p className="text-[11px] font-bold text-[#6a6a6a] uppercase mb-1">USERNAME</p>
                <div className="flex items-center justify-between bg-[#fffaf0] rounded-[10px] border border-[#e5e5e5] px-3.5 py-2">
                  <span className="font-mono text-sm font-bold text-[#0a0a0a]">@{credentialModalData.username}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(credentialModalData.username)}
                    className="text-xs font-bold text-[#0a0a0a] hover:underline cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-[#6a6a6a] uppercase mb-1">PASSWORD</p>
                <div className="flex items-center justify-between bg-[#fffaf0] rounded-[10px] border border-[#e5e5e5] px-3.5 py-2">
                  <span className="font-mono text-sm font-bold text-[#0a0a0a]">{credentialModalData.defaultPassword}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(credentialModalData.defaultPassword)}
                    className="text-xs font-bold text-[#0a0a0a] hover:underline cursor-pointer"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => setCredentialModalData(null)}
                className="h-11 flex-1 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white hover:bg-[#1f1f1f] cursor-pointer"
              >
                Done
              </button>
              {credentialModalData.phone && (
                <a
                  href={`https://api.whatsapp.com/send?phone=${credentialModalData.phone.replace(/[^0-9]/g, "")}&text=${encodeURIComponent(
                    `Namo Buddhaya ${credentialModalData.memberName},\n\nYour Sekkha password has been reset:\n👤 Username: *${credentialModalData.username}*\n🔑 Password: *${credentialModalData.defaultPassword}*\n🆔 Member ID: *${credentialModalData.userNumber || "-"}*\n\nThank you!`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 flex items-center justify-center gap-1.5 rounded-[12px] bg-emerald-600 px-4 text-xs sm:text-sm font-bold text-white hover:bg-emerald-700 cursor-pointer"
                >
                  <Share2Icon className="size-4" />
                  <span>WhatsApp</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}

    </main>
  )
}
