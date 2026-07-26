// components/ui/DateTimePickerPopover
// Pop-up Sub-Modal Dialog for Date & Time Selection.
// Single-scroll layout with category-aware preset filtering & clean responsive UX.

import { useState } from "react"
import { CalendarIcon, ClockIcon, XIcon, CheckIcon, SparklesIcon, CalendarDaysIcon } from "lucide-react"
import { EventCalendar } from "./EventCalendar"
import { getTimePresetsForCategory, getNextDateForDayOfWeek, DAY_NAMES, type EventTimePresetItem } from "@/modules/events/internal/masterdata"

interface DateTimePickerPopoverProps {
  value: string // ISO string "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void
  error?: string
  /** Current event category tag — used to filter applicable time presets */
  categoryTag?: string
}

const QUICK_HOURS_LIST = ["07:00", "08:00", "09:00", "10:00", "13:00", "15:00", "18:00", "18:30", "19:00"]

function parseValue(isoStr: string) {
  if (!isoStr) {
    const now = new Date()
    const datePart = now.toISOString().split("T")[0]
    return { datePart, timePart: "08:00", dateObj: now }
  }
  const parts = isoStr.split("T")
  const datePart = parts[0]!
  const timePart = parts[1] ? parts[1].slice(0, 5) : "08:00"
  const dateObj = new Date(isoStr)
  return { datePart, timePart, dateObj: isNaN(dateObj.getTime()) ? new Date() : dateObj }
}

function formatDisplayDate(datePart: string, timePart: string) {
  if (!datePart) return "Pilih Tanggal & Waktu..."
  const [y, m, d] = datePart.split("-").map(Number)
  const date = new Date(y!, (m ?? 1) - 1, d)
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  const months = [
    "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
    "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
  ]
  const dayName = days[date.getDay()]
  return `${dayName}, ${d} ${months[(m ?? 1) - 1]} ${y} · ${timePart} WIB`
}

