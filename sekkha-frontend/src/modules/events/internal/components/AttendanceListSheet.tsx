// feature/events/components/AttendanceListSheet
// Apple HIG Inset Grouped List for Attendance Records.
// Features summary capsules, instant live search, CSV export,
// badge activity assignment, late arrival indicators, and draft deletion.

import { useState, useMemo, useEffect } from "react"
import {
  QrCodeIcon,
  SparklesIcon,
  XIcon,
  Trash2Icon,
  LockIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UsersIcon,
  ClipboardListIcon,
  ClockIcon,
  AwardIcon,
  CheckIcon,
} from "lucide-react"
import type { AttendanceRecord, UserRole } from "../types"
import { ConfirmDialog } from "@/components/base/AlertDialog"
import { Badge } from "@/components/base/Badge"
import { api } from "@/lib/api"

interface BadgeActivityOption {
  id: string
  code: string
  label: string
  bonusPoints: number
}

interface AttendanceListSheetProps {
  eventId?: string
  records: AttendanceRecord[]
  role: UserRole | null
  isClosed?: boolean
  onDeleteRecord?: (userId: string) => void
  onRefresh?: () => void
}

const PAGE_SIZE = 10

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

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return "U"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AttendanceListSheet({
  eventId,
  records,
  role,
  isClosed = false,
  onDeleteRecord,
  onRefresh,
}: AttendanceListSheetProps) {
  const isPengurus = role === "organizer" || role === "admin"
  const isEditable = isPengurus && !isClosed

  const [localRecords, setLocalRecords] = useState<AttendanceRecord[]>(records)
  const [deleteTarget, setDeleteTarget] = useState<AttendanceRecord | null>(
    null
  )
  const [badgePickerTarget, setBadgePickerTarget] =
    useState<AttendanceRecord | null>(null)
  const [badgeActivities, setBadgeActivities] = useState<BadgeActivityOption[]>(
    []
  )
  const [loadingBadges, setLoadingBadges] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMethod, setFilterMethod] = useState<"all" | "qr" | "manual">(
    "all"
  )
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setLocalRecords(records)
  }, [records])

  // Load badge activities for service assignment
  useEffect(() => {
    if (isEditable) {
      setLoadingBadges(true)
      api
        .get<BadgeActivityOption[]>("/configure/badge-activities")
        .then((res) => {
          const list = Array.isArray(res) ? res : (res as any)?.items || []
          setBadgeActivities(list)
        })
        .catch(() => {})
        .finally(() => setLoadingBadges(false))
    }
  }, [isEditable])

  const displayRecords = localRecords.length > 0 ? localRecords : records

  // ── Metrics Calculation (Top Summary) ──
  const metrics = useMemo(() => {
    const total = displayRecords.length
    const qr = displayRecords.filter((r) => r.method === "qr").length
    const manual = displayRecords.filter((r) => r.method === "manual").length
    const late = displayRecords.filter((r) => r.is_late).length
    const points = displayRecords.reduce((acc, r) => {
      const base = r.points_earned ?? r.base_points ?? 50
      const bonus = r.badge_bonus_points ?? 0
      return acc + base + bonus
    }, 0)
    return { total, qr, manual, late, points }
  }, [displayRecords])

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
                  ? selectedBadge.bonusPoints
                  : 0,
              }
            : rec
        )
      )
      setBadgePickerTarget(null)
      onRefresh?.()
    } catch (err: any) {
      console.error("Failed to assign service role:", err)
      alert(err?.message || "Failed to assign service role.")
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
    return displayRecords.filter((rec) => {
      if (filterMethod === "qr" && rec.method !== "qr") return false
      if (filterMethod === "manual" && rec.method !== "manual") return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const nameMatch = rec.name.toLowerCase().includes(q)
        const idMatch = rec.user_number?.toLowerCase().includes(q)
        const schoolMatch = rec.school?.toLowerCase().includes(q)
        return nameMatch || idMatch || schoolMatch
      }
      return true
    })
  }, [displayRecords, filterMethod, searchQuery])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterMethod])

  // ── Pagination Calculation ──
  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedRecords = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE
    return filteredRecords.slice(start, start + PAGE_SIZE)
  }, [filteredRecords, safePage])

  return (
    <div className="space-y-4 text-left font-sans">
      {/* ── 1. Top Glanceable Summary Cards ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* Total Attendees (Filter: All) */}
        <button
          type="button"
          onClick={() => setFilterMethod("all")}
          className={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded-[18px] p-3 text-left transition-all ${
            filterMethod === "all"
              ? "border-2 border-[#0a0a0a] bg-white shadow-xs ring-2 ring-[#0a0a0a]/10"
              : "border border-[#e5e5e5] bg-[#fffaf0] hover:border-[#0a0a0a]/30 hover:bg-[#faf5e8]"
          }`}
          title="Show all attendees"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shadow-xs">
            <UsersIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                Total Present
              </p>
              {filterMethod === "all" && (
                <span className="size-1.5 rounded-full bg-[#0a0a0a]" />
              )}
            </div>
            <p className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              {metrics.total} Members
            </p>
          </div>
        </button>

        {/* QR Scan Method (Filter: QR) */}
        <button
          type="button"
          onClick={() => setFilterMethod(filterMethod === "qr" ? "all" : "qr")}
          className={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded-[18px] p-3 text-left transition-all ${
            filterMethod === "qr"
              ? "border-2 border-[#1a3a3a] bg-white shadow-xs ring-2 ring-[#1a3a3a]/15"
              : "border border-[#e5e5e5] bg-[#fffaf0] hover:border-[#1a3a3a]/40 hover:bg-[#faf5e8]"
          }`}
          title="Filter only QR Code check-ins"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#1a3a3a] text-white shadow-xs">
            <QrCodeIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                QR Scan
              </p>
              {filterMethod === "qr" && (
                <span className="size-1.5 rounded-full bg-[#1a3a3a]" />
              )}
            </div>
            <p className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              {metrics.qr} Check-ins
            </p>
          </div>
        </button>

        {/* Manual Check-in (Filter: Manual) */}
        <button
          type="button"
          onClick={() =>
            setFilterMethod(filterMethod === "manual" ? "all" : "manual")
          }
          className={`flex min-h-[64px] cursor-pointer items-center gap-3 rounded-[18px] p-3 text-left transition-all ${
            filterMethod === "manual"
              ? "border-2 border-[#0a0a0a] bg-white shadow-xs ring-2 ring-[#0a0a0a]/10"
              : "border border-[#e5e5e5] bg-[#fffaf0] hover:border-[#0a0a0a]/30 hover:bg-[#faf5e8]"
          }`}
          title="Filter only manual check-ins"
        >
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] text-[#0a0a0a] shadow-xs">
            <ClipboardListIcon className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                Manual
              </p>
              {filterMethod === "manual" && (
                <span className="size-1.5 rounded-full bg-[#0a0a0a]" />
              )}
            </div>
            <p className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              {metrics.manual} Entries
            </p>
          </div>
        </button>

        {/* Total Points / Late indicator */}
        <div className="flex min-h-[64px] items-center gap-3 rounded-[18px] border border-[#e8b94a]/40 bg-[#faf5e8] p-3 shadow-2xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-[#e8b94a] shadow-xs">
            <SparklesIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
              Total Points
            </p>
            <p className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              +{metrics.points} Pts
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Search & CSV Export Toolbar ── */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6a6a6a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by member name, ID, or school..."
            className="min-h-[42px] w-full rounded-full border border-[#e5e5e5] bg-[#fffaf0] pr-10 pl-10 text-xs text-[#0a0a0a] shadow-2xs placeholder:text-[#767676] focus:border-[#0a0a0a] focus:bg-white focus:outline-none sm:text-sm"
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
              className="mt-4 inline-flex min-h-[36px] cursor-pointer items-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-4 py-1.5 text-xs font-semibold text-[#0a0a0a] shadow-xs hover:bg-white"
            >
              Reset Search Filter
            </button>
          )}
        </div>
      ) : (
        <div className="divide-y divide-[#f0f0f0] overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs">
          {paginatedRecords.map((rec, idx) => {
            const basePoints = rec.points_earned ?? rec.base_points ?? 50
            const bonusPoints = rec.badge_bonus_points ?? 0
            const totalPoints = basePoints + bonusPoints

            return (
              <div
                key={`${rec.user_id}-${idx}`}
                className="flex flex-col gap-2.5 p-3.5 transition-colors hover:bg-[#faf5e8]/50 sm:p-4"
              >
                {/* Upper Row: Avatar, Identity, Method & Points */}
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Avatar squircle + Name & Metadata */}
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] text-xs font-bold text-[#0a0a0a] shadow-2xs">
                      {getInitials(rec.name)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-[#0a0a0a]">
                          {rec.name}
                        </p>
                        {rec.role && (
                          <span className="py-0.2 rounded-full bg-black/[0.05] px-2 text-[10px] font-semibold text-[#6a6a6a] uppercase">
                            {rec.role}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6a6a6a]">
                        {rec.user_number && (
                          <span className="font-mono font-medium text-[#1a3a3a]">
                            {rec.user_number}
                          </span>
                        )}
                        {rec.school && (
                          <>
                            <span>•</span>
                            <span className="truncate">{rec.school}</span>
                          </>
                        )}
                        <span>•</span>
                        <span>{formatTime(rec.scanned_at)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Method Pill + Total Points */}
                  <div className="flex shrink-0 items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        rec.method === "qr"
                          ? "border border-[#1a3a3a]/20 bg-[#1a3a3a]/10 text-[#1a3a3a]"
                          : "border border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a]"
                      }`}
                    >
                      {rec.method === "qr" ? (
                        <>
                          <QrCodeIcon className="size-3 text-[#1a3a3a]" />
                          <span className="hidden sm:inline">QR Scan</span>
                          <span className="sm:hidden">QR</span>
                        </>
                      ) : (
                        "Manual"
                      )}
                    </span>

                    <span className="inline-flex items-center gap-1 rounded-[8px] border border-[#e8b94a]/40 bg-[#e8b94a]/15 px-2.5 py-0.5 text-xs font-bold text-[#0a0a0a] shadow-2xs">
                      <SparklesIcon className="size-3 text-[#e8b94a]" />
                      <span>+{totalPoints} Pts</span>
                    </span>
                  </div>
                </div>

                {/* Lower Row: Late Status, Service Role Badge Activity, Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#f4f0e6] pt-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Late Arrival Badge */}
                    {rec.is_late ? (
                      <Badge
                        variant="destructive"
                        glass
                        className="gap-1 text-[11px] font-medium"
                      >
                        <ClockIcon className="size-3" />
                        <span>
                          Late (-{rec.late_penalty_applied ?? 15} Pts)
                        </span>
                      </Badge>
                    ) : (
                      <Badge
                        variant="emerald"
                        glass
                        className="gap-1 text-[11px] font-medium"
                      >
                        <span>On Time</span>
                      </Badge>
                    )}

                    {/* Service Role Badge Activity */}
                    {rec.badge_activity ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8b94a]/60 bg-[#fff8e7] px-2.5 py-0.5 text-[11px] font-semibold text-[#855e00] shadow-2xs">
                        <AwardIcon className="size-3" />
                        <span>{rec.badge_activity}</span>
                        <span className="font-bold">
                          (+{rec.badge_bonus_points ?? 30} Pts)
                        </span>
                        {isEditable && (
                          <button
                            type="button"
                            onClick={() =>
                              handleAssignBadgeActivity(rec.user_id, null)
                            }
                            className="ml-1 text-[#855e00] hover:text-[#0a0a0a]"
                            title="Remove role"
                          >
                            <XIcon className="size-3" />
                          </button>
                        )}
                      </span>
                    ) : (
                      isEditable && (
                        <button
                          type="button"
                          onClick={() => setBadgePickerTarget(rec)}
                          className="inline-flex min-h-[30px] cursor-pointer items-center gap-1 rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-2.5 py-0.5 text-[11px] font-medium text-[#6a6a6a] shadow-2xs hover:border-[#0a0a0a] hover:text-[#0a0a0a]"
                        >
                          <AwardIcon className="size-3 text-[#e8b94a]" />
                          <span>+ Assign Service Role</span>
                        </button>
                      )
                    )}
                  </div>

                  {/* Organizer Management Actions */}
                  {isPengurus && (
                    <div className="flex shrink-0 items-center gap-2">
                      {isEditable ? (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(rec)}
                          className="inline-flex min-h-[32px] cursor-pointer items-center justify-center rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-2.5 py-1 text-xs text-[#6a6a6a] shadow-2xs transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 active:scale-95"
                          title="Remove draft check-in"
                        >
                          <Trash2Icon className="size-3.5" />
                          <span className="ml-1 hidden sm:inline">Delete</span>
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6a6a6a]">
                          <LockIcon className="size-3" />
                          <span>Finalized</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── 4. Scalable Pagination Bar ── */}
      {filteredRecords.length > PAGE_SIZE && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3 text-xs shadow-2xs sm:flex-row sm:px-4">
          <div className="text-[#6a6a6a]">
            Showing{" "}
            <strong className="text-[#0a0a0a]">
              {(safePage - 1) * PAGE_SIZE + 1}
            </strong>{" "}
            –{" "}
            <strong className="text-[#0a0a0a]">
              {Math.min(safePage * PAGE_SIZE, filteredRecords.length)}
            </strong>{" "}
            of{" "}
            <strong className="text-[#0a0a0a]">{filteredRecords.length}</strong>{" "}
            attendees
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`flex min-h-[34px] items-center gap-1 rounded-full border px-3 py-1 font-semibold transition-all ${
                safePage <= 1
                  ? "cursor-not-allowed border-transparent text-[#6a6a6a]"
                  : "cursor-pointer border-[#e5e5e5] bg-white text-[#0a0a0a] shadow-2xs hover:bg-[#faf5e8]"
              }`}
            >
              <ChevronLeftIcon className="size-3.5" />
              <span>Previous</span>
            </button>

            <span className="px-2 font-bold text-[#0a0a0a]">
              {safePage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`flex min-h-[34px] items-center gap-1 rounded-full border px-3 py-1 font-semibold transition-all ${
                safePage >= totalPages
                  ? "cursor-not-allowed border-transparent text-[#6a6a6a]"
                  : "cursor-pointer border-[#e5e5e5] bg-white text-[#0a0a0a] shadow-2xs hover:bg-[#faf5e8]"
              }`}
            >
              <span>Next</span>
              <ChevronRightIcon className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── 5. Service Role (Badge Activity) Assignment Modal ── */}
      {badgePickerTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md animate-in space-y-4 rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-2xl zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#1a3a3a]">
                  <AwardIcon className="size-3.5 text-[#e8b94a]" />
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
              <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() =>
                    handleAssignBadgeActivity(badgePickerTarget.user_id, null)
                  }
                  className={`flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-[14px] border p-3 text-xs font-semibold transition-all ${
                    !badgePickerTarget.badge_activity_id
                      ? "border-[#0a0a0a] bg-white text-[#0a0a0a] ring-1 ring-black"
                      : "border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] hover:bg-white"
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
                          ? "border-[#0a0a0a] bg-white font-bold text-[#0a0a0a] ring-1 ring-black"
                          : "border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] hover:bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <AwardIcon className="size-4 text-[#e8b94a]" />
                        <span className="font-bold text-[#0a0a0a]">
                          {act.label}
                        </span>
                      </div>
                      <span className="rounded-full border border-[#e8b94a]/50 bg-[#e8b94a]/20 px-2 py-0.5 text-[11px] font-bold text-[#0a0a0a]">
                        +{act.bonusPoints} Pts
                      </span>
                    </button>
                  )
                })}
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
            ? `Are you sure you want to remove ${deleteTarget.name} from the attendance list? Points have not been distributed yet and this entry will simply be dropped.`
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
