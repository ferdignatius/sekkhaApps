// components/ui/EventCalendar
// Custom month-grid calendar with colored event dots (max 3 per day).
// Redesigned with Glassmorphism aesthetic and smooth day tiles.

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
  /** Render compact layout for form pickers */
  compact?: boolean
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
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ]
  return `${months[date.getMonth()]} ${date.getFullYear()}`
}

// ─── Component ────────────────────────────────────────────────────────────────

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
      onSelect?.(null) // deselect
    } else {
      onSelect?.(key)
    }
  }

  return (
    <div className={`w-full select-none font-sans text-left ${
      compact
        ? "p-1.5 space-y-2 bg-transparent"
        : "rounded-2xl border border-sekkha-hairline bg-white/95 backdrop-blur-md p-3.5 shadow-xs space-y-3"
    }`}>
      
      {/* ── Month Navigation Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-1.5 border-b border-sekkha-hairline-soft px-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`font-extrabold text-sekkha-ink tracking-tight ${compact ? "text-caption" : "text-caption-bold"}`}>
            {monthLabel(month)}
          </span>
          <button
            type="button"
            onClick={resetToToday}
            className="rounded-lg bg-blue-50 px-1.5 py-0.5 text-micro-bold text-sekkha-brand-blue hover:bg-blue-100 transition-colors"
            title="Kembali ke Bulan Hari Ini"
          >
            Hari Ini
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Bulan sebelumnya"
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-sekkha-hairline bg-white text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <ChevronLeftIcon className="size-3.5" />
          </button>

          <button
            type="button"
            onClick={nextMonth}
            aria-label="Bulan berikutnya"
            className="flex h-7 w-8 items-center justify-center rounded-lg border border-sekkha-hairline bg-white text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            <ChevronRightIcon className="size-3.5" />
          </button>
        </div>
      </div>

      {/* ── Day-of-week headers ───────────────────────────────────────────── */}
      <div className="grid grid-cols-7 text-center">
        {DAYS_ID.map((d, idx) => (
          <div
            key={d}
            className={`text-micro font-bold uppercase tracking-tight py-0.5 ${
              idx === 0 || idx === 6 ? "text-rose-500" : "text-sekkha-slate"
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
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
                "relative mx-auto flex flex-col items-center justify-center transition-all cursor-pointer",
                compact
                  ? "h-7 w-7 sm:h-7.5 sm:w-7.5 rounded-xl text-micro font-bold"
                  : "h-9 w-9 sm:h-10 sm:w-10 rounded-2xl text-caption",
                isSelected
                  ? "bg-sekkha-brand-blue text-white font-black shadow-md scale-105 ring-2 ring-blue-300/80"
                  : isToday
                    ? "border-2 border-sekkha-brand-blue bg-blue-50/60 font-black text-sekkha-brand-blue shadow-2xs"
                    : isCurrentMonth
                      ? "text-sekkha-ink font-bold hover:bg-sekkha-surface/90 hover:scale-105"
                      : "text-sekkha-slate/30 font-medium hover:bg-sekkha-surface/50",
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
                  {dayDots.map((color, di) => (
                    <span
                      key={di}
                      className={[
                        "h-1.5 w-1.5 rounded-full shadow-2xs",
                        isSelected ? "bg-white/90" : color,
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
