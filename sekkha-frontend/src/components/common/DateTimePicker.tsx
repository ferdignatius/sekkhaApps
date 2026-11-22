import { useEffect, useMemo, useRef, useState } from "react"
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  SparklesIcon,
} from "lucide-react"
import { Button, Chip, Select } from "@/components/base"
import type { SelectOption } from "@/components/base"
import { useResponsiveModalScroll } from "@/components/common/ResponsiveFormModal"
import { EventCalendar } from "@/components/ui/EventCalendar"
import { cn } from "@/lib/utils"

export interface DateTimePickerProps {
  id?: string
  value: string // Local ISO string "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void
  error?: string
  disablePastDates?: boolean
  defaultOpen?: boolean
  recentTimes?: string[]
}

const DEFAULT_QUICK_TIMES = ["10:30", "13:00", "19:00"] as const

function normalizeQuickTimes(recentTimes?: string[]): {
  items: string[]
  isFromRecent: boolean
} {
  if (Array.isArray(recentTimes) && recentTimes.length > 0) {
    const seen = new Set<string>()
    const valid: string[] = []
    for (const raw of recentTimes) {
      const trimmed = raw?.trim()
      if (!trimmed || !/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) continue
      if (seen.has(trimmed)) continue
      seen.add(trimmed)
      valid.push(trimmed)
      if (valid.length >= 3) break
    }
    if (valid.length > 0) {
      return { items: valid, isFromRecent: true }
    }
  }
  return { items: [...DEFAULT_QUICK_TIMES], isFromRecent: false }
}

const HOUR_OPTIONS: SelectOption[] = Array.from({ length: 24 }, (_, i) => {
  const hh = String(i).padStart(2, "0")
  return { value: hh, label: hh }
})

const MINUTE_STEP_VALUES = Array.from({ length: 12 }, (_, i) =>
  String(i * 5).padStart(2, "0")
)

const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const
const MONTHS_SHORT = [
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
] as const

function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function getTodayString(): string {
  return formatLocalDate(new Date())
}

function getTomorrowString(): string {
  const target = new Date()
  target.setDate(target.getDate() + 1)
  return formatLocalDate(target)
}

function getNextSundayString(): string {
  const now = new Date()
  const day = now.getDay()
  const daysUntilSunday = day === 0 ? 0 : 7 - day
  const target = new Date(now)
  target.setDate(now.getDate() + daysUntilSunday)
  return formatLocalDate(target)
}

