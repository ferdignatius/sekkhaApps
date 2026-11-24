// feature/events/components/AttendanceListSheet
// Apple HIG Inset Grouped List for Attendance Records.
// Standardized strictly with Sekkha Design System (DESIGN.md & AGENTS.md).

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
import {
  QrCodeIcon,
  XIcon,
  Trash2Icon,
  LockIcon,
  SearchIcon,
  UsersIcon,
  ClipboardListIcon,
  ClockIcon,
  AwardIcon,
  CheckIcon,
  MoreVerticalIcon,
} from "lucide-react"
import type { AttendanceRecord, UserRole } from "../types"
import { ConfirmDialog } from "@/components/base/AlertDialog"
import { Badge } from "@/components/base/Badge"
import { toast } from "@/components/base"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InfiniteScrollFooter } from "@/components/common/InfiniteScrollFooter"
import { usePaginatedDropdown } from "@/hooks/usePaginatedDropdown"
import { useDebouncedSearch } from "@/hooks/useDebounce"
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel"
import { DROPDOWN_PAGE_SIZE, normalizePaginatedResult } from "@/lib/pagination"
import { api } from "@/lib/api"
import { getInitials } from "@/lib/initials"

export interface AttendanceListMeta {
  totalCount?: number
  filteredTotal?: number
  qrCount?: number
  manualCount?: number
  lateCount?: number
  hasMore?: boolean
  nextCursor?: string | null
}

interface BadgeActivityOption {
  id: string
  code: string
  label: string
  bonus_points?: number
  bonusPoints?: number
}

interface AttendanceListSheetProps {
  eventId?: string
  records: AttendanceRecord[]
  attendanceMeta?: AttendanceListMeta
  role: UserRole | null
  isClosed?: boolean
  onDeleteRecord?: (userId: string) => void
  onRefresh?: () => void
}

const PAGE_SIZE = 25
const SWIPE_THRESHOLD = 64

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })
  } catch {
    return "-"
  }
}

interface SwipeableAttendanceRowProps {
  rec: AttendanceRecord
  isEditable: boolean
  isPengurus: boolean
  canWaiveLate: boolean
  onOpenBadgePicker: (rec: AttendanceRecord) => void
  onRemoveBadgeActivity: (userId: string) => void
  onWaiveLate: (userId: string) => void
  onRequestDelete: (rec: AttendanceRecord) => void
}

