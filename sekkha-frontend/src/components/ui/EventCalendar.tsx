// components/ui/EventCalendar
// Custom month-grid calendar adhering strictly to Clay Design System tokens.
// English localized, consistent border radii, warm canvas palette, and interactive dot indicators.

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

export interface EventDotItem {
  colorHex?: string
  className?: string
}

export interface EventCalendarProps {
  /** Map of ISO date string ("YYYY-MM-DD") → array of dot bg-color classes or hex items (max 3 shown) */
  dots?: Record<string, (string | EventDotItem)[]>
  /** Selected day as "YYYY-MM-DD", or null for no selection */
  selected?: string | null
  onSelect?: (date: string | null) => void
  /** The month to display (only year/month matter) */
  month: Date
  onMonthChange?: (month: Date) => void
  /** Render compact layout for form pickers */
  compact?: boolean
}

const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

const MONTHS_EN = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

function toKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function buildGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay()
  const grid: Date[][] = []
  let current = new Date(year, month, 1 - startOffset)
  for (let row = 0; row < 6; row++) {
    const week: Date[] = []
    for (let col = 0; col < 7; col++) {
      week.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    grid.push(week)
  }
  return grid
}

function monthLabel(date: Date): string {
  return `${MONTHS_EN[date.getMonth()]} ${date.getFullYear()}`
}

export function EventCalendar({
  dots = {},
  selected,
  onSelect,
  month,
  onMonthChange,
  compact = false,
}: EventCalendarProps) {
  const today = new Date()
  const year = month.getFullYear()
  const mo = month.getMonth()
  const grid = buildGrid(year, mo)

  function prevMonth() {
    onMonthChange?.(new Date(year, mo - 1, 1))
  }
  function nextMonth() {
    onMonthChange?.(new Date(year, mo + 1, 1))
  }
  function resetToToday() {
    onMonthChange?.(new Date())
    onSelect?.(toKey(today))
  }

  function handleDayClick(date: Date) {
    const key = toKey(date)
    if (selected === key) {
      onSelect?.(null)
    } else {
      onSelect?.(key)
    }
  }

  return (
    <div className={`w-full select-none font-sans text-left ${
      compact
        ? "p-1.5 space-y-2 bg-transparent"
        : "rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs space-y-3"
    }`}>
      
      {/* ── Month Navigation Header ── */}
      <div className="flex items-center justify-between pb-2 border-b border-[#e5e5e5] px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#0a0a0a] tracking-tight">
            {monthLabel(month)}
          </span>
          <button
            type="button"
            onClick={resetToToday}
            className="rounded-[8px] bg-[#faf5e8] border border-[#e5e5e5] px-2 py-0.5 text-xs font-semibold text-[#0a0a0a] hover:bg-[#f5f0e0] transition-colors cursor-pointer"
            title="Reset to current month"
          >
            Today
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous month"
            className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8] transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <ChevronLeftIcon className="size-4" />
          </button>

          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next month"
            className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8] transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* ── Day-of-week headers ── */}
      <div className="grid grid-cols-7 text-center">
        {DAYS_EN.map((d) => (
          <div
            key={d}
            className="text-[11px] font-bold uppercase tracking-tight py-1 text-[#6a6a6a]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div className="grid grid-cols-7 gap-1">
        {grid.flat().map((date, i) => {
          const key = toKey(date)
          const isCurrentMonth = date.getMonth() === mo
          const isToday = isSameDay(date, today)
          const isSelected = selected === key
          const dayDots = (dots[key] ?? []).slice(0, 3)

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleDayClick(date)}
              aria-label={date.toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
              aria-pressed={isSelected}
              className={[
                "relative mx-auto flex flex-col items-center justify-center transition-all cursor-pointer",
                compact
                  ? "h-7 w-7 rounded-[8px] text-xs font-semibold"
                  : "h-9 w-9 sm:h-9.5 sm:w-9.5 rounded-[10px] text-xs font-semibold",
                isSelected
                  ? "bg-[#0a0a0a] text-white font-bold shadow-xs scale-105"
                  : isToday
                    ? "border-2 border-[#0a0a0a] bg-[#faf5e8] font-bold text-[#0a0a0a] shadow-2xs"
                    : isCurrentMonth
                      ? "text-[#0a0a0a] hover:bg-[#faf5e8] hover:scale-105"
                      : "text-[#6a6a6a]/40 font-normal hover:bg-[#faf5e8]/50",
              ].join(" ")}
            >
              {/* Day number */}
              <span className="leading-none">{date.getDate()}</span>

              {/* Event dots indicator */}
              {dayDots.length > 0 && (
                <span
                  className="mt-1 flex items-center gap-[3px]"
                  aria-hidden="true"
                >
                  {dayDots.map((dot, di) => {
                    const isObj = typeof dot === "object" && dot !== null
                    const hex = isObj ? (dot as EventDotItem).colorHex : undefined
                    const cls = isObj ? (dot as EventDotItem).className : (typeof dot === "string" ? dot : undefined)

                    return (
                      <span
                        key={di}
                        className={[
                          "h-1.5 w-1.5 rounded-full shadow-2xs",
                          isSelected ? "bg-white" : (cls ?? ""),
                        ].join(" ")}
                        style={!isSelected && hex ? { backgroundColor: hex } : undefined}
                      />
                    )
                  })}
                </span>
              )}
            </button>
          )
        })}
      </div>

    </div>
  )
}
