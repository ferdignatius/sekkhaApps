// feature/events/components/AttendanceListSheet
// Displays attendance records in a clean Glassmorphic Table.
// Features a custom Multi-Select Badge Dropdown Picker matching exact user UI specifications.

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

interface AttendanceListSheetProps {
  records: AttendanceRecord[]
  role: UserRole | null
  totalRsvp?: number
  isClosed?: boolean
  onUpdateBadges?: (userId: string, badges: AttendanceBadge[]) => void
  onDeleteRecord?: (userId: string) => void
}

// Preset Badges that Pengurus can award to participants
const BADGE_PRESETS: AttendanceBadge[] = [
  { id: "puja", name: "Petugas Puja", points: 20, color: "bg-blue-50/90 text-blue-700 border-blue-200/80" },
  { id: "paritta", name: "Pembaca Paritta", points: 30, color: "bg-amber-50/90 text-amber-800 border-amber-200/80" },
  { id: "panitia", name: "Panitia / Relawan", points: 50, color: "bg-purple-50/90 text-purple-800 border-purple-200/80" },
  { id: "pemusik", name: "Pemusik / Speaker", points: 40, color: "bg-rose-50/90 text-rose-800 border-rose-200/80" },
  { id: "kebersihan", name: "Tim Kebersihan", points: 25, color: "bg-emerald-50/90 text-emerald-800 border-emerald-200/80" },
]

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit", minute: "2-digit",
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
  
  // Local state for interactive manipulation demo
  const [localRecords, setLocalRecords] = useState<AttendanceRecord[]>(records)
  const [activePickerUser, setActivePickerUser] = useState<string | null>(null)

  // Use localRecords if updated locally
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
    <div className="space-y-3 text-left">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircleIcon className="size-4 text-sekkha-brand-blue" aria-hidden="true" />
          <span className="text-caption-bold text-sekkha-ink">
            Daftar Kehadiran Peserta
          </span>
        </div>
        <span className="text-micro font-medium text-sekkha-slate">
          {displayRecords.length} Peserta Terdaftar Hadir
        </span>
      </div>

      {/* Attendance Table */}
      {displayRecords.length === 0 ? (
        <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/60 py-8 text-center text-caption text-sekkha-slate">
          Belum ada peserta yang tercatat hadir.
        </div>
      ) : (
        <div className="w-full rounded-2xl border border-sekkha-hairline bg-white/90 shadow-2xs pb-4">
          <table className="w-full text-left text-xs font-sans border-collapse">
            {/* Table Header */}
            <thead>
              <tr className="border-b border-sekkha-hairline text-sekkha-slate">
                <th className="py-2.5 px-3 font-bold">Peserta</th>
                <th className="py-2.5 px-3 font-bold">Waktu</th>
                <th className="py-2.5 px-3 font-bold">Badges (Bonus Poin)</th>
                <th className="py-2.5 px-3 font-bold">Metode</th>
                <th className="py-2.5 px-3 font-bold text-right">Total Poin</th>
                {isPengurus && <th className="py-2.5 px-3 font-bold text-center">Kelola / Akses</th>}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-sekkha-hairline-soft/70 text-sekkha-ink">
              {displayRecords.map((rec, i) => {
                const basePoints = rec.base_points ?? 50
                const badgeBonus = (rec.badges ?? []).reduce((acc, b) => acc + b.points, 0)
                const totalPoints = basePoints + badgeBonus
                const userBadges = rec.badges ?? []
                const isAllSelected = userBadges.length === BADGE_PRESETS.length

                return (
                  <tr key={`${rec.user_id}-${i}`} className="hover:bg-blue-50/30 transition-colors">
                    
                    {/* Col 1: Name */}
                    <td className="py-2.5 px-3 font-medium min-w-[130px]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sekkha-surface text-sekkha-slate">
                          <UserIcon className="size-3" />
                        </span>
                        <span className="truncate">{rec.name}</span>
                      </div>
                    </td>

                    {/* Col 2: Time */}
                    <td className="py-2.5 px-3 text-sekkha-slate whitespace-nowrap">
                      {formatTime(rec.scanned_at)}
                    </td>

                    {/* Col 3: Badges Chips Display (Style Pill Matching Reference UI) */}
                    <td className="py-2.5 px-3 min-w-[200px]">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {userBadges.length === 0 ? (
                          <span className="text-micro text-sekkha-slate italic">-</span>
                        ) : (
                          userBadges.map(b => (
                            <span
                              key={b.id}
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-micro-bold border shadow-2xs ${b.color ?? "bg-blue-50/90 text-blue-700 border-blue-200/80"}`}
                            >
                              <span>{b.name}</span>
                              {isEditable && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBadge(rec.user_id, b.id)}
                                  className="ml-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-200/80 text-slate-600 hover:bg-slate-300 hover:text-slate-900 transition-colors"
                                  title="Hapus Badge Ini"
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
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro-bold ${
                          rec.method === "qr"
                            ? "bg-emerald-100/90 text-emerald-800 border border-emerald-200/80"
                            : "bg-sekkha-surface text-sekkha-slate border border-sekkha-hairline"
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
                    <td className="py-2.5 px-3 text-right font-extrabold whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-micro-bold text-amber-900 shadow-2xs">
                        <SparklesIcon className="size-3 text-amber-600" />
                        <span>+{totalPoints} Poin</span>
                      </span>
                    </td>

                    {/* Col 6: Actions for Pengurus (Add Badge Multi-Select & Delete User) */}
                    {isPengurus && (
                      <td className="py-2.5 px-3 text-center relative whitespace-nowrap">
                        {isEditable ? (
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Add Badge Multi-Select Trigger */}
                            <button
                              type="button"
                              onClick={() => setActivePickerUser(activePickerUser === rec.user_id ? null : rec.user_id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-2.5 py-1 text-micro-bold text-sekkha-brand-blue hover:bg-blue-50 transition-all shadow-2xs active:scale-95"
                              title="Kelola Badge Bonus"
                            >
                              <PlusIcon className="size-3" />
                              <span>Badge</span>
                            </button>

                            {/* Delete User Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveUser(rec.user_id)}
                              className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-1 text-rose-600 hover:bg-rose-100 transition-all shadow-2xs active:scale-95"
                              title="Hapus Presensi Peserta Ini"
                            >
                              <Trash2Icon className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-micro font-semibold text-slate-400 italic">🔒 Terkunci</span>
                        )}

                        {/* ── Multi-Select Dropdown Picker (Sekkha Glassmorphism Style) ── */}
                        {activePickerUser === rec.user_id && (
                          <div className="absolute right-3 top-10 z-40 w-60 rounded-2xl border border-sekkha-hairline bg-white/95 backdrop-blur-md p-2 shadow-xl text-left font-sans space-y-2">
                            
                            {/* Dropdown Header: Select/Deselect All & Reset */}
                            <div className="flex items-center justify-between pb-1.5 border-b border-sekkha-hairline-soft px-1">
                              <button
                                type="button"
                                onClick={() => isAllSelected ? handleDeselectAll(rec.user_id) : handleSelectAll(rec.user_id)}
                                className="flex items-center gap-1.5 text-micro-bold text-sekkha-ink hover:text-sekkha-brand-blue transition-colors"
                              >
                                {isAllSelected ? (
                                  <CheckSquareIcon className="size-4 text-sekkha-brand-blue" />
                                ) : (
                                  <SquareIcon className="size-4 text-sekkha-slate/60" />
                                )}
                                <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeselectAll(rec.user_id)}
                                className="rounded-lg bg-blue-50 px-2 py-0.5 text-micro-bold text-sekkha-brand-blue hover:bg-blue-100 transition-colors"
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
                                    className={`flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-micro font-medium transition-all ${
                                      isChecked
                                        ? "bg-sekkha-brand-blue/10 text-sekkha-ink font-bold border border-sekkha-brand-blue/20"
                                        : "hover:bg-sekkha-surface text-sekkha-slate"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      {isChecked ? (
                                        <CheckSquareIcon className="size-3.5 text-sekkha-brand-blue shrink-0" />
                                      ) : (
                                        <SquareIcon className="size-3.5 text-sekkha-slate/40 shrink-0" />
                                      )}
                                      <span className="truncate">{preset.name}</span>
                                    </div>
                                    <span className="shrink-0 text-micro-bold text-sekkha-brand-blue ml-2">
                                      +{preset.points} Poin
                                    </span>
                                  </button>
                                )
                              })}
                            </div>

                            {/* Dropdown Footer: Selected Counter */}
                            <div className="pt-1.5 border-t border-sekkha-hairline-soft flex items-center justify-between text-micro font-semibold text-sekkha-slate px-1">
                              <span>Total Terpilih:</span>
                              <span className="rounded-full bg-sekkha-surface px-2 py-0.5 text-micro-bold text-sekkha-ink border border-sekkha-hairline">
                                {userBadges.length} Badge
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
              <tr className="border-t-2 border-sekkha-hairline bg-sekkha-surface/90 text-sekkha-ink font-bold">
                <td className="py-3 px-3">
                  Total Kehadiran: <span className="text-sekkha-brand-blue">{displayRecords.length} Peserta</span>
                </td>
                <td className="py-3 px-3 text-sekkha-slate text-micro font-medium">
                  {displayRecords.filter(r => r.method === "qr").length} QR · {displayRecords.filter(r => r.method === "manual").length} Manual
                </td>
                <td className="py-3 px-3 text-sekkha-slate text-micro font-medium">
                  {displayRecords.reduce((acc, r) => acc + (r.badges?.length ?? 0), 0)} Badge Diberikan
                </td>
                <td className="py-3 px-3 text-sekkha-slate font-medium text-micro">
                  Ringkasan Poin:
                </td>
                <td className="py-3 px-3 text-right font-extrabold whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 rounded-xl bg-amber-100/90 border border-amber-300 px-3 py-1 text-xs font-black text-amber-900 shadow-2xs">
                    <SparklesIcon className="size-3.5 text-amber-600" />
                    <span>
                      Total +{displayRecords.reduce((acc, rec) => {
                        const base = rec.base_points ?? 50
                        const bonus = (rec.badges ?? []).reduce((bAcc, b) => bAcc + b.points, 0)
                        return acc + base + bonus
                      }, 0)} Poin
                    </span>
                  </span>
                </td>
                {isPengurus && <td className="py-3 px-3" />}
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