function SwipeableAttendanceRow({
  rec,
  isEditable,
  isPengurus,
  canWaiveLate,
  onOpenBadgePicker,
  onRemoveBadgeActivity,
  onWaiveLate,
  onRequestDelete,
}: SwipeableAttendanceRowProps) {
  const [swipeOffset, setSwipeOffset] = useState(0)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    lockedAxis: "x" | "y" | null
  } | null>(null)

  const basePoints = rec.points_earned ?? rec.base_points ?? 50
  const bonusPoints = rec.badge_bonus_points ?? 0
  const totalPoints = basePoints + bonusPoints

  const metaParts = [
    formatTime(rec.scanned_at),
    rec.method === "qr" ? "QR" : "Manual",
    rec.role?.toUpperCase() || "MEMBER",
    rec.user_number || null,
    rec.school && rec.school !== "Umum" ? rec.school : null,
  ].filter(Boolean)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!isEditable) return
    const target = e.target as HTMLElement | null
    if (target?.closest("button, a, [role='menuitem']")) return
    if (e.pointerType === "mouse" && e.button !== 0) return
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      lockedAxis: null,
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const state = dragRef.current
    if (!state || state.pointerId !== e.pointerId) return
    const dx = e.clientX - state.startX
    const dy = e.clientY - state.startY
    if (!state.lockedAxis) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      if (Math.abs(dy) > Math.abs(dx)) {
        state.lockedAxis = "y"
        setSwipeOffset(0)
        return
      }
      state.lockedAxis = "x"
    }
    if (state.lockedAxis === "x") {
      setSwipeOffset(Math.max(-108, Math.min(108, dx)))
    }
  }

  function finishSwipe(e: React.PointerEvent<HTMLDivElement>, trigger: boolean) {
    const state = dragRef.current
    if (!state || state.pointerId !== e.pointerId) return
    const dx = e.clientX - state.startX
    const wasHorizontal = state.lockedAxis === "x"
    dragRef.current = null
    setSwipeOffset(0)

    if (!trigger) return
    if ((wasHorizontal && dx >= SWIPE_THRESHOLD) || swipeOffset >= SWIPE_THRESHOLD) {
      onOpenBadgePicker(rec)
    } else if (
      (wasHorizontal && dx <= -SWIPE_THRESHOLD) ||
      swipeOffset <= -SWIPE_THRESHOLD
    ) {
      onRequestDelete(rec)
    }
  }

  const isSwipingRight = swipeOffset > 4
  const isSwipingLeft = swipeOffset < -4

  return (
    <div
      data-testid={`attendance-row-${rec.user_id}`}
      className="relative overflow-hidden bg-[#fffaf0]"
    >
      {/* Swipe Reveal Action Layer */}
      {isEditable && (isSwipingRight || isSwipingLeft) && (
        <div
          aria-hidden="true"
          className={`absolute inset-0 flex items-center justify-between px-4 text-xs font-bold text-white transition-colors ${
            isSwipingRight
              ? Math.abs(swipeOffset) >= SWIPE_THRESHOLD
                ? "bg-[#1a3a3a]"
                : "bg-[#1a3a3a]/80"
              : Math.abs(swipeOffset) >= SWIPE_THRESHOLD
                ? "bg-rose-600"
                : "bg-rose-500/80"
          }`}
        >
          <span
            className={`inline-flex items-center gap-1.5 ${
              isSwipingRight ? "opacity-100" : "opacity-0"
            }`}
          >
            <AwardIcon className="size-4" />
            <span>Service Role</span>
          </span>
          <span
            className={`inline-flex items-center gap-1.5 ${
              isSwipingLeft ? "opacity-100" : "opacity-0"
            }`}
          >
            <span>Remove</span>
            <Trash2Icon className="size-4" />
          </span>
        </div>
      )}

      {/* Foreground Compact Row */}
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => finishSwipe(e, true)}
        onPointerCancel={(e) => finishSwipe(e, false)}
        style={{
          transform: swipeOffset !== 0 ? `translateX(${swipeOffset}px)` : undefined,
          touchAction: isEditable ? "pan-y" : undefined,
        }}
        className={`relative flex items-center justify-between gap-2.5 bg-[#fffaf0] px-3 py-2.5 select-none hover:bg-[#faf5e8]/70 sm:px-4 ${
          swipeOffset === 0 ? "transition-transform duration-150 ease-out" : ""
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#e5e5e5] bg-[#faf5e8] text-[11px] font-bold text-[#0a0a0a]">
            {getInitials(rec.name)}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="max-w-full truncate text-[13px] font-bold text-[#0a0a0a] sm:text-sm">
                {rec.name}
              </span>

              {rec.is_late && (
                <Badge
                  variant="destructive"
                  size="sm"
                  className="gap-1 px-1.5 py-0 text-[10px] font-semibold"
                >
                  <ClockIcon className="size-2.5" />
                  <span>Late (-{rec.late_penalty_applied ?? 15})</span>
                  {canWaiveLate && (
                    <button
                      type="button"
                      onClick={() => onWaiveLate(rec.user_id)}
                      className="ml-0.5 inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full hover:bg-white/25"
                      title="Admin: Remove late status"
                      aria-label="Remove late status"
                    >
                      <XIcon className="size-2.5" />
                    </button>
                  )}
                </Badge>
              )}

              {rec.badge_activity && (
                <span className="inline-flex max-w-[180px] items-center gap-1 rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-2 py-0.5 text-[10px] font-semibold text-[#0a0a0a]">
                  <AwardIcon className="size-2.5 shrink-0 text-[#9a6e14]" />
                  <span className="truncate">{rec.badge_activity}</span>
                  <span className="shrink-0 font-bold">
                    +{rec.badge_bonus_points ?? 30}
                  </span>
                  {isEditable && (
                    <button
                      type="button"
                      onClick={() => onRemoveBadgeActivity(rec.user_id)}
                      className="inline-flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#6a6a6a] hover:bg-[#e5e5e5] hover:text-[#0a0a0a]"
                      title="Remove service role"
                      aria-label="Remove role"
                    >
                      <XIcon className="size-2.5" />
                    </button>
                  )}
                </span>
              )}
            </div>

            <p className="truncate text-[11px] text-[#6a6a6a]">
              {metaParts.join(" · ")}
            </p>
          </div>
        </div>

        {/* Right: Clean Points Text + More Menu (⋮) */}
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-xs font-bold text-[#0a0a0a] tabular-nums">
            +{totalPoints} Pts
          </span>

          {isPengurus &&
            (isEditable ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Actions for ${rec.name}`}
                    title={`Actions for ${rec.name}`}
                    className="inline-flex size-9 cursor-pointer items-center justify-center rounded-full text-[#6a6a6a] transition-colors hover:bg-[#ebe6d6] hover:text-[#0a0a0a]"
                  >
                    <MoreVerticalIcon className="size-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-48 rounded-2xl border border-[#e5e5e5] bg-[#fffaf0] p-1.5 shadow-lg"
                >
                  <DropdownMenuItem
                    onClick={() => onOpenBadgePicker(rec)}
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#0a0a0a] hover:bg-[#faf5e8]"
                  >
                    <AwardIcon className="size-3.5 text-[#9a6e14]" />
                    <span>
                      {rec.badge_activity
                        ? "Change Service Role"
                        : "Assign Service Role"}
                    </span>
                  </DropdownMenuItem>
                  {rec.badge_activity && (
                    <DropdownMenuItem
                      onClick={() => onRemoveBadgeActivity(rec.user_id)}
                      className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
                    >
                      <XIcon className="size-3.5" />
                      <span>Remove Service Role</span>
                    </DropdownMenuItem>
                  )}
                  {canWaiveLate && rec.is_late && (
                    <DropdownMenuItem
                      onClick={() => onWaiveLate(rec.user_id)}
                      className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-[#0a0a0a] hover:bg-[#faf5e8]"
                    >
                      <ClockIcon className="size-3.5 text-amber-600" />
                      <span>Remove Late Status</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator className="my-1 border-t border-[#e5e5e5]" />
                  <DropdownMenuItem
                    onClick={() => onRequestDelete(rec)}
                    className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2Icon className="size-3.5 text-rose-600" />
                    <span>Remove Check-In</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span
                className="inline-flex size-8 items-center justify-center text-[#8a8a8a]"
                title="Finalized"
                aria-label="Finalized"
              >
                <LockIcon className="size-3.5" />
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}

export function AttendanceListSheet({
  eventId,
  records,
  attendanceMeta,
  role,
  isClosed = false,
  onDeleteRecord,
  onRefresh,
}: AttendanceListSheetProps) {
  const isPengurus = role === "organizer" || role === "admin"
  const isAdmin = role === "admin"
  const isEditable = isPengurus && !isClosed
  const canWaiveLate = isAdmin && !isClosed

  const [localRecords, setLocalRecords] = useState<AttendanceRecord[]>(records)
  const [serverSummary, setServerSummary] = useState<AttendanceListMeta | null>(
    attendanceMeta ?? null
  )
  const [serverActive, setServerActive] = useState(
    Boolean(attendanceMeta?.hasMore)
  )
  const [serverHasMore, setServerHasMore] = useState(
    Boolean(attendanceMeta?.hasMore)
  )
  const [serverNextCursor, setServerNextCursor] = useState<string | null>(
    attendanceMeta?.nextCursor ?? null
  )
  const [serverFilteredTotal, setServerFilteredTotal] = useState<
    number | undefined
  >(attendanceMeta?.filteredTotal ?? attendanceMeta?.totalCount)
  const [loadingFilter, setLoadingFilter] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const listAbortRef = useRef<AbortController | null>(null)

  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(
    null
  )
  const [badgePickerTarget, setBadgePickerTarget] =
    useState<AttendanceRecord | null>(null)
  const {
    items: badgeActivities,
    hasMore: hasMoreBadges,
    loading: loadingBadges,
    loadingMore: loadingMoreBadges,
    total: totalBadges,
    loadMore: loadMoreBadges,
    handleScroll: handleBadgesScroll,
  } = usePaginatedDropdown<BadgeActivityOption>({
    fetcher: async ({ page, limit }) => {
      const q = new URLSearchParams({
        is_active: "true",
        page: String(page),
        limit: String(limit),
        paginated: "true",
      })
      const res = await api.get<unknown>(
        `/configure/badge-activities?${q.toString()}`
      )
      return normalizePaginatedResult<BadgeActivityOption>(res, page, limit)
    },
    getKey: (act) => act.id,
    pageSize: DROPDOWN_PAGE_SIZE,
    enabled: isEditable && Boolean(badgePickerTarget),
  })
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, flushAttendanceSearch] =
    useDebouncedSearch(searchQuery)
  const [filterMethod, setFilterMethod] = useState<
    "all" | "qr" | "manual" | "late"
  >("all")

  useEffect(() => {
    return () => {
      listAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    setLocalRecords(records)
  }, [records])

  useEffect(() => {
    if (!attendanceMeta) return
    setServerSummary(attendanceMeta)
    if (attendanceMeta.hasMore) {
      setServerActive(true)
    }
    setServerHasMore(Boolean(attendanceMeta.hasMore))
    setServerNextCursor(attendanceMeta.nextCursor ?? null)
    setServerFilteredTotal(
      attendanceMeta.filteredTotal ?? attendanceMeta.totalCount
    )
  }, [attendanceMeta])

  const displayRecords = localRecords

  const fetchServerAttendances = useCallback(
    async (options: {
      cursor?: string | null
      method: "all" | "qr" | "manual" | "late"
      search: string
    }) => {
      if (!eventId) return
      const isLoadMore = Boolean(options.cursor)
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
        } else {
          setLoadingFilter(true)
        }

        const qs = new URLSearchParams({
          paginated: "true",
          limit: String(PAGE_SIZE),
        })
        if (options.cursor) qs.set("cursor", options.cursor)
        if (options.method !== "all") qs.set("method", options.method)
        if (options.search.trim()) qs.set("search", options.search.trim())

        const data = await api.get<any>(
          `/events/${eventId}/attendances?${qs.toString()}`,
          { signal: controller.signal }
        )
        if (controller.signal.aborted) return

        const incoming: AttendanceRecord[] = Array.isArray(data)
          ? data
          : (data?.attendances ?? [])

        setServerActive(true)
        if (isLoadMore) {
          setLocalRecords((prev) => {
            const seen = new Set(prev.map((r) => r.user_id))
            const unique = incoming.filter((r) => !seen.has(r.user_id))
            return [...prev, ...unique]
          })
        } else {
          setLocalRecords(incoming)
          if (typeof data?.total_attended === "number") {
            setServerSummary({
              totalCount: data.total_attended,
              qrCount: data.qr_count,
              manualCount: data.manual_count,
              lateCount: data.late_count,
              filteredTotal: data.filtered_total ?? data.total_attended,
              hasMore: Boolean(data.has_more),
              nextCursor: data.next_cursor ?? null,
            })
          }
          if (typeof data?.filtered_total === "number") {
            setServerFilteredTotal(data.filtered_total)
          }
        }
        setServerHasMore(Boolean(data?.has_more))
        setServerNextCursor(data?.next_cursor ?? null)
      } catch (err: any) {
        if (err?.name === "AbortError") return
        console.error("Failed to fetch filtered attendees:", err)
      } finally {
        if (isLoadMore) {
          setLoadingMore(false)
        } else if (!controller.signal.aborted) {
          setLoadingFilter(false)
        }
      }
    },
    [eventId]
  )

  const didMountFilterRef = useRef(false)
  useEffect(() => {
    if (!didMountFilterRef.current) {
      didMountFilterRef.current = true
      return
    }
    if (!serverActive || !eventId) return
    void fetchServerAttendances({
      method: filterMethod,
      search: debouncedSearchQuery,
    })
  }, [
    serverActive,
    eventId,
    filterMethod,
    debouncedSearchQuery,
    fetchServerAttendances,
  ])

  // ── Metrics Calculation (Top Summary) ──
  const metrics = useMemo(() => {
    const localTotal = displayRecords.length
    const localQr = displayRecords.filter((r) => r.method === "qr").length
    const localManual = displayRecords.filter(
      (r) => r.method === "manual"
    ).length
    const localLate = displayRecords.filter((r) => r.is_late).length
    return {
      total: serverSummary?.totalCount ?? localTotal,
      qr: serverSummary?.qrCount ?? localQr,
      manual: serverSummary?.manualCount ?? localManual,
      late: serverSummary?.lateCount ?? localLate,
    }
  }, [displayRecords, serverSummary])

  // ── Assign Badge Activity ──
  async function handleAssignBadgeActivity(
    userId: string,
    badgeActivityId: string | null
  ) {
    if (!eventId) return
    try {
      await api.patch(
        `/events/${eventId}/attendances/${userId}/badge-activity`,
        {
          badge_activity_id: badgeActivityId,
        }
      )
      const selectedBadge = badgeActivities.find(
        (b) => b.id === badgeActivityId
      )
      setLocalRecords((prev) =>
        prev.map((rec) =>
          rec.user_id === userId
            ? {
                ...rec,
                badge_activity_id: badgeActivityId,
                badge_activity: selectedBadge ? selectedBadge.label : null,
                badge_bonus_points: selectedBadge
                  ? (selectedBadge.bonus_points ?? selectedBadge.bonusPoints ?? 30)
                  : 0,
              }
            : rec
        )
      )
      setBadgePickerTarget(null)
      toast.success(
        selectedBadge
          ? `Service role "${selectedBadge.label}" assigned.`
          : "Service role cleared."
      )
      onRefresh?.()
    } catch (err: any) {
      console.error("Failed to assign service role:", err)
      toast.error(err?.message || "Failed to assign service role.")
    }
  }

  // ── Admin-only Waive Late Status ──
  async function handleWaiveLatePenalty(userId: string) {
    if (!eventId || !canWaiveLate) return
    try {
      const res = await api.patch<{
        is_late: boolean
        late_penalty_applied: number
        points_earned: number
      }>(`/events/${eventId}/attendances/${userId}/waive-late`, {})
      setLocalRecords((prev) =>
        prev.map((rec) =>
          rec.user_id === userId
            ? {
                ...rec,
                is_late: false,
                late_penalty_applied: 0,
                points_earned:
                  typeof res?.points_earned === "number"
                    ? res.points_earned
                    : (rec.points_earned ?? 0) + (rec.late_penalty_applied ?? 0),
              }
            : rec
        )
      )
      toast.success("Late status removed and penalty restored.")
      onRefresh?.()
    } catch (err: any) {
      console.error("Failed to remove late status:", err)
      toast.error(err?.message || "Failed to remove late status.")
    }
  }

  // ── Remove Attendance Draft ──
  function handleRemoveUser(userId: string) {
    const updated = displayRecords.filter((rec) => rec.user_id !== userId)
    setLocalRecords(updated)
    onDeleteRecord?.(userId)
  }

  // ── Filtering & Searching ──
  const filteredRecords = useMemo(() => {
    if (serverActive) return displayRecords
    return displayRecords.filter((rec) => {
      if (filterMethod === "qr" && rec.method !== "qr") return false
      if (filterMethod === "manual" && rec.method !== "manual") return false
      if (filterMethod === "late" && !rec.is_late) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const nameMatch = rec.name.toLowerCase().includes(q)
        const idMatch = rec.user_number?.toLowerCase().includes(q)
        const schoolMatch = rec.school?.toLowerCase().includes(q)
        return nameMatch || idMatch || schoolMatch
      }
      return true
    })
  }, [serverActive, displayRecords, filterMethod, searchQuery])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [searchQuery, filterMethod])

  const paginatedRecords = useMemo(() => {
    if (serverActive) return filteredRecords
    return filteredRecords.slice(0, visibleCount)
  }, [serverActive, filteredRecords, visibleCount])

  const effectiveHasMore = serverActive
    ? serverHasMore
    : visibleCount < filteredRecords.length
  const effectiveTotalCount = serverActive
    ? (serverFilteredTotal ?? Math.max(metrics.total, filteredRecords.length))
    : filteredRecords.length

  const handleLoadMore = useCallback(() => {
    if (loadingMore) return
    if (serverActive) {
      if (serverNextCursor) {
        void fetchServerAttendances({
          cursor: serverNextCursor,
          method: filterMethod,
          search: debouncedSearchQuery,
        })
      }
      return
    }
    setVisibleCount((prev) => prev + PAGE_SIZE)
  }, [
    loadingMore,
    serverActive,
    serverNextCursor,
    fetchServerAttendances,
    filterMethod,
    debouncedSearchQuery,
  ])

  const sentinelRef = useInfiniteScrollSentinel({
    hasMore: effectiveHasMore,
    loading: loadingFilter,
    loadingMore,
    onLoadMore: handleLoadMore,
  })

  return (
    <div className="space-y-4 text-left font-sans">
      {/* ── 1. Clean Single-Row Filter Bar (All / QR / Manual / Late) ── */}
      <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-0.5">
        <button
          type="button"
          onClick={() => setFilterMethod("all")}
          className={`inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all ${
            filterMethod === "all"
              ? "border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-2xs"
              : "border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8]"
          }`}
          title="Show all attendees"
        >
          <UsersIcon className="size-3.5" />
          <span>All · {metrics.total}</span>
        </button>

        <button
          type="button"
          onClick={() => setFilterMethod(filterMethod === "qr" ? "all" : "qr")}
          className={`inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all ${
            filterMethod === "qr"
              ? "border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-2xs"
              : "border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8]"
          }`}
          title="Filter only QR Code check-ins"
        >
          <QrCodeIcon className="size-3.5" />
          <span>QR · {metrics.qr}</span>
        </button>

        <button
          type="button"
          onClick={() =>
            setFilterMethod(filterMethod === "manual" ? "all" : "manual")
          }
          className={`inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all ${
            filterMethod === "manual"
              ? "border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-2xs"
              : "border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8]"
          }`}
          title="Filter only manual check-ins"
        >
          <ClipboardListIcon className="size-3.5" />
          <span>Manual · {metrics.manual}</span>
        </button>

        {metrics.late > 0 && (
          <button
            type="button"
            onClick={() =>
              setFilterMethod(filterMethod === "late" ? "all" : "late")
            }
            className={`inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-all ${
              filterMethod === "late"
                ? "border-rose-700 bg-rose-600 text-white shadow-2xs"
                : "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
            title="Filter only late attendees"
          >
            <ClockIcon className="size-3.5" />
            <span>Late · {metrics.late}</span>
          </button>
        )}
      </div>

      {/* ── 2. Search Toolbar ── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6a6a6a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                flushAttendanceSearch()
              }
            }}
            placeholder="Search by member name, ID, or school..."
            className="min-h-[42px] w-full rounded-full border border-[#e5e5e5] bg-[#fffaf0] pr-10 pl-10 text-xs text-[#0a0a0a] shadow-2xs placeholder:text-[#767676] focus:border-[#0a0a0a] focus:bg-[#faf5e8] focus:outline-none sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-3 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#e5e5e5] text-[#6a6a6a] hover:bg-[#0a0a0a] hover:text-white"
              title="Clear search"
            >
              <XIcon className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* ── 3. Attendees Table ── */}
      {filteredRecords.length === 0 ? (
        <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-8 text-center shadow-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#faf5e8] text-[#6a6a6a]">
            <SearchIcon className="size-6 text-[#6a6a6a]" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-[#0a0a0a]">
            {displayRecords.length === 0
              ? "No attendees recorded yet"
              : "No attendees matching your search"}
          </h4>
          <p className="mt-1 text-xs text-[#6a6a6a]">
            {displayRecords.length === 0
              ? "Open the live camera scanner to start checking in members."
              : `Search query "${searchQuery}" did not return any records.`}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("")
                setFilterMethod("all")
              }}
              className="mt-4 inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-4 py-1.5 text-xs font-semibold text-[#0a0a0a] shadow-xs hover:bg-[#ebe6d6]"
            >
              Reset Search Filter
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[#e5e5e5] overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs">
          {paginatedRecords.map((rec, idx) => (
            <SwipeableAttendanceRow
              key={`${rec.user_id}-${idx}`}
              rec={rec}
              isEditable={isEditable}
              isPengurus={isPengurus}
              canWaiveLate={canWaiveLate}
              onOpenBadgePicker={(target) => setBadgePickerTarget(target)}
              onRemoveBadgeActivity={(userId) =>
                void handleAssignBadgeActivity(userId, null)
              }
              onWaiveLate={(userId) => void handleWaiveLatePenalty(userId)}
              onRequestDelete={(target) => setDeleteTarget(target)}
            />
          ))}
        </div>
      )}

      {/* ── 4. Scalable Infinite Scroll Footer ── */}
      {(paginatedRecords.length > 0 || loadingFilter) && (
        <InfiniteScrollFooter
          hasMore={effectiveHasMore}
          isLoadingMore={loadingMore || loadingFilter}
          loadedCount={paginatedRecords.length}
          totalCount={effectiveTotalCount}
          sentinelRef={sentinelRef}
          onLoadMore={handleLoadMore}
          itemLabel="attendees"
        />
      )}

      {/* ── 5. Service Role (Badge Activity) Assignment Modal ── */}
      {badgePickerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md animate-in space-y-4 rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-2xl zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0a0a0a]">
                  <AwardIcon className="size-3.5 text-[#0a0a0a]" />
                  Service Role Assignment
                </span>
                <h3 className="mt-1 text-base font-bold text-[#0a0a0a]">
                  {badgePickerTarget.name}
                </h3>
                <p className="text-xs text-[#6a6a6a]">
                  Select the duty role performed by this member for seva bonus
                  points.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setBadgePickerTarget(null)}
                className="flex size-7 cursor-pointer items-center justify-center rounded-full bg-[#faf5e8] text-[#6a6a6a] hover:bg-[#0a0a0a] hover:text-white"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {loadingBadges ? (
              <div className="py-8 text-center text-xs text-[#6a6a6a]">
                Loading service roles...
              </div>
            ) : (
              <div
                data-testid="badge-activity-scroll-list"
                onScroll={handleBadgesScroll}
                className="max-h-[168px] space-y-2 overflow-y-auto overscroll-contain pr-1"
              >
                <button
                  type="button"
                  onClick={() =>
                    handleAssignBadgeActivity(badgePickerTarget.user_id, null)
                  }
                  className={`flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-[14px] border p-3 text-xs font-semibold transition-all ${
                    !badgePickerTarget.badge_activity_id
                      ? "border-2 border-[#0a0a0a] bg-[#faf5e8] text-[#0a0a0a] shadow-xs"
                      : "border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8]"
                  }`}
                >
                  <span>No Service Role (Standard Attendee)</span>
                  {!badgePickerTarget.badge_activity_id && (
                    <CheckIcon className="size-4 text-[#0a0a0a]" />
                  )}
                </button>

                {badgeActivities.map((act) => {
                  const isSelected =
                    badgePickerTarget.badge_activity_id === act.id
                  const bonus = act.bonus_points ?? act.bonusPoints ?? 30
                  return (
                    <button
                      key={act.id}
                      type="button"
                      onClick={() =>
                        handleAssignBadgeActivity(
                          badgePickerTarget.user_id,
                          act.id
                        )
                      }
                      className={`flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-[14px] border p-3 text-xs transition-all ${
                        isSelected
                          ? "border-2 border-[#0a0a0a] bg-[#faf5e8] font-bold text-[#0a0a0a] shadow-xs"
                          : "border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AwardIcon className="size-4 text-[#0a0a0a]" />
                        <span className="font-bold text-[#0a0a0a]">
                          {act.label}
                        </span>
                      </div>
                      <span className="rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-2 py-0.5 text-[11px] font-bold text-[#0a0a0a]">
                        +{bonus} Pts
                      </span>
                    </button>
                  )
                })}
                <InfiniteScrollFooter
                  hasMore={hasMoreBadges}
                  isLoadingMore={loadingMoreBadges}
                  loadedCount={badgeActivities.length}
                  totalCount={totalBadges}
                  onLoadMore={loadMoreBadges}
                  itemLabel="roles"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 6. Confirmation Dialog for Attendee Deletion ── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove Draft Attendance Record?"
        description={
          deleteTarget
            ? `Are you sure you want to remove ${deleteTarget.name} from the attendance list? Karma Points have not been distributed yet and this entry will simply be dropped.`
            : ""
        }
        confirmLabel="Yes, Remove Record"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) {
            handleRemoveUser(deleteTarget.user_id)
            setDeleteTarget(null)
          }
        }}
      />
    </div>
  )
}
