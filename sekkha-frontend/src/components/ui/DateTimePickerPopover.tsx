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
}

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

export function DateTimePickerPopover({
  id,
  value,
  onChange,
  error,
}: DateTimePickerPopoverProps) {
  const [open, setOpen] = useState(false)

  const { datePart, timePart, dateObj } = parseValue(value)
  const [calendarMonth, setCalendarMonth] = useState<Date>(dateObj)

  const [draftDate, setDraftDate] = useState<string>(datePart)
  const [draftTime, setDraftTime] = useState<string>(timePart)

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
  }

  function handleQuickSunday() {
    const sun = getNextSunday()
    setDraftDate(sun)
    const [y, m, d] = sun.split("-").map(Number)
    if (y && m && d) {
      setCalendarMonth(new Date(y, m - 1, d))
    }
  }

  function handleApply() {
    const finalDate = draftDate || getTodayString()
    const finalTime = draftTime || "08:00"
    onChange(`${finalDate}T${finalTime}`)
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
            className={`group flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-[12px] border bg-[#fffaf0] px-3.5 py-2 text-xs text-[#0a0a0a] transition-all duration-150 outline-none sm:text-sm ${
              error
                ? "border-rose-400 bg-rose-50/40 text-rose-900 shadow-2xs"
                : open
                  ? "border-[#0a0a0a] shadow-xs ring-1 ring-[#0a0a0a]"
                  : "border-[#e5e5e5] shadow-2xs hover:border-[#c5c5c5] hover:bg-[#faf5e8]"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <CalendarIcon className="size-4 shrink-0 text-[#0a0a0a]" />
              <span className="truncate font-bold text-[#0a0a0a]">
                {value ? (
                  formatDisplayDate(datePart, timePart)
                ) : (
                  <span className="font-normal text-[#7a7a7a]">
                    Select Date & Time...
                  </span>
                )}
              </span>
            </div>
            <span className="ml-1 shrink-0 rounded-[8px] border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-1 text-xs font-semibold text-[#0a0a0a] transition-colors group-hover:bg-[#f0ebe0]">
              {value ? "Change" : "Select"}
            </span>
          </button>
        </PopoverTrigger>

        {/* ── Minimalist Floating Popover (NO dark backdrop!) ────────────── */}
        <PopoverContent
          align="start"
          sideOffset={6}
          className="w-[310px] rounded-[18px] border border-[#e5e5e5] bg-[#faf5e8] p-3 text-[#0a0a0a] shadow-xl outline-none sm:w-[320px]"
        >
          {/* Header */}
          <div className="mb-2 flex items-center justify-between border-b border-[#e5e5e5] pb-2">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="size-3.5 text-[#0a0a0a]" />
              <span className="text-xs font-bold text-[#0a0a0a]">
                Set Date & Time
              </span>
            </div>
            {/* Quick Sunday Shortcut */}
            <button
              type="button"
              onClick={handleQuickSunday}
              className="flex cursor-pointer items-center gap-1 rounded-md border border-[#e5e5e5] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#0a0a0a] hover:bg-[#f5f0e0]"
            >
              <SparklesIcon className="size-2.5 text-[#e8b94a]" />
              <span>Next Sun</span>
            </button>
          </div>

          {/* Date Section */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#6a6a6a]">
              <span>Date</span>
              <span className="font-mono text-[10px] font-bold text-[#0a0a0a]">
                {draftDate}
              </span>
            </div>
            <div className="rounded-[12px] border border-[#e5e5e5] bg-white p-1 shadow-2xs">
              <EventCalendar
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={draftDate}
                onSelect={handleSelectDate}
                compact={true}
              />
            </div>
          </div>

          {/* Time Section */}
          <div className="mt-2.5 space-y-1.5 border-t border-[#e5e5e5] pt-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#6a6a6a]">
              <div className="flex items-center gap-1">
                <ClockIcon className="size-3 text-[#0a0a0a]" />
                <span>Time</span>
              </div>
              <span className="font-mono text-xs font-bold text-[#0a0a0a]">
                {draftTime} WIB
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-[10px] border border-[#e5e5e5] bg-white px-2.5 py-2">
              <span className="text-[11px] font-semibold text-[#6a6a6a]">
                Select time
              </span>
              <input
                type="time"
                value={draftTime}
                onChange={(e) => setDraftTime(e.target.value)}
                aria-label="Event time"
                className="h-10 cursor-pointer rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 font-mono text-sm font-bold text-[#0a0a0a] outline-none hover:border-[#c5c5c5] focus:border-[#0a0a0a]"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="mt-3 flex items-center justify-between border-t border-[#e5e5e5] pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="cursor-pointer text-xs font-medium text-[#6a6a6a] hover:text-[#0a0a0a]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="flex cursor-pointer items-center gap-1 rounded-lg bg-[#0a0a0a] px-3.5 py-1 text-xs font-bold text-white shadow-2xs hover:bg-[#202020] active:scale-95"
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
