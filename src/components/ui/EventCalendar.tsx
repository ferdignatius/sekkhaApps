// components/ui/EventCalendar
// Custom month-grid calendar with colored event dots (max 3 per day).
// Built from scratch — no react-day-picker — so dot rendering is fully controlled.
//
// Props:
//   dots       — map of "YYYY-MM-DD" → array of color strings (Tailwind bg-* class)
//   selected   — currently selected date ("YYYY-MM-DD") or null
//   onSelect   — called with "YYYY-MM-DD" when a day is clicked (same date → deselect)
//   month      — controlled month (Date object, day doesn't matter)
//   onMonthChange — called when user navigates prev/next

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventCalendarProps {
  /** Map of ISO date string ("YYYY-MM-DD") → array of dot bg-color classes (max 3 shown) */
  dots?: Record<string, string[]>
  /** Selected day as "YYYY-MM-DD", or null for no selection */
  selected?: string | null
  onSelect?: (date: string | null) => void
  /** The month to display (only year/month matter) */
  month: Date
  onMonthChange?: (month: Date) => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAYS_ID = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

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

/**
 * Build a 6-row × 7-col grid of Date objects for the given month.
 * Cells outside the month are included (for the full grid).
 */
function buildGrid(year: number, month: number): Date[][] {
  const firstDay = new Date(year, month, 1)
  const startOffset = firstDay.getDay() // 0 = Sun
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
  return date.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EventCalendar({
  dots = {},
  selected,
  onSelect,
  month,
  onMonthChange,
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

  function handleDayClick(date: Date) {
    const key = toKey(date)
    if (selected === key) {
      onSelect?.(null) // deselect
    } else {
      onSelect?.(key)
    }
  }

  return (
    <div className="w-full select-none rounded-xl bg-sekkha-canvas">
      {/* ── Month navigation ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-1 pb-3">
        <button
          type="button"
          onClick={prevMonth}
          aria-label="Bulan sebelumnya"
          className="flex h-8 w-8 items-center justify-center rounded-full text-sekkha-slate transition-colors hover:bg-sekkha-surface hover:text-sekkha-ink"
        >
          <ChevronLeftIcon className="size-4" />
        </button>

        <span className="text-body-sm-medium text-sekkha-ink">
          {monthLabel(month)}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          aria-label="Bulan berikutnya"
          className="flex h-8 w-8 items-center justify-center rounded-full text-sekkha-slate transition-colors hover:bg-sekkha-surface hover:text-sekkha-ink"
        >
          <ChevronRightIcon className="size-4" />
        </button>
      </div>

      {/* ── Day-of-week headers ───────────────────────────────────────────── */}
      <div className="grid grid-cols-7 pb-1">
        {DAYS_ID.map(d => (
          <div
            key={d}
            className="text-center text-caption text-sekkha-muted"
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-y-1">
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
              aria-label={date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              aria-pressed={isSelected}
              className={[
                "relative mx-auto flex h-9 w-9 flex-col items-center justify-center rounded-full text-caption transition-colors",
                isSelected
                  ? "bg-sekkha-primary text-white"
                  : isToday
                    ? "bg-sekkha-surface font-semibold text-sekkha-brand-blue"
                    : isCurrentMonth
                      ? "text-sekkha-ink hover:bg-sekkha-surface"
                      : "text-sekkha-muted hover:bg-sekkha-surface",
              ].join(" ")}
            >
              {/* Day number */}
              <span className="leading-none">{date.getDate()}</span>

              {/* Event dots */}
              {dayDots.length > 0 && (
                <span
                  className="mt-0.5 flex items-center gap-[3px]"
                  aria-hidden="true"
                >
                  {dayDots.map((color, di) => (
                    <span
                      key={di}
                      className={[
                        "h-1 w-1 rounded-full",
                        isSelected ? "bg-white/80" : color,
                      ].join(" ")}
                    />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
