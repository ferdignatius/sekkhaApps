// components/ui/DateTimePickerPopover
// Pop-up Sub-Modal Dialog for Date & Time Selection.
// Single-scroll layout with category-aware preset filtering & clean Clay Design responsive UX.

import { useState } from "react"
import {
  CalendarIcon,
  ClockIcon,
  XIcon,
  CheckIcon,
  CalendarDaysIcon,
} from "lucide-react"
import { EventCalendar } from "./EventCalendar"
import {
  getTimePresetsForCategory,
  getNextDateForDayOfWeek,
  type EventTimePresetItem,
} from "@/modules/events/internal/masterdata"

interface DateTimePickerPopoverProps {
  id?: string
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
  id,
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

  const configuredTimes = new Set(presets.map((preset) => preset.time))
  const suggestedTimes: Array<{
    key: string
    label: string
    time: string
    preset?: EventTimePresetItem
  }> = [
    ...presets.slice(0, 6).map((preset) => ({
      key: preset.id || preset.time,
      label: preset.label,
      time: preset.time,
      preset,
    })),
    ...QUICK_HOURS_LIST.filter((time) => !configuredTimes.has(time)).map(
      (time) => ({ key: time, label: time, time })
    ),
  ].slice(0, 9)

  return (
    <div className="relative text-left font-sans">
      {/* ── Trigger Bar Button ────────────────────────────────────────────── */}
      <button
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={Boolean(error)}
        aria-describedby={error && id ? `${id}-error` : undefined}
        onClick={handleOpenModal}
        className={`flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-[12px] border bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] transition-all duration-200 outline-none sm:text-sm ${
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
          <div className="flex max-h-[93vh] w-full animate-in flex-col rounded-t-[24px] border-t border-[#e5e5e5] bg-[#faf5e8] font-sans shadow-2xl duration-200 slide-in-from-bottom-full sm:max-h-[88vh] sm:max-w-2xl sm:rounded-[24px] sm:border sm:zoom-in-95">
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
                    Choose the date and time for this event
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-2 flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[#6a6a6a] transition-colors hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* ── Scrollable Body ── */}
            <div className="flex-1 scrollbar-none space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
              {/* ── Section 1: Preset Waktu (category-filtered) ── */}
              <div className="grid gap-5 sm:grid-cols-[1.05fr_0.95fr] sm:items-start">
                <section
                  aria-labelledby="picker-date-heading"
                  className="space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4
                        id="picker-date-heading"
                        className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#0a0a0a] uppercase"
                      >
                        <CalendarIcon
                          className="size-3.5 text-[#1a3a3a]"
                          aria-hidden="true"
                        />
                        Date
                      </h4>
                      <p className="mt-0.5 text-xs text-[#6a6a6a]">
                        Choose the day for this event.
                      </p>
                    </div>
                    {draftDate && (
                      <span className="shrink-0 rounded-full bg-[#f5f0e0] px-2.5 py-1 text-xs font-semibold text-[#0a0a0a]">
                        {(() => {
                          const [y, m, d] = draftDate.split("-").map(Number)
                          return new Date(
                            y!,
                            (m ?? 1) - 1,
                            d
                          ).toLocaleDateString("en-US", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })
                        })()}
                      </span>
                    )}
                  </div>
                  <div className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-2 sm:p-3">
                    <EventCalendar
                      month={calendarMonth}
                      onMonthChange={setCalendarMonth}
                      selected={draftDate}
                      onSelect={(d) => d && setDraftDate(d)}
                      compact={true}
                    />
                  </div>
                </section>

                <section
                  aria-labelledby="picker-time-heading"
                  className="space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4
                        id="picker-time-heading"
                        className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-[#0a0a0a] uppercase"
                      >
                        <ClockIcon
                          className="size-3.5 text-[#1a3a3a]"
                          aria-hidden="true"
                        />
                        Time
                      </h4>
                      <p className="mt-0.5 text-xs text-[#6a6a6a]">
                        Select a suggested time or set your own.
                      </p>
                    </div>
                    <span className="font-mono text-sm font-bold text-[#0a0a0a]">
                      {draftTime}
                    </span>
                  </div>

                  <div className="flex scrollbar-none gap-2 overflow-x-auto pb-1">
                    {suggestedTimes.map((item) => {
                      const isSelected = draftTime === item.time
                      return (
                        <button
                          key={item.key}
                          type="button"
                          aria-pressed={isSelected}
                          title={item.preset?.description || item.label}
                          onClick={() =>
                            item.preset
                              ? handleSelectPreset(item.preset)
                              : setDraftTime(item.time)
                          }
                          className={`flex min-h-[44px] shrink-0 items-center gap-2 rounded-[12px] border px-3 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:outline-none ${
                            isSelected
                              ? "border-[#0a0a0a] bg-[#0a0a0a] text-white"
                              : "border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#f5f0e0]"
                          }`}
                        >
                          <span className="max-w-[8rem] truncate">
                            {item.label}
                          </span>
                          {item.label !== item.time && (
                            <span
                              className={`font-mono ${isSelected ? "text-[#e8b94a]" : "text-[#6a6a6a]"}`}
                            >
                              {item.time}
                            </span>
                          )}
                          {isSelected && (
                            <CheckIcon
                              className="size-3.5 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                        </button>
                      )
                    })}
                  </div>

                  <label
                    htmlFor="picker-custom-time"
                    className="flex items-center justify-between gap-3 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] px-3 py-2"
                  >
                    <span className="text-xs font-semibold text-[#6a6a6a]">
                      Custom time
                    </span>
                    <input
                      id="picker-custom-time"
                      type="time"
                      value={draftTime}
                      onChange={(e) => setDraftTime(e.target.value)}
                      className="h-11 rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 font-mono text-sm font-bold text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                    />
                  </label>
                </section>
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
                  className="h-11 cursor-pointer rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="h-11 cursor-pointer rounded-[10px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f]"
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
