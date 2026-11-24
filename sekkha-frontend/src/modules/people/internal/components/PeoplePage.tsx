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
  FilterIcon,
  CheckIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { InfiniteScrollFooter } from "@/components/common/InfiniteScrollFooter"
import { safeStorage } from "@/lib/storage"
import { useAuth } from "@/modules/auth"
import { useDebouncedSearch } from "@/hooks/useDebounce"
import { Badge } from "@/components/base/Badge"
import { Button } from "@/components/base/Button"
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
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const [debouncedSearchQuery, flushPeopleSearch] = useDebouncedSearch(searchQuery)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(e.target as Node)
      ) {
        setFilterDropdownOpen(false)
      }
    }
    if (filterDropdownOpen) {
      document.addEventListener("mousedown", handleOutsideClick)
      return () => document.removeEventListener("mousedown", handleOutsideClick)
    }
  }, [filterDropdownOpen])
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [claimStatusFilter, setClaimStatusFilter] = useState<string>("all")
  const sentinelRef = useRef<HTMLDivElement>(null)
  const PAGE_SIZE = 12

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

  const listAbortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    return () => {
      listAbortRef.current?.abort()
    }
  }, [])

  // Fetch cursor-paginated & filtered data from API
  useEffect(() => {
    if (!isOrganizerOrAdmin) return
    void loadData()
  }, [
    isOrganizerOrAdmin,
    debouncedSearchQuery,
    roleFilter,
    claimStatusFilter,
  ])

  // Auto-load next chunk via IntersectionObserver
  useEffect(() => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      typeof IntersectionObserver === "undefined"
    ) {
      return
    }
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor && !loadingMore) {
          void loadData({ cursor: nextCursor })
        }
      },
      { rootMargin: "200px" }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, nextCursor])

  // Flash toast from redirected actions (e.g. member deleted from MemberDetailPage)
  useEffect(() => {
    const flashToast = safeStorage.getItem("people_toast")
    if (flashToast) {
      safeStorage.removeItem("people_toast")
      showToast(flashToast)
    }
  }, [])

  function showToast(text: string, type: "success" | "error" = "success") {
    setToastMessage({ text, type })
    setTimeout(() => setToastMessage(null), 3500)
  }

  async function loadData(
    options: { silent?: boolean; cursor?: string } = {}
  ) {
    if (!isOrganizerOrAdmin) return
    const { silent = false, cursor } = options
    const isLoadMore = Boolean(cursor)
    if (!isLoadMore) {
      listAbortRef.current?.abort()
    }
    const controller = new AbortController()
    if (!isLoadMore) {
      listAbortRef.current = controller
    }
    try {
      if (isLoadMore) {
        setLoadingMore(true)
      } else if (!silent) {
        setLoading(true)
      }
      const res = (await peopleApi.listMembers(
        {
          search: debouncedSearchQuery.trim() || undefined,
          role: roleFilter,
          claimed_status: claimStatusFilter,
          ...(cursor ? { cursor } : { page: 1 }),
          limit: PAGE_SIZE,
        },
        { signal: controller.signal }
      )) as PaginatedMembersResponse

      if (controller.signal.aborted) return

      if (isLoadMore) {
        setMembers((prev) => {
          const seen = new Set(prev.map((m) => m.id))
          const incoming = (res.items || []).filter((m) => !seen.has(m.id))
          return [...prev, ...incoming]
        })
      } else {
        setMembers(res.items || [])
        setTotalItems(res.total ?? (res.items?.length || 0))
      }
      setHasMore(Boolean(res.has_more))
      setNextCursor(res.next_cursor ?? null)
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
    } catch (err: any) {
      if (err?.name === "AbortError") return
      console.error("Failed to load People data:", err)
      if (!silent) {
        showToast("Failed to load member data", "error")
      }
    } finally {
      if (isLoadMore) {
        setLoadingMore(false)
      } else if (!silent && !controller.signal.aborted) {
        setLoading(false)
      }
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

    const targetMember = deletingMember
    try {
      setSubmitting(true)
      await peopleApi.deleteMember(targetMember.id)
      // Optimistically remove deleted member & close modal immediately; reconcile counts silently in background
      setMembers((prev) => prev.filter((m) => m.id !== targetMember.id))
      setTotalItems((prev) => Math.max(0, prev - 1))
      setDeletingMember(null)
      showToast(`Member "${targetMember.name}" successfully deleted`)
      void loadData({ silent: true })
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

  const hasActiveFilters = roleFilter !== "all" || claimStatusFilter !== "all"
  const activeFilterSummary = [
    roleFilter !== "all"
      ? roleFilter === "organizer"
        ? "Organizers"
        : roleFilter === "member"
          ? "Members"
          : "Activists"
      : null,
    claimStatusFilter !== "all"
      ? claimStatusFilter === "claimed"
        ? "Claimed"
        : "Unclaimed"
      : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <main className="flex min-h-screen flex-col bg-canvas text-left font-sans antialiased">
      <PageBreadcrumb
        items={[{ label: "People" }]}
        actions={
          <div className="flex items-center gap-1.5">
            {/* Combined Role & Claim Status Filter Dropdown */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                type="button"
                onClick={() => setFilterDropdownOpen((prev) => !prev)}
                aria-label="Filter members"
                aria-expanded={filterDropdownOpen}
                title="Filter members"
                className={`flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border transition-all active:scale-95 sm:h-10 ${
                  hasActiveFilters
                    ? "border-[#0a0a0a] bg-[#0a0a0a] px-3 text-xs font-semibold text-white shadow-xs"
                    : "w-9 border-[#ded6c2] bg-[#faf5e8]/90 text-[#0a0a0a] shadow-2xs hover:bg-[#f5efe0] sm:w-10"
                }`}
              >
                <FilterIcon className="size-4 shrink-0" aria-hidden="true" />
                {hasActiveFilters && (
                  <span className="max-w-[110px] truncate">
                    {activeFilterSummary}
                  </span>
                )}
              </button>

              {filterDropdownOpen && (
                <div className="absolute top-full right-0 z-50 mt-2 w-60 animate-in space-y-2 rounded-[22px] border border-[#ded5c0] bg-[#faf5e8]/95 p-2.5 text-left shadow-[0_16px_40px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.05] backdrop-blur-2xl zoom-in-95 fade-in">
                  <div className="space-y-0.5">
                    <p className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                      Role
                    </p>
                    {(
                      [
                        { id: "all", label: "All Roles", count: stats.total || 0, dotColor: null },
                        { id: "organizer", label: "Organizers", count: stats.organizer ?? 0, dotColor: "#1a3a3a" },
                        { id: "member", label: "Members", count: stats.member ?? 0, dotColor: "#e8b94a" },
                        { id: "activist", label: "Activists", count: stats.activist ?? 0, dotColor: "#8b5cf6" },
                      ] as const
                    ).map((opt) => {
                      const isSelected = roleFilter === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setRoleFilter(
                              opt.id === "all" || isSelected ? "all" : opt.id
                            )
                            setFilterDropdownOpen(false)
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-[12px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            isSelected
                              ? "bg-[#fffaf0] font-bold text-[#0a0a0a] shadow-2xs"
                              : "text-[#6a6a6a] hover:bg-[#fffaf0]/80 hover:text-[#0a0a0a]"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {opt.dotColor && (
                              <span
                                className="size-2 shrink-0 rounded-full"
                                style={{ backgroundColor: opt.dotColor }}
                                aria-hidden="true"
                              />
                            )}
                            <span>
                              {opt.label} · {opt.count}
                            </span>
                          </span>
                          {isSelected && (
                            <CheckIcon className="size-3.5 text-[#0a0a0a]" />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <div className="h-px bg-black/[0.06]" />

                  <div className="space-y-0.5">
                    <p className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                      Account Status
                    </p>
                    {(
                      [
                        { id: "all", label: "All Accounts" },
                        { id: "claimed", label: "Claimed" },
                        { id: "unclaimed", label: "Unclaimed" },
                      ] as const
                    ).map((st) => {
                      const isSelected = claimStatusFilter === st.id
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setClaimStatusFilter(st.id)
                            setFilterDropdownOpen(false)
                          }}
                          className={`flex w-full cursor-pointer items-center justify-between rounded-[12px] px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                            isSelected
                              ? "bg-[#fffaf0] font-bold text-[#0a0a0a] shadow-2xs"
                              : "text-[#6a6a6a] hover:bg-[#fffaf0]/80 hover:text-[#0a0a0a]"
                          }`}
                        >
                          <span>{st.label}</span>
                          {isSelected && (
                            <CheckIcon className="size-3.5 text-[#0a0a0a]" />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {hasActiveFilters && (
                    <>
                      <div className="h-px bg-black/[0.06]" />
                      <button
                        type="button"
                        onClick={() => {
                          setRoleFilter("all")
                          setClaimStatusFilter("all")
                          setFilterDropdownOpen(false)
                        }}
                        className="w-full cursor-pointer rounded-[12px] px-2.5 py-1.5 text-center text-xs font-bold text-[#0a0a0a] hover:bg-[#fffaf0]"
                      >
                        Reset Filters
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Search Toggle / Close Button */}
            <button
              type="button"
              onClick={() => {
                if (searchOpen || searchQuery.trim()) {
                  setSearchQuery("")
                  setSearchOpen(false)
                } else {
                  setSearchOpen(true)
                }
              }}
              aria-label={
                searchOpen || Boolean(searchQuery.trim())
                  ? "Close search"
                  : "Search members"
              }
              aria-expanded={searchOpen || Boolean(searchQuery.trim())}
              title={
                searchOpen || Boolean(searchQuery.trim())
                  ? "Close search"
                  : "Search members"
              }
              className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all active:scale-95 sm:size-10 ${
                searchOpen || searchQuery.trim()
                  ? "border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-xs"
                  : "border-[#ded6c2] bg-[#faf5e8]/90 text-[#0a0a0a] shadow-2xs hover:bg-[#f5efe0]"
              }`}
            >
              {searchOpen || searchQuery.trim() ? (
                <XIcon className="size-4" aria-hidden="true" />
              ) : (
                <SearchIcon className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        }
      />

      {/* Floating Top-Bar Search Bar */}
      {(searchOpen || searchQuery.trim().length > 0) && (
        <div className="pointer-events-none fixed inset-x-0 top-[68px] z-40 px-3.5 sm:top-[76px] sm:px-6 md:px-8 lg:px-12">
          <div className="pointer-events-auto mx-auto max-w-7xl animate-in rounded-[18px] border border-[#ded5c0] bg-[#fffaf0]/95 p-1.5 shadow-[0_14px_34px_rgba(10,10,10,0.12)] ring-1 ring-black/[0.04] backdrop-blur-xl duration-200 fade-in slide-in-from-top-2">
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#7a776a]"
                aria-hidden="true"
              />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    flushPeopleSearch()
                  }
                }}
                placeholder="Search name, @username, Member ID..."
                className="h-10 w-full rounded-[13px] border border-[#e5dec9] bg-[#faf5e8] pr-4 pl-10 text-xs text-[#0a0a0a] shadow-2xs transition-all outline-none placeholder:text-[#8a8678] focus:border-[#0a0a0a] focus:bg-[#fffaf0] focus:ring-1 focus:ring-[#0a0a0a] sm:h-11 sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-[16px] px-4 py-3 shadow-xl backdrop-blur-md transition-all ${toastMessage.type === "success"
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

      <div className="flex flex-1 flex-col px-3.5 py-2 pb-32 sm:px-6 sm:py-4 md:px-8 md:pb-20 lg:px-12">
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col space-y-3 sm:space-y-4">
          {/* Main Directory */}
          <div className="flex w-full flex-1 flex-col space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-ink">
                  Members Directory
                </h2>
                <p className="text-xs text-text-muted">
                  Showing {members.length} of {totalItems} members
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
                      className="group flex cursor-pointer flex-col justify-between gap-2 rounded-xl border border-hairline bg-canvas p-2.5 shadow-2xs transition-colors hover:border-ink/30 hover:bg-surface-soft active:scale-[0.99] sm:p-3.5"
                    >
                      {/* Top: Avatar & Single Role Badge */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg border text-[11px] font-bold uppercase sm:size-9 sm:text-xs ${getRoleAvatarClass(m.role)}`}
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

                      {/* Bottom: Only surface Unclaimed warning + Tablet/Desktop Quick ID Copy */}
                      {(!m.is_claimed || m.user_number) && (
                        <div className="flex items-center justify-between gap-1.5">
                          {!m.is_claimed ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700">
                              <span
                                className="size-1.5 rounded-full bg-amber-500"
                                aria-hidden="true"
                              />
                              <span>Unclaimed</span>
                            </span>
                          ) : (
                            <span />
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
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── INFINITE SCROLL FOOTER (pinned to bottom) ── */}
            {members.length > 0 && (
              <div className="mt-auto pt-2">
                <InfiniteScrollFooter
                  hasMore={hasMore}
                  isLoadingMore={loadingMore}
                  loadedCount={members.length}
                  totalCount={totalItems}
                  sentinelRef={sentinelRef}
                  onLoadMore={() => {
                    if (nextCursor && !loadingMore) {
                      void loadData({ cursor: nextCursor })
                    }
                  }}
                  itemLabel="members"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button (+ Add Member) at bottom-right */}
      {isOrganizerOrAdmin && (
        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          aria-label="Add Member"
          title="Add Member"
          className="fixed right-4 bottom-24 z-40 flex size-14 cursor-pointer items-center justify-center rounded-full bg-ink text-canvas shadow-[0_12px_28px_rgba(10,10,10,0.28)] transition-all hover:bg-ink/90 active:scale-95 md:right-8 md:bottom-8"
        >
          <PlusIcon className="size-6" aria-hidden="true" />
        </button>
      )}

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
