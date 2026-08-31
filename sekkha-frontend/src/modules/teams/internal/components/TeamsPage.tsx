import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  UsersIcon,
  MailIcon,
  PlusIcon,
  SearchIcon,
  UserPlusIcon,
  ClockIcon,
  QrCodeIcon,
  Edit2Icon,
  Trash2Icon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
  PrinterIcon,
  CopyIcon,
  CheckIcon,
  SparklesIcon,
  ShieldCheckIcon,
  KeyIcon,
  Share2Icon,
  ChevronRightIcon,
  EyeIcon,
} from "lucide-react"
import QRCode from "react-qr-code"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { useDebounce } from "@/hooks/useDebounce"
import { SkeletonCard, SkeletonTableRow } from "@/components/ui/skeleton"
import { teamsApi } from "../api/teamsApi"
import type { MemberDto, InvitationDto, CreateMemberPayload, UpdateMemberPayload } from "../api/teamsApi"

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

export function TeamsPage() {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const isPengurusOrAdmin = authState.status === "authenticated" && (authState.role === "pengurus" || authState.role === "admin")
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const [members, setMembers] = useState<MemberDto[]>([])
  const [invitations, setInvitations] = useState<InvitationDto[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [editingMember, setEditingMember] = useState<MemberDto | null>(null)
  const [deletingMember, setDeletingMember] = useState<MemberDto | null>(null)
  const [qrMember, setQrMember] = useState<MemberDto | null>(null)


  const [credentialModalData, setCredentialModalData] = useState<{
    memberName: string
    username: string
    defaultPassword: string
    userNumber?: string
    phone?: string | null
  } | null>(null)

  // Form states
  const [createForm, setCreateForm] = useState<CreateMemberPayload>({
    name: "",
    username: "",
    email: "",
    phone: "",
    school: "",
    birth_date: "",
    gender: "L",
    role: "umat",
  })
  const [updateForm, setUpdateForm] = useState<UpdateMemberPayload>({})
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"pengurus" | "aktivis">("aktivis")
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  async function loadData() {
    try {
      setLoading(true)
      const [membersData, invitationsData] = await Promise.all([
        teamsApi.listMembers(),
        isPengurusOrAdmin ? teamsApi.listInvitations().catch(() => []) : Promise.resolve([]),
      ])
      setMembers(membersData)
      setInvitations(invitationsData)
    } catch (err) {
      console.error("Failed to load People data:", err)
      showToast("Failed to load member data", "error")
    } finally {
      setLoading(false)
    }
  }

  // Handle Create Member with auto-generated credentials
  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault()
    if (!createForm.name.trim()) return

    try {
      setSubmitting(true)
      const created = await teamsApi.createMember({
        ...createForm,
        name: createForm.name.trim(),
        username: createForm.username?.trim() || undefined,
        email: createForm.email?.trim() || undefined,
        phone: createForm.phone?.trim() || undefined,
        school: createForm.school?.trim() || undefined,
        birth_date: createForm.birth_date || undefined,
      })
      showToast(`Successfully registered member "${created.name}" (Username: @${created.username || "-"})`)
      setShowCreateModal(false)
      setCreateForm({
        name: "",
        username: "",
        email: "",
        phone: "",
        school: "",
        birth_date: "",
        gender: "L",
        role: "umat",
      })
      await loadData()
      // Open credentials modal so Pengurus can copy username & password or share to WA
      setCredentialModalData({
        memberName: created.name,
        username: created.username || "-",
        defaultPassword: created.default_password || "sekkha123",
        userNumber: created.user_number || undefined,
        phone: created.phone,
      })
    } catch (err: any) {
      showToast(err.message || "Failed to add member", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Reset Member Password
  async function handleResetPassword(m: MemberDto) {
    if (!confirm(`Reset password for "${m.name}" (@${m.username || "member"}) to default password (sekkha123)?`)) return
    try {
      const res = await teamsApi.resetMemberPassword(m.id)
      setCredentialModalData({
        memberName: res.name,
        username: res.username || "-",
        defaultPassword: res.default_password,
        userNumber: res.user_number,
        phone: m.phone,
      })
      showToast(res.message)
    } catch (err: any) {
      showToast(err.message || "Failed to reset password", "error")
    }
  }

  // Handle Update Member Role
  async function handleUpdateMember(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMember) return

    try {
      setSubmitting(true)
      await teamsApi.updateMember(editingMember.id, { role: updateForm.role })
      showToast(`Role for "${editingMember.name}" updated to ${updateForm.role?.toUpperCase()}`)
      setEditingMember(null)
      await loadData()
    } catch (err: any) {
      showToast(err.message || "Failed to update member role", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Delete Member
  async function handleDeleteMember() {
    if (!deletingMember) return

    try {
      setSubmitting(true)
      await teamsApi.deleteMember(deletingMember.id)
      showToast(`Member "${deletingMember.name}" successfully deleted`)
      setDeletingMember(null)
      await loadData()
    } catch (err: any) {
      showToast(err.message || "Failed to delete member", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Send Invitation (Admin only)
  async function handleInviteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    try {
      setSubmitting(true)
      await teamsApi.sendInvitation({ email: inviteEmail.trim(), role: inviteRole })
      showToast(`Invitation successfully sent to ${inviteEmail.trim()}`)
      setInviteEmail("")
      setShowInviteModal(false)
      const invData = await teamsApi.listInvitations()
      setInvitations(invData)
    } catch (err: any) {
      showToast(err.message || "Failed to send invitation", "error")
    } finally {
      setSubmitting(false)
    }
  }

  // Copy helper
  function handleCopy(text?: string | null) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
    showToast("Copied to clipboard!")
  }

  // Stats calculation
  const stats = useMemo(() => {
    const total = members.length
    const umat = members.filter((m) => m.role === "umat").length
    const aktivis = members.filter((m) => m.role === "aktivis").length
    const pengurus = members.filter((m) => m.role === "pengurus" || m.role === "admin").length
    return { total, umat, aktivis, pengurus }
  }, [members])

  const debouncedSearchQuery = useDebounce(searchQuery, 250)

  // Filtered members list with debounced query optimization
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const q = debouncedSearchQuery.toLowerCase()
      const matchesQuery =
        !q ||
        m.name.toLowerCase().includes(q) ||
        (m.username && m.username.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.user_number && m.user_number.toLowerCase().includes(q)) ||
        (m.school && m.school.toLowerCase().includes(q)) ||
        (m.phone && m.phone.toLowerCase().includes(q))

      const matchesRole =
        roleFilter === "all"
          ? true
          : roleFilter === "pengurus"
          ? m.role === "pengurus" || m.role === "admin"
          : m.role === roleFilter

      return matchesQuery && matchesRole
    })
  }, [members, debouncedSearchQuery, roleFilter])

  const roleBadgeStyle: Record<string, string> = {
    admin: "bg-[#ff4d8b]/15 text-[#ff4d8b] border-[#ff4d8b]/30 font-semibold",
    pengurus: "bg-[#1a3a3a] text-white border-[#1a3a3a] font-semibold",
    aktivis: "bg-[#b8a4ed]/30 text-[#0a0a0a] border-[#b8a4ed]/50 font-semibold",
    umat: "bg-[#f5f0e0] text-[#0a0a0a] border-[#e5e5e5] font-semibold",
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] font-sans text-left">
      <PageBreadcrumb items={[{ label: "People" }]} />

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-[16px] px-4 py-3 shadow-xl backdrop-blur-md transition-all ${
            toastMessage.type === "success"
              ? "bg-[#0a0a0a] text-white border border-emerald-500/50"
              : "bg-[#ef4444] text-white"
          }`}
        >
          {toastMessage.type === "success" ? <CheckCircleIcon className="size-5 text-emerald-400" /> : <AlertTriangleIcon className="size-5" />}
          <span className="text-xs font-bold">{toastMessage.text}</span>
        </div>
      )}

      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12 pb-32 md:pb-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">

          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs shrink-0">
                <UsersIcon className="size-5 text-[#e8b94a]" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-[#0a0a0a] tracking-tight">People & Member Database</h1>
                <p className="text-xs text-[#6a6a6a]">
                  Centralized member profile management, pre-provisioning, and access roles
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            {isPengurusOrAdmin && (
              <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 sm:flex-initial h-11 flex items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] px-4 sm:px-5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all active:scale-[0.98] cursor-pointer shrink-0"
                >
                  <PlusIcon className="size-4" />
                  <span>Add New Member</span>
                </button>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(true)}
                    className="h-11 flex items-center justify-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs sm:text-sm font-bold text-[#0a0a0a] shadow-xs hover:bg-[#faf5e8] transition-all active:scale-[0.98] cursor-pointer shrink-0"
                  >
                    <UserPlusIcon className="size-4 text-[#1a3a3a]" />
                    <span>Invite Staff</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
            <div className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 sm:p-4 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a]">Total Members & Users</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-bold text-[#0a0a0a]">{stats.total}</span>
                <span className="text-xs text-[#6a6a6a]">Users</span>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 sm:p-4 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#0a0a0a]">Members</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-bold text-[#0a0a0a]">{stats.umat}</span>
                <span className="text-xs text-[#6a6a6a]">Members</span>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#b8a4ed]/40 bg-[#b8a4ed]/20 p-3.5 sm:p-4 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#0a0a0a]">Activists & Volunteers</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-bold text-[#0a0a0a]">{stats.aktivis}</span>
                <span className="text-xs text-[#0a0a0a]/70">Activists</span>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#1a3a3a]/25 bg-[#1a3a3a]/10 p-3.5 sm:p-4 shadow-xs">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#1a3a3a]">Organizers & Admins</p>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="text-xl sm:text-2xl font-bold text-[#1a3a3a]">{stats.pengurus}</span>
                <span className="text-xs text-[#1a3a3a]/70">Staff</span>
              </div>
            </div>
          </div>

          {/* Search, Filter Tabs & Controls Card */}
          <div className="flex flex-col gap-3 rounded-[20px] sm:rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 sm:p-4 shadow-xs">
            {/* Top row: Status Tabs on mobile/desktop */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none rounded-[12px] bg-[#faf5e8] p-1 border border-[#e5e5e5] w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setRoleFilter("all")}
                  className={`flex-1 sm:flex-none text-center whitespace-nowrap rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    roleFilter === "all" ? "bg-[#0a0a0a] text-white shadow-xs" : "text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#f5f0e0]"
                  }`}
                >
                  All ({stats.total})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("umat")}
                  className={`flex-1 sm:flex-none text-center whitespace-nowrap rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    roleFilter === "umat" ? "bg-[#0a0a0a] text-white shadow-xs" : "text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#f5f0e0]"
                  }`}
                >
                  Members ({stats.umat})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("aktivis")}
                  className={`flex-1 sm:flex-none text-center whitespace-nowrap rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    roleFilter === "aktivis" ? "bg-[#0a0a0a] text-white shadow-xs" : "text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#f5f0e0]"
                  }`}
                >
                  Activists ({stats.aktivis})
                </button>
                <button
                  type="button"
                  onClick={() => setRoleFilter("pengurus")}
                  className={`flex-1 sm:flex-none text-center whitespace-nowrap rounded-[8px] px-3.5 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    roleFilter === "pengurus" ? "bg-[#0a0a0a] text-white shadow-xs" : "text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#f5f0e0]"
                  }`}
                >
                  Organizers ({stats.pengurus})
                </button>
              </div>

              {/* Right side: Search box */}
              <div className="relative flex-1 sm:w-72">
                <SearchIcon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#6a6a6a]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, @username, ID..."
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pl-10 pr-9 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-[#e5e5e5] text-[#6a6a6a] hover:bg-[#0a0a0a] hover:text-white transition-colors cursor-pointer"
                    title="Clear search"
                  >
                    <XIcon className="size-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main Grid: Directory & Invitations (if Admin) */}
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            
            {/* Members Directory (Col Span 2 or 3) */}
            <div className={`space-y-3 sm:space-y-4 ${isAdmin ? "lg:col-span-2" : "lg:col-span-3"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#0a0a0a]">Members Directory</h2>
                  <p className="text-xs text-[#6a6a6a]">
                    Showing {filteredMembers.length} of {members.length} registered members
                  </p>
                </div>
              </div>

              {loading ? (
                <>
                  {/* Mobile Skeleton Cards */}
                  <div className="md:hidden space-y-3">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <SkeletonCard key={idx} />
                    ))}
                  </div>

                  {/* Desktop Skeleton Table */}
                  <div className="hidden md:block overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#e5e5e5] bg-[#faf5e8]">
                          <th className="px-4 py-3 text-xs font-bold text-[#6a6a6a]">Member</th>
                          <th className="px-4 py-3 text-xs font-bold text-[#6a6a6a]">Contact & Info</th>
                          <th className="px-4 py-3 text-xs font-bold text-[#6a6a6a]">Role</th>
                          <th className="px-4 py-3 text-xs font-bold text-[#6a6a6a]">Points & Attendance</th>
                          <th className="px-4 py-3 text-right text-xs font-bold text-[#6a6a6a]">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <SkeletonTableRow key={idx} columns={5} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : filteredMembers.length === 0 ? (
                <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#e5e5e5] bg-[#fffaf0] p-8 text-center">
                  <UsersIcon className="size-10 text-[#6a6a6a]/40 mb-2" />
                  <p className="text-sm font-bold text-[#0a0a0a]">No members found</p>
                  <p className="text-xs text-[#6a6a6a] mt-1 max-w-xs">
                    Try adjusting your search terms or category filter.
                  </p>
                </div>
              ) : (
                <>
                  {/* 📱 MOBILE VIEW: Touch-optimized Card List (< md) */}
                  <div className="md:hidden space-y-3">
                    {filteredMembers.map((m) => {
                      const initials =
                        m.name
                          .split(" ")
                          .slice(0, 2)
                          .map((w) => (w[0] ? w[0].toUpperCase() : ""))
                          .join("") || "UM"

                      return (
                        <div
                          key={m.id}
                          onClick={() => navigate({ to: "/teams/$memberId", params: { memberId: m.id } })}
                          className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs space-y-3 transition-all hover:border-[#0a0a0a]/30 cursor-pointer active:scale-[0.99]"
                        >
                          {/* Card Header: Avatar, Name, Username, Role */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#e8b94a] text-xs font-bold text-[#0a0a0a] shadow-2xs">
                                {initials}
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-xs sm:text-sm text-[#0a0a0a] truncate">{m.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {m.username && (
                                    <span className="font-mono text-[11px] font-bold text-[#1a3a3a] bg-[#1a3a3a]/10 px-1.5 py-0.5 rounded-[6px]">
                                      @{m.username}
                                    </span>
                                  )}
                                  <span className="font-mono text-[11px] font-medium text-[#6a6a6a]">
                                    {m.user_number || "—"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeStyle[m.role] || roleBadgeStyle.umat}`}>
                                {formatRoleLabel(m.role)}
                              </span>
                            </div>
                          </div>

                          {/* Card Details: Contact & School snippet */}
                          <div className="grid grid-cols-2 gap-2 text-xs text-[#6a6a6a] pt-2 border-t border-[#e5e5e5] bg-[#faf5e8] -mx-4 -mb-3 p-3 rounded-b-[16px]">
                            <div className="truncate">
                              <span className="font-bold text-[#6a6a6a] block text-[10px] uppercase">School / College</span>
                              <span className="font-medium text-[#0a0a0a] truncate block">{m.school || "—"}</span>
                            </div>
                            <div className="truncate">
                              <span className="font-bold text-[#6a6a6a] block text-[10px] uppercase">Contact</span>
                              <span className="font-medium text-[#0a0a0a] truncate block">{m.phone || m.email || "—"}</span>
                            </div>

                            {/* Single Clean View Profile & Details Button */}
                            <div className="col-span-2 pt-2 border-t border-[#e5e5e5] mt-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate({ to: "/teams/$memberId", params: { memberId: m.id } })
                                }}
                                className="w-full h-9 flex items-center justify-between rounded-[8px] bg-[#0a0a0a] text-white px-3.5 text-xs font-bold hover:bg-[#1f1f1f] transition-all cursor-pointer shadow-xs"
                              >
                                <span>View Profile & Details</span>
                                <ChevronRightIcon className="size-4 text-white/70" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* 🖥️ DESKTOP VIEW: Structured Table (hidden on mobile, visible md+) */}
                  <div className="hidden md:block overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-sans">
                        <thead>
                          <tr className="border-b border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] font-bold">
                            <th className="px-4 py-3">Member ID</th>
                            <th className="px-4 py-3">Name & Username</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">School / Contact</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f0f0f0]">
                          {filteredMembers.map((m) => {
                            const initials = m.name
                              .split(" ")
                              .slice(0, 2)
                              .map((w) => (w[0] ? w[0].toUpperCase() : ""))
                              .join("") || "UM"

                            return (
                              <tr
                                key={m.id}
                                onClick={() => navigate({ to: "/teams/$memberId", params: { memberId: m.id } })}
                                className="group hover:bg-[#faf5e8]/70 transition-colors cursor-pointer"
                              >
                                {/* Member ID */}
                                <td className="px-4 py-3 font-mono text-xs font-bold text-[#1a3a3a]">
                                  <div className="flex items-center gap-1.5">
                                    <span>{m.user_number || "—"}</span>
                                    {m.user_number && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleCopy(m.user_number)
                                        }}
                                        className="opacity-0 group-hover:opacity-100 text-[#6a6a6a] hover:text-[#0a0a0a] transition-opacity cursor-pointer"
                                        title="Copy Member ID"
                                      >
                                        <CopyIcon className="size-3" />
                                      </button>
                                    )}
                                  </div>
                                </td>

                                {/* Name & Username */}
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#e8b94a] text-xs font-bold text-[#0a0a0a] shadow-2xs">
                                      {initials}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <p className="font-bold text-[#0a0a0a] truncate">{m.name}</p>
                                        {m.username && (
                                          <span className="font-mono text-[11px] font-semibold text-[#1a3a3a] bg-[#1a3a3a]/10 px-1.5 py-0.5 rounded-[4px]">
                                            @{m.username}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-[11px] text-[#6a6a6a] truncate">
                                        {m.email || (m.phone ? `Phone: ${m.phone}` : "No email contact")}
                                      </p>
                                    </div>
                                  </div>
                                </td>

                                {/* Role */}
                                <td className="px-4 py-3">
                                  <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeStyle[m.role] || roleBadgeStyle.umat}`}>
                                    {formatRoleLabel(m.role)}
                                  </span>
                                </td>

                                {/* School / Contact */}
                                <td className="px-4 py-3 text-xs text-[#6a6a6a]">
                                  <div className="space-y-0.5">
                                    {m.school && <p className="truncate max-w-[160px]">🏫 {m.school}</p>}
                                    {m.phone && <p className="text-[11px] text-[#6a6a6a]">📞 {m.phone}</p>}
                                    {!m.school && !m.phone && <span className="text-[#6a6a6a]">—</span>}
                                  </div>
                                </td>

                                {/* Actions */}
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate({ to: "/teams/$memberId", params: { memberId: m.id } })
                                    }}
                                    className="inline-flex items-center gap-1.5 h-8 rounded-[8px] bg-[#0a0a0a] text-white hover:bg-[#1f1f1f] px-3 text-xs font-bold transition-all cursor-pointer shadow-xs"
                                  >
                                    <span>View Detail</span>
                                    <ChevronRightIcon className="size-3.5" />
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Invitations History (Admin only) */}
            {isAdmin && (
              <div className="space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#0a0a0a]">Staff Invitations History</h2>
                  <ClockIcon className="size-4 text-[#6a6a6a]" />
                </div>

                {loading ? (
                  <div className="h-64 flex items-center justify-center rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] text-center">
                    <span className="text-xs text-[#6a6a6a]">Loading...</span>
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center rounded-[16px] border border-dashed border-[#e5e5e5] bg-[#fffaf0] text-center p-4">
                    <MailIcon className="size-6 text-[#6a6a6a] mb-1" />
                    <span className="text-xs text-[#6a6a6a]">No invitations sent yet.</span>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {invitations.map((inv) => {
                      const statusStyles: Record<string, string> = {
                        pending: "bg-amber-50 text-amber-800 border-amber-200",
                        accepted: "bg-emerald-50 text-emerald-800 border-emerald-200",
                        rejected: "bg-rose-50 text-rose-800 border-rose-200",
                      }

                      return (
                        <div
                          key={inv.id}
                          className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 space-y-1.5 shadow-xs hover:shadow-sm transition-shadow"
                        >
                          <div className="flex justify-between items-center">
                            <p className="text-xs font-bold text-[#0a0a0a] truncate max-w-[160px]">{inv.email}</p>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold capitalize ${statusStyles[inv.status]}`}>
                              {inv.status}
                            </span>
                          </div>
                          <p className="text-xs text-[#6a6a6a]">
                            Invited as: <span className="font-bold text-[#0a0a0a] uppercase">{inv.role}</span>
                          </p>
                          <div className="flex justify-between text-[11px] text-[#6a6a6a] pt-1.5 border-t border-[#e5e5e5] mt-1">
                            <span>Invited by: {inv.invited_by?.name || "Admin"}</span>
                            <span>
                              {new Date(inv.created_at).toLocaleDateString("en-US", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>
      </div>


      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: Create Pre-provisioned Member                                    */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {showCreateModal && (


        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <UserPlusIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Add New Member</h3>
                  <p className="text-[11px] sm:text-xs text-[#6a6a6a]">Pre-provision member account by Organizer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0a0a0a]">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Michael Jordan"
                    value={createForm.name}
                    onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">
                    Username <span className="text-[10px] text-[#6a6a6a]/80 font-normal">(Auto if empty)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. michael.jordan"
                    value={createForm.username || ""}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="e.g. +628123456789"
                    value={createForm.phone || ""}
                    onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="name@email.com"
                    value={createForm.email || ""}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">School / College</label>
                  <input
                    type="text"
                    placeholder="e.g. Saint Joseph High School"
                    value={createForm.school || ""}
                    onChange={(e) => setCreateForm({ ...createForm, school: e.target.value })}
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">Birth Date</label>
                  <input
                    type="date"
                    value={createForm.birth_date || ""}
                    onChange={(e) => setCreateForm({ ...createForm, birth_date: e.target.value })}
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">Gender</label>
                  <select
                    value={createForm.gender || "L"}
                    onChange={(e) => setCreateForm({ ...createForm, gender: e.target.value })}
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  >
                    <option value="L">Male</option>
                    <option value="P">Female</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">Account Role</label>
                  <select
                    value={createForm.role || "umat"}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  >
                    <option value="umat">Member</option>
                    <option value="aktivis">Activist</option>
                    <option value="pengurus">Organizer</option>
                  </select>
                </div>
              </div>

              <div className="rounded-[12px] bg-[#faf5e8] p-3 text-xs text-[#0a0a0a] border border-[#e5e5e5] leading-relaxed space-y-1">
                <p>💡 <strong>Default Password:</strong> New accounts are assigned temporary password <code className="font-bold bg-[#f5f0e0] px-1.5 py-0.5 rounded">sekkha123</code>. Members can change it anytime in Profile.</p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-11 flex-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 flex-1 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 2: Change Member Role (Pengurus/Admin only can change role)          */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <ShieldCheckIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Change User Role</h3>
                  <p className="text-[11px] sm:text-xs text-[#6a6a6a]">Manage permissions & account roles</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Read-Only User Info Card */}
            <div className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 space-y-2.5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#e8b94a] text-xs font-bold text-[#0a0a0a] shadow-2xs uppercase">
                  {editingMember.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => (w[0] ? w[0].toUpperCase() : ""))
                    .join("") || "UM"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-xs sm:text-sm text-[#0a0a0a] truncate">{editingMember.name}</p>
                  <p className="font-mono text-[11px] font-bold text-[#1a3a3a]">{editingMember.user_number || "—"}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadgeStyle[editingMember.role]}`}>
                  {editingMember.role}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-[#6a6a6a] pt-2 border-t border-[#e5e5e5]">
                <div className="truncate">
                  <span className="text-[10px] text-[#6a6a6a] block uppercase font-bold">Contact</span>
                  <span className="font-medium text-[#0a0a0a] truncate block">{editingMember.phone || editingMember.email || "—"}</span>
                </div>
                <div className="truncate">
                  <span className="text-[10px] text-[#6a6a6a] block uppercase font-bold">School/College</span>
                  <span className="font-medium text-[#0a0a0a] truncate block">{editingMember.school || "—"}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a] flex items-center justify-between">
                  <span>Select New Role</span>
                </label>
                <select
                  value={updateForm.role || "umat"}
                  onChange={(e) => setUpdateForm({ role: e.target.value as any })}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] font-semibold"
                >
                  <option value="umat">Member (Access: Home, Events, Leaderboard, Profile)</option>
                  <option value="aktivis">Activist (Access: Attendance Scanner & Event Duties)</option>
                  <option value="pengurus">Organizer (Full Access: Management & Events)</option>
                  {isAdmin && <option value="admin">Admin (System Master Administrator)</option>}
                </select>
              </div>

              <div className="rounded-[12px] bg-[#faf5e8] p-3 text-xs text-[#0a0a0a] border border-[#e5e5e5] leading-relaxed">
                ℹ️ <strong>Information:</strong> Role changes will immediately update the member's navigation menu and authorization privileges.
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="h-11 flex-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 flex-1 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Saving..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 3: Member QR Card & Printable Physical ID                           */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {qrMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-5 text-[#e8b94a]" />
                <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Member Card & QR Code</h3>
              </div>
              <button
                type="button"
                onClick={() => setQrMember(null)}
                className="rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* The ID Card Preview */}
            <div className="rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-4 sm:p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2.5">
                <div>
                  <p className="text-xs font-bold text-[#0a0a0a]">Sekkha Community</p>
                  <p className="text-[11px] font-medium text-[#6a6a6a]">Official Membership ID Card</p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadgeStyle[qrMember.role]}`}>
                  {qrMember.role}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center py-2 space-y-3">
                <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-xs">
                  <QRCode
                    value={qrMember.user_number || qrMember.id}
                    size={140}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox="0 0 256 256"
                  />
                </div>

                <div className="text-center space-y-0.5">
                  <p className="text-sm sm:text-base font-bold text-[#0a0a0a]">{qrMember.name}</p>
                  <p className="font-mono text-xs font-bold text-[#1a3a3a]">{qrMember.user_number || "—"}</p>
                  {qrMember.school && <p className="text-xs text-[#6a6a6a]">🏫 {qrMember.school}</p>}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#6a6a6a] pt-2 border-t border-[#e5e5e5]">
                <span>Status: {qrMember.is_claimed ? "✅ Active Account" : "⚠️ Unclaimed"}</span>
                <span>Total Attendance: {qrMember.total_attendance || 0}x</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCopy(qrMember.user_number)}
                className="h-11 flex-1 flex items-center justify-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
              >
                {copiedId ? <CheckIcon className="size-4 text-emerald-600" /> : <CopyIcon className="size-4 text-[#6a6a6a]" />}
                <span>{copiedId ? "Copied!" : "Copy Member ID"}</span>
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
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 4: Delete Confirmation                                              */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[10px] bg-rose-100 text-rose-600">
                <Trash2Icon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Delete Member?</h3>
                <p className="text-xs text-[#6a6a6a]">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-[#6a6a6a] leading-relaxed">
              Are you sure you want to delete <strong>"{deletingMember.name}"</strong> ({deletingMember.user_number || "No ID"})? All associated history will be removed.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="h-11 flex-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={submitting}
                className="h-11 flex-1 rounded-[12px] bg-rose-600 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-rose-700 transition-all disabled:opacity-50 cursor-pointer"
              >
                {submitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 5: Invite Staff (Admin only)                                        */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {showInviteModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <UserPlusIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Invite Staff Member</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">Staff Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="staff.member@gmail.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "pengurus" | "aktivis")}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                >
                  <option value="aktivis">Activist (Access: Events & Attendance Duties)</option>
                  <option value="pengurus">Organizer (Full Management & Data Access)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="h-11 flex-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 flex-1 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 6: Member Credentials Modal (Pengurus / Admin)                      */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {credentialModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-left">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <KeyIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Member Credentials</h3>
                  <p className="text-xs text-[#6a6a6a]">Username & login password for member</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCredentialModalData(null)}
                className="rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Member Info Card */}
            <div className="rounded-[16px] bg-[#faf5e8] border border-[#e5e5e5] p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-[#6a6a6a] uppercase tracking-wider">Member Name</p>
                <p className="text-xs sm:text-sm font-bold text-[#0a0a0a] truncate">{credentialModalData.memberName}</p>
                {credentialModalData.phone && (
                  <p className="text-xs text-[#6a6a6a]">📞 {credentialModalData.phone}</p>
                )}
              </div>
              {credentialModalData.userNumber && (
                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold text-[#6a6a6a] uppercase tracking-wider">Member ID</p>
                  <span className="font-mono text-xs font-bold text-[#1a3a3a] bg-[#1a3a3a]/10 px-2 py-1 rounded-[6px] border border-[#e5e5e5]">
                    {credentialModalData.userNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Username & Password Display */}
            <div className="space-y-3">
              <div className="rounded-[16px] bg-[#faf5e8] border border-[#e5e5e5] p-4 space-y-3">
                {/* Username */}
                <div>
                  <p className="text-[11px] font-bold text-[#6a6a6a] uppercase tracking-wider mb-1">LOGIN USERNAME</p>
                  <div className="flex items-center justify-between bg-[#fffaf0] rounded-[10px] border border-[#e5e5e5] px-3.5 py-2.5">
                    <span className="font-mono text-sm sm:text-base font-bold text-[#0a0a0a] select-all">
                      @{credentialModalData.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(credentialModalData.username)}
                      className="flex items-center gap-1 text-xs font-bold text-[#0a0a0a] hover:underline cursor-pointer"
                    >
                      <CopyIcon className="size-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* Password Default */}
                <div>
                  <p className="text-[11px] font-bold text-[#6a6a6a] uppercase tracking-wider mb-1">DEFAULT PASSWORD</p>
                  <div className="flex items-center justify-between bg-[#fffaf0] rounded-[10px] border border-[#e5e5e5] px-3.5 py-2.5">
                    <span className="font-mono text-sm sm:text-base font-bold text-[#0a0a0a] select-all">
                      {credentialModalData.defaultPassword}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(credentialModalData.defaultPassword)}
                      className="flex items-center gap-1 text-xs font-bold text-[#0a0a0a] hover:underline cursor-pointer"
                    >
                      <CopyIcon className="size-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#6a6a6a] leading-relaxed px-1">
                Members can immediately log in using the <strong>Username</strong> and <strong>Default Password</strong> above, and may update their credentials anytime under their Profile menu.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2 border-t border-[#e5e5e5]">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fullText = `Sekkha Community Account:\nName: ${credentialModalData.memberName}\nUsername: @${credentialModalData.username}\nPassword: ${credentialModalData.defaultPassword}`
                    navigator.clipboard.writeText(fullText)
                    showToast("All credentials copied!")
                  }}
                  className="h-11 flex-1 flex items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer"
                >
                  <CopyIcon className="size-4" />
                  <span>Copy All</span>
                </button>

                {credentialModalData.phone && (
                  <a
                    href={`https://api.whatsapp.com/send?phone=${credentialModalData.phone.replace(/[^0-9]/g, "")}&text=${encodeURIComponent(
                      `Namo Buddhaya ${credentialModalData.memberName},\n\nHere are your Sekkha account credentials:\n👤 Username: *${credentialModalData.username}*\n🔑 Password: *${credentialModalData.defaultPassword}*\n🆔 Member ID: *${credentialModalData.userNumber || "-"}*\n\nPlease log in to the Sekkha app with your credentials above. You can change your password under *Profile > Change Password*.\n\nThank you!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-11 flex items-center justify-center gap-2 rounded-[12px] bg-emerald-600 px-4 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-emerald-700 transition-all cursor-pointer"
                    title="Send via WhatsApp"
                  >
                    <Share2Icon className="size-4" />
                    <span className="hidden sm:inline">Send WhatsApp</span>
                  </a>
                )}
              </div>

              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setCredentialModalData(null)}
                  className="text-xs font-semibold text-[#6a6a6a] hover:text-[#0a0a0a] cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </main>
  )
}


