/**
 * WheelTimePicker — Apple-style infinite drum-roll time picker.
 *
 * Infinite scroll trick: triplicate the item list, start at the middle copy,
 * silently jump back when the user scrolls too close to either edge.
 *
 * Exports:
 *  - WheelTimePicker        : bare drum-wheel columns
 *  - WheelTimePickerTrigger : field-style trigger that opens sub-modal popup
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { ClockIcon, CheckIcon } from "lucide-react"

// ─── Constants ────────────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

// Pre-tripled arrays (rendered once, avoids re-creating on each render)
const HOURS_3X = [...HOURS, ...HOURS, ...HOURS]
const MINUTES_3X = [...MINUTES, ...MINUTES, ...MINUTES]

// ─── Infinite Drum Column ─────────────────────────────────────────────────────

interface DrumProps {
  items: string[] // original list  (e.g. HOURS)
  tripled: string[] // items × 3      (e.g. HOURS_3X)
  selected: string
  onSelect: (v: string) => void
  itemHeight?: number
  visibleCount?: number
}

function Drum({
  items,
  tripled,
  selected,
  onSelect,
  itemHeight = 40,
  visibleCount = 5,
}: DrumProps) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const jumping = useRef(false) // guard against recursive scroll events
  const isDown = useRef(false)
  const startY = useRef(0)
  const startST = useRef(0)

  const pad = Math.floor(visibleCount / 2)
  const len = items.length
  const midOffset = len * itemHeight // scroll position of the first item in middle copy

  const selectedIdx = Math.max(0, items.indexOf(selected))

  // ── Scroll to absolute position inside tripled list ─────────────────────
  const scrollTo = useCallback((top: number, smooth = true) => {
    const el = ref.current
    if (!el) return
    if (smooth) {
      el.scrollTo({ top, behavior: "smooth" })
    } else {
      el.scrollTop = top
    }
  }, [])

  // Snap to selected in the middle copy (no animation on mount / value change)
  useEffect(() => {
    const t = setTimeout(
      () => scrollTo(midOffset + selectedIdx * itemHeight, false),
      16
    )
    return () => clearTimeout(t)
  }, [selectedIdx, midOffset, itemHeight, scrollTo])

  // ── Infinite loop logic ─────────────────────────────────────────────────
  const loopIfNeeded = useCallback(() => {
    const el = ref.current
    if (!el || jumping.current) return

    const st = el.scrollTop

    // Too close to top edge → jump forward one full cycle
    if (st < midOffset * 0.5) {
      jumping.current = true
      el.scrollTop = st + midOffset
      jumping.current = false
    }
    // Too close to bottom edge → jump back one full cycle
    else if (st > midOffset * 2.5) {
      jumping.current = true
      el.scrollTop = st - midOffset
      jumping.current = false
    }
  }, [midOffset])

  // ── Settle & snap after scroll inertia ─────────────────────────────────
  const handleScroll = useCallback(() => {
    if (jumping.current) return

    loopIfNeeded()

    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      const el = ref.current
      if (!el) return

      // Normalize scrollTop to an index within the original list
      const rawIdx = Math.round(el.scrollTop / itemHeight)
      const normalized = ((rawIdx % len) + len) % len

      onSelect(items[normalized])

      // Snap to the exact position in the middle copy (no animation jump visible)
      const target = midOffset + normalized * itemHeight
      if (Math.abs(el.scrollTop - target) > 2) {
        el.scrollTo({ top: target, behavior: "smooth" })
      }
    }, 120)
  }, [items, len, midOffset, itemHeight, loopIfNeeded, onSelect])

  // ── Pointer drag (mouse + touch) ────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDown.current = true
    startY.current = e.clientY
    startST.current = ref.current?.scrollTop ?? 0
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDown.current || !ref.current) return
    ref.current.scrollTop = startST.current - (e.clientY - startY.current)
  }
  const onPointerUp = () => {
    isDown.current = false
    handleScroll()
  }

  return (
    <div
      className="relative touch-pan-y overflow-hidden select-none"
      style={{ width: 76, height: itemHeight * visibleCount }}
    >
      {/* Selection highlight ring */}
      <div
        className="pointer-events-none absolute inset-x-1.5 z-20 rounded-xl border border-sekkha-brand-blue/30 bg-sekkha-brand-blue/10"
        style={{ top: pad * itemHeight, height: itemHeight }}
      />
      {/* Top fade */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{
          height: pad * itemHeight + 6,
          background: "linear-gradient(to bottom, white 40%, transparent)",
        }}
      />
      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{
          height: pad * itemHeight + 6,
          background: "linear-gradient(to top, white 40%, transparent)",
        }}
      />

      {/* Infinite scroll list */}
      <div
        ref={ref}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute inset-0 cursor-grab scrollbar-none overflow-y-scroll select-none active:cursor-grabbing"
      >
        {/* Top padding so first item can be centred */}
        <div style={{ height: pad * itemHeight }} />

        {tripled.map((item, i) => {
          const active = item === selected
          return (
            <div
              key={i}
              style={{ height: itemHeight }}
              onClick={() => {
                onSelect(item)
                const absIdx = i - pad
                scrollTo(absIdx * itemHeight + pad * itemHeight, true)
              }}
              className={`flex cursor-pointer items-center justify-center transition-all duration-100 ${
                active
                  ? "scale-105 text-xl font-extrabold text-sekkha-brand-blue sm:text-2xl"
                  : "text-sm font-medium text-sekkha-slate/40 sm:text-base"
              }`}
            >
              {item}
            </div>
          )
        })}

        {/* Bottom padding */}
        <div style={{ height: pad * itemHeight }} />
      </div>
    </div>
  )
}

