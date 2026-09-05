// feature/events/components/AttendanceListSheet
// Displays attendance records in a clean Clay Design System Table.
// Features horizontal scrolling for guaranteed mobile responsiveness and a custom Multi-Select Badge Dropdown.

import { useState } from "react"
import {
  CheckCircleIcon,
  QrCodeIcon,
  UserIcon,
  PlusIcon,
  SparklesIcon,
  XIcon,
  Trash2Icon,
  CheckSquareIcon,
  SquareIcon,
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

// Preset Badges — only active from Master Data
const BADGE_PRESETS: AttendanceBadge[] = getMasterBadges(true)

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  })
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

  const displayRecords = localRecords.length > 0 ? localRecords : records

  function handleToggleBadge(userId: string, badge: AttendanceBadge) {
    const updated = displayRecords.map(rec => {
      if (rec.user_id !== userId) return rec
      const existing = rec.badges ?? []
      const hasBadge = existing.some(b => b.id === badge.id)
      const nextBadges = hasBadge
        ? existing.filter(b => b.id !== badge.id)
        : [...existing, badge]
      onUpdateBadges?.(userId, nextBadges)
      return { ...rec, badges: nextBadges }
    })
    setLocalRecords(updated)
  }

  function handleSelectAll(userId: string) {
    const updated = displayRecords.map(rec => {
      if (rec.user_id !== userId) return rec
      onUpdateBadges?.(userId, BADGE_PRESETS)
      return { ...rec, badges: BADGE_PRESETS }
    })
    setLocalRecords(updated)
  }

  function handleDeselectAll(userId: string) {
    const updated = displayRecords.map(rec => {
      if (rec.user_id !== userId) return rec
      onUpdateBadges?.(userId, [])
      return { ...rec, badges: [] }
    })
    setLocalRecords(updated)
  }

  function handleRemoveBadge(userId: string, badgeId: string) {
    const updated = displayRecords.map(rec => {
      if (rec.user_id !== userId) return rec
      const nextBadges = (rec.badges ?? []).filter(b => b.id !== badgeId)
      onUpdateBadges?.(userId, nextBadges)
      return { ...rec, badges: nextBadges }
    })
    setLocalRecords(updated)
  }

  function handleRemoveUser(userId: string) {
    const updated = displayRecords.filter(rec => rec.user_id !== userId)
    setLocalRecords(updated)
    onDeleteRecord?.(userId)
  }

  return (
    <div className="space-y-3 text-left font-sans">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="size-4 text-[#1a3a3a]" aria-hidden="true" />
          <span className="text-xs font-bold text-[#0a0a0a]">
            Attendance List
          </span>
        </div>
        <span className="text-xs font-medium text-[#6a6a6a]">
          {displayRecords.length} Attendees Checked In
        </span>
      </div>

      {/* Attendance Table */}
      {displayRecords.length === 0 ? (
        <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] py-8 text-center text-xs text-[#6a6a6a]">
          No attendance records yet.
        </div>
      ) : (
        <div className="w-full overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full min-w-[620px] text-left text-xs font-sans border-collapse">
              {/* Table Header */}
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a]">
                  <th className="py-2.5 px-3 font-bold">Attendee</th>
                  <th className="py-2.5 px-3 font-bold">Time</th>
                  <th className="py-2.5 px-3 font-bold">Badges (Bonus Points)</th>
                  <th className="py-2.5 px-3 font-bold">Method</th>
                  <th className="py-2.5 px-3 font-bold text-right">Total Points</th>
                  {isPengurus && <th className="py-2.5 px-3 font-bold text-center">Manage</th>}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody className="divide-y divide-[#f0f0f0] text-[#0a0a0a]">
                {displayRecords.map((rec, i) => {
                  const basePoints = rec.base_points ?? 50
                  const badgeBonus = (rec.badges ?? []).reduce((acc, b) => acc + b.points, 0)
                  const totalPoints = basePoints + badgeBonus
                  const userBadges = rec.badges ?? []
                  const isAllSelected = userBadges.length === BADGE_PRESETS.length

                  return (
                    <tr key={`${rec.user_id}-${i}`} className="hover:bg-[#faf5e8]/80 transition-colors">
                      
                      {/* Col 1: Name & No. Unik */}
                      <td className="py-2.5 px-3 font-medium min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#faf5e8] text-[#0a0a0a] border border-[#e5e5e5]">
                            <UserIcon className="size-3.5" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold leading-tight text-[#0a0a0a]">{rec.name}</p>
                            {rec.user_number && (
                              <p className="text-[10px] font-mono text-[#1a3a3a] font-semibold mt-0.5">
                                {rec.user_number}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Time */}
                      <td className="py-2.5 px-3 text-[#6a6a6a] whitespace-nowrap">
                        {formatTime(rec.scanned_at)}
                      </td>

                      {/* Col 3: Badges Chips Display */}
                      <td className="py-2.5 px-3 min-w-[200px]">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {userBadges.length === 0 ? (
                            <span className="text-xs text-[#6a6a6a] italic">-</span>
                          ) : (
                            userBadges.map(b => (
                              <span
                                key={b.id}
                                className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-[#f5f0e0] text-[#0a0a0a] border border-[#e5e5e5] shadow-2xs"
                              >
                                <span>{b.name}</span>
                                {isEditable && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveBadge(rec.user_id, b.id)}
                                    className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#e5e5e5] text-[#6a6a6a] hover:bg-[#0a0a0a] hover:text-white transition-colors cursor-pointer"
                                    title="Remove Badge"
                                  >
                                    <XIcon className="size-2.5" />
                                  </button>
                                )}
                              </span>
                            ))
                          )}
                        </div>
                      </td>

                      {/* Col 4: Method */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            rec.method === "qr"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-[#faf5e8] text-[#6a6a6a] border border-[#e5e5e5]"
                          }`}
                        >
                          {rec.method === "qr" ? (
                            <><QrCodeIcon className="size-3" /> QR Scan</>
                          ) : (
                            "Manual"
                          )}
                        </span>
                      </td>

                      {/* Col 5: Total Points */}
                      <td className="py-2.5 px-3 text-right font-bold whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 rounded-[8px] bg-[#e8b94a]/20 border border-[#e8b94a]/40 px-2.5 py-0.5 text-xs font-bold text-[#0a0a0a] shadow-2xs">
                          <SparklesIcon className="size-3 text-[#e8b94a]" />
                          <span>+{totalPoints} Pts</span>
                        </span>
                      </td>

                      {/* Col 6: Actions for Pengurus */}
                      {isPengurus && (
                        <td className="py-2.5 px-3 text-center relative whitespace-nowrap">
                          {isEditable ? (
                            <div className="flex items-center justify-center gap-1.5">
                              {/* Add Badge Multi-Select Trigger */}
                              <button
                                type="button"
                                onClick={() => setActivePickerUser(activePickerUser === rec.user_id ? null : rec.user_id)}
                                className="inline-flex items-center gap-1 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 py-1 text-xs font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] transition-all shadow-2xs active:scale-95 cursor-pointer"
                                title="Manage Badges"
                              >
                                <PlusIcon className="size-3" />
                                <span>Badge</span>
                              </button>

                              {/* Delete User Button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveUser(rec.user_id)}
                                className="inline-flex items-center justify-center rounded-[8px] border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition-all shadow-2xs active:scale-95 cursor-pointer"
                                title="Remove Attendee"
                              >
                                <Trash2Icon className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-[#6a6a6a] italic">🔒 Locked</span>
                          )}

                          {/* ── Multi-Select Dropdown Picker ── */}
                          {activePickerUser === rec.user_id && (
                            <div className="absolute right-3 top-10 z-40 w-64 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-2.5 shadow-2xl text-left font-sans space-y-2">
                              
                              {/* Dropdown Header: Select/Deselect All & Reset */}
                              <div className="flex items-center justify-between pb-1.5 border-b border-[#e5e5e5] px-1">
                                <button
                                  type="button"
                                  onClick={() => isAllSelected ? handleDeselectAll(rec.user_id) : handleSelectAll(rec.user_id)}
                                  className="flex items-center gap-1.5 text-xs font-bold text-[#0a0a0a] hover:text-[#1a3a3a] transition-colors cursor-pointer"
                                >
                                  {isAllSelected ? (
                                    <CheckSquareIcon className="size-4 text-[#0a0a0a]" />
                                  ) : (
                                    <SquareIcon className="size-4 text-[#6a6a6a]" />
                                  )}
                                  <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeselectAll(rec.user_id)}
                                  className="rounded-[6px] bg-[#faf5e8] border border-[#e5e5e5] px-2 py-0.5 text-xs font-semibold text-[#0a0a0a] hover:bg-[#f5f0e0] transition-colors cursor-pointer"
                                >
                                  Reset
                                </button>
                              </div>

                              {/* Dropdown Body: Checkbox Item List */}
                              <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                                {BADGE_PRESETS.map(preset => {
                                  const isChecked = userBadges.some(b => b.id === preset.id)
                                  return (
                                    <button
                                      key={preset.id}
                                      type="button"
                                      onClick={() => handleToggleBadge(rec.user_id, preset)}
                                      className={`flex w-full items-center justify-between rounded-[8px] px-2.5 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                                        isChecked
                                          ? "bg-[#f5f0e0] text-[#0a0a0a] font-bold border border-[#e5e5e5]"
                                          : "hover:bg-[#faf5e8] text-[#6a6a6a]"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 min-w-0">
                                        {isChecked ? (
                                          <CheckSquareIcon className="size-3.5 text-[#0a0a0a] shrink-0" />
                                        ) : (
                                          <SquareIcon className="size-3.5 text-[#6a6a6a]/60 shrink-0" />
                                        )}
                                        <span className="truncate">{preset.name}</span>
                                      </div>
                                      <span className="shrink-0 text-xs font-bold text-[#0a0a0a] ml-2">
                                        +{preset.points} Pts
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>

                              {/* Dropdown Footer: Selected Counter */}
                              <div className="pt-1.5 border-t border-[#e5e5e5] flex items-center justify-between text-xs font-medium text-[#6a6a6a] px-1">
                                <span>Selected:</span>
                                <span className="rounded-full bg-[#faf5e8] px-2 py-0.5 text-xs font-bold text-[#0a0a0a] border border-[#e5e5e5]">
                                  {userBadges.length} Badges
                                </span>
                              </div>

                            </div>
                          )}
                        </td>
                      )}

                    </tr>
                  )
                })}
              </tbody>

              {/* Table Footer Summary */}
              <tfoot>
                <tr className="border-t-2 border-[#e5e5e5] bg-[#faf5e8] text-[#0a0a0a] font-bold">
                  <td className="py-3 px-3">
                    Total Attendance: <span className="text-[#0a0a0a]">{displayRecords.length} Attendees</span>
                  </td>
                  <td className="py-3 px-3 text-[#6a6a6a] text-xs font-normal">
                    {displayRecords.filter(r => r.method === "qr").length} QR · {displayRecords.filter(r => r.method === "manual").length} Manual
                  </td>
                  <td className="py-3 px-3 text-[#6a6a6a] text-xs font-normal">
                    {displayRecords.reduce((acc, r) => acc + (r.badges?.length ?? 0), 0)} Badges Awarded
                  </td>
                  <td className="py-3 px-3 text-[#6a6a6a] font-normal text-xs">
                    Points Summary:
                  </td>
                  <td className="py-3 px-3 text-right font-extrabold whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 rounded-[8px] bg-[#e8b94a]/20 border border-[#e8b94a]/40 px-3 py-1 text-xs font-bold text-[#0a0a0a] shadow-2xs">
                      <SparklesIcon className="size-3.5 text-[#e8b94a]" />
                      <span>
                        Total +{displayRecords.reduce((acc, rec) => {
                          const base = rec.base_points ?? 50
                          const bonus = (rec.badges ?? []).reduce((bAcc, b) => bAcc + b.points, 0)
                          return acc + base + bonus
                        }, 0)} Pts
                      </span>
                    </span>
                  </td>
                  {isPengurus && <td className="py-3 px-3" />}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
