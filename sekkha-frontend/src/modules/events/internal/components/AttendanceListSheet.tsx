// feature/events/components/AttendanceListSheet
// Apple HIG Inset Grouped List for Attendance Records.
// Features top glanceable summary capsules, instant live search, filter chips,
// compact touch-friendly rows, ergonomic badge management modal, and scalable pagination.

import { useState, useMemo, useEffect } from "react"
import {
  QrCodeIcon,
  PlusIcon,
  SparklesIcon,
  XIcon,
  Trash2Icon,
  CheckSquareIcon,
  SquareIcon,
  LockIcon,
  SearchIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UsersIcon,
  ClipboardListIcon,
  CheckCircleIcon,
} from "lucide-react"
import type { AttendanceRecord, UserRole, AttendanceBadge } from "../types"
import { getMasterBadges } from "../masterdata"

interface AttendanceListSheetProps {
  records: AttendanceRecord[]
  role: UserRole | null
  isClosed?: boolean
  onUpdateBadges?: (userId: string, badges: AttendanceBadge[]) => void
  onDeleteRecord?: (userId: string) => void
}

const BADGE_PRESETS: AttendanceBadge[] = getMasterBadges(true)
const PAGE_SIZE = 10

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return "U"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function AttendanceListSheet({
  records,
  role,
  isClosed = false,
  onUpdateBadges,
  onDeleteRecord,
}: AttendanceListSheetProps) {
  const isPengurus = role === "pengurus" || role === "admin"
  const isEditable = isPengurus && !isClosed

  const [localRecords, setLocalRecords] = useState<AttendanceRecord[]>(records)
  const [activePickerUser, setActivePickerUser] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterMethod, setFilterMethod] = useState<
    "all" | "qr" | "manual" | "badges"
  >("all")
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setLocalRecords(records)
  }, [records])

  const displayRecords = localRecords.length > 0 ? localRecords : records

  // ── Handlers ──
  function handleToggleBadge(userId: string, badge: AttendanceBadge) {
    const updated = displayRecords.map((rec) => {
      if (rec.user_id !== userId) return rec
      const existing = rec.badges ?? []
      const hasBadge = existing.some((b) => b.id === badge.id)
      const nextBadges = hasBadge
        ? existing.filter((b) => b.id !== badge.id)
        : [...existing, badge]
      onUpdateBadges?.(userId, nextBadges)
      return { ...rec, badges: nextBadges }
    })
    setLocalRecords(updated)
  }

  function handleSelectAll(userId: string) {
    const updated = displayRecords.map((rec) => {
      if (rec.user_id !== userId) return rec
      onUpdateBadges?.(userId, BADGE_PRESETS)
      return { ...rec, badges: BADGE_PRESETS }
    })
    setLocalRecords(updated)
  }

  function handleDeselectAll(userId: string) {
    const updated = displayRecords.map((rec) => {
      if (rec.user_id !== userId) return rec
      onUpdateBadges?.(userId, [])
      return { ...rec, badges: [] }
    })
    setLocalRecords(updated)
  }

  function handleRemoveBadge(userId: string, badgeId: string) {
    const updated = displayRecords.map((rec) => {
      if (rec.user_id !== userId) return rec
      const nextBadges = (rec.badges ?? []).filter((b) => b.id !== badgeId)
      onUpdateBadges?.(userId, nextBadges)
      return { ...rec, badges: nextBadges }
    })
    setLocalRecords(updated)
  }

  function handleRemoveUser(userId: string) {
    const updated = displayRecords.filter((rec) => rec.user_id !== userId)
    setLocalRecords(updated)
    onDeleteRecord?.(userId)
  }

  // ── Metrics Calculation (Top Summary) ──
  const metrics = useMemo(() => {
    const total = displayRecords.length
    const qr = displayRecords.filter((r) => r.method === "qr").length
    const manual = displayRecords.filter((r) => r.method === "manual").length
    const points = displayRecords.reduce((acc, r) => {
      const base = r.base_points ?? 50
      const bonus = (r.badges ?? []).reduce((bAcc, b) => bAcc + b.points, 0)
      return acc + base + bonus
    }, 0)
    return { total, qr, manual, points }
  }, [displayRecords])

  // ── Filtering & Searching ──
  const filteredRecords = useMemo(() => {
    return displayRecords.filter((rec) => {
      if (filterMethod === "qr" && rec.method !== "qr") return false
      if (filterMethod === "manual" && rec.method !== "manual") return false
      if (filterMethod === "badges" && (!rec.badges || rec.badges.length === 0))
        return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const nameMatch = rec.name.toLowerCase().includes(q)
        const idMatch = rec.user_number?.toLowerCase().includes(q)
        return nameMatch || idMatch
      }
      return true
    })
  }, [displayRecords, filterMethod, searchQuery])

  // Reset pagination on filter or search change
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

  // Active user for badge modal
  const activePickerRecord = useMemo(() => {
    if (!activePickerUser) return null
    return displayRecords.find((r) => r.user_id === activePickerUser) ?? null
  }, [activePickerUser, displayRecords])

  return (
    <div className="space-y-4 text-left font-sans">
      {/* ── 1. Top Glanceable Summary Capsules (HIG Cards) ── */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {/* Total Attendees */}
        <div className="flex items-center gap-3 rounded-[18px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-2xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shadow-xs">
            <UsersIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
              Total Hadir
            </p>
            <p className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              {metrics.total} Orang
            </p>
          </div>
        </div>

        {/* QR Scan Method */}
        <div className="flex items-center gap-3 rounded-[18px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-2xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#1a3a3a] text-white shadow-xs">
            <QrCodeIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
              QR Scan
            </p>
            <p className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              {metrics.qr} Sesi
            </p>
          </div>
        </div>

        {/* Manual Check-in */}
        <div className="flex items-center gap-3 rounded-[18px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-2xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] text-[#0a0a0a] shadow-xs">
            <ClipboardListIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
              Manual
            </p>
            <p className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              {metrics.manual} Sesi
            </p>
          </div>
        </div>

        {/* Total Merit Points */}
        <div className="flex items-center gap-3 rounded-[18px] border border-[#e8b94a]/40 bg-[#faf5e8] p-3 shadow-2xs">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-[#e8b94a] shadow-xs">
            <SparklesIcon className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
              Total Seva
            </p>
            <p className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              +{metrics.points} Pts
            </p>
          </div>
        </div>
      </div>

      {/* ── 2. Live Search Bar & Quick Filter Chips ── */}
      <div className="space-y-2.5 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-2xs sm:p-3.5">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Instant Search Bar */}
          <div className="relative flex-1">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6a6a6a]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama umat atau nomor ID..."
              className="min-h-[40px] w-full rounded-full border border-[#e5e5e5] bg-[#faf5e8] pr-9 pl-9 text-xs text-[#0a0a0a] placeholder:text-[#9a9a9a] focus:border-[#0a0a0a] focus:bg-white focus:outline-none sm:text-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute top-1/2 right-2.5 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#e5e5e5] text-[#6a6a6a] hover:bg-[#0a0a0a] hover:text-white"
                title="Clear search"
              >
                <XIcon className="size-3" />
              </button>
            )}
          </div>

          {/* Quick Filter Segmented Chips */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setFilterMethod("all")}
              className={`min-h-[34px] cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-all ${
                filterMethod === "all"
                  ? "bg-[#0a0a0a] text-white shadow-xs"
                  : "border border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] hover:text-[#0a0a0a]"
              }`}
            >
              Semua ({displayRecords.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterMethod("qr")}
              className={`inline-flex min-h-[34px] cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                filterMethod === "qr"
                  ? "bg-[#0a0a0a] text-white shadow-xs"
                  : "border border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] hover:text-[#0a0a0a]"
              }`}
            >
              <QrCodeIcon className="size-3" />
              <span>QR ({metrics.qr})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterMethod("manual")}
              className={`min-h-[34px] cursor-pointer rounded-full px-3 py-1 text-xs font-bold transition-all ${
                filterMethod === "manual"
                  ? "bg-[#0a0a0a] text-white shadow-xs"
                  : "border border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] hover:text-[#0a0a0a]"
              }`}
            >
              Manual ({metrics.manual})
            </button>

            <button
              type="button"
              onClick={() => setFilterMethod("badges")}
              className={`inline-flex min-h-[34px] cursor-pointer items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                filterMethod === "badges"
                  ? "bg-[#0a0a0a] text-white shadow-xs"
                  : "border border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] hover:text-[#0a0a0a]"
              }`}
            >
              <SparklesIcon className="size-3 text-[#e8b94a]" />
              <span>Ada Badge</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Apple HIG Inset Grouped List ── */}
      {filteredRecords.length === 0 ? (
        <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-8 text-center shadow-xs">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#faf5e8] text-[#6a6a6a]">
            <SearchIcon className="size-6 text-[#9a9a9a]" />
          </div>
          <h4 className="mt-3 text-sm font-bold text-[#0a0a0a]">
            {displayRecords.length === 0
              ? "Belum ada presensi tercatat"
              : "Tidak ada data yang cocok"}
          </h4>
          <p className="mt-1 text-xs text-[#6a6a6a]">
            {displayRecords.length === 0
              ? "Gunakan QR scanner atau tombol aktivasi untuk mulai mencatat kehadiran."
              : `Pencarian "${searchQuery}" tidak menemukan hasil pada filter ini.`}
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
              Reset Pencarian
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs divide-y divide-[#f0f0f0]">
          {paginatedRecords.map((rec, idx) => {
            const basePoints = rec.base_points ?? 50
            const userBadges = rec.badges ?? []
            const badgeBonus = userBadges.reduce((acc, b) => acc + b.points, 0)
            const totalPoints = basePoints + badgeBonus

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
                      <p className="truncate text-sm font-bold text-[#0a0a0a]">
                        {rec.name}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#6a6a6a]">
                        {rec.user_number && (
                          <span className="font-mono font-medium text-[#1a3a3a]">
                            {rec.user_number}
                          </span>
                        )}
                        {rec.user_number && <span>•</span>}
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

                {/* Lower Row: Awarded Badges & Organizer Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#f4f0e6] pt-2">
                  {/* Badges Chips */}
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {userBadges.length === 0 ? (
                      <span className="text-[11px] text-[#9a9a9a] italic">
                        Belum ada bonus badge
                      </span>
                    ) : (
                      userBadges.map((b) => (
                        <span
                          key={b.id}
                          className="inline-flex items-center gap-1 rounded-full border border-[#e5e5e5] bg-[#f5f0e0] px-2.5 py-0.5 text-[11px] font-semibold text-[#0a0a0a] shadow-2xs"
                        >
                          <span>{b.name}</span>
                          {isEditable && (
                            <button
                              type="button"
                              onClick={() =>
                                handleRemoveBadge(rec.user_id, b.id)
                              }
                              className="ml-0.5 flex size-3.5 cursor-pointer items-center justify-center rounded-full bg-[#e5e5e5] text-[#6a6a6a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
                              title="Hapus badge"
                            >
                              <XIcon className="size-2.5" />
                            </button>
                          )}
                        </span>
                      ))
                    )}
                  </div>

                  {/* Organizer Management Actions */}
                  {isPengurus && (
                    <div className="flex shrink-0 items-center gap-2">
                      {isEditable ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setActivePickerUser(rec.user_id)}
                            className="inline-flex min-h-[34px] cursor-pointer items-center gap-1 rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-3 py-1 text-xs font-semibold text-[#0a0a0a] shadow-2xs transition-all hover:bg-[#faf5e8] active:scale-95"
                          >
                            <PlusIcon className="size-3 text-[#e8b94a]" />
                            <span>Badge ({userBadges.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Hapus presensi ${rec.name} dari daftar?`
                                )
                              ) {
                                handleRemoveUser(rec.user_id)
                              }
                            }}
                            className="inline-flex min-h-[34px] cursor-pointer items-center justify-center rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-2.5 py-1 text-[#6a6a6a] shadow-2xs transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 active:scale-95"
                            title="Hapus presensi"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-[#6a6a6a]">
                          <LockIcon className="size-3" />
                          <span>Terkunci</span>
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

      {/* ── 4. Scalable Pagination Bar (HIG Navigation) ── */}
      {filteredRecords.length > PAGE_SIZE && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3 text-xs shadow-2xs sm:flex-row sm:px-4">
          <div className="text-[#6a6a6a]">
            Menampilkan{" "}
            <strong className="text-[#0a0a0a]">
              {(safePage - 1) * PAGE_SIZE + 1}
            </strong>{" "}
            –{" "}
            <strong className="text-[#0a0a0a]">
              {Math.min(safePage * PAGE_SIZE, filteredRecords.length)}
            </strong>{" "}
            dari{" "}
            <strong className="text-[#0a0a0a]">
              {filteredRecords.length}
            </strong>{" "}
            peserta
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`flex min-h-[34px] items-center gap-1 rounded-full border px-3 py-1 font-semibold transition-all ${
                safePage <= 1
                  ? "cursor-not-allowed border-transparent text-[#9a9a9a]"
                  : "cursor-pointer border-[#e5e5e5] bg-[#faf5e8] text-[#0a0a0a] hover:bg-white active:scale-95"
              }`}
            >
              <ChevronLeftIcon className="size-3.5" />
              <span>Sebelumnya</span>
            </button>

            <span className="px-2 font-medium text-[#0a0a0a]">
              Hal. {safePage} / {totalPages}
            </span>

            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`flex min-h-[34px] items-center gap-1 rounded-full border px-3 py-1 font-semibold transition-all ${
                safePage >= totalPages
                  ? "cursor-not-allowed border-transparent text-[#9a9a9a]"
                  : "cursor-pointer border-[#e5e5e5] bg-[#faf5e8] text-[#0a0a0a] hover:bg-white active:scale-95"
              }`}
            >
              <span>Selanjutnya</span>
              <ChevronRightIcon className="size-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ── 5. Apple-Style Modal for Badge Management ── */}
      {activePickerRecord && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-xs sm:items-center sm:p-4"
        >
          {/* Backdrop Click Dismiss */}
          <button
            type="button"
            className="absolute inset-0 cursor-pointer"
            onClick={() => setActivePickerUser(null)}
            aria-label="Tutup modal"
          />

          {/* Modal Card / Bottom Sheet on Mobile */}
          <div className="relative z-10 w-full max-w-lg space-y-4 rounded-t-[28px] border border-[#e5e5e5] bg-[#faf5e8] p-5 text-left font-sans shadow-2xl animate-in fade-in slide-in-from-bottom-6 sm:rounded-[28px] sm:p-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 border-b border-[#e5e5e5] pb-3">
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#e8b94a] uppercase">
                  <SparklesIcon className="size-3" />
                  Kelola Apresiasi Seva
                </span>
                <h3 className="text-base font-bold text-[#0a0a0a] sm:text-lg">
                  Bonus Badge untuk {activePickerRecord.name}
                </h3>
                <p className="text-xs text-[#6a6a6a]">
                  Pilih badge kehormatan untuk menambah poin seva peserta.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActivePickerUser(null)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-[#e5e5e5] text-[#6a6a6a] hover:bg-[#0a0a0a] hover:text-white"
                title="Tutup"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Quick Actions (Select All / Clear All) */}
            <div className="flex items-center justify-between px-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  const isAll =
                    (activePickerRecord.badges ?? []).length ===
                    BADGE_PRESETS.length
                  if (isAll) {
                    handleDeselectAll(activePickerRecord.user_id)
                  } else {
                    handleSelectAll(activePickerRecord.user_id)
                  }
                }}
                className="flex cursor-pointer items-center gap-1.5 font-bold text-[#0a0a0a] hover:text-[#1a3a3a]"
              >
                {(activePickerRecord.badges ?? []).length ===
                BADGE_PRESETS.length ? (
                  <>
                    <CheckSquareIcon className="size-4 text-[#0a0a0a]" />
                    <span>Hapus Semua Pilihan</span>
                  </>
                ) : (
                  <>
                    <SquareIcon className="size-4 text-[#6a6a6a]" />
                    <span>Pilih Semua Badge</span>
                  </>
                )}
              </button>

              <span className="font-semibold text-[#6a6a6a]">
                {(activePickerRecord.badges ?? []).length} Terpilih
              </span>
            </div>

            {/* Badges Checklist */}
            <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
              {BADGE_PRESETS.map((preset) => {
                const isChecked = (activePickerRecord.badges ?? []).some(
                  (b) => b.id === preset.id
                )

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() =>
                      handleToggleBadge(activePickerRecord.user_id, preset)
                    }
                    className={`flex w-full min-h-[46px] cursor-pointer items-center justify-between rounded-[14px] border p-3 text-xs transition-all ${
                      isChecked
                        ? "border-[#0a0a0a] bg-[#fffaf0] font-bold text-[#0a0a0a] shadow-xs"
                        : "border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] hover:border-black/20 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {isChecked ? (
                        <CheckSquareIcon className="size-4.5 shrink-0 text-[#0a0a0a]" />
                      ) : (
                        <SquareIcon className="size-4.5 shrink-0 text-[#9a9a9a]" />
                      )}
                      <div className="text-left">
                        <p className="font-bold text-[#0a0a0a]">{preset.name}</p>
                      </div>
                    </div>

                    <span className="ml-2 shrink-0 rounded-full border border-[#e8b94a]/50 bg-[#e8b94a]/20 px-2 py-0.5 font-bold text-[#0a0a0a]">
                      +{preset.points} Pts
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end border-t border-[#e5e5e5] pt-3">
              <button
                type="button"
                onClick={() => setActivePickerUser(null)}
                className="flex min-h-[42px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#0a0a0a] px-6 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] active:scale-95 sm:w-auto sm:text-sm"
              >
                <CheckCircleIcon className="size-4 text-[#e8b94a]" />
                <span>Selesai & Simpan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
