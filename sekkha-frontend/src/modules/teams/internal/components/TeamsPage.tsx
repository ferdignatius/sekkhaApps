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
  KeyIcon,
  Share2Icon,
  ChevronRightIcon,
} from "lucide-react"
import QRCode from "react-qr-code"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { useDebounce } from "@/hooks/useDebounce"
import { SkeletonTableRow } from "@/components/ui/skeleton"
import { Field, FieldLabel } from "@/components/ui/field"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { teamsApi } from "../api/teamsApi"
import type {
  MemberDto,
  CreateMemberPayload,
  UpdateMemberPayload,
  PaginatedMembersResponse,
} from "../api/teamsApi"

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

function CommunityRoleChart({
  stats,
  activeFilter,
  onFilterChange,
}: {
  stats: { total: number; umat: number; aktivis: number; pengurus: number }
  activeFilter: string
  onFilterChange: (role: string) => void
}) {
  const total = stats.total || 0
  const umatPct = total > 0 ? (stats.umat / total) * 100 : 0
  const aktivisPct = total > 0 ? (stats.aktivis / total) * 100 : 0
  const pengurusPct = total > 0 ? (stats.pengurus / total) * 100 : 0

  const r = 36
  const c = 2 * Math.PI * r

  const pengurusLen = (pengurusPct / 100) * c
  const umatLen = (umatPct / 100) * c
  const aktivisLen = (aktivisPct / 100) * c

  const pengurusOffset = 0
  const umatOffset = -pengurusLen
  const aktivisOffset = -(pengurusLen + umatLen)

  const roles = [
    {
      id: "pengurus",
      label: "Organizers & Admins",
      shortLabel: "Organizers",
      count: stats.pengurus,
      pct: pengurusPct,
      colorHex: "#1a3a3a",
    },
    {
      id: "umat",
      label: "Members",
      shortLabel: "Members",
      count: stats.umat,
      pct: umatPct,
      colorHex: "#e8b94a",
    },
    {
      id: "aktivis",
      label: "Activists & Volunteers",
      shortLabel: "Activists",
      count: stats.aktivis,
      pct: aktivisPct,
      colorHex: "#8b5cf6",
    },
  ]

  return (
    <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-xs sm:rounded-[20px] sm:p-4">
      <div className="flex flex-col items-center justify-between gap-3 sm:flex-row sm:gap-4">
        {/* Left: Donut Chart & Center Metric */}
        <div className="flex w-full items-center gap-3 sm:w-auto sm:gap-4">
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
                  {pengurusLen > 0 && (
                    <circle
                      cx="48"
                      cy="48"
                      r={r}
                      fill="none"
                      stroke="#1a3a3a"
                      strokeWidth={activeFilter === "pengurus" ? 12 : 10}
                      strokeDasharray={`${pengurusLen} ${c}`}
                      strokeDashoffset={pengurusOffset}
                      className="cursor-pointer transition-all duration-300 hover:opacity-85"
                      onClick={() =>
                        onFilterChange(
                          activeFilter === "pengurus" ? "all" : "pengurus"
                        )
                      }
                    />
                  )}
                  {umatLen > 0 && (
                    <circle
                      cx="48"
                      cy="48"
                      r={r}
                      fill="none"
                      stroke="#e8b94a"
                      strokeWidth={activeFilter === "umat" ? 12 : 10}
                      strokeDasharray={`${umatLen} ${c}`}
                      strokeDashoffset={umatOffset}
                      className="cursor-pointer transition-all duration-300 hover:opacity-85"
                      onClick={() =>
                        onFilterChange(activeFilter === "umat" ? "all" : "umat")
                      }
                    />
                  )}
                  {aktivisLen > 0 && (
                    <circle
                      cx="48"
                      cy="48"
                      r={r}
                      fill="none"
                      stroke="#8b5cf6"
                      strokeWidth={activeFilter === "aktivis" ? 12 : 10}
                      strokeDasharray={`${aktivisLen} ${c}`}
                      strokeDashoffset={aktivisOffset}
                      className="cursor-pointer transition-all duration-300 hover:opacity-85"
                      onClick={() =>
                        onFilterChange(
                          activeFilter === "aktivis" ? "all" : "aktivis"
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
              <span className="text-lg leading-none font-black text-[#0a0a0a] sm:text-xl">
                {total}
              </span>
              <span
                className={`mt-0.5 text-[8px] font-bold tracking-wider uppercase sm:text-[9px] ${
                  activeFilter !== "all"
                    ? "text-[#0a0a0a] underline"
                    : "text-[#6a6a6a]"
                }`}
              >
                {activeFilter !== "all" ? "Reset" : "Total"}
              </span>
            </button>
          </div>

          <div className="flex-1 sm:hidden">
            <h3 className="text-xs font-bold text-[#0a0a0a]">
              Role Distribution
            </h3>
            <p className="text-[11px] text-[#6a6a6a]">
              Tap any role chip to filter directory.
            </p>
          </div>
        </div>

        {/* Right: Interactive Role Chips */}
        <div className="grid w-full grid-cols-3 gap-1.5 sm:flex sm:w-auto sm:items-center sm:gap-2">
          {roles.map((r) => {
            const isSelected = activeFilter === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => onFilterChange(isSelected ? "all" : r.id)}
                className={`flex flex-1 cursor-pointer flex-col gap-1 rounded-[12px] border p-2 text-left transition-all select-none sm:flex-row sm:items-center sm:gap-2 sm:px-3 sm:py-2 ${
                  isSelected
                    ? "border-[#0a0a0a] bg-[#faf5e8] shadow-xs ring-1 ring-[#0a0a0a]"
                    : "border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8]"
                }`}
                title={`Filter by ${r.label}`}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-2 shrink-0 rounded-full shadow-2xs"
                    style={{ backgroundColor: r.colorHex }}
                  />
                  <span className="truncate text-[10px] font-bold text-[#6a6a6a] sm:text-xs">
                    {r.shortLabel}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-xs font-extrabold text-[#0a0a0a] sm:text-sm">
                    {r.count}
                  </span>
                  <span className="text-[9px] text-[#6a6a6a]">
                    ({Math.round(r.pct)}%)
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function TeamsPage() {
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

  const roleBadgeStyle: Record<string, string> = {
    admin: "bg-[#ff4d8b]/15 text-[#ff4d8b] border-[#ff4d8b]/30 font-semibold",
    pengurus: "bg-[#1a3a3a] text-white border-[#1a3a3a] font-semibold",
    aktivis: "bg-[#b8a4ed]/30 text-[#0a0a0a] border-[#b8a4ed]/50 font-semibold",
    umat: "bg-[#f5f0e0] text-[#0a0a0a] border-[#e5e5e5] font-semibold",
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] text-left font-sans">
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
          {/* ── Top Header Banner: Sleek Clay Style ── */}
          <div className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3 shadow-xs sm:rounded-[24px] sm:p-5">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs sm:size-12 sm:rounded-[12px]">
                  <UsersIcon className="size-4.5 text-[#e8b94a] sm:size-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="truncate text-sm font-bold tracking-tight text-[#0a0a0a] sm:text-xl">
                      People Directory
                    </h1>
                    <span className="shrink-0 rounded-[6px] border border-[#e8b94a]/40 bg-[#e8b94a]/20 px-2 py-0.5 text-[10px] font-extrabold text-[#0a0a0a] sm:rounded-[8px] sm:text-xs">
                      {stats.total} Members
                    </span>
                  </div>
                  <p className="truncate text-[11px] text-[#6a6a6a] sm:text-xs">
                    Member database, roles, and community directory
                  </p>
                </div>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-[#0a0a0a] px-3 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] active:scale-[0.98] sm:h-10 sm:rounded-[12px] sm:px-4 sm:text-sm"
                >
                  <PlusIcon className="size-3.5 sm:size-4" />
                  <span className="hidden sm:inline">Add Member</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Interactive Role Distribution Donut Chart ── */}
          <CommunityRoleChart
            stats={stats}
            activeFilter={roleFilter}
            onFilterChange={setRoleFilter}
          />

          {/* ── Search Bar ── */}
          <div className="relative w-full">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6a6a6a]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, @username, ID..."
              className="h-10 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pr-9 pl-10 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:h-11 sm:text-sm"
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
              <>
                {/* Mobile Skeleton Grid */}
                <div className="grid grid-cols-2 gap-2.5 md:hidden">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-28 animate-pulse rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3"
                    />
                  ))}
                </div>

                {/* Desktop Skeleton Table */}
                <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs md:block">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[#e5e5e5] bg-[#faf5e8]">
                        <th className="px-4 py-3 text-xs font-bold text-[#6a6a6a]">
                          Member
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-[#6a6a6a]">
                          Contact & Info
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-[#6a6a6a]">
                          Role
                        </th>
                        <th className="px-4 py-3 text-xs font-bold text-[#6a6a6a]">
                          Points & Attendance
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-bold text-[#6a6a6a]">
                          Actions
                        </th>
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
                <UsersIcon className="mb-2 size-10 text-[#6a6a6a]/40" />
                <p className="text-sm font-bold text-[#0a0a0a]">
                  No members found
                </p>
                <p className="mt-1 max-w-xs text-xs text-[#6a6a6a]">
                  Try adjusting your search terms or category filter.
                </p>
              </div>
            ) : (
              <>
                {/* 📱 MOBILE VIEW: 2-Column Card Grid (< md) */}
                <div className="grid grid-cols-2 gap-2.5 md:hidden">
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
                            to: "/teams/$memberId",
                            params: { memberId: m.id },
                          })
                        }
                        className="flex cursor-pointer flex-col justify-between rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-2xs transition-all hover:border-[#0a0a0a]/30 hover:bg-[#faf5e8] active:scale-[0.98]"
                      >
                        <div>
                          {/* Top row: Avatar & Role badge */}
                          <div className="mb-2 flex items-start justify-between gap-1">
                            <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#e8b94a] text-xs font-bold text-[#0a0a0a] shadow-2xs">
                              {initials}
                            </div>
                            <span
                              className={`inline-block rounded-full border px-1.5 py-0.5 text-[9px] leading-none font-bold ${roleBadgeStyle[m.role] || roleBadgeStyle.umat}`}
                            >
                              {formatRoleLabel(m.role)}
                            </span>
                          </div>

                          {/* Name & Username */}
                          <p
                            className="truncate text-xs leading-tight font-bold text-[#0a0a0a]"
                            title={m.name}
                          >
                            {m.name}
                          </p>
                          <div className="mt-0.5 flex items-center gap-1 text-[10px]">
                            {m.username ? (
                              <span className="truncate font-mono font-semibold text-[#1a3a3a]">
                                @{m.username}
                              </span>
                            ) : (
                              <span className="font-mono text-[#6a6a6a]">
                                {m.user_number || "—"}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Bottom info snippet */}
                        <div className="mt-2.5 flex items-center justify-between border-t border-[#e5e5e5]/80 pt-2 text-[10px] text-[#6a6a6a]">
                          <span className="truncate text-[#6a6a6a]">
                            {m.school || m.phone || m.email || "No details"}
                          </span>
                          <ChevronRightIcon className="ml-1 size-3 shrink-0 text-[#6a6a6a]" />
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 🖥️ DESKTOP VIEW: Structured Table (hidden on mobile, visible md+) */}
                <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs md:block">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-sans text-xs">
                      <thead>
                        <tr className="border-b border-[#e5e5e5] bg-[#faf5e8] font-bold text-[#6a6a6a]">
                          <th className="px-4 py-3">Member ID</th>
                          <th className="px-4 py-3">Name & Username</th>
                          <th className="px-4 py-3">Role</th>
                          <th className="px-4 py-3">School / Contact</th>
                          <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f0f0f0]">
                        {members.map((m) => {
                          const initials =
                            m.name
                              .split(" ")
                              .slice(0, 2)
                              .map((w) => (w[0] ? w[0].toUpperCase() : ""))
                              .join("") || "UM"

                          return (
                            <tr
                              key={m.id}
                              onClick={() =>
                                navigate({
                                  to: "/teams/$memberId",
                                  params: { memberId: m.id },
                                })
                              }
                              className="group cursor-pointer transition-colors hover:bg-[#faf5e8]/70"
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
                                      className="cursor-pointer text-[#6a6a6a] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#0a0a0a]"
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
                                      <p className="truncate font-bold text-[#0a0a0a]">
                                        {m.name}
                                      </p>
                                      {m.username && (
                                        <span className="rounded-[4px] bg-[#1a3a3a]/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#1a3a3a]">
                                          @{m.username}
                                        </span>
                                      )}
                                    </div>
                                    <p className="truncate text-[11px] text-[#6a6a6a]">
                                      {m.email ||
                                        (m.phone
                                          ? `Phone: ${m.phone}`
                                          : "No email contact")}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* Role */}
                              <td className="px-4 py-3">
                                <span
                                  className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeStyle[m.role] || roleBadgeStyle.umat}`}
                                >
                                  {formatRoleLabel(m.role)}
                                </span>
                              </td>

                              {/* School / Contact */}
                              <td className="px-4 py-3 text-xs text-[#6a6a6a]">
                                <div className="space-y-0.5">
                                  {m.school && (
                                    <p className="max-w-[160px] truncate">
                                      🏫 {m.school}
                                    </p>
                                  )}
                                  {m.phone && (
                                    <p className="text-[11px] text-[#6a6a6a]">
                                      📞 {m.phone}
                                    </p>
                                  )}
                                  {!m.school && !m.phone && (
                                    <span className="text-[#6a6a6a]">—</span>
                                  )}
                                </div>
                              </td>

                              {/* Actions */}
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigate({
                                      to: "/teams/$memberId",
                                      params: { memberId: m.id },
                                    })
                                  }}
                                  className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] bg-[#0a0a0a] px-3 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f]"
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

                {/* ── PAGINATION CONTROLS (ICONS-ONLY STYLE) ── */}
                {totalItems > 0 && (
                  <div className="flex flex-col gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3 text-xs text-[#0a0a0a] shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-4">
                    <Field orientation="horizontal" className="w-fit">
                      <FieldLabel htmlFor="select-rows-per-page">
                        Rows per page
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
                        of{" "}
                        <strong className="text-[#0a0a0a]">{totalItems}</strong>{" "}
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      {/* MODAL 1: Create Pre-provisioned Member (Admin only)                       */}
      {/* ───────────────────────────────────────────────────────────────────────── */}
      {showCreateModal && isAdmin && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-3.5 backdrop-blur-xs fade-in sm:p-4">
          <div className="relative max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 text-left shadow-2xl sm:space-y-5 sm:p-6">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <PlusIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                    Add New Member
                  </h3>
                  <p className="text-[11px] text-[#6a6a6a] sm:text-xs">
                    Pre-provision member account by Admin
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="cursor-pointer rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8]"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-[#0a0a0a]">
                    Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Michael Jordan"
                    value={createForm.name}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, name: e.target.value })
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">
                    Username{" "}
                    <span className="text-[10px] font-normal text-[#6a6a6a]/80">
                      (Auto if empty)
                    </span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. michael.jordan"
                    value={createForm.username || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, username: e.target.value })
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +628123456789"
                    value={createForm.phone || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, phone: e.target.value })
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">
                    Email (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="name@email.com"
                    value={createForm.email || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, email: e.target.value })
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">
                    School / College
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Saint Joseph High School"
                    value={createForm.school || ""}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, school: e.target.value })
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">
                    Birth Date
                  </label>
                  <input
                    type="date"
                    value={createForm.birth_date || ""}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        birth_date: e.target.value,
                      })
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">
                    Gender
                  </label>
                  <select
                    value={createForm.gender || "L"}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, gender: e.target.value })
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                  >
                    <option value="L">Male</option>
                    <option value="P">Female</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[#6a6a6a]">
                    Account Role
                  </label>
                  <select
                    value={createForm.role || "umat"}
                    onChange={(e) =>
                      setCreateForm({
                        ...createForm,
                        role: e.target.value as any,
                      })
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                  >
                    <option value="umat">Member</option>
                    <option value="aktivis">Activist</option>
                    <option value="pengurus">Organizer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3 text-xs leading-relaxed text-[#0a0a0a]">
                <p>
                  💡 <strong>Default Password:</strong> New accounts are
                  assigned an auto-generated temporary password with format{" "}
                  <code className="rounded bg-[#f5f0e0] px-1.5 py-0.5 font-bold">
                    Sekkha[4-digit]Puggala
                  </code>
                  . Members can change it anytime in Profile.
                </p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="h-11 flex-1 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8] sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 flex-1 cursor-pointer rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-50 sm:text-sm"
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
                  value={updateForm.role || "umat"}
                  onChange={(e) =>
                    setUpdateForm({ role: e.target.value as any })
                  }
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs font-semibold text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                >
                  <option value="umat">
                    Member (Access: Home, Events, Leaderboard, Profile)
                  </option>
                  <option value="aktivis">
                    Activist (Access: Attendance Scanner & Event Duties)
                  </option>
                  <option value="pengurus">
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
                    <p className="text-xs text-[#6a6a6a]">
                      🏫 {qrMember.school}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-[#e5e5e5] pt-2 text-xs text-[#6a6a6a]">
                <span>
                  Status:{" "}
                  {qrMember.is_claimed ? "✅ Active Account" : "⚠️ Unclaimed"}
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
              <button
                type="button"
                onClick={() => setDeletingMember(null)}
                className="h-11 flex-1 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8] sm:text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteMember}
                disabled={submitting}
                className="h-11 flex-1 cursor-pointer rounded-[12px] bg-rose-600 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-700 disabled:opacity-50 sm:text-sm"
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
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-3.5 backdrop-blur-xs fade-in sm:p-4">
          <div className="relative max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 text-left shadow-2xl sm:space-y-5 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <KeyIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                    Member Credentials
                  </h3>
                  <p className="text-xs text-[#6a6a6a]">
                    Username & login password for member
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCredentialModalData(null)}
                className="cursor-pointer rounded-full p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8]"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Member Info Card */}
            <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
              <div className="min-w-0">
                <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                  Member Name
                </p>
                <p className="truncate text-xs font-bold text-[#0a0a0a] sm:text-sm">
                  {credentialModalData.memberName}
                </p>
                {credentialModalData.phone && (
                  <p className="text-xs text-[#6a6a6a]">
                    📞 {credentialModalData.phone}
                  </p>
                )}
              </div>
              {credentialModalData.userNumber && (
                <div className="shrink-0 text-right">
                  <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                    Member ID
                  </p>
                  <span className="rounded-[6px] border border-[#e5e5e5] bg-[#1a3a3a]/10 px-2 py-1 font-mono text-xs font-bold text-[#1a3a3a]">
                    {credentialModalData.userNumber}
                  </span>
                </div>
              )}
            </div>

            {/* Username & Password Display */}
            <div className="space-y-3">
              <div className="space-y-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4">
                {/* Username */}
                <div>
                  <p className="mb-1 text-[11px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                    LOGIN USERNAME
                  </p>
                  <div className="flex items-center justify-between rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2.5">
                    <span className="font-mono text-sm font-bold text-[#0a0a0a] select-all sm:text-base">
                      @{credentialModalData.username}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(credentialModalData.username)}
                      className="flex cursor-pointer items-center gap-1 text-xs font-bold text-[#0a0a0a] hover:underline"
                    >
                      <CopyIcon className="size-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>

                {/* Password Default */}
                <div>
                  <p className="mb-1 text-[11px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                    DEFAULT PASSWORD
                  </p>
                  <div className="flex items-center justify-between rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2.5">
                    <span className="font-mono text-sm font-bold text-[#0a0a0a] select-all sm:text-base">
                      {credentialModalData.defaultPassword}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopy(credentialModalData.defaultPassword)
                      }
                      className="flex cursor-pointer items-center gap-1 text-xs font-bold text-[#0a0a0a] hover:underline"
                    >
                      <CopyIcon className="size-3.5" />
                      <span>Copy</span>
                    </button>
                  </div>
                </div>
              </div>

              <p className="px-1 text-xs leading-relaxed text-[#6a6a6a]">
                Members can immediately log in using the{" "}
                <strong>Username</strong> and <strong>Default Password</strong>{" "}
                above, and may update their credentials anytime under their
                Profile menu.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 border-t border-[#e5e5e5] pt-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const fullText = `Sekkha Community Account:\nName: ${credentialModalData.memberName}\nUsername: @${credentialModalData.username}\nPassword: ${credentialModalData.defaultPassword}`
                    navigator.clipboard.writeText(fullText)
                    showToast("All credentials copied!")
                  }}
                  className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] sm:text-sm"
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
                    className="flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-emerald-600 px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 sm:text-sm"
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
                  className="cursor-pointer text-xs font-semibold text-[#6a6a6a] hover:text-[#0a0a0a]"
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