// ─── WheelTimePicker (bare) ───────────────────────────────────────────────────

interface WheelTimePickerProps {
  value: string // "HH:mm"
  onChange: (v: string) => void
  itemHeight?: number
  visibleCount?: number
  showLabels?: boolean
}

export function WheelTimePicker({
  value,
  onChange,
  itemHeight = 40,
  visibleCount = 5,
  showLabels = true,
}: WheelTimePickerProps) {
  const parts = value.split(":")
  const hh = (parts[0] ?? "08").padStart(2, "0")
  const mm = (parts[1] ?? "00").padStart(2, "0")

  return (
    <div className="flex flex-col items-center">
      {/* Labels row */}
      {showLabels && (
        <div className="mb-1 flex items-center">
          <div
            className="text-micro-bold text-center tracking-widest text-sekkha-slate/60 uppercase select-none"
            style={{ width: 76 }}
          >
            Jam
          </div>
          <div style={{ width: 24 }} />
          <div
            className="text-micro-bold text-center tracking-widest text-sekkha-slate/60 uppercase select-none"
            style={{ width: 76 }}
          >
            Menit
          </div>
        </div>
      )}

      {/* Drums + colon */}
      <div className="flex items-center">
        <Drum
          items={HOURS}
          tripled={HOURS_3X}
          selected={hh}
          onSelect={(h) => onChange(`${h}:${mm}`)}
          itemHeight={itemHeight}
          visibleCount={visibleCount}
        />

        {/* Colon: same height as drum, vertically centered */}
        <div
          className="flex shrink-0 items-center justify-center select-none"
          style={{ width: 24, height: itemHeight * visibleCount }}
        >
          <span className="text-xl font-black text-sekkha-brand-blue sm:text-2xl">
            :
          </span>
        </div>

        <Drum
          items={MINUTES}
          tripled={MINUTES_3X}
          selected={mm}
          onSelect={(m) => onChange(`${hh}:${m}`)}
          itemHeight={itemHeight}
          visibleCount={visibleCount}
        />
      </div>
    </div>
  )
}

// ─── WheelTimePickerTrigger ───────────────────────────────────────────────────

interface WheelTimePickerTriggerProps {
  value: string
  onChange: (v: string) => void
  label?: string
}

export function WheelTimePickerTrigger({
  value,
  onChange,
  label = "Pilih Jam",
}: WheelTimePickerTriggerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)

  function handleOpen() {
    setDraft(value)
    setOpen(true)
  }

  function handleConfirm() {
    onChange(draft)
    setOpen(false)
  }

  return (
    <>
      {/* Trigger — field-like button */}
      <button
        type="button"
        onClick={handleOpen}
        className="group flex h-11 w-full items-center gap-3 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-left transition-all hover:border-sekkha-brand-blue/50 hover:bg-white"
      >
        <ClockIcon className="size-4 shrink-0 text-sekkha-brand-blue transition-transform group-hover:scale-110" />
        <span className="text-caption flex-1 font-extrabold text-sekkha-ink tabular-nums">
          {value}{" "}
          <span className="text-micro font-medium text-sekkha-slate">WIB</span>
        </span>
        <span className="text-micro font-bold text-sekkha-brand-blue">
          Ubah
        </span>
      </button>

      {/* Sub-modal popup */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex animate-in items-center justify-center bg-black/30 p-4 backdrop-blur-xs fade-in-0"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="w-full max-w-xs animate-in rounded-3xl border border-sekkha-hairline bg-white shadow-2xl zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft px-5 pt-5 pb-4">
              <div className="flex items-center gap-2">
                <ClockIcon className="size-4 text-sekkha-brand-blue" />
                <span className="text-caption font-extrabold text-sekkha-ink">
                  {label}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex size-7 items-center justify-center rounded-full bg-sekkha-canvas text-sm text-sekkha-slate transition-colors hover:bg-sekkha-surface"
              >
                ✕
              </button>
            </div>

            {/* Wheel */}
            <div className="flex items-center justify-center px-6 py-5">
              <WheelTimePicker value={draft} onChange={setDraft} />
            </div>

            {/* Footer */}
            <div className="flex gap-2 border-t border-sekkha-hairline-soft px-5 pt-3 pb-5">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-caption h-11 flex-1 rounded-2xl border border-sekkha-hairline font-bold text-sekkha-slate transition-colors hover:bg-sekkha-canvas"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="text-caption flex h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-sekkha-brand-blue font-bold text-white transition-colors hover:bg-sekkha-brand-blue/90"
              >
                <CheckIcon className="size-4" />
                Simpan {draft}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
