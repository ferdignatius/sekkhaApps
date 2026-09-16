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
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  function toggleOption(opt: MultiSelectOption) {
    if (value.includes(opt.value)) {
      if (!allowEmpty && value.length === 1) return // Prevent empty if not allowed
      onChange(value.filter((v) => v !== opt.value))
    } else {
      onChange([...value, opt.value])
    }
  }

  function handleDeselectAll() {
    if (!allowEmpty) return
    onChange([])
  }

  function handleSelectAll() {
    onChange(options.map((o) => o.value))
  }

  function handleReset() {
    if (defaultValue) {
      onChange(defaultValue)
    } else {
      onChange(options.map((o) => o.value))
    }
  }

  function removeTag(v: string, e: React.MouseEvent) {
    e.stopPropagation()
    if (!allowEmpty && value.length === 1) return
    onChange(value.filter((x) => x !== v))
  }

  const isAllSelected = value.length === options.length
  const selectedOptions = options.filter((o) => value.includes(o.value))

  return (
    <div ref={containerRef} className="relative text-left font-sans">
      {/* ── Trigger ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && setOpen((v) => !v)
        }
        className={`text-caption relative flex min-h-10 w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-xl border bg-sekkha-canvas px-2.5 py-1.5 pr-8 transition-all ${
          open
            ? "border-sekkha-brand-blue bg-white ring-2 ring-sekkha-brand-blue/20"
            : "border-sekkha-hairline hover:border-sekkha-hairline-strong hover:bg-white"
        }`}
      >
        {selectedOptions.length === 0 ? (
          <span className="text-caption px-1 py-0.5 font-medium text-sekkha-slate/70">
            {placeholder}
          </span>
        ) : (
          selectedOptions.map((opt) => (
            <span
              key={opt.value}
              className="text-micro-bold inline-flex items-center gap-1 rounded-lg border px-2 py-0.5"
              style={
                opt.colorHex
                  ? {
                      backgroundColor: `${opt.colorHex}20`,
                      color: opt.colorHex,
                      borderColor: `${opt.colorHex}40`,
                    }
                  : undefined
              }
              onClick={(e) => e.stopPropagation()}
            >
              <span>{opt.label}</span>
              <button
                type="button"
                onClick={(e) => removeTag(opt.value, e)}
                className="-mr-0.5 cursor-pointer rounded-full p-0.5 transition-colors hover:bg-black/10"
              >
                <XIcon className="size-2.5" />
              </button>
            </span>
          ))
        )}

        {/* Chevron icon */}
        <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-sekkha-slate">
          <ChevronDownIcon
            className={`size-4 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        </span>
      </div>

      {/* ── Dropdown Panel ── */}
      {open && (
        <div className="absolute z-[200] mt-1 w-full min-w-[200px] animate-in overflow-hidden rounded-2xl border border-sekkha-hairline bg-white shadow-xl duration-100 fade-in-0 zoom-in-95">
          {/* Deselect All / Select All row */}
          <div className="flex items-center justify-between border-b border-sekkha-hairline-soft bg-sekkha-canvas/60 px-3 py-2">
            <button
              type="button"
              onClick={isAllSelected ? handleDeselectAll : handleSelectAll}
              className="text-micro-bold flex cursor-pointer items-center gap-1.5 text-sekkha-brand-blue hover:underline"
            >
              <div
                className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                  isAllSelected
                    ? "border-sekkha-brand-blue bg-sekkha-brand-blue"
                    : "border-sekkha-hairline-strong bg-white"
                }`}
              >
                {isAllSelected && (
                  <CheckIcon className="size-2.5 stroke-[3] text-white" />
                )}
              </div>
              {isAllSelected ? "Batal Pilih Semua" : "Pilih Semua"}
            </button>

            {defaultValue !== undefined && (
              <button
                type="button"
                onClick={handleReset}
                className="text-micro-bold cursor-pointer text-sekkha-slate hover:text-sekkha-ink hover:underline"
              >
                Reset
              </button>
            )}
          </div>

          {/* Options list */}
          <div className="max-h-52 scrollbar-none overflow-y-auto py-1">
            {options.map((opt) => {
              const isChecked = value.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleOption(opt)}
                  className={`text-caption flex w-full cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left font-semibold transition-colors ${
                    isChecked
                      ? "bg-sekkha-brand-blue/8 text-sekkha-ink"
                      : "text-sekkha-ink hover:bg-sekkha-surface"
                  }`}
                >
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all ${
                      isChecked
                        ? "border-sekkha-brand-blue bg-sekkha-brand-blue"
                        : "border-sekkha-hairline-strong bg-white"
                    }`}
                  >
                    {isChecked && (
                      <CheckIcon className="size-2.5 stroke-[3] text-white" />
                    )}
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
          <div className="border-t border-sekkha-hairline-soft bg-sekkha-canvas/60 px-3 py-2">
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
