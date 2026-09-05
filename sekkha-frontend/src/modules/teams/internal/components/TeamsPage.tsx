import { useEffect, useState, useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
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
  ChevronLeftIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from "lucide-react"
import QRCode from "react-qr-code"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { useDebounce } from "@/hooks/useDebounce"
import { SkeletonCard, SkeletonTableRow } from "@/components/ui/skeleton"
import { teamsApi } from "../api/teamsApi"
import type { MemberDto, CreateMemberPayload, UpdateMemberPayload, PaginatedMembersResponse } from "../api/teamsApi"

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
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const [members, setMembers] = useState<MemberDto[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, umat: 0, aktivis: 0, pengurus: 0 })

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
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
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [copiedId, setCopiedId] = useState(false)

  // Reset pagination when filter/search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [debouncedSearchQuery, roleFilter])

  // Fetch paginated & filtered data from API
  useEffect(() => {
    loadData()
  }, [currentPage, pageSize, debouncedSearchQuery, roleFilter])

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  async function loadData() {
    try {
      setLoading(true)
      const res = (await teamsApi.listMembers({
        search: debouncedSearchQuery.trim() || undefined,
        role: roleFilter,
        page: currentPage,
        limit: pageSize,
      })) as PaginatedMembersResponse

      setMembers(res.items || [])
      setTotalItems(res.total || 0)
      setTotalPages(res.totalPages || 1)
      if (res.stats) {
        setStats(res.stats)
      }
    } catch (err) {
      console.error("Failed to load People data:", err)
      showToast("Failed to load member data", "error")
    } finally {
      setLoading(false)
    }
  }

  // Handle Create Member with auto-generated credentials (Admin only)
  async function handleCreateMember(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin || !createForm.name.trim()) return

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
        defaultPassword: created.default_password || "Sekkha****Puggala",
        userNumber: created.user_number || undefined,
        phone: created.phone,
      })
    } catch (err: any) {
      showToast(err.message || "Failed to add member", "error")
    } finally {
      setSubmitting(false)
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

  // Copy helper
  function handleCopy(text?: string | null) {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopiedId(true)
    setTimeout(() => setCopiedId(false), 2000)
    showToast("Copied to clipboard!")
  }

  // Pagination calculations based on server response
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages]
    }
    if (currentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages]
    }
    return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages]
  }, [totalPages, currentPage])

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
                <h1 className="text-lg sm:text-2xl font-bold text-[#0a0a0a] tracking-tight">People</h1>
                <p className="text-xs text-[#6a6a6a]">
                  Member database, roles, and community directory
                </p>
              </div>
            </div>

            {/* Action Buttons (Admin only) */}
            {isAdmin && (
              <div className="flex flex-row items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="flex-1 sm:flex-initial h-11 flex items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] px-4 sm:px-5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all active:scale-[0.98] cursor-pointer shrink-0"
                >
                  <PlusIcon className="size-4" />
                  <span>Add New Member</span>
                </button>
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

          {/* Main Directory */}
          <div className="w-full space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#0a0a0a]">Members Directory</h2>
                  <p className="text-xs text-[#6a6a6a]">
                    Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of {totalItems} members
                    {totalItems !== members.length && ` (filtered from ${members.length} total)`}
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
              ) : members.length === 0 ? (
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
                    {members.map((m) => {
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
                          {members.map((m) => {
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

                  {/* ── PAGINATION CONTROLS BAR (CLAY DESIGN) ── */}
                  {totalItems > 0 && (
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3 sm:p-4 text-xs text-[#0a0a0a] shadow-xs">
                      {/* Left: Summary & Page Size Select */}
                      <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                        <span className="text-[#6a6a6a]">
                          Showing <strong className="text-[#0a0a0a]">{startIndex + 1}</strong>–<strong className="text-[#0a0a0a]">{endIndex}</strong> of <strong className="text-[#0a0a0a]">{totalItems}</strong> members
                        </span>

                        <div className="flex items-center gap-1.5 border-l border-[#e5e5e5] pl-3">
                          <span className="text-[#6a6a6a]">Per page:</span>
                          <select
                            value={pageSize}
                            onChange={(e) => {
                              setPageSize(Number(e.target.value))
                              setCurrentPage(1)
                            }}
                            className="h-8 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2 text-xs font-bold text-[#0a0a0a] outline-none shadow-xs cursor-pointer focus:border-[#0a0a0a]"
                          >
                            <option value={10}>10</option>
                            <option value={15}>15</option>
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                          </select>
                        </div>
                      </div>

                      {/* Right: Page Navigation Buttons */}
                      <div className="flex items-center justify-center sm:justify-end gap-1 w-full sm:w-auto overflow-x-auto py-0.5">
                        <button
                          type="button"
                          onClick={() => setCurrentPage(1)}
                          disabled={currentPage === 1}
                          className="size-8 flex items-center justify-center rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#0a0a0a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                          title="First page"
                        >
                          <ChevronsLeftIcon className="size-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="size-8 flex items-center justify-center rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#0a0a0a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                          title="Previous page"
                        >
                          <ChevronLeftIcon className="size-3.5" />
                        </button>

                        {/* Page Numbers */}
                        <div className="flex items-center gap-1 px-1">
                          {pageNumbers.map((page, idx) =>
                            typeof page === "number" ? (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setCurrentPage(page)}
                                className={`size-8 flex items-center justify-center rounded-[8px] text-xs font-bold transition-all cursor-pointer shadow-xs ${
                                  page === currentPage
                                    ? "bg-[#0a0a0a] text-white"
                                    : "border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8]"
                                }`}
                              >
                                {page}
                              </button>
                            ) : (
                              <span key={idx} className="px-1 text-[#6a6a6a] font-bold">
                                ...
                              </span>
                            )
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="size-8 flex items-center justify-center rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#0a0a0a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                          title="Next page"
                        >
                          <ChevronRightIcon className="size-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setCurrentPage(totalPages)}
                          disabled={currentPage === totalPages}
                          className="size-8 flex items-center justify-center rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-[#0a0a0a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-xs"
                          title="Last page"
                        >
                          <ChevronsRightIcon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
          </div>

        </div>
      </div>


      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: Create Pre-provisioned Member (Admin only)                       */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {showCreateModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3.5 sm:p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <PlusIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Add New Member</h3>
                  <p className="text-[11px] sm:text-xs text-[#6a6a6a]">Pre-provision member account by Admin</p>
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
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="rounded-[12px] bg-[#faf5e8] p-3 text-xs text-[#0a0a0a] border border-[#e5e5e5] leading-relaxed space-y-1">
                <p>💡 <strong>Default Password:</strong> New accounts are assigned an auto-generated temporary password with format <code className="font-bold bg-[#f5f0e0] px-1.5 py-0.5 rounded">Sekkha[4-digit]Puggala</code>. Members can change it anytime in Profile.</p>
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
      {/* MODAL 5: Member Credentials Modal (Pengurus / Admin)                      */}
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


