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

const ITEM_H  = 44
const VISIBLE = 5
const PAD     = Math.floor(VISIBLE / 2)   // 2

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))

// Pre-tripled arrays (rendered once, avoids re-creating on each render)
const HOURS_3X   = [...HOURS,   ...HOURS,   ...HOURS]
const MINUTES_3X = [...MINUTES, ...MINUTES, ...MINUTES]

// ─── Infinite Drum Column ─────────────────────────────────────────────────────

interface DrumProps {
  items: string[]        // original list  (e.g. HOURS)
  tripled: string[]      // items × 3      (e.g. HOURS_3X)
  selected: string
  onSelect: (v: string) => void
}

function Drum({ items, tripled, selected, onSelect }: DrumProps) {
  const ref      = useRef<HTMLDivElement>(null)
  const timer    = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const jumping  = useRef(false)       // guard against recursive scroll events
  const isDown   = useRef(false)
  const startY   = useRef(0)
  const startST  = useRef(0)

  const len       = items.length
  const midOffset = len * ITEM_H       // scroll position of the first item in middle copy

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
    const t = setTimeout(() => scrollTo(midOffset + selectedIdx * ITEM_H, false), 16)
    return () => clearTimeout(t)
  }, [selectedIdx, midOffset, scrollTo])

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
      const rawIdx     = Math.round(el.scrollTop / ITEM_H)
      const normalized = ((rawIdx % len) + len) % len

      onSelect(items[normalized])

      // Snap to the exact position in the middle copy (no animation jump visible)
      const target = midOffset + normalized * ITEM_H
      if (Math.abs(el.scrollTop - target) > 2) {
        el.scrollTo({ top: target, behavior: "smooth" })
      }
    }, 120)
  }, [items, len, midOffset, loopIfNeeded, onSelect])

  // ── Pointer drag (mouse + touch) ────────────────────────────────────────
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDown.current  = true
    startY.current  = e.clientY
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
      className="relative overflow-hidden"
      style={{ width: 80, height: ITEM_H * VISIBLE }}
    >
      {/* Selection highlight ring */}
      <div
        className="pointer-events-none absolute inset-x-2 z-20 rounded-2xl bg-sekkha-brand-blue/10 border border-sekkha-brand-blue/30"
        style={{ top: PAD * ITEM_H, height: ITEM_H }}
      />
      {/* Top fade */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10"
        style={{ height: PAD * ITEM_H + 10, background: "linear-gradient(to bottom, white 35%, transparent)" }}
      />
      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10"
        style={{ height: PAD * ITEM_H + 10, background: "linear-gradient(to top, white 35%, transparent)" }}
      />

      {/* Infinite scroll list */}
      <div
        ref={ref}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="absolute inset-0 overflow-y-scroll scrollbar-none select-none cursor-grab active:cursor-grabbing"
      >
        {/* Top padding so first item can be centred */}
        <div style={{ height: PAD * ITEM_H }} />

        {tripled.map((item, i) => {
          // Determine if this cell corresponds to the currently selected value
          const active = item === selected
          return (
            <div
              key={i}
              style={{ height: ITEM_H }}
              onClick={() => {
                onSelect(item)
                const absIdx = i - PAD  // rough offset inside tripled list
                scrollTo(absIdx * ITEM_H + PAD * ITEM_H, true)
              }}
              className={`flex items-center justify-center cursor-pointer transition-all duration-100 ${
                active
                  ? "text-sekkha-brand-blue font-extrabold text-2xl"
                  : "text-sekkha-slate/40 font-medium text-base"
              }`}
            >
              {item}
            </div>
          )
        })}

        {/* Bottom padding */}
        <div style={{ height: PAD * ITEM_H }} />
      </div>
    </div>
  )
}

// ─── WheelTimePicker (bare) ───────────────────────────────────────────────────

interface WheelTimePickerProps {
  value: string      // "HH:mm"
  onChange: (v: string) => void
}

export function WheelTimePicker({ value, onChange }: WheelTimePickerProps) {
  const parts = value.split(":")
  const hh = (parts[0] ?? "08").padStart(2, "0")
  const mm = (parts[1] ?? "00").padStart(2, "0")

  return (
    <div className="flex flex-col items-center">
      {/* Labels row */}
      <div className="flex items-center mb-1.5">
        <div className="text-center text-micro-bold uppercase tracking-widest text-sekkha-slate/60 select-none" style={{ width: 80 }}>
          Jam
        </div>
        <div style={{ width: 28 }} />
        <div className="text-center text-micro-bold uppercase tracking-widest text-sekkha-slate/60 select-none" style={{ width: 80 }}>
          Menit
        </div>
      </div>

      {/* Drums + colon */}
      <div className="flex items-center">
        <Drum
          items={HOURS}
          tripled={HOURS_3X}
          selected={hh}
          onSelect={h => onChange(`${h}:${mm}`)}
        />

        {/* Colon: same height as drum, vertically centered */}
        <div
          className="flex items-center justify-center select-none"
          style={{ width: 28, height: ITEM_H * VISIBLE }}
        >
          <span className="text-2xl font-black text-sekkha-brand-blue">:</span>
        </div>

        <Drum
          items={MINUTES}
          tripled={MINUTES_3X}
          selected={mm}
          onSelect={m => onChange(`${hh}:${m}`)}
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
        className="w-full h-11 flex items-center gap-3 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-left transition-all hover:border-sekkha-brand-blue/50 hover:bg-white group"
      >
        <ClockIcon className="size-4 text-sekkha-brand-blue shrink-0 group-hover:scale-110 transition-transform" />
        <span className="flex-1 text-caption font-extrabold text-sekkha-ink tabular-nums">
          {value} <span className="font-medium text-sekkha-slate text-micro">WIB</span>
        </span>
        <span className="text-micro font-bold text-sekkha-brand-blue">Ubah</span>
      </button>

      {/* Sub-modal popup */}
      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-xs p-4 animate-in fade-in-0"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full max-w-xs rounded-3xl bg-white shadow-2xl border border-sekkha-hairline animate-in zoom-in-95">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-sekkha-hairline-soft">
              <div className="flex items-center gap-2">
                <ClockIcon className="size-4 text-sekkha-brand-blue" />
                <span className="text-caption font-extrabold text-sekkha-ink">{label}</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="size-7 rounded-full bg-sekkha-canvas flex items-center justify-center text-sekkha-slate hover:bg-sekkha-surface transition-colors text-sm"
              >✕</button>
            </div>

            {/* Wheel */}
            <div className="flex justify-center items-center px-6 py-5">
              <WheelTimePicker value={draft} onChange={setDraft} />
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-sekkha-hairline-soft">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex-1 h-11 rounded-2xl border border-sekkha-hairline text-caption font-bold text-sekkha-slate hover:bg-sekkha-canvas transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 h-11 rounded-2xl bg-sekkha-brand-blue text-caption font-bold text-white hover:bg-sekkha-brand-blue/90 transition-colors flex items-center justify-center gap-1.5"
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
