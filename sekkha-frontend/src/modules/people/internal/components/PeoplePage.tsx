import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  UsersIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
  CopyIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
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
import { Badge } from "@/components/base/Badge"
import { Button } from "@/components/base/Button"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/base/Select"
import {
  formatMemberInitials,
  formatRoleLabel,
  getRoleAvatarClass,
  getRoleBadgeVariant,
} from "../utils/memberFormatters"
import { PreProvisionMemberModal } from "./PreProvisionMemberModal"
import { peopleApi } from "../api/peopleApi"
import type {
  MemberDto,
  UpdateMemberPayload,
  PaginatedMembersResponse,
} from "../api/peopleApi"

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
  }
  activeFilter: string
  onFilterChange: (role: string) => void
}) {
  const total = stats.total || 0
  const memberCount = stats.member ?? 0
  const activistCount = stats.activist ?? 0
  const organizerCount = stats.organizer ?? 0

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
      label: "Activists",
      shortLabel: "Activists",
      count: activistCount,
      pct: activistPct,
      colorHex: "#8b5cf6",
    },
  ]

  return (
    <div className="rounded-xl border border-hairline bg-canvas p-4 shadow-2xs sm:p-5">
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
                      strokeWidth={activeFilter === "organizer" ? 12 : 10}
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
                      strokeWidth={activeFilter === "member" ? 12 : 10}
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
                      strokeWidth={activeFilter === "activist" ? 12 : 10}
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
        <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3 sm:gap-3 lg:w-[480px]">
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
  const isOrganizerOrAdmin =
    authState.status === "authenticated" &&
    (authState.role === "organizer" ||
      (authState.role as string) === "pengurus" ||
      authState.role === "admin")
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
    claimed: 0,
    unclaimed: 0,
  })

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 250)
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(12)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingMember, setEditingMember] = useState<MemberDto | null>(null)
  const [deletingMember, setDeletingMember] = useState<MemberDto | null>(null)

  // Form states
  const [updateForm, setUpdateForm] = useState<UpdateMemberPayload>({})
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<{
    text: string
    type: "success" | "error"
  } | null>(null)

  // Defense-in-depth: Redirect non-organizer/non-admin users to home
  useEffect(() => {
    if (
      authState.status === "authenticated" &&
      authState.role !== null &&
      !isOrganizerOrAdmin
    ) {
      navigate({ to: "/home" })
    }
  }, [authState.status, authState.role, isOrganizerOrAdmin, navigate])

  const prevFiltersRef = useRef({
    debouncedSearchQuery,
    roleFilter,
    claimStatusFilter,
  })

  // Fetch paginated & filtered data from API (resetting page to 1 without double-fetching)
  useEffect(() => {
    if (!isOrganizerOrAdmin) return
    const filtersChanged =
      prevFiltersRef.current.debouncedSearchQuery !== debouncedSearchQuery ||
      prevFiltersRef.current.roleFilter !== roleFilter ||
      prevFiltersRef.current.claimStatusFilter !== claimStatusFilter
    prevFiltersRef.current = {
      debouncedSearchQuery,
      roleFilter,
      claimStatusFilter,
    }
    if (filtersChanged && currentPage !== 1) {
      setCurrentPage(1)
      return
    }
    void loadData()
  }, [
    isOrganizerOrAdmin,
    currentPage,
    pageSize,
    debouncedSearchQuery,
    roleFilter,
    claimStatusFilter,
  ])

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  async function loadData() {
    if (!isOrganizerOrAdmin) return
    try {
      setLoading(true)
      const res = (await peopleApi.listMembers({
        search: debouncedSearchQuery.trim() || undefined,
        role: roleFilter,
        claimed_status: claimStatusFilter,
        page: currentPage,
        limit: pageSize,
      })) as PaginatedMembersResponse

      setMembers(res.items || [])
      setTotalItems(res.total || 0)
      setTotalPages(res.totalPages || 1)
      if (res.stats) {
        setStats({
          total: res.stats.total || 0,
          member: res.stats.member ?? 0,
          activist: res.stats.activist ?? 0,
          organizer: res.stats.organizer ?? 0,
          claimed: res.stats.claimed ?? 0,
          unclaimed: res.stats.unclaimed ?? 0,
        })
      }
    } catch (err) {
      console.error("Failed to load People data:", err)
      showToast("Failed to load member data", "error")
    } finally {
      setLoading(false)
    }
  }

  const isSelfMember = (targetId?: string) =>
    Boolean(authState.userId && targetId && authState.userId === targetId)

  // Handle Update Member Role
  async function handleUpdateMember(e: React.FormEvent) {
    e.preventDefault()
    if (!editingMember || !isAdmin || isSelfMember(editingMember.id)) {
      if (editingMember && isSelfMember(editingMember.id)) {
        showToast("You cannot change your own role or account data.", "error")
      }
      return
    }

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
    if (!deletingMember || !isAdmin || isSelfMember(deletingMember.id)) {
      if (deletingMember && isSelfMember(deletingMember.id)) {
        showToast("You cannot delete your own account.", "error")
      }
      return
    }

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
  function handleCopy(
    text?: string | number | null,
    successMessage: string = "Copied to clipboard!"
  ) {
    if (!text) return
    navigator.clipboard
      .writeText(String(text))
      .then(() => {
        showToast(successMessage)
      })
      .catch(() => showToast("Clipboard access denied.", "error"))
  }

  // Pagination calculations based on server response
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * pageSize
  const endIndex = Math.min(startIndex + pageSize, totalItems)

  return (
    <main className="min-h-screen bg-canvas text-left font-sans antialiased">
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

          {/* ── Search Bar, Status Filter & Actions ── */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, @username, Member ID..."
                className="h-11 w-full rounded-md border border-hairline bg-canvas pr-9 pl-10 text-sm text-ink shadow-2xs transition-all outline-none placeholder:text-text-muted focus:border-ink focus:ring-1 focus:ring-ink"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-3 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-hairline text-text-muted transition-colors hover:bg-ink hover:text-white"
                  title="Clear search"
                >
                  <XIcon className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
              {/* Filter Pills for Claim Status */}
              <div className="grid w-full grid-cols-3 gap-1 rounded-md border border-hairline bg-canvas/90 p-1 shadow-2xs sm:inline-flex sm:w-auto">
                {(["all", "claimed", "unclaimed"] as const).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setClaimStatusFilter(st)}
                    className={`min-h-[38px] cursor-pointer rounded-sm px-3 py-1.5 text-center text-xs font-bold whitespace-nowrap capitalize transition-all ${
                      claimStatusFilter === st
                        ? "bg-ink text-white shadow-xs"
                        : "text-text-muted hover:text-ink"
                    }`}
                  >
                    {st === "all" ? "All Accounts" : st}
                  </button>
                ))}
              </div>

              {/* Add Member Button (Organizer/Admin) */}
              {isOrganizerOrAdmin && (
                <Button
                  variant="filled"
                  onClick={() => setShowCreateModal(true)}
                  className="w-full shrink-0 gap-1.5 rounded-md px-4 sm:w-auto"
                >
                  <PlusIcon className="size-4" />
                  <span>Add Member</span>
                </Button>
              )}
            </div>
          </div>

          {/* Main Directory */}
          <div className="w-full space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Members Directory
                </h2>
                <p className="text-xs text-text-muted">
                  Showing {totalItems === 0 ? 0 : startIndex + 1}–{endIndex} of{" "}
                  {totalItems} members
                  {(roleFilter !== "all" || claimStatusFilter !== "all") &&
                    " (filtered)"}
                </p>
              </div>

              {(roleFilter !== "all" || claimStatusFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setRoleFilter("all")
                    setClaimStatusFilter("all")
                  }}
                  className="min-h-[36px] shrink-0 cursor-pointer text-xs font-bold text-ink hover:underline"
                >
                  Clear filters
                </button>
              )}
            </div>

            {loading ? (
              /* Lightweight 2-col Mobile / 3-4 col Desktop Skeleton Grid */
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="flex h-[112px] animate-pulse flex-col justify-between rounded-lg border border-hairline bg-surface-soft p-3 shadow-2xs sm:h-[132px] sm:p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="size-9 rounded-md bg-hairline/70 sm:size-10" />
                      <div className="h-5 w-14 rounded-full bg-hairline/70" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="h-3.5 w-3/4 rounded bg-hairline/70" />
                      <div className="h-3 w-1/2 rounded bg-hairline/50" />
                    </div>
                  </div>
                ))}
              </div>
            ) : members.length === 0 ? (
              <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-canvas p-8 text-center">
                <UsersIcon className="mb-2 size-10 text-text-muted/40" />
                <p className="text-sm font-bold text-ink">
                  No members found
                </p>
                <p className="mt-1 max-w-xs text-xs text-text-muted">
                  Try adjusting your search query or filter settings.
                </p>
              </div>
            ) : (
              /* Crisp 2-col mobile grid, scaling to 3 cols (md) and 4 cols (lg) */
              <div
                data-testid="people-directory-grid"
                className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4"
              >
                {members.map((m) => {
                  const initials = formatMemberInitials(m.name)
                  const isSelf = isSelfMember(m.id)

                  return (
                    <div
                      key={m.id}
                      onClick={() =>
                        navigate({
                          to: "/people/$memberId",
                          params: { memberId: m.id },
                        })
                      }
                      className="group flex cursor-pointer flex-col justify-between gap-2.5 rounded-lg border border-hairline bg-canvas p-3 shadow-2xs transition-colors hover:border-ink/30 hover:bg-surface-soft active:scale-[0.99] sm:p-4"
                    >
                      {/* Top: Avatar & Single Role Badge */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div
                          className={`flex size-9 shrink-0 items-center justify-center rounded-md border text-xs font-bold uppercase sm:size-10 sm:text-sm ${getRoleAvatarClass(m.role)}`}
                          aria-hidden="true"
                        >
                          {initials}
                        </div>

                        <Badge variant={getRoleBadgeVariant(m.role)} size="sm">
                          {formatRoleLabel(m.role)}
                        </Badge>
                      </div>

                      {/* Middle: Name + Compact Identifier */}
                      <div className="min-w-0 space-y-0.5">
                        <h3
                          className="truncate text-xs font-bold text-ink group-hover:text-clay-teal sm:text-sm"
                          title={m.name}
                        >
                          {m.name}
                          {isSelf && (
                            <span className="ml-1 font-semibold text-text-muted">
                              (You)
                            </span>
                          )}
                        </h3>
                        <p className="truncate font-mono text-[11px] font-medium text-clay-teal">
                          {m.username
                            ? `@${m.username}`
                            : m.user_number
                              ? String(m.user_number)
                              : "No handle"}
                        </p>
                      </div>

                      {/* Bottom: Lightweight Claim Status + Tablet/Desktop Quick ID Copy */}
                      <div className="flex items-center justify-between gap-1.5 pt-0.5">
                        {m.is_claimed ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                            <span
                              className="size-1.5 rounded-full bg-emerald-500"
                              aria-hidden="true"
                            />
                            <span>Claimed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-700">
                            <span
                              className="size-1.5 rounded-full bg-amber-500"
                              aria-hidden="true"
                            />
                            <span>Unclaimed</span>
                          </span>
                        )}

                        {m.user_number && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleCopy(m.user_number, "Member ID copied!")
                            }}
                            className="hidden cursor-pointer items-center gap-1 rounded-xs px-1 py-0.5 font-mono text-[11px] text-text-muted transition-colors hover:bg-surface-card hover:text-ink sm:inline-flex"
                            title="Click to copy Member ID"
                          >
                            <span>{m.user_number}</span>
                            <CopyIcon className="size-3 opacity-70" />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── PAGINATION CONTROLS ── */}
            {totalItems > 0 && (
              <div className="flex flex-col gap-3 rounded-lg border border-hairline bg-canvas p-3 text-xs text-ink shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:p-4">
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
                      className="h-9 w-20 rounded-sm border-hairline bg-canvas text-xs font-bold shadow-xs"
                      id="select-rows-per-page"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectGroup>
                        <SelectItem value="12">12</SelectItem>
                        <SelectItem value="24">24</SelectItem>
                        <SelectItem value="48">48</SelectItem>
                        <SelectItem value="96">96</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>

                <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:w-auto sm:gap-3">
                  <span className="text-xs text-text-muted">
                    Showing{" "}
                    <strong className="text-ink">
                      {totalItems === 0 ? 0 : startIndex + 1}–{endIndex}
                    </strong>{" "}
                    of <strong className="text-ink">{totalItems}</strong>{" "}
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

      {/* ── MODAL 1 & 2: PRE-PROVISION NEW MEMBER & CREDENTIALS ── */}
      <PreProvisionMemberModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        canLoadSchools={isOrganizerOrAdmin}
        onSuccess={async () => {
          await loadData()
        }}
        onToast={showToast}
      />

      {/* ── MODAL 3: CHANGE MEMBER ROLE (ADMIN ONLY, NEVER SELF) ── */}
      {editingMember && isAdmin && !isSelfMember(editingMember.id) && (
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

            <div className="space-y-2.5 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#e8b94a] text-xs font-bold text-[#0a0a0a] uppercase shadow-2xs">
                  {editingMember.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-[#0a0a0a] sm:text-sm">
                    {editingMember.name}
                  </p>
                  <p className="font-mono text-[11px] font-bold text-[#1a3a3a]">
                    {editingMember.user_number || "—"}
                  </p>
                </div>
                <Badge variant={getRoleBadgeVariant(editingMember.role)} size="sm">
                  {formatRoleLabel(editingMember.role)}
                </Badge>
              </div>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Select New Role
                </label>
                <select
                  value={updateForm.role || "member"}
                  onChange={(e) =>
                    setUpdateForm({ role: e.target.value as any })
                  }
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs font-semibold text-[#0a0a0a] outline-none focus:border-[#0a0a0a] sm:text-sm"
                >
                  <option value="member">Member (Regular Community)</option>
                  <option value="activist">
                    Activist (Volunteer & Duties)
                  </option>
                  <option value="organizer">
                    Organizer (Operations & Events)
                  </option>
                  {isAdmin && (
                    <option value="admin">Admin (System Master)</option>
                  )}
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="h-11 flex-1 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-11 flex-1 cursor-pointer rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs hover:bg-[#1f1f1f] disabled:opacity-50 sm:text-sm"
                >
                  {submitting ? "Saving..." : "Save Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 4: DELETE MEMBER CONFIRMATION (ADMIN ONLY, NEVER SELF) ── */}
      {deletingMember && isAdmin && !isSelfMember(deletingMember.id) && (
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
              {deletingMember.user_number || "No ID"})?
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
    </main>
  )
}
