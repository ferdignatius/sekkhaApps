import * as React from "react"
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SimpleSelectProps {
  id?: string
  label?: string
  placeholder?: string
  value?: string
  defaultValue?: string
  options?: SelectOption[]
  onChange?: (value: string) => void
  disabled?: boolean
  error?: string | null
  className?: string
  children?: React.ReactNode
}

/**
 * Sekkha base Select — aligned strictly with DESIGN.md specifications.
 */
export function Select({
  id,
  label,
  placeholder = "Select an option...",
  value,
  defaultValue,
  options,
  onChange,
  disabled,
  error,
  className,
  children,
}: SimpleSelectProps) {
  const generatedId = React.useId()
  const selectId = id || generatedId
  const hasError = Boolean(error)

  // If children provided, render as primitive wrapper
  if (children && !options) {
    return (
      <div className="flex flex-col gap-1.5 w-full text-left font-sans">
        {label && (
          <label htmlFor={selectId} className="text-xs font-semibold text-[#0a0a0a] tracking-tight">
            {label}
          </label>
        )}
        <ShadcnSelect
          value={value}
          defaultValue={defaultValue}
          onValueChange={onChange}
          disabled={disabled}
        >
          {children}
        </ShadcnSelect>
        {hasError && (
          <p className="text-xs font-medium text-[#ef4444] animate-in fade-in">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 w-full text-left font-sans">
      {label && (
        <label htmlFor={selectId} className="text-xs font-semibold text-[#0a0a0a] tracking-tight">
          {label}
        </label>
      )}
      <ShadcnSelect
        value={value}
        defaultValue={defaultValue}
        onValueChange={onChange}
        disabled={disabled}
      >
        <SelectTrigger
          id={selectId}
          className={cn(
            "w-full h-11 rounded-[12px] bg-[#fffaf0] px-4 py-2.5 text-sm text-[#0a0a0a] border border-[#e5e5e5] outline-none shadow-2xs hover:bg-[#faf5e8] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]",
            hasError && "border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444]",
            className
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] p-1 shadow-lg text-[#0a0a0a]">
          <SelectGroup>
            {options?.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="rounded-[8px] hover:bg-[#f5f0e0] text-sm py-2 px-3 text-[#0a0a0a] focus:bg-[#f5f0e0]"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </ShadcnSelect>
      {hasError && (
        <p className="text-xs font-medium text-[#ef4444] animate-in fade-in">
          {error}
        </p>
      )}
    </div>
  )
}

export {
  ShadcnSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
}

