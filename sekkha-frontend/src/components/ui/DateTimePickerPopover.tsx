// components/ui/DateTimePickerPopover
// Pop-up Sub-Modal Dialog for Date & Time Selection.
// Single-scroll layout with category-aware preset filtering & clean Clay Design responsive UX.

import { useState } from "react"
import {
  CalendarIcon,
  ClockIcon,
  XIcon,
  CheckIcon,
  SparklesIcon,
  CalendarDaysIcon,
} from "lucide-react"
import { EventCalendar } from "./EventCalendar"
import {
  getTimePresetsForCategory,
  getNextDateForDayOfWeek,
  DAY_NAMES,
  type EventTimePresetItem,
} from "@/modules/events/internal/masterdata"

interface DateTimePickerPopoverProps {
  value: string // ISO string "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void
  error?: string
  /** Current event category tag — used to filter applicable time presets */
  categoryTag?: string
}

const QUICK_HOURS_LIST = [
  "07:00",
  "08:00",
  "09:00",
  "10:00",
  "13:00",
  "15:00",
  "18:00",
  "18:30",
  "19:00",
]

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
  return {
    datePart,
    timePart,
    dateObj: isNaN(dateObj.getTime()) ? new Date() : dateObj,
  }
}

function formatDisplayDate(datePart: string, timePart: string) {
  if (!datePart) return "Select Date & Time..."
  const [y, m, d] = datePart.split("-").map(Number)
  const date = new Date(y!, (m ?? 1) - 1, d)
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
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
        className={`flex h-11 w-full cursor-pointer items-center justify-between rounded-[12px] border bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] transition-all duration-200 outline-none sm:text-sm ${
          error
            ? "border-rose-400 bg-rose-50/30 text-rose-900"
            : open
              ? "border-[#0a0a0a] shadow-xs ring-1 ring-[#0a0a0a]"
              : "border-[#e5e5e5] hover:bg-[#faf5e8]"
        }`}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <CalendarIcon className="size-4 shrink-0 text-[#0a0a0a]" />
          <span className="truncate font-bold text-[#0a0a0a]">
            {value ? (
              formatDisplayDate(datePart, timePart)
            ) : (
              <span className="font-normal text-[#6a6a6a]">
                Select Date & Time...
              </span>
            )}
          </span>
        </div>
        <span className="ml-1 shrink-0 rounded-[8px] border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-1 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0]">
          {value ? "Change" : "Select"}
        </span>
      </button>

      {/* ── Modal Overlay ─────────────────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-[110] flex animate-in items-end justify-center bg-black/60 p-0 backdrop-blur-xs fade-in-0 sm:items-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="flex max-h-[93vh] w-full animate-in flex-col rounded-t-[24px] border-t border-[#e5e5e5] bg-[#fffaf0] font-sans shadow-2xl duration-200 slide-in-from-bottom-full sm:max-h-[88vh] sm:max-w-lg sm:rounded-[24px] sm:border sm:zoom-in-95">
            {/* ── Drag Handle (Mobile) ── */}
            <div className="flex shrink-0 items-center justify-center pt-3 pb-1 sm:hidden">
              <div className="h-1.5 w-12 rounded-full bg-[#6a6a6a]/30" />
            </div>

            {/* ── Header ── */}
            <div className="flex shrink-0 items-center justify-between border-b border-[#e5e5e5] px-5 pt-3 pb-3 sm:pt-5">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
                  <CalendarDaysIcon className="size-4.5 text-[#e8b94a]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                    Set Date & Time
                  </h3>
                  <p className="text-xs text-[#6a6a6a]">
                    Choose preset, date, and event time
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-2 shrink-0 cursor-pointer rounded-[8px] p-1.5 text-[#6a6a6a] transition-colors hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 scrollbar-none space-y-4 overflow-y-auto px-5 py-4">
              {/* ── Section 1: Preset Waktu (category-filtered) ── */}
              {presets.length > 0 && (
                <div className="space-y-2">
                  <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#6a6a6a] uppercase">
                    <SparklesIcon className="size-3.5 text-[#e8b94a]" />
                    <span>Quick Vihara Presets</span>
                    <span className="py-0.2 ml-1 rounded-full border border-[#e8b94a]/40 bg-[#e8b94a]/20 px-2 text-[10px] font-bold text-[#0a0a0a]">
                      1-Click
                    </span>
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {presets.map((qt) => {
                      const isSelected = draftTime === qt.time
                      return (
                        <button
                          key={qt.id || qt.time}
                          type="button"
                          onClick={() => handleSelectPreset(qt)}
                          className={`flex cursor-pointer items-center justify-between rounded-[12px] border px-3.5 py-2.5 text-left text-xs font-semibold transition-all ${
                            isSelected
                              ? "border-[#0a0a0a] bg-[#0a0a0a] font-bold text-white shadow-xs"
                              : "border-[#e5e5e5] bg-[#faf5e8] text-[#0a0a0a] hover:bg-[#f5f0e0]"
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold">
                              {qt.label}
                            </p>
                            {qt.description && (
                              <p
                                className={`mt-0.5 truncate text-[11px] ${isSelected ? "text-white/80" : "text-[#6a6a6a]"}`}
                              >
                                {qt.description}
                              </p>
                            )}
                            {qt.day_of_week !== undefined &&
                              qt.day_of_week >= 0 && (
                                <span
                                  className={`mt-1 inline-block rounded-[4px] px-1.5 py-0.5 text-[10px] font-bold ${
                                    isSelected
                                      ? "bg-white/20 text-white"
                                      : "border border-[#b8a4ed]/50 bg-[#b8a4ed]/30 text-[#0a0a0a]"
                                  }`}
                                >
                                  📅 {DAY_NAMES[qt.day_of_week]} (Auto-date)
                                </span>
                              )}
                          </div>
                          <div className="ml-2 flex shrink-0 items-center gap-1.5">
                            <span
                              className={`font-mono text-xs font-bold ${isSelected ? "text-[#e8b94a]" : "text-[#0a0a0a]"}`}
                            >
                              {qt.time}
                            </span>
                            {isSelected && (
                              <CheckIcon className="size-4 text-white" />
                            )}
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
                  <div className="h-px flex-1 bg-[#e5e5e5]" />
                  <span>or select manually</span>
                  <div className="h-px flex-1 bg-[#e5e5e5]" />
                </div>
              )}

              {/* ── Section 2: Calendar Date Picker ── */}
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#6a6a6a] uppercase">
                  <CalendarIcon className="size-3.5 text-[#0a0a0a]" />
                  <span>Event Date</span>
                  {draftDate && (
                    <span className="ml-auto text-xs font-bold tracking-normal text-[#0a0a0a] normal-case">
                      {(() => {
                        const [y, m, d] = draftDate.split("-").map(Number)
                        const dt = new Date(y!, (m ?? 1) - 1, d)
                        return dt.toLocaleDateString("en-US", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      })()}
                    </span>
                  )}
                </p>
                <div className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-2 shadow-xs sm:p-3">
                  <EventCalendar
                    month={calendarMonth}
                    onMonthChange={setCalendarMonth}
                    selected={draftDate}
                    onSelect={(d) => d && setDraftDate(d)}
                    compact={true}
                  />
                </div>
              </div>

              {/* ── Section 3: Quick Time Chips ── */}
              <div className="space-y-2 pb-2">
                <p className="flex items-center gap-1.5 text-xs font-bold tracking-wider text-[#6a6a6a] uppercase">
                  <ClockIcon className="size-3.5 text-[#0a0a0a]" />
                  <span>Event Time</span>
                  <span className="ml-auto font-mono text-xs font-bold tracking-normal text-[#0a0a0a] normal-case">
                    {draftTime}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_HOURS_LIST.map((t) => {
                    const isSelected = draftTime === t
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setDraftTime(t)}
                        className={`cursor-pointer rounded-[8px] border px-3 py-1.5 text-xs font-bold transition-all ${
                          isSelected
                            ? "border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-xs"
                            : "border-[#e5e5e5] bg-[#fffaf0] text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
                        }`}
                      >
                        {t}
                      </button>
                    )
                  })}
                </div>
                {/* Custom time input for non-standard hours */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="shrink-0 text-xs font-semibold text-[#6a6a6a]">
                    Other time:
                  </span>
                  <input
                    type="time"
                    value={draftTime}
                    onChange={(e) => setDraftTime(e.target.value)}
                    className="h-10 rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 font-mono text-xs font-bold text-[#0a0a0a] transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                </div>
              </div>
            </div>

            {/* ── Footer: Summary + Actions ── */}
            <div className="flex shrink-0 flex-col items-stretch gap-3 rounded-b-[24px] border-t border-[#e5e5e5] bg-[#faf5e8] px-5 py-3.5 sm:flex-row sm:items-center">
              {/* Summary */}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                  Selection Summary
                </p>
                <p className="mt-0.5 truncate text-xs font-bold text-[#0a0a0a]">
                  {draftDate
                    ? formatDisplayDate(draftDate, draftTime)
                    : "Not selected"}
                </p>
              </div>
              {/* Buttons */}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="h-10 cursor-pointer rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="h-10 cursor-pointer rounded-[10px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f]"
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
