import { useMemo, useState } from "react"
import {
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  SparklesIcon,
} from "lucide-react"
import { Badge, Button, Card, Chip, Select } from "@/components/base"
import type { SelectOption } from "@/components/base"
import { EventCalendar } from "@/components/ui/EventCalendar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

export interface DateTimePickerProps {
  id?: string
  value: string // Local ISO string "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void
  error?: string
  disablePastDates?: boolean
  defaultOpen?: boolean
}

const QUICK_TIMES = ["08:00", "09:00", "13:00", "17:00", "19:00"] as const

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

function formatDisplayDateTime(datePart: string, timePart: string): string {
  if (!datePart) return "Select Date & Time..."
  return `${formatReadableDate(datePart)} · ${timePart} WIB`
}

/**
 * Inline collapsible Date & Time picker built with Sekkha base components
 * (Card, Chip, Select, Button, Badge) so it never clips or traps focus
 * inside modals or mobile drawers.
 */
export function DateTimePicker({
  id,
  value,
  onChange,
  error,
  disablePastDates = false,
  defaultOpen = false,
}: DateTimePickerProps) {
  const [open, setOpen] = useState(defaultOpen)
  const { datePart, timePart, dateObj } = parseValue(value)
  const [calendarMonth, setCalendarMonth] = useState<Date>(dateObj)

  const [activeHour = "08", activeMinute = "00"] = timePart.split(":")

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

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setCalendarMonth(parseDateObj(datePart))
    }
    setOpen(nextOpen)
  }

  function handleSelectDate(selectedDate: string | null) {
    if (!selectedDate) return
    commitSchedule(selectedDate, timePart)
  }

  function handleQuickDate(targetDate: string) {
    setCalendarMonth(parseDateObj(targetDate))
    commitSchedule(targetDate, timePart)
  }

  function handleQuickTime(presetTime: string) {
    commitSchedule(datePart, presetTime)
  }

  function handleHourChange(nextHour: string) {
    commitSchedule(datePart, `${nextHour}:${activeMinute}`)
  }

  function handleMinuteChange(nextMinute: string) {
    commitSchedule(datePart, `${activeHour}:${nextMinute}`)
  }

  return (
    <Collapsible
      open={open}
      onOpenChange={handleOpenChange}
      className="w-full text-left font-sans"
    >
      {/* ── Trigger Bar ───────────────────────────────────────────────────── */}
      <CollapsibleTrigger asChild>
        <button
          id={id}
          type="button"
          aria-expanded={open}
          aria-invalid={Boolean(error)}
          aria-describedby={error && id ? `${id}-error` : undefined}
          className={cn(
            "group flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-[12px] border bg-canvas px-3.5 py-2 text-xs text-ink shadow-2xs transition-all duration-150 outline-none sm:text-sm",
            error
              ? "border-rose-400 bg-rose-50/40 text-rose-900 focus-visible:ring-2 focus-visible:ring-rose-400/30"
              : open
                ? "border-ink ring-2 ring-ink/15"
                : "border-hairline hover:border-[#bfbfbf] hover:bg-surface-soft focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/15"
          )}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <CalendarIcon className="size-4 shrink-0 text-clay-teal" />
            <span className="truncate font-bold text-ink">
              {value ? (
                formatDisplayDateTime(datePart, timePart)
              ) : (
                <span className="font-normal text-text-muted">
                  Select Date &amp; Time...
                </span>
              )}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Badge
              variant={open ? "primary" : "secondary"}
              size="sm"
              className="font-semibold"
            >
              {open ? "Editing" : value ? "Change" : "Select"}
            </Badge>
            <ChevronDownIcon
              className={cn(
                "size-4 text-text-muted transition-transform duration-200",
                open && "rotate-180 text-ink"
              )}
              aria-hidden="true"
            />
          </div>
        </button>
      </CollapsibleTrigger>

      {/* ── Inline Collapsible Schedule Panel ─────────────────────────────── */}
      <CollapsibleContent className="mt-2.5">
        <Card
          variant="soft"
          className="space-y-3.5 border-hairline p-3.5 shadow-xs sm:p-4"
        >
          {/* Panel Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-2.5">
            <div className="flex items-center gap-2">
              <CalendarIcon className="size-4 text-clay-teal" />
              <span className="text-xs font-bold text-ink sm:text-sm">
                Set Date &amp; Time
              </span>
            </div>
            <Badge
              variant="default"
              size="sm"
              className="font-mono font-semibold tabular-nums"
            >
              {formatReadableDate(datePart)} · {timePart} WIB
            </Badge>
          </div>

          {/* 2-Column Responsive Grid: Calendar (Left) + Time Controls (Right) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.15fr_1fr] md:items-start">
            {/* ── Date Pane ── */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-ink">Date</span>
                <span className="font-mono text-[11px] font-semibold text-text-muted">
                  {datePart}
                </span>
              </div>

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

              <Card variant="canvas" className="p-1.5 shadow-2xs">
                <EventCalendar
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  selected={datePart}
                  onSelect={handleSelectDate}
                  compact={true}
                  allowDeselect={false}
                  disablePastDates={disablePastDates}
                />
              </Card>
            </div>

            {/* ── Time Pane ── */}
            <div className="flex h-full flex-col justify-between gap-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ClockIcon className="size-3.5 text-clay-teal" />
                    <span className="text-xs font-bold text-ink">
                      Service Time
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    size="sm"
                    className="bg-canvas font-mono font-bold tabular-nums"
                  >
                    {timePart} WIB
                  </Badge>
                </div>

                {/* Quick Presets using Sekkha Filter Chips */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-text-muted">
                    Quick presets
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_TIMES.map((preset) => (
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

                {/* Uniform Sekkha Hour / Minute Selects */}
                <Card variant="canvas" className="space-y-2.5 p-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">
                      Custom time
                    </span>
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
                </Card>
              </div>

              {/* Collapse / Confirm Bar */}
              <div className="flex justify-end border-t border-hairline pt-2.5">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="w-full gap-1.5 rounded-[12px] md:w-auto"
                >
                  <CheckIcon className="size-3.5" aria-hidden="true" />
                  <span>Done</span>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </CollapsibleContent>
    </Collapsible>
  )
}