export function DateTimePickerPopover({
  value,
  onChange,
  error,
  categoryTag,
}: DateTimePickerPopoverProps) {
  const [open, setOpen] = useState(false)

  const { datePart, timePart, dateObj } = parseValue(value)
  const [calendarMonth, setCalendarMonth] = useState<Date>(dateObj)

  // Local draft state when modal is open
  const [draftDate, setDraftDate] = useState<string>(datePart)
  const [draftTime, setDraftTime] = useState<string>(timePart)
  const [presets, setPresets] = useState<EventTimePresetItem[]>([])

  function handleOpenModal() {
    setPresets(getTimePresetsForCategory(categoryTag, true))
    setDraftDate(datePart || new Date().toISOString().split("T")[0]!)
    setDraftTime(timePart || "08:00")
    setOpen(true)
  }

  function handleSelectPreset(qt: EventTimePresetItem) {
    setDraftTime(qt.time)
    if (qt.day_of_week !== undefined && qt.day_of_week >= 0) {
      const nextDate = getNextDateForDayOfWeek(qt.day_of_week, qt.time)
      setDraftDate(nextDate)
      const [y, m, d] = nextDate.split("-").map(Number)
      setCalendarMonth(new Date(y!, (m ?? 1) - 1, d))
    }
  }

  function handleApply() {
    const finalDate = draftDate || new Date().toISOString().split("T")[0]!
    const finalTime = draftTime || "08:00"
    onChange(`${finalDate}T${finalTime}`)
    setOpen(false)
  }

  return (
    <div className="relative text-left font-sans">
      
      {/* ── Trigger Bar Button ────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleOpenModal}
        className={`flex h-11 w-full items-center justify-between rounded-xl border bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink transition-all shadow-xs ${
          error
            ? "border-rose-300 ring-2 ring-rose-100"
            : open
              ? "border-sekkha-brand-blue ring-2 ring-sekkha-brand-blue/20 bg-white"
              : "border-sekkha-hairline hover:border-sekkha-hairline-strong hover:bg-white"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarIcon className="size-4 text-sekkha-brand-blue shrink-0" />
          <span className="truncate font-bold text-sekkha-ink text-caption">
            {value ? formatDisplayDate(datePart, timePart) : <span className="text-sekkha-slate/70 font-medium">Pilih Tanggal & Waktu...</span>}
          </span>
        </div>
        <span className="rounded-lg bg-sekkha-brand-blue/10 px-2.5 py-1 text-micro-bold text-sekkha-brand-blue hover:bg-sekkha-brand-blue hover:text-white transition-all shrink-0 ml-1">
          {value ? "Ubah" : "Pilih"}
        </span>
      </button>

      {/* ── Modal Overlay ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in-0"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full sm:max-w-lg max-h-[93vh] sm:max-h-[88vh] rounded-t-[28px] sm:rounded-3xl border-t sm:border border-sekkha-hairline bg-white flex flex-col font-sans shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">

            {/* ── Drag Handle (Mobile) ── */}
            <div className="flex items-center justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
            </div>

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-3 border-b border-sekkha-hairline-soft shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-sekkha-brand-blue shrink-0">
                  <CalendarDaysIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-body-sm-medium font-extrabold text-sekkha-ink">Atur Tanggal & Waktu</h3>
                  <p className="text-micro text-sekkha-slate">Pilih preset, tanggal, dan jam acara</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink transition-colors cursor-pointer shrink-0 ml-2"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto scrollbar-none px-5 py-4 space-y-4">

              {/* ── Section 1: Preset Waktu (category-filtered) ── */}
              {presets.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-micro-bold uppercase tracking-wider text-sekkha-slate">
                    <SparklesIcon className="size-3.5 text-amber-500" />
                    <span>Preset Cepat Vihara</span>
                    <span className="ml-1 rounded-full bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">1-Click</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {presets.map(qt => {
                      const isSelected = draftTime === qt.time
                      return (
                        <button
                          key={qt.id || qt.time}
                          type="button"
                          onClick={() => handleSelectPreset(qt)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-micro font-semibold transition-all border cursor-pointer text-left ${
                            isSelected
                              ? "bg-sekkha-brand-blue/10 border-sekkha-brand-blue text-sekkha-brand-blue font-bold shadow-2xs"
                              : "bg-sekkha-canvas border-sekkha-hairline hover:bg-white hover:border-sekkha-brand-blue/40 text-sekkha-ink"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-[13px]">{qt.label}</p>
                            {qt.description && (
                              <p className="text-[11px] text-sekkha-slate truncate mt-0.5">{qt.description}</p>
                            )}
                            {qt.day_of_week !== undefined && qt.day_of_week >= 0 && (
                              <span className="mt-1 text-[10px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded-md inline-block">
                                📅 Hari {DAY_NAMES[qt.day_of_week]} (Auto-tanggal)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="font-extrabold text-caption text-sekkha-brand-blue">{qt.time}</span>
                            {isSelected && <CheckIcon className="size-4 text-sekkha-brand-blue" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Divider if presets exist */}
              {presets.length > 0 && (
                <div className="flex items-center gap-2 text-micro text-sekkha-slate">
                  <div className="flex-1 h-px bg-sekkha-hairline-soft" />
                  <span>atau pilih manual</span>
                  <div className="flex-1 h-px bg-sekkha-hairline-soft" />
                </div>
              )}

              {/* ── Section 2: Calendar Date Picker ── */}
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-micro-bold uppercase tracking-wider text-sekkha-slate">
                  <CalendarIcon className="size-3.5 text-sekkha-brand-blue" />
                  <span>Tanggal Pelaksanaan</span>
                  {draftDate && (
                    <span className="ml-auto text-caption-bold text-sekkha-brand-blue normal-case tracking-normal">
                      {(() => {
                        const [y, m, d] = draftDate.split("-").map(Number)
                        const dt = new Date(y!, (m ?? 1) - 1, d)
                        return dt.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })
                      })()}
                    </span>
                  )}
                </p>
                <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/50 p-2 sm:p-3">
                  <EventCalendar
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    selected={draftDate}
                    onSelect={d => d && setDraftDate(d)}
                    compact={true}
                  />
                </div>
              </div>

              {/* ── Section 3: Quick Time Chips ── */}
              <div className="space-y-2 pb-2">
                <p className="flex items-center gap-1.5 text-micro-bold uppercase tracking-wider text-sekkha-slate">
                  <ClockIcon className="size-3.5 text-sekkha-brand-blue" />
                  <span>Jam Pelaksanaan</span>
                  <span className="ml-auto text-caption-bold text-sekkha-brand-blue normal-case tracking-normal">{draftTime} WIB</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_HOURS_LIST.map(t => {
                    const isSelected = draftTime === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDraftTime(t)}
                        className={`rounded-xl px-3 py-2 text-micro-bold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-sekkha-brand-blue text-white border-sekkha-brand-blue shadow-xs"
                            : "bg-sekkha-canvas border-sekkha-hairline text-sekkha-ink hover:bg-white hover:border-sekkha-brand-blue/40"
                        }`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
                {/* Custom time input for non-standard hours */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-micro text-sekkha-slate shrink-0">Jam lain:</span>
                  <input
                    type="time"
                    value={draftTime}
                    onChange={e => setDraftTime(e.target.value)}
                    className="h-9 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3 text-caption font-bold text-sekkha-ink outline-none focus:border-sekkha-brand-blue focus:ring-2 focus:ring-sekkha-brand-blue/20 transition-all"
                  />
                </div>
              </div>

            </div>

            {/* ── Footer: Summary + Actions ── */}
            <div className="px-5 py-3.5 border-t border-sekkha-hairline-soft shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-sekkha-canvas/60 rounded-b-[28px] sm:rounded-b-3xl">
              {/* Summary */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-sekkha-slate">Hasil Pilihan</p>
                <p className="text-caption-bold text-sekkha-brand-blue truncate mt-0.5">
                  {draftDate ? formatDisplayDate(draftDate, draftTime) : "Belum dipilih"}
                </p>
              </div>
              {/* Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 sm:flex-initial rounded-xl border border-sekkha-hairline bg-white px-4 py-2.5 text-micro-bold text-sekkha-slate hover:bg-sekkha-surface transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 sm:flex-initial rounded-xl bg-sekkha-brand-blue px-5 py-2.5 text-micro-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-95 cursor-pointer font-extrabold"
                >
                  Terapkan
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
