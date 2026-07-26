// components/ui/MultiSelectDropdown
// Reusable compact multi-select dropdown with tag pills, checkboxes, deselect all, and reset.

import { useState, useRef, useEffect } from "react"
import { ChevronDownIcon, XIcon, CheckIcon } from "lucide-react"

export interface MultiSelectOption {
  value: string
  label: string
  /** Optional color hex for the tag pill */
  colorHex?: string
}

interface MultiSelectDropdownProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  /** If provided, Reset will restore to these defaults */
  defaultValue?: string[]
  /** Allow empty selection (no minimum) */
  allowEmpty?: boolean
}

export function MultiSelectDropdown({
  options,
  value,
  onChange,
  placeholder = "Pilih...",
  defaultValue,
  allowEmpty = true,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function toggleOption(opt: MultiSelectOption) {
    if (value.includes(opt.value)) {
      if (!allowEmpty && value.length === 1) return // Prevent empty if not allowed
      onChange(value.filter(v => v !== opt.value))
    } else {
      onChange([...value, opt.value])
    }
  }

  function handleDeselectAll() {
    if (!allowEmpty) return
    onChange([])
  }

  function handleSelectAll() {
    onChange(options.map(o => o.value))
  }

  function handleReset() {
    if (defaultValue) {
      onChange(defaultValue)
    } else {
      onChange(options.map(o => o.value))
    }
  }

  function removeTag(v: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!allowEmpty && value.length === 1) return
    onChange(value.filter(x => x !== v))
  }

  const isAllSelected = value.length === options.length
  const selectedOptions = options.filter(o => value.includes(o.value))

  return (
    <div ref={containerRef} className="relative text-left font-sans">
      {/* ── Trigger ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen(v => !v)}
        onKeyDown={e => (e.key === "Enter" || e.key === " ") && setOpen(v => !v)}
        className={`flex min-h-10 w-full cursor-pointer items-center gap-1.5 flex-wrap rounded-xl border bg-sekkha-canvas px-2.5 py-1.5 pr-8 text-caption transition-all relative ${
          open
            ? "border-sekkha-brand-blue ring-2 ring-sekkha-brand-blue/20 bg-white"
            : "border-sekkha-hairline hover:border-sekkha-hairline-strong hover:bg-white"
        }`}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-sekkha-slate/70 font-medium text-caption py-0.5 px-1">{placeholder}</span>
        ) : (
          selectedOptions.map(opt => (
            <span
              key={opt.value}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-micro-bold border"
              style={
                opt.colorHex
                  ? {
                      backgroundColor: `${opt.colorHex}20`,
                      color: opt.colorHex,
                      borderColor: `${opt.colorHex}40`,
                    }
                  : undefined
              }
              onClick={e => e.stopPropagation()}
            >
              <span>{opt.label}</span>
              <button
                type="button"
                onClick={e => removeTag(opt.value, e)}
                className="rounded-full hover:bg-black/10 transition-colors p-0.5 -mr-0.5 cursor-pointer"
              >
                <XIcon className="size-2.5" />
              </button>
            </span>
          ))
        )}

        {/* Chevron icon */}
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-sekkha-slate pointer-events-none">
          <ChevronDownIcon
            className={`size-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </div>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div className="absolute z-[200] mt-1 w-full min-w-[200px] rounded-2xl border border-sekkha-hairline bg-white shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-100">
          
          {/* Deselect All / Select All row */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-sekkha-hairline-soft bg-sekkha-canvas/60">
            <button
              type="button"
              onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
              className="flex items-center gap-1.5 text-micro-bold text-sekkha-brand-blue hover:underline cursor-pointer"
            >
              <div className={`h-4 w-4 rounded flex items-center justify-center border transition-all ${
                isAllSelected
                  ? "bg-sekkha-brand-blue border-sekkha-brand-blue"
                  : "border-sekkha-hairline-strong bg-white"
              }`}>
                {isAllSelected && <CheckIcon className="size-2.5 text-white stroke-[3]" />}
              </div>
              {isAllSelected ? "Batal Pilih Semua" : "Pilih Semua"}
            </button>

            {defaultValue !== undefined && (
              <button
                type="button"
                onClick={handleReset}
                className="text-micro-bold text-sekkha-slate hover:text-sekkha-ink cursor-pointer hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto scrollbar-none py-1">
            {options.map(opt => {
              const isChecked = value.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleOption(opt)}
                  className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-caption font-semibold transition-colors cursor-pointer text-left ${
                    isChecked ? "bg-sekkha-brand-blue/8 text-sekkha-ink" : "hover:bg-sekkha-surface text-sekkha-ink"
                  }`}
                >
                  <div className={`h-4 w-4 shrink-0 rounded flex items-center justify-center border transition-all ${
                    isChecked
                      ? "bg-sekkha-brand-blue border-sekkha-brand-blue"
                      : "border-sekkha-hairline-strong bg-white"
                  }`}>
                    {isChecked && <CheckIcon className="size-2.5 text-white stroke-[3]" />}
                  </div>
                  {opt.colorHex && (
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: opt.colorHex }}
                    />
                  )}
                  <span className="truncate">{opt.label}</span>
                </button>
              )
            })}
          </div>

          {/* Footer: count */}
          <div className="border-t border-sekkha-hairline-soft px-3 py-2 bg-sekkha-canvas/60">
            <p className="text-micro font-bold text-sekkha-slate">
              {value.length === 0
                ? "Tidak ada yang dipilih"
                : `${value.length} dari ${options.length} dipilih`}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
