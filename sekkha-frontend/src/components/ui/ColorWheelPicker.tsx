// components/ui/ColorWheelPicker
// Modern Popover Color Picker with 2D Saturation/Value Canvas, Hue Slider, RGB/Hex Inputs, Eyedropper, & Cancel/Save Buttons.

import { useState, useEffect, useRef } from "react"
import { PaletteIcon, PipetteIcon, CheckIcon } from "lucide-react"

export interface ColorWheelPickerProps {
  color: string // Hex color string, e.g. "#0284c7"
  onChange: (hex: string) => void
  label?: string
}

// ─── Color Helper Conversions ─────────────────────────────────────────────────

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = (hex || "#0284c7").replace("#", "")
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("")
  }
  const num = parseInt(clean, 16)
  if (isNaN(num) || clean.length !== 6) return { r: 2, g: 132, b: 199 }
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n || 0)))
      .toString(16)
      .padStart(2, "0")
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

function rgbToHsv(
  r: number,
  g: number,
  b: number
): { h: number; s: number; v: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const diff = max - min
  let h = 0
  const s = max === 0 ? 0 : diff / max
  const v = max

  if (diff !== 0) {
    switch (max) {
      case r:
        h = (g - b) / diff + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / diff + 2
        break
      case b:
        h = (r - g) / diff + 4
        break
    }
    h /= 6
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100),
  }
}

function hsvToRgb(
  h: number,
  s: number,
  v: number
): { r: number; g: number; b: number } {
  h = ((h % 360) + 360) % 360
  s = Math.max(0, Math.min(100, s)) / 100
  v = Math.max(0, Math.min(100, v)) / 100

  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c

  let r = 0,
    g = 0,
    b = 0
  if (h >= 0 && h < 60) {
    r = c
    g = x
    b = 0
  } else if (h >= 60 && h < 120) {
    r = x
    g = c
    b = 0
  } else if (h >= 120 && h < 180) {
    r = 0
    g = c
    b = x
  } else if (h >= 180 && h < 240) {
    r = 0
    g = x
    b = c
  } else if (h >= 240 && h < 300) {
    r = x
    g = 0
    b = c
  } else if (h >= 300 && h < 360) {
    r = c
    g = 0
    b = x
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  }
}

