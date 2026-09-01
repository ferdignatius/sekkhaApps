// components/ui/DateTimePickerPopover
// Pop-up Sub-Modal Dialog for Date & Time Selection.
// Single-scroll layout with category-aware preset filtering & clean Clay Design responsive UX.

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
  if (!datePart) return "Select Date & Time..."
  const [y, m, d] = datePart.split("-").map(Number)
  const date = new Date(y!, (m ?? 1) - 1, d)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ]
  const dayName = days[date.getDay()]
  return `${dayName}, ${d} ${months[(m ?? 1) - 1]} ${y} · ${timePart}`
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
        className={`flex h-11 w-full items-center justify-between rounded-[12px] border bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] transition-all duration-200 outline-none cursor-pointer ${
          error
            ? "border-rose-400 bg-rose-50/30 text-rose-900"
            : open
              ? "border-[#0a0a0a] ring-1 ring-[#0a0a0a] shadow-xs"
              : "border-[#e5e5e5] hover:bg-[#faf5e8]"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarIcon className="size-4 text-[#0a0a0a] shrink-0" />
          <span className="truncate font-bold text-[#0a0a0a]">
            {value ? formatDisplayDate(datePart, timePart) : <span className="text-[#6a6a6a] font-normal">Select Date & Time...</span>}
          </span>
        </div>
        <span className="rounded-[8px] bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-1 text-xs font-bold text-[#0a0a0a] hover:bg-[#f5f0e0] transition-colors shrink-0 ml-1">
          {value ? "Change" : "Select"}
        </span>
      </button>

      {/* ── Modal Overlay ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in-0"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full sm:max-w-lg max-h-[93vh] sm:max-h-[88vh] rounded-t-[24px] sm:rounded-[24px] border-t sm:border border-[#e5e5e5] bg-[#fffaf0] flex flex-col font-sans shadow-2xl animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">

            {/* ── Drag Handle (Mobile) ── */}
            <div className="flex items-center justify-center pt-3 pb-1 sm:hidden shrink-0">
              <div className="w-12 h-1.5 bg-[#6a6a6a]/30 rounded-full" />
            </div>

            {/* ── Header ── */}
            <div className="flex items-center justify-between px-5 pt-3 sm:pt-5 pb-3 border-b border-[#e5e5e5] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shrink-0 shadow-xs">
                  <CalendarDaysIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">Set Date & Time</h3>
                  <p className="text-xs text-[#6a6a6a]">Choose preset, date, and event time</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-[8px] p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a] transition-colors cursor-pointer shrink-0 ml-2"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 overflow-y-auto scrollbar-none px-5 py-4 space-y-4">

              {/* ── Section 1: Preset Waktu (category-filtered) ── */}
              {presets.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-bold text-[#6a6a6a] uppercase tracking-wider">
                    <SparklesIcon className="size-3.5 text-[#e8b94a]" />
                    <span>Quick Vihara Presets</span>
                    <span className="ml-1 rounded-full bg-[#e8b94a]/20 border border-[#e8b94a]/40 px-2 py-0.2 text-[10px] font-bold text-[#0a0a0a]">1-Click</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {presets.map(qt => {
                      const isSelected = draftTime === qt.time
                      return (
                        <button
                          key={qt.id || qt.time}
                          type="button"
                          onClick={() => handleSelectPreset(qt)}
                          className={`flex items-center justify-between rounded-[12px] px-3.5 py-2.5 text-xs font-semibold transition-all border cursor-pointer text-left ${
                            isSelected
                              ? "bg-[#0a0a0a] border-[#0a0a0a] text-white font-bold shadow-xs"
                              : "bg-[#faf5e8] border-[#e5e5e5] hover:bg-[#f5f0e0] text-[#0a0a0a]"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-bold text-xs">{qt.label}</p>
                            {qt.description && (
                              <p className={`text-[11px] truncate mt-0.5 ${isSelected ? "text-white/80" : "text-[#6a6a6a]"}`}>{qt.description}</p>
                            )}
                            {qt.day_of_week !== undefined && qt.day_of_week >= 0 && (
                              <span className={`mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded-[4px] inline-block ${
                                isSelected ? "bg-white/20 text-white" : "bg-[#b8a4ed]/30 text-[#0a0a0a] border border-[#b8a4ed]/50"
                              }`}>
                                📅 {DAY_NAMES[qt.day_of_week]} (Auto-date)
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className={`font-mono text-xs font-bold ${isSelected ? "text-[#e8b94a]" : "text-[#0a0a0a]"}`}>{qt.time}</span>
                            {isSelected && <CheckIcon className="size-4 text-white" />}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Divider if presets exist */}
              {presets.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-[#6a6a6a]">
                  <div className="flex-1 h-px bg-[#e5e5e5]" />
                  <span>or select manually</span>
                  <div className="flex-1 h-px bg-[#e5e5e5]" />
                </div>
              )}

              {/* ── Section 2: Calendar Date Picker ── */}
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-bold text-[#6a6a6a] uppercase tracking-wider">
                  <CalendarIcon className="size-3.5 text-[#0a0a0a]" />
                  <span>Event Date</span>
                  {draftDate && (
                    <span className="ml-auto text-xs font-bold text-[#0a0a0a] normal-case tracking-normal">
                      {(() => {
                        const [y, m, d] = draftDate.split("-").map(Number)
                        const dt = new Date(y!, (m ?? 1) - 1, d)
                        return dt.toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                      })()}
                    </span>
                  )}
                </p>
                <div className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-2 sm:p-3 shadow-xs">
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
                <p className="flex items-center gap-1.5 text-xs font-bold text-[#6a6a6a] uppercase tracking-wider">
                  <ClockIcon className="size-3.5 text-[#0a0a0a]" />
                  <span>Event Time</span>
                  <span className="ml-auto font-mono text-xs font-bold text-[#0a0a0a] normal-case tracking-normal">{draftTime}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_HOURS_LIST.map(t => {
                    const isSelected = draftTime === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDraftTime(t)}
                        className={`rounded-[8px] px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#0a0a0a] text-white border-[#0a0a0a] shadow-xs"
                            : "bg-[#fffaf0] border-[#e5e5e5] text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
                        }`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
                {/* Custom time input for non-standard hours */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs font-semibold text-[#6a6a6a] shrink-0">Other time:</span>
                  <input
                    type="time"
                    value={draftTime}
                    onChange={e => setDraftTime(e.target.value)}
                    className="h-10 rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 font-mono text-xs font-bold text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                  />
                </div>
              </div>

            </div>

            {/* ── Footer: Summary + Actions ── */}
            <div className="px-5 py-3.5 border-t border-[#e5e5e5] shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#faf5e8] rounded-b-[24px]">
              {/* Summary */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a]">Selection Summary</p>
                <p className="text-xs font-bold text-[#0a0a0a] truncate mt-0.5">
                  {draftDate ? formatDisplayDate(draftDate, draftTime) : "Not selected"}
                </p>
              </div>
              {/* Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] hover:bg-[#f5f0e0] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="h-10 rounded-[10px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer"
                >
                  Apply
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
