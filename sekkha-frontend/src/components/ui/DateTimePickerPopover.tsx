// components/ui/DateTimePickerPopover
// Minimalist Floating Popover Date & Time Picker ala Notion / Linear.
// - Anchored floating dropdown beneath the input (NO dark backdrop, no nested modal feeling)
// - Clean, compact single-column popover (~300px wide)
// - Instant date selection with month navigation & Sunday shortcut
// - Manual date and time selection
// - Clay Design System tokens (warm cream canvas, hairline borders, near-black ink)

import { useState } from "react"
import {
  CalendarIcon,
  ClockIcon,
  ChevronRightIcon,
  SparklesIcon,
} from "lucide-react"
import { EventCalendar } from "./EventCalendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DateTimePickerPopoverProps {
  id?: string
  value: string // ISO string "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void
  error?: string
  disablePastDates?: boolean
}

const QUICK_TIMES = ["08:00", "09:00", "13:00", "17:00", "19:00"] as const

function parseValue(isoStr: string) {
  if (!isoStr) {
    const now = new Date()
    const datePart = now.toISOString().split("T")[0]!
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

function getNextSunday(): string {
  const now = new Date()
  const day = now.getDay()
  const daysUntilSunday = day === 0 ? 0 : 7 - day
  const target = new Date(now)
  target.setDate(now.getDate() + daysUntilSunday)
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, "0")
  const d = String(target.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getTodayString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const d = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getTomorrowString(): string {
  const target = new Date()
  target.setDate(target.getDate() + 1)
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, "0")
  const d = String(target.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

export function DateTimePickerPopover({
  id,
  value,
  onChange,
  error,
  disablePastDates = false,
}: DateTimePickerPopoverProps) {
  const [open, setOpen] = useState(false)

  const { datePart, timePart, dateObj } = parseValue(value)
  const [calendarMonth, setCalendarMonth] = useState<Date>(dateObj)

  const [draftDate, setDraftDate] = useState<string>(datePart)
  const [draftTime, setDraftTime] = useState<string>(timePart)

  function commitSchedule(nextDate: string, nextTime: string) {
    const finalDate = nextDate || getTodayString()
    const finalTime = nextTime || "08:00"
    onChange(`${finalDate}T${finalTime}`)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      const initialDate = datePart || getTodayString()
      const initialTime = timePart || "08:00"
      setDraftDate(initialDate)
      setDraftTime(initialTime)
      const [y, m, d] = initialDate.split("-").map(Number)
      if (y && m && d) {
        setCalendarMonth(new Date(y, m - 1, d))
      }
    }
    setOpen(nextOpen)
  }

  function handleSelectDate(d: string | null) {
    if (!d) return
    setDraftDate(d)
    commitSchedule(d, draftTime)
  }

  function applyQuickDate(dateStr: string) {
    setDraftDate(dateStr)
    const [y, m, d] = dateStr.split("-").map(Number)
    if (y && m && d) {
      setCalendarMonth(new Date(y, m - 1, d))
    }
    commitSchedule(dateStr, draftTime)
  }

  function handleQuickTime(presetTime: string) {
    setDraftTime(presetTime)
    commitSchedule(draftDate, presetTime)
  }

  function handleApply() {
    commitSchedule(draftDate, draftTime)
    setOpen(false)
  }

  return (
    <div className="relative text-left font-sans">
      <Popover open={open} onOpenChange={handleOpenChange}>
        {/* ── Trigger Bar Button ──────────────────────────────────────────── */}
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-invalid={Boolean(error)}
            aria-describedby={error && id ? `${id}-error` : undefined}
            className={`group flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-xl border bg-canvas px-3.5 py-2 text-xs text-ink transition-all duration-150 outline-none sm:text-sm ${
              error
                ? "border-rose-400 bg-rose-50/40 text-rose-900 shadow-2xs"
                : open
                  ? "border-ink shadow-xs ring-1 ring-ink"
                  : "border-hairline shadow-2xs hover:border-ink/30 hover:bg-surface-soft"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <CalendarIcon className="size-4 shrink-0 text-ink" />
              <span className="truncate font-bold text-ink">
                {value ? (
                  formatDisplayDate(datePart, timePart)
                ) : (
                  <span className="font-normal text-text-muted">
                    Select Date &amp; Time...
                  </span>
                )}
              </span>
            </div>
            <span className="ml-1 shrink-0 rounded-lg border border-hairline bg-surface-soft px-2.5 py-1 text-xs font-semibold text-ink transition-colors group-hover:bg-surface-card">
              {value ? "Change" : "Select"}
            </span>
          </button>
        </PopoverTrigger>

        {/* ── Minimalist Floating Popover (NO dark backdrop!) ────────────── */}
        <PopoverContent
          align="start"
          sideOffset={6}
          className="z-[120] w-[320px] rounded-2xl border border-hairline bg-surface-soft p-3 text-ink shadow-xl outline-none sm:w-[340px]"
        >
          {/* Header + Quick Date Shortcuts */}
          <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 text-ink" />
              <span className="text-xs font-bold text-ink">
                Set Date &amp; Time
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyQuickDate(getTodayString())}
                className="cursor-pointer rounded-md border border-hairline bg-canvas px-2 py-0.5 text-[10px] font-semibold text-ink hover:bg-surface-card"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => applyQuickDate(getTomorrowString())}
                className="cursor-pointer rounded-md border border-hairline bg-canvas px-2 py-0.5 text-[10px] font-semibold text-ink hover:bg-surface-card"
              >
                Tomorrow
              </button>
              <button
                type="button"
                onClick={() => applyQuickDate(getNextSunday())}
                className="flex cursor-pointer items-center gap-1 rounded-md border border-hairline bg-canvas px-2 py-0.5 text-[10px] font-semibold text-ink hover:bg-surface-card"
              >
                <SparklesIcon className="size-2.5 text-clay-ochre" />
                <span>Next Sun</span>
              </button>
            </div>
          </div>

          {/* Date Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-text-muted">
              <span>Date</span>
              <span className="font-mono text-[10px] font-bold text-ink">
                {draftDate}
              </span>
            </div>
            <div className="rounded-xl border border-hairline bg-white p-1 shadow-2xs">
              <EventCalendar
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={draftDate}
                onSelect={handleSelectDate}
                compact={true}
                disablePastDates={disablePastDates}
              />
            </div>
          </div>

          {/* Time Section + Quick Service Time Presets */}
          <div className="mt-2.5 space-y-2 border-t border-hairline pt-2.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-text-muted">
              <div className="flex items-center gap-1">
                <ClockIcon className="size-3 text-ink" />
                <span>Time</span>
              </div>
              <span className="font-mono text-xs font-bold text-ink">
                {draftTime} WIB
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {QUICK_TIMES.map((preset) => {
                const isPresetActive = draftTime === preset
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleQuickTime(preset)}
                    className={`cursor-pointer rounded-lg border px-2.5 py-1 font-mono text-[11px] font-bold transition-colors ${
                      isPresetActive
                        ? "border-ink bg-ink text-white"
                        : "border-hairline bg-white text-ink hover:bg-surface-card"
                    }`}
                  >
                    {preset}
                  </button>
                )
              })}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-hairline bg-white px-3 py-2">
              <span className="text-[11px] font-semibold text-text-muted">
                Custom time
              </span>
              <input
                type="time"
                value={draftTime}
                onChange={(e) => {
                  const val = e.target.value
                  setDraftTime(val)
                  if (val) commitSchedule(draftDate, val)
                }}
                aria-label="Event time"
                className="h-9 cursor-pointer rounded-lg border border-hairline bg-canvas px-2.5 font-mono text-sm font-bold text-ink outline-none hover:border-ink/30 focus:border-ink"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-3 flex items-center justify-between border-t border-hairline pt-2.5">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer text-xs font-medium text-text-muted hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex cursor-pointer items-center gap-1 rounded-lg bg-ink px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-ink/90 active:scale-95"
            >
              <span>Apply</span>
              <ChevronRightIcon className="size-3" />
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