// Preset vibrant color swatches for quick pick
export const QUICK_SWATCHES = [
  { name: "Sky Blue", hex: "#0284c7" },
  { name: "Amber Gold", hex: "#d97706" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Emerald", hex: "#059669" },
  { name: "Rose", hex: "#e11d48" },
  { name: "Indigo", hex: "#4f46e5" },
  { name: "Teal", hex: "#0d9488" },
  { name: "Orange", hex: "#ea580c" },
  { name: "Pink", hex: "#db2777" },
  { name: "Cyan", hex: "#0891b2" },
  { name: "Violet", hex: "#7c3aed" },
  { name: "Slate", hex: "#475569" },
]

// ─── 2D Saturation & Brightness Box ───────────────────────────────────────────

function SaturationBox({
  h,
  s,
  v,
  onChange,
}: {
  h: number
  s: number
  v: number
  onChange: (s: number, v: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  function handleMove(
    e: MouseEvent | TouchEvent | React.MouseEvent | React.TouchEvent
  ) {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY

    const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top))

    const newS = Math.round((x / rect.width) * 100)
    const newV = Math.round((1 - y / rect.height) * 100)
    onChange(newS, newV)
  }

  function handleMouseDown(e: React.MouseEvent | React.TouchEvent) {
    handleMove(e)
    const onPointerMove = (ev: MouseEvent | TouchEvent) => handleMove(ev)
    const onPointerUp = () => {
      window.removeEventListener("mousemove", onPointerMove)
      window.removeEventListener("mouseup", onPointerUp)
      window.removeEventListener("touchmove", onPointerMove)
      window.removeEventListener("touchend", onPointerUp)
    }
    window.addEventListener("mousemove", onPointerMove)
    window.addEventListener("mouseup", onPointerUp)
    window.addEventListener("touchmove", onPointerMove)
    window.addEventListener("touchend", onPointerUp)
  }

  const pureHueBg = `hsl(${h}, 100%, 50%)`

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
      className="relative h-44 w-full cursor-crosshair touch-none overflow-hidden rounded-xl border border-black/10 shadow-xs select-none"
      style={{ backgroundColor: pureHueBg }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
      <div
        className="pointer-events-none absolute -mt-2 -ml-2 h-4 w-4 rounded-full border-2 border-white shadow-md transition-transform active:scale-125"
        style={{ left: `${s}%`, top: `${100 - v}%` }}
      />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ColorWheelPicker({
  color,
  onChange,
  label = "Warna Badge Kategori",
}: ColorWheelPickerProps) {
  const [isOpen, setIsOpen] = useState(false)

  // Internal popover state (HSV & RGB & Hex)
  const [hsv, setHsv] = useState(() => {
    const rgb = hexToRgb(color || "#0284c7")
    return rgbToHsv(rgb.r, rgb.g, rgb.b)
  })

  // Sync HSV when popover opens or prop changes
  useEffect(() => {
    const rgb = hexToRgb(color || "#0284c7")
    setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b))
  }, [color, isOpen])

  const rgb = hsvToRgb(hsv.h, hsv.s, hsv.v)
  const currentHex = rgbToHex(rgb.r, rgb.g, rgb.b)
  const safeCommitted =
    color && /^#[0-9A-Fa-f]{6}$/.test(color) ? color : "#0284c7"

  function handleSave() {
    onChange(currentHex)
    setIsOpen(false)
  }

  function handleCancel() {
    const origRgb = hexToRgb(color || "#0284c7")
    setHsv(rgbToHsv(origRgb.r, origRgb.g, origRgb.b))
    setIsOpen(false)
  }

  function handlePickSwatch(swatchHex: string) {
    const rgb = hexToRgb(swatchHex)
    setHsv(rgbToHsv(rgb.r, rgb.g, rgb.b))
  }

  async function handleEyeDropper() {
    if (typeof window !== "undefined" && "EyeDropper" in window) {
      try {
        const eyeDropper = new (window as any).EyeDropper()
        const result = await eyeDropper.open()
        if (result?.sRGBHex) {
          const pickedRgb = hexToRgb(result.sRGBHex)
          setHsv(rgbToHsv(pickedRgb.r, pickedRgb.g, pickedRgb.b))
        }
      } catch {}
    }
  }

  return (
    <div className="relative space-y-2 rounded-2xl border border-sekkha-hairline bg-sekkha-surface/60 p-3 text-left font-sans backdrop-blur-md">
      <div className="flex items-center justify-between">
        <label className="text-caption flex items-center gap-1.5 font-bold text-sekkha-ink">
          <PaletteIcon className="size-4 text-sekkha-brand-blue" />
          <span>{label}</span>
        </label>

        {/* Live Badge Preview */}
        <span
          className="text-micro-bold inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-extrabold capitalize shadow-2xs transition-all"
          style={{
            backgroundColor: `${safeCommitted}1a`,
            color: safeCommitted,
            borderColor: `${safeCommitted}40`,
          }}
        >
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: safeCommitted }}
          />
          <span>Preview Badge</span>
        </span>
      </div>

      {/* Main Trigger Bar */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex h-11 flex-1 items-center gap-2.5 rounded-xl border border-sekkha-hairline bg-white px-3.5 text-left shadow-2xs transition-all hover:bg-slate-50 active:scale-[0.99]"
        >
          <div className="relative shrink-0 rounded-full bg-gradient-to-tr from-rose-500 via-amber-400 via-emerald-400 via-sky-400 to-purple-500 p-0.5 shadow-2xs">
            <span
              className="block h-6 w-6 rounded-full border-2 border-white"
              style={{ backgroundColor: safeCommitted }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <span className="text-caption-bold block font-mono font-extrabold tracking-wider text-sekkha-ink uppercase">
              {safeCommitted}
            </span>
          </div>

          <span className="text-micro shrink-0 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 font-bold text-sekkha-brand-blue">
            Pilih Warna...
          </span>
        </button>
      </div>

      {/* ── Custom Popover Modal (Pixel-Perfect match to reference screenshot) ── */}
      {isOpen && (
        <div className="fixed inset-0 z-[150] flex animate-in items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs fade-in-0">
          <div className="w-full max-w-[340px] animate-in space-y-3.5 rounded-2xl border border-sekkha-hairline bg-white p-4 text-left font-sans shadow-2xl duration-150 zoom-in-95">
            {/* 1. 2D Saturation & Value Canvas */}
            <SaturationBox
              h={hsv.h}
              s={hsv.s}
              v={hsv.v}
              onChange={(s, v) => setHsv((prev) => ({ ...prev, s, v }))}
            />

            {/* 2. Rainbow Hue Slider */}
            <div className="relative h-4 w-full cursor-pointer overflow-hidden rounded-full select-none">
              <input
                type="range"
                min="0"
                max="360"
                value={hsv.h}
                onChange={(e) =>
                  setHsv((prev) => ({ ...prev, h: Number(e.target.value) }))
                }
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
              />
              <div
                className="h-full w-full rounded-full"
                style={{
                  background:
                    "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)",
                }}
              />
              <div
                className="pointer-events-none absolute top-0 bottom-0 -ml-2 h-4 w-4 rounded-full border-2 border-white shadow-md"
                style={{
                  left: `${(hsv.h / 360) * 100}%`,
                  backgroundColor: `hsl(${hsv.h}, 100%, 50%)`,
                }}
              />
            </div>

            {/* 3. Inputs Row: Hex, R, G, B */}
            <div className="grid grid-cols-4 gap-2">
              <div className="col-span-1 space-y-0.5">
                <label className="text-[10px] font-bold text-sekkha-slate">
                  Hex
                </label>
                <input
                  type="text"
                  value={currentHex.toUpperCase()}
                  onChange={(e) => {
                    let val = e.target.value
                    if (!val.startsWith("#")) val = `#${val}`
                    const pickedRgb = hexToRgb(val)
                    setHsv(rgbToHsv(pickedRgb.r, pickedRgb.g, pickedRgb.b))
                  }}
                  className="text-micro-bold h-9 w-full rounded-lg border border-sekkha-hairline bg-sekkha-canvas px-2 text-center font-mono text-sekkha-ink uppercase outline-none focus:border-sekkha-brand-blue"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-sekkha-slate">
                  R
                </label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.r}
                  onChange={(e) => {
                    const newR = Math.max(
                      0,
                      Math.min(255, Number(e.target.value) || 0)
                    )
                    setHsv(rgbToHsv(newR, rgb.g, rgb.b))
                  }}
                  className="text-micro-bold h-9 w-full rounded-lg border border-sekkha-hairline bg-sekkha-canvas px-1.5 text-center font-mono text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-sekkha-slate">
                  G
                </label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.g}
                  onChange={(e) => {
                    const newG = Math.max(
                      0,
                      Math.min(255, Number(e.target.value) || 0)
                    )
                    setHsv(rgbToHsv(rgb.r, newG, rgb.b))
                  }}
                  className="text-micro-bold h-9 w-full rounded-lg border border-sekkha-hairline bg-sekkha-canvas px-1.5 text-center font-mono text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                />
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-bold text-sekkha-slate">
                  B
                </label>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb.b}
                  onChange={(e) => {
                    const newB = Math.max(
                      0,
                      Math.min(255, Number(e.target.value) || 0)
                    )
                    setHsv(rgbToHsv(rgb.r, rgb.g, newB))
                  }}
                  className="text-micro-bold h-9 w-full rounded-lg border border-sekkha-hairline bg-sekkha-canvas px-1.5 text-center font-mono text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                />
              </div>
            </div>

            {/* Quick Swatches Row */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {QUICK_SWATCHES.map((swatch) => {
                const isSelected =
                  currentHex.toLowerCase() === swatch.hex.toLowerCase()
                return (
                  <button
                    key={swatch.hex}
                    type="button"
                    onClick={() => handlePickSwatch(swatch.hex)}
                    className={`flex h-6 w-6 items-center justify-center rounded-md border transition-all ${
                      isSelected
                        ? "scale-110 border-white shadow-xs ring-2 ring-sekkha-brand-blue"
                        : "border-black/10 opacity-80 hover:scale-105 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: swatch.hex }}
                    title={`${swatch.name} (${swatch.hex})`}
                  >
                    {isSelected && (
                      <CheckIcon className="size-3 text-white drop-shadow-xs" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* 4. Bottom Control Bar (Eyedropper, Cancel, Save) — Pixel-perfect match */}
            <div className="flex items-center justify-between border-t border-sekkha-hairline-soft pt-2">
              {/* Eyedropper Button */}
              <button
                type="button"
                onClick={handleEyeDropper}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-sekkha-hairline bg-sekkha-canvas text-sekkha-ink shadow-2xs transition-colors hover:bg-slate-100"
                title="Ambil Warna dari Layar (Eyedropper)"
              >
                <PipetteIcon className="size-4" />
              </button>

              {/* Action Buttons: Cancel & Save */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-caption-bold h-9 rounded-xl border border-sekkha-hairline bg-white px-4 text-sekkha-slate transition-colors hover:bg-sekkha-surface"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="text-caption-bold h-9 rounded-xl bg-sekkha-brand-blue px-5 text-white shadow-sm transition-colors hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