function parseDateObj(datePart: string): Date {
  const [y, m, d] = datePart.split("-").map(Number)
  if (!y || !m || !d) return new Date()
  const parsed = new Date(y, m - 1, d)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function parseValue(isoStr: string) {
  if (!isoStr) {
    const today = getTodayString()
    return {
      datePart: today,
      timePart: "08:00",
      dateObj: parseDateObj(today),
    }
  }
  const [rawDate, rawTime] = isoStr.split("T")
  const datePart = rawDate || getTodayString()
  const cleanTime = rawTime ? rawTime.slice(0, 5) : "08:00"
  const [rawH = "08", rawM = "00"] = cleanTime.split(":")
  const hh = /^\d{2}$/.test(rawH) ? rawH : "08"
  const mm = /^\d{2}$/.test(rawM) ? rawM : "00"
  return {
    datePart,
    timePart: `${hh}:${mm}`,
    dateObj: parseDateObj(datePart),
  }
}

function formatReadableDate(datePart: string): string {
  const [y, m, d] = datePart.split("-").map(Number)
  if (!y || !m || !d) return datePart
  const date = new Date(y, m - 1, d)
  const dayName = DAYS_SHORT[date.getDay()] ?? ""
  const monthName = MONTHS_SHORT[m - 1] ?? ""
  return `${dayName}, ${d} ${monthName} ${y}`
}

/**
 * Two-pill iOS Calendar-style inline Date & Time picker.
 * Tapping Date opens the calendar directly; tapping Time opens time presets & Hour/Minute selects.
 */
export function DateTimePicker({
  id,
  value,
  onChange,
  error,
  disablePastDates = false,
  defaultOpen = false,
  recentTimes,
}: DateTimePickerProps) {
  const [activePanel, setActivePanel] = useState<"date" | "time" | null>(
    defaultOpen ? "date" : null
  )
  const { datePart, timePart, dateObj } = parseValue(value)
  const [calendarMonth, setCalendarMonth] = useState<Date>(dateObj)
  const containerRef = useRef<HTMLDivElement>(null)
  const shouldRevealPanelRef = useRef(false)
  const { revealElement } = useResponsiveModalScroll()

  useEffect(() => {
    if (!activePanel || !shouldRevealPanelRef.current) return
    shouldRevealPanelRef.current = false
    revealElement(containerRef.current)
  }, [activePanel, revealElement])

  const [activeHour = "08", activeMinute = "00"] = timePart.split(":")

  const quickTimeMeta = useMemo(
    () => normalizeQuickTimes(recentTimes),
    [recentTimes]
  )

  const todayStr = getTodayString()
  const tomorrowStr = getTomorrowString()
  const nextSundayStr = getNextSundayString()

  const minuteOptions = useMemo<SelectOption[]>(() => {
    const values = MINUTE_STEP_VALUES.includes(activeMinute)
      ? MINUTE_STEP_VALUES
      : [...MINUTE_STEP_VALUES, activeMinute].sort(
        (a, b) => Number(a) - Number(b)
      )
    return values.map((mm) => ({ value: mm, label: mm }))
  }, [activeMinute])

  function commitSchedule(nextDate: string, nextTime: string) {
    onChange(`${nextDate || getTodayString()}T${nextTime || "08:00"}`)
  }

  function togglePanel(panel: "date" | "time") {
    if (activePanel === panel) {
      shouldRevealPanelRef.current = false
      setActivePanel(null)
      return
    }
    if (panel === "date") {
      setCalendarMonth(parseDateObj(datePart))
    }
    shouldRevealPanelRef.current = true
    setActivePanel(panel)
  }

  function handleSelectDate(selectedDate: string | null) {
    if (!selectedDate) return
    commitSchedule(selectedDate, timePart)
    setActivePanel(null)
  }

  function handleQuickDate(targetDate: string) {
    setCalendarMonth(parseDateObj(targetDate))
    commitSchedule(targetDate, timePart)
    setActivePanel(null)
  }

  function handleQuickTime(presetTime: string) {
    commitSchedule(datePart, presetTime)
    setActivePanel(null)
  }

  function handleHourChange(nextHour: string) {
    commitSchedule(datePart, `${nextHour}:${activeMinute}`)
  }

  function handleMinuteChange(nextMinute: string) {
    commitSchedule(datePart, `${activeHour}:${nextMinute}`)
  }

  return (
    <div ref={containerRef} className="w-full space-y-2 text-left font-sans">
      {/* ── Two Clear Triggers: Date Pill + Time Pill ── */}
      <div className="grid grid-cols-[1.35fr_1fr] gap-2">
        <button
          id={id}
          type="button"
          onClick={() => togglePanel("date")}
          aria-expanded={activePanel === "date"}
          aria-invalid={Boolean(error)}
          aria-describedby={error && id ? `${id}-error` : undefined}
          className={cn(
            "flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-[12px] border bg-canvas px-3 py-2 text-xs text-ink shadow-2xs transition-all outline-none sm:px-3.5 sm:text-sm",
            error
              ? "border-rose-400 bg-rose-50/40 text-rose-900"
              : activePanel === "date"
                ? "border-ink bg-surface-card ring-2 ring-ink/10"
                : "border-hairline hover:border-[#bfbfbf] hover:bg-surface-soft"
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-clay-teal" aria-hidden="true" />
          <span className="truncate font-bold">
            {value ? formatReadableDate(datePart) : "Select date"}
          </span>
        </button>

        <button
          id={id ? `${id}-time` : undefined}
          type="button"
          onClick={() => togglePanel("time")}
          aria-expanded={activePanel === "time"}
          aria-invalid={Boolean(error)}
          className={cn(
            "flex min-h-11 min-w-0 cursor-pointer items-center gap-2 rounded-[12px] border bg-canvas px-3 py-2 text-xs text-ink shadow-2xs transition-all outline-none sm:px-3.5 sm:text-sm",
            error
              ? "border-rose-400 bg-rose-50/40 text-rose-900"
              : activePanel === "time"
                ? "border-ink bg-surface-card ring-2 ring-ink/10"
                : "border-hairline hover:border-[#bfbfbf] hover:bg-surface-soft"
          )}
        >
          <ClockIcon className="size-4 shrink-0 text-clay-teal" aria-hidden="true" />
          <span className="truncate font-mono font-bold tabular-nums">
            {timePart} WIB
          </span>
        </button>
      </div>

      {/* ── Single Flat Inline Picker Panel ── */}
      {activePanel === "date" && (
        <div className="space-y-2.5 rounded-[16px] border border-hairline bg-canvas p-3 shadow-xs">
          <div className="flex flex-wrap gap-1.5">
            <Chip
              variant="assist"
              selected={value !== "" && datePart === todayStr}
              onClick={() => handleQuickDate(todayStr)}
            >
              Today
            </Chip>
            <Chip
              variant="assist"
              selected={value !== "" && datePart === tomorrowStr}
              onClick={() => handleQuickDate(tomorrowStr)}
            >
              Tomorrow
            </Chip>
            <Chip
              variant="assist"
              selected={value !== "" && datePart === nextSundayStr}
              leadingIcon={<SparklesIcon className="text-clay-ochre" />}
              onClick={() => handleQuickDate(nextSundayStr)}
            >
              Next Sun
            </Chip>
          </div>

          <EventCalendar
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            selected={datePart}
            onSelect={handleSelectDate}
            compact={true}
            hideTodayButton={true}
            allowDeselect={false}
            disablePastDates={disablePastDates}
          />
        </div>
      )}

      {activePanel === "time" && (
        <div className="space-y-3 rounded-[16px] border border-hairline bg-canvas p-3 shadow-xs sm:p-4">
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-text-muted">
              {quickTimeMeta.isFromRecent ? "Recent times" : "Quick presets"}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {quickTimeMeta.items.map((preset) => (
                <Chip
                  key={preset}
                  variant="filter"
                  selected={timePart === preset}
                  onClick={() => handleQuickTime(preset)}
                  className="font-mono tabular-nums"
                >
                  {preset}
                </Chip>
              ))}
            </div>
          </div>

          <div className="space-y-2 border-t border-hairline pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink">Custom time</span>
              <span className="text-[11px] font-medium text-text-muted">
                24-hour · WIB
              </span>
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
              <Select
                id={id ? `${id}-hour` : undefined}
                label="Hour"
                value={activeHour}
                onValueChange={handleHourChange}
                options={HOUR_OPTIONS}
                className="font-mono font-bold tabular-nums"
              />
              <span
                aria-hidden="true"
                className="pb-2.5 font-mono text-base font-bold text-text-muted"
              >
                :
              </span>
              <Select
                id={id ? `${id}-minute` : undefined}
                label="Minute"
                value={activeMinute}
                onValueChange={handleMinuteChange}
                options={minuteOptions}
                className="font-mono font-bold tabular-nums"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="outlined"
              size="sm"
              onClick={() => setActivePanel(null)}
              className="gap-1.5 rounded-[10px]"
            >
              <CheckIcon className="size-3.5" aria-hidden="true" />
              <span>Done</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
