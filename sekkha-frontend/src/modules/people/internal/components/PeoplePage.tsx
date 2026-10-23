import { useEffect, useState } from "react"
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
  ChevronRightIcon,
  PhoneIcon,
  GraduationCapIcon,
} from "lucide-react"
import QRCode from "react-qr-code"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import { useDebounce } from "@/hooks/useDebounce"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Button } from "@/components/base/Button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/base/Select"
import { peopleApi } from "../api/peopleApi"
import type {
  MemberDto,
  CreateMemberPayload,
  UpdateMemberPayload,
  PaginatedMembersResponse,
} from "../api/peopleApi"

function formatRoleLabel(role?: string | null): string {
  if (!role) return "Member"
  const r = role.toLowerCase()
  switch (r) {
    case "admin":
      return "Admin"
    case "organizer":
    case "pengurus":
      return "Organizer"
    case "activist":
    case "aktivis":
      return "Activist"
    case "member":
    case "umat":
    default:
      return "Member"
  }
}

function CommunityRoleChart({
  stats,
  activeFilter,
  onFilterChange,
}: {
  stats: {
    total: number
    member?: number
    activist?: number
    organizer?: number
    umat?: number
    aktivis?: number
    pengurus?: number
  }
  activeFilter: string
  onFilterChange: (role: string) => void
}) {
  const total = stats.total || 0
  const memberCount = stats.member ?? stats.umat ?? 0
  const activistCount = stats.activist ?? stats.aktivis ?? 0
  const organizerCount = stats.organizer ?? stats.pengurus ?? 0

  const memberPct = total > 0 ? (memberCount / total) * 100 : 0
  const activistPct = total > 0 ? (activistCount / total) * 100 : 0
  const organizerPct = total > 0 ? (organizerCount / total) * 100 : 0

  const r = 36
  const c = 2 * Math.PI * r

  const organizerLen = (organizerPct / 100) * c
  const memberLen = (memberPct / 100) * c
  const activistLen = (activistPct / 100) * c

  const organizerOffset = 0
  const memberOffset = -organizerLen
  const activistOffset = -(organizerLen + memberLen)

  const roles = [
    {
      id: "organizer",
      label: "Organizers & Admins",
      shortLabel: "Organizers",
      count: organizerCount,
      pct: organizerPct,
      colorHex: "#1a3a3a",
    },
    {
      id: "member",
      label: "Members",
      shortLabel: "Members",
      count: memberCount,
      pct: memberPct,
      colorHex: "#e8b94a",
    },
    {
      id: "activist",
      label: "Activists & Volunteers",
      shortLabel: "Activists",
      count: activistCount,
      pct: activistPct,
      colorHex: "#8b5cf6",
    },
  ]

  return (
    <div className="rounded-[20px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-4 shadow-2xs backdrop-blur-md sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Donut Chart & Title / Description */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="relative flex size-20 shrink-0 items-center justify-center sm:size-24">
            <svg className="size-full -rotate-90" viewBox="0 0 96 96">
              <circle
                cx="48"
                cy="48"
                r={r}
                fill="none"
                stroke="#f0ebe0"
                strokeWidth="10"
              />
              {total > 0 ? (
                <>
                  {organizerLen > 0 && (
                    <circle
                      cx="48"
                      cy="48"
                      r={r}
                      fill="none"
                      stroke="#1a3a3a"
                      strokeWidth={
                        activeFilter === "organizer" ||
                        activeFilter === "pengurus"
                          ? 12
                          : 10
                      }
                      strokeDasharray={`${organizerLen} ${c}`}
                      strokeDashoffset={organizerOffset}
                      className="cursor-pointer transition-all duration-300 hover:opacity-85"
                      onClick={() =>
                        onFilterChange(
                          activeFilter === "organizer" ? "all" : "organizer"
                        )
                      }
                    />
                  )}
                  {memberLen > 0 && (
                    <circle
                      cx="48"
                      cy="48"
                      r={r}
                      fill="none"
                      stroke="#e8b94a"
                      strokeWidth={
                        activeFilter === "member" || activeFilter === "umat"
                          ? 12
                          : 10
                      }
                      strokeDasharray={`${memberLen} ${c}`}
                      strokeDashoffset={memberOffset}
                      className="cursor-pointer transition-all duration-300 hover:opacity-85"
                      onClick={() =>
                        onFilterChange(
                          activeFilter === "member" ? "all" : "member"
                        )
                      }
                    />
                  )}
                  {activistLen > 0 && (
                    <circle
                      cx="48"
                      cy="48"
                      r={r}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth={
                        activeFilter === "activist" ||
                        activeFilter === "aktivis"
                          ? 12
                          : 10
                      }
                      strokeDasharray={`${activistLen} ${c}`}
                      strokeDashoffset={activistOffset}
                      className="cursor-pointer transition-all duration-300 hover:opacity-85"
                      onClick={() =>
                        onFilterChange(
                          activeFilter === "activist" ? "all" : "activist"
                        )
                      }
                    />
                  )}
                </>
              ) : null}
            </svg>

            <button
              type="button"
              onClick={() => onFilterChange("all")}
              disabled={activeFilter === "all"}
              className={`absolute inset-0 flex flex-col items-center justify-center rounded-full text-center transition-transform select-none ${
                activeFilter !== "all"
                  ? "cursor-pointer hover:scale-105"
                  : "pointer-events-none cursor-default"
              }`}
              title={
                activeFilter !== "all"
                  ? "Click to reset to all members"
                  : "Total Members"
              }
            >
              <span className="text-xl leading-none font-black text-[#0a0a0a] sm:text-2xl">
                {total}
              </span>
              <span
                className={`mt-0.5 text-[9px] font-bold tracking-wider uppercase ${
                  activeFilter !== "all"
                    ? "text-[#0a0a0a] underline"
                    : "text-[#6a6a6a]"
                }`}
              >
                {activeFilter !== "all" ? "Reset" : "Total"}
              </span>
            </button>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-tight text-[#0a0a0a] sm:text-base">
                Role Distribution
              </h2>
              {activeFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => onFilterChange("all")}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-[#0a0a0a] bg-[#0a0a0a] px-2 py-0.5 text-[10px] font-bold text-white transition-all hover:bg-[#1f1f1f]"
                >
                  <span>Reset Filter</span>
                  <XIcon className="size-2.5" />
                </button>
              )}
            </div>
            <p className="mt-0.5 text-xs text-[#6a6a6a]">
              Community breakdown by youth roles. Click a card to filter the
              directory.
            </p>
          </div>
        </div>

        {/* Right: Interactive Role Metric Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:w-[480px]">
          {roles.map((roleItem) => {
            const isSelected = activeFilter === roleItem.id
            return (
              <button
                key={roleItem.id}
                type="button"
                onClick={() => onFilterChange(isSelected ? "all" : roleItem.id)}
                className={`group flex cursor-pointer flex-col justify-between rounded-[14px] border p-2.5 text-left transition-all select-none sm:p-3 ${
                  isSelected
                    ? "border-[#0a0a0a] bg-[#faf5e8] shadow-xs ring-2 ring-[#0a0a0a]"
                    : "border-[#e6decb]/80 bg-[#fffaf0] hover:border-[#0a0a0a]/30 hover:bg-[#faf5e8]"
                }`}
                title={`Filter by ${roleItem.label}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-[11px] font-bold text-[#6a6a6a] group-hover:text-[#0a0a0a] sm:text-xs">
                      {roleItem.shortLabel}
                    </span>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: roleItem.colorHex }}
                    />
                  </div>

                  <div className="mt-1 flex items-baseline gap-1.5">
                    <span className="text-base font-extrabold text-[#0a0a0a] sm:text-lg">
                      {roleItem.count}
                    </span>
                    <span className="text-[10px] font-medium text-[#6a6a6a] sm:text-xs">
                      ({Math.round(roleItem.pct)}%)
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#f0ebe0]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${roleItem.pct}%`,
                      backgroundColor: roleItem.colorHex,
                    }}
                  />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function PeoplePage() {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

  const [members, setMembers] = useState<MemberDto[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    total: 0,
    member: 0,
    activist: 0,
    organizer: 0,
    umat: 0,
    aktivis: 0,
    pengurus: 0,
  })

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

  // Form states
  const [createForm, setCreateForm] = useState<CreateMemberPayload>({
    name: "",
    username: "",
    email: "",
    phone: "",
    school: "",
    birth_date: "",
    gender: "",
    role: "member",
  })
  const [updateForm, setUpdateForm] = useState<UpdateMemberPayload>({})
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<{
    text: string
    type: "success" | "error"
  } | null>(null)
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
      const res = (await peopleApi.listMembers({
        search: debouncedSearchQuery.trim() || undefined,
        role: roleFilter,
        page: currentPage,
        limit: pageSize,
      })) as PaginatedMembersResponse

      setMembers(res.items || [])
      setTotalItems(res.total || 0)
      setTotalPages(res.totalPages || 1)
      if (res.stats) {
        setStats({
          total: res.stats.total || 0,
          member: res.stats.member ?? res.stats.umat ?? 0,
          activist: res.stats.activist ?? res.stats.aktivis ?? 0,
          organizer: res.stats.organizer ?? res.stats.pengurus ?? 0,
          umat: res.stats.umat ?? res.stats.member ?? 0,
          aktivis: res.stats.aktivis ?? res.stats.activist ?? 0,
          pengurus: res.stats.pengurus ?? res.stats.organizer ?? 0,
        })
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
    if (
      !isAdmin ||
      !createForm.name.trim() ||
      !createForm.email?.trim() ||
      !createForm.gender ||
      !createForm.school?.trim()
    ) {
      setCreateError("Full Name, Email, Gender, and School are required.")
      return
    }

    try {
      setSubmitting(true)
      setCreateError(null)
      const created = await peopleApi.createMember({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        gender: createForm.gender,
        school: createForm.school.trim(),
        role: "member",
      })
      showToast(
        `Successfully registered member "${created.name}" (Username: @${created.username || "-"})`
      )
      setShowCreateModal(false)
      setCreateForm({
        name: "",
        username: "",
        email: "",
        phone: "",
        school: "",
        birth_date: "",
        gender: "",
        role: "member",
      })
      await loadData()
      showToast(
        created.email_sent
          ? "Temporary password sent to registered email."
          : "Member created. No temporary password delivery channel configured.",
        created.email_sent ? "success" : "error"
      )
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
      await peopleApi.updateMember(editingMember.id, { role: updateForm.role })
      showToast(
        `Role for "${editingMember.name}" updated to ${updateForm.role?.toUpperCase()}`
      )
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
      await peopleApi.deleteMember(deletingMember.id)
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
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopiedId(true)
        showToast("Copied to clipboard!")
      })
      .catch(() => showToast("Clipboard access denied.", "error"))
  }

  // Pagination calculations based on server response
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  const roleBadgeStyle: Record<string, string> = {
    admin: "bg-[#ff4d8b]/15 text-[#ff4d8b] border-[#ff4d8b]/30 font-semibold",
    organizer: "bg-[#1a3a3a] text-white border-[#1a3a3a] font-semibold",
    activist:
      "bg-[#b8a4ed]/30 text-[#0a0a0a] border-[#b8a4ed]/50 font-semibold",
    member: "bg-[#f5f0e0] text-[#0a0a0a] border-[#e5e5e5] font-semibold",
    // Backward-compat aliases
    pengurus: "bg-[#1a3a3a] text-white border-[#1a3a3a] font-semibold",
    aktivis: "bg-[#b8a4ed]/30 text-[#0a0a0a] border-[#b8a4ed]/50 font-semibold",
    umat: "bg-[#f5f0e0] text-[#0a0a0a] border-[#e5e5e5] font-semibold",
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] text-left font-sans antialiased">
      <PageBreadcrumb items={[{ label: "People" }]} />

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-[16px] px-4 py-3 shadow-xl backdrop-blur-md transition-all ${
            toastMessage.type === "success"
              ? "border border-emerald-500/50 bg-[#0a0a0a] text-white"
              : "bg-[#ef4444] text-white"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircleIcon className="size-5 text-emerald-400" />
          ) : (
            <AlertTriangleIcon className="size-5" />
          )}
          <span className="text-xs font-bold">{toastMessage.text}</span>
        </div>
      )}

      <div className="px-3.5 py-4 pb-32 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          {/* ── Interactive Role Distribution Donut Chart ── */}
          <CommunityRoleChart
            stats={stats}
            activeFilter={roleFilter}
            onFilterChange={setRoleFilter}
          />

          {/* ── Search Bar & Actions ── */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6a6a6a]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, @username, ID..."
                className="h-10 w-full rounded-[12px] border border-[#e6decb]/80 bg-[#fffaf0]/90 pr-9 pl-10 text-xs text-[#0a0a0a] shadow-2xs backdrop-blur-sm transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:h-11 sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-3 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#e5e5e5] text-[#6a6a6a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
                  title="Clear search"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>

            {isAdmin && (
              <Button
                variant="filled"
                onClick={() => setShowCreateModal(true)}
                className="h-10 shrink-0 gap-1.5 rounded-[12px] px-3 sm:h-11 sm:px-4"
              >
                <PlusIcon className="size-3.5 sm:size-4" />
                <span className="hidden sm:inline">Add Member</span>
              </Button>
            )}
          </div>

          {/* Main Directory */}
          <div className="w-full space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-[#0a0a0a]">
                  Members Directory
                </h2>
                <p className="text-xs text-[#6a6a6a]">
                  Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of{" "}
                  {totalItems} members
                  {totalItems !== members.length &&
                    ` (filtered from ${members.length} total)`}
                </p>
              </div>

              {roleFilter !== "all" && (
                <button
                  type="button"
                  onClick={() => setRoleFilter("all")}
                  className="cursor-pointer text-xs font-bold text-[#0a0a0a] hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>

            {loading ? (
              /* Uniform Card Skeleton Grid */
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex h-[135px] animate-pulse flex-col justify-between rounded-[16px] border border-[#e6decb]/80 bg-[#faf5e8]/90 p-3.5 shadow-2xs backdrop-blur-sm sm:h-[180px] sm:p-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="size-10 rounded-[12px] bg-[#e6decb]/60 sm:size-11" />
                        <div className="h-5 w-16 rounded-full bg-[#e6decb]/60" />
                      </div>
                      <div className="h-4 w-3/4 rounded bg-[#e6decb]/60" />
                      <div className="h-3 w-1/2 rounded bg-[#e6decb]/40" />
                    </div>
                    <div className="h-3 w-1/3 rounded bg-[#e6decb]/40" />
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center rounded-[20px] border border-dashed border-[#e6decb]/80 bg-[#fffaf0]/90 p-8 text-center backdrop-blur-sm">
                <UsersIcon className="mb-2 size-10 text-[#6a6a6a]/40" />
                <p className="text-sm font-bold text-[#0a0a0a]">
                  No members found
                </p>
                <p className="mt-1 max-w-xs text-xs text-[#6a6a6a]">
                  Try adjusting your search terms or category filter.
                </p>
              </div>
            ) : (
              /* Uniform Responsive Card Grid across mobile & desktop */
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
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
                      onClick={() =>
                        navigate({
                          to: "/people/$memberId",
                          params: { memberId: m.id },
                        })
                      }
                      className="group flex cursor-pointer flex-col justify-between rounded-[16px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-3.5 shadow-2xs backdrop-blur-sm transition-all hover:-translate-y-0.5 hover:border-[#0a0a0a]/30 hover:bg-[#faf5e8] hover:shadow-xs active:scale-[0.98] sm:p-4"
                    >
                      <div>
                        {/* Top row: Avatar & Role badge */}
                        <div className="mb-2.5 flex items-start justify-between gap-1">
                          <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#e8b94a] text-xs font-bold text-[#0a0a0a] shadow-2xs transition-transform group-hover:scale-105 sm:size-11 sm:text-sm">
                            {initials}
                          </div>
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                              roleBadgeStyle[m.role] ||
                              roleBadgeStyle.member ||
                              roleBadgeStyle.umat
                            }`}
                          >
                            {formatRoleLabel(m.role)}
                          </span>
                        </div>

                        {/* Name & Identifiers */}
                        <div>
                          <h3
                            className="truncate text-xs font-bold text-[#0a0a0a] group-hover:text-[#1a3a3a] sm:text-sm"
                            title={m.name}
                          >
                            {m.name}
                          </h3>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] sm:text-xs">
                            {m.username && (
                              <span className="truncate rounded-[4px] bg-[#1a3a3a]/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#1a3a3a]">
                                @{m.username}
                              </span>
                            )}
                            {m.user_number && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCopy(m.user_number)
                                }}
                                className="inline-flex cursor-pointer items-center gap-1 font-mono text-[11px] text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
                                title="Click to copy Member ID"
                              >
                                <span>{m.user_number}</span>
                                <CopyIcon className="size-2.5 opacity-60" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Contact & Info Snippets - hidden on mobile, shown on tablet/desktop */}
                        <div className="mt-2.5 hidden space-y-1 text-[11px] text-[#6a6a6a] sm:block">
                          {m.school && (
                            <p className="flex items-center gap-1.5 truncate">
                              <GraduationCapIcon
                                className="size-3 shrink-0 text-[#6a6a6a]"
                                aria-hidden="true"
                              />
                              <span className="truncate">{m.school}</span>
                            </p>
                          )}
                          {m.phone && (
                            <p className="flex items-center gap-1.5 truncate">
                              <PhoneIcon
                                className="size-2.5 shrink-0 text-[#6a6a6a]"
                                aria-hidden="true"
                              />
                              <span className="truncate">{m.phone}</span>
                            </p>
                          )}
                          {!m.school && !m.phone && (
                            <p className="truncate text-[11px] text-[#6a6a6a]">
                              {m.email || "No additional contact"}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Bottom row / Action */}
                      <div className="mt-3 flex items-center justify-between border-t border-[#e6decb]/60 pt-2 text-[10px] font-bold text-[#6a6a6a] transition-colors group-hover:text-[#0a0a0a] sm:text-[11px]">
                        <span>View Details</span>
                        <ChevronRightIcon className="size-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── PAGINATION CONTROLS (ICONS-ONLY STYLE) ── */}
            {totalItems > 0 && (
              <div className="flex flex-col gap-3 rounded-[16px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-3 text-xs text-[#0a0a0a] shadow-2xs backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
                <Field orientation="horizontal" className="w-fit">
                  <FieldLabel htmlFor="select-rows-per-page">
                    Items per page
                  </FieldLabel>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(val) => {
                      setPageSize(Number(val))
                      setCurrentPage(1)
                    }}
                  >
                    <SelectTrigger
                      className="h-8 w-20 rounded-[8px] border-[#e5e5e5] bg-[#fffaf0] text-xs font-bold shadow-xs"
                      id="select-rows-per-page"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="15">15</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="flex w-full items-center justify-between gap-3 sm:w-auto">
                  <span className="text-xs text-[#6a6a6a]">
                    Showing{" "}
                    <strong className="text-[#0a0a0a]">
                      {totalItems === 0 ? 0 : startIndex + 1}–{endIndex}
                    </strong>{" "}
                    of <strong className="text-[#0a0a0a]">{totalItems}</strong>{" "}
                    (Page {currentPage} of {totalPages})
                  </span>

                  <Pagination className="mx-0 w-auto">
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }}
                          disabled={currentPage <= 1}
                        />
                      </PaginationItem>
                      <PaginationItem>
                        <PaginationNext
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1)
                            )
                          }}
                          disabled={currentPage >= totalPages}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      <ResponsiveFormModal
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open)
          if (open) setCreateError(null)
        }}
        title="Add New Member"
        description="Full Name, Email, Gender, and School are required to deliver temporary login password."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateMember} className="space-y-5">
          {createError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[12px] border border-[#ef4444]/30 bg-[#ef4444]/5 p-3 text-xs font-semibold text-[#991b1b]"
            >
              <AlertTriangleIcon
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>{createError}</span>
            </div>
          )}
          <section className="space-y-4 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-[#0a0a0a]">
                <UsersIcon className="size-4 text-[#1a3a3a]" /> Member basics
              </h4>
              <p className="mt-1 text-xs leading-relaxed text-[#6a6a6a]">
                These three details are enough to create the member record.
              </p>
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="people-create-name"
                className="text-xs font-bold text-[#0a0a0a]"
              >
                Full Name <span className="text-[#ef4444]">*</span>
              </label>
              <input
                id="people-create-name"
                type="text"
                required
                autoComplete="name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="e.g. Michael Jordan"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-sm text-[#0a0a0a] transition-colors outline-none placeholder:text-[#767676] focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/15"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <label
                  htmlFor="people-create-email"
                  className="text-xs font-bold text-[#0a0a0a]"
                >
                  Email <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  id="people-create-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={createForm.email || ""}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, email: e.target.value })
                  }
                  placeholder="member@example.com"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-sm text-[#0a0a0a] transition-colors outline-none placeholder:text-[#767676] focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/15"
                />
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="people-create-gender"
                  className="text-xs font-bold text-[#0a0a0a]"
                >
                  Gender <span className="text-[#ef4444]">*</span>
                </label>
                <select
                  id="people-create-gender"
                  required
                  value={createForm.gender || ""}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, gender: e.target.value })
                  }
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-sm text-[#0a0a0a] transition-colors outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/15"
                >
                  <option value="" disabled>
                    Select gender
                  </option>
                  <option value="L">Male</option>
                  <option value="P">Female</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="people-create-school"
                  className="text-xs font-bold text-[#0a0a0a]"
                >
                  School <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  id="people-create-school"
                  type="text"
                  required
                  autoComplete="organization"
                  value={createForm.school || ""}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, school: e.target.value })
                  }
                  placeholder="e.g. SMA Tri Maha Dharma"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-sm text-[#0a0a0a] transition-colors outline-none placeholder:text-[#767676] focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/15"
                />
              </div>
            </div>
          </section>
          <div className="flex flex-col-reverse gap-2.5 border-t border-[#e5e5e5] pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowCreateModal(false)}
              className="min-h-11 flex-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0] disabled:opacity-50 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] px-5 text-sm font-bold text-white transition-colors hover:bg-[#1f1f1f] disabled:cursor-wait disabled:opacity-50 sm:flex-none"
            >
              {submitting && (
                <span
                  className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
              )}
              {submitting ? "Creating..." : "Create Member"}
            </button>
          </div>
        </form>
      </ResponsiveFormModal>
      {/* MODAL 2: Change Member Role (Pengurus/Admin only can change role)          */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-3.5 backdrop-blur-xs fade-in sm:p-4">
          <div className="relative max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 text-left shadow-2xl sm:space-y-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <ShieldCheckIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                    Change User Role
                  </h3>
                  <p className="text-[11px] text-[#6a6a6a] sm:text-xs">
                    Manage permissions & account roles
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="cursor-pointer rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8]"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Read-Only User Info Card */}
            <div className="space-y-2.5 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#e8b94a] text-xs font-bold text-[#0a0a0a] uppercase shadow-2xs">
                  {editingMember.name
                    .split(" ")
                    .slice(0, 2)
                    .map((w) => (w[0] ? w[0].toUpperCase() : ""))
                    .join("") || "UM"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#0a0a0a] sm:text-sm">
                    {editingMember.name}
                  </p>
                  <p className="font-mono text-[11px] font-bold text-[#1a3a3a]">
                    {editingMember.user_number || "—"}
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadgeStyle[editingMember.role]}`}
                >
                  {editingMember.role}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-[#e5e5e5] pt-2 text-xs text-[#6a6a6a]">
                <div className="truncate">
                  <span className="block text-[10px] font-bold text-[#6a6a6a] uppercase">
                    Contact
                  </span>
                  <span className="block truncate font-medium text-[#0a0a0a]">
                    {editingMember.phone || editingMember.email || "—"}
                  </span>
                </div>
                <div className="truncate">
                  <span className="block text-[10px] font-bold text-[#6a6a6a] uppercase">
                    School/College
                  </span>
                  <span className="block truncate font-medium text-[#0a0a0a]">
                    {editingMember.school || "—"}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="flex items-center justify-between text-xs font-bold text-[#0a0a0a]">
                  <span>Select New Role</span>
                </label>
                <select
                  value={updateForm.role || "member"}
                  onChange={(e) =>
                    setUpdateForm({ role: e.target.value as any })
                  }
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs font-semibold text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                >
                  <option value="member">
                    Member (Access: Home, Events, Leaderboard, Profile)
                  </option>
                  <option value="activist">
                    Activist (Access: Attendance Scanner & Event Duties)
                  </option>
                  <option value="organizer">
                    Organizer (Full Access: Management & Events)
                  </option>
                  {isAdmin && (
                    <option value="admin">
                      Admin (System Master Administrator)
                    </option>
                  )}
                </select>
              </div>

              <div className="rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3 text-xs leading-relaxed text-[#0a0a0a]">
                ℹ️ <strong>Information:</strong> Role changes will immediately
                update the member's navigation menu and authorization
                privileges.
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="h-11 flex-1 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8] sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 flex-1 cursor-pointer rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-50 sm:text-sm"
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
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-3.5 backdrop-blur-xs fade-in sm:p-4">
          <div className="relative max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 text-left shadow-2xl sm:space-y-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2">
                <SparklesIcon className="size-5 text-[#e8b94a]" />
                <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                  Member Card & QR Code
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQrMember(null)}
                className="cursor-pointer rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8]"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* The ID Card Preview */}
            <div className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-xs sm:p-5">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2.5">
                <div>
                  <p className="text-xs font-bold text-[#0a0a0a]">
                    Sekkha Community
                  </p>
                  <p className="text-[11px] font-medium text-[#6a6a6a]">
                    Official Membership ID Card
                  </p>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${roleBadgeStyle[qrMember.role]}`}
                >
                  {qrMember.role}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center space-y-3 py-2">
                <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-xs">
                  <QRCode
                    value={qrMember.user_number || qrMember.id}
                    size={140}
                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                    viewBox="0 0 256 256"
                  />
                </div>

                <div className="space-y-0.5 text-center">
                  <p className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                    {qrMember.name}
                  </p>
                  <p className="font-mono text-xs font-bold text-[#1a3a3a]">
                    {qrMember.user_number || "—"}
                  </p>
                  {qrMember.school && (
                    <p className="flex items-center gap-1 text-xs text-[#6a6a6a]">
                      <GraduationCapIcon
                        className="size-3"
                        aria-hidden="true"
                      />
                      <span>{qrMember.school}</span>
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#e5e5e5] pt-2 text-xs text-[#6a6a6a]">
                <span className="inline-flex items-center gap-1.5">
                  <span>Status:</span>
                  {qrMember.is_claimed ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                      <CheckCircleIcon
                        className="size-3.5"
                        aria-hidden="true"
                      />
                      Active Account
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-600">
                      <AlertTriangleIcon
                        className="size-3.5"
                        aria-hidden="true"
                      />
                      Unclaimed
                    </span>
                  )}
                </span>
                <span>Total Attendance: {qrMember.total_attendance || 0}x</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleCopy(qrMember.user_number)}
                className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8] sm:text-sm"
              >
                {copiedId ? (
                  <CheckIcon className="size-4 text-emerald-600" />
                ) : (
                  <CopyIcon className="size-4 text-[#6a6a6a]" />
                )}
                <span>{copiedId ? "Copied!" : "Copy Member ID"}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] sm:text-sm"
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
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-3.5 backdrop-blur-xs fade-in sm:p-4">
          <div className="relative max-h-[90vh] w-full max-w-sm space-y-4 overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 text-left shadow-2xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-[10px] bg-rose-100 text-rose-600">
                <Trash2Icon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                  Delete Member?
                </h3>
                <p className="text-xs text-[#6a6a6a]">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-[#6a6a6a] sm:text-sm">
              Are you sure you want to delete{" "}
              <strong>"{deletingMember.name}"</strong> (
              {deletingMember.user_number || "No ID"})? All associated history
              will be removed.
            </p>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outlined"
                type="button"
                onClick={() => setDeletingMember(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                type="button"
                onClick={handleDeleteMember}
                disabled={submitting}
                className="flex-1"
              >
                {submitting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 5: Member Credentials Modal (Pengurus / Admin)                      */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
    </main>
  )
}
