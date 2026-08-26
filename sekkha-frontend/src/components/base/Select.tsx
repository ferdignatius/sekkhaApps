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

export function Select({
  id,
  label,
  placeholder = "Pilih opsi...",
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
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={selectId} className="text-caption font-bold text-sekkha-ink">
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
          <p className="text-micro font-medium text-red-600 animate-in fade-in">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={selectId} className="text-caption font-bold text-sekkha-ink">
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
            "w-full rounded-2xl bg-slate-50/70 py-2.5 px-3.5 text-body-sm text-sekkha-ink border border-sekkha-hairline-strong focus:border-sekkha-brand-blue focus:bg-white focus:ring-2 focus:ring-blue-500/10",
            hasError && "border-red-400 bg-red-50/30 text-red-900",
            className
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="rounded-2xl border border-sekkha-hairline bg-white shadow-lg">
          <SelectGroup>
            {options?.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
                disabled={opt.disabled}
                className="rounded-xl hover:bg-slate-50 text-body-sm py-2 px-3"
              >
                {opt.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </ShadcnSelect>
      {hasError && (
        <p className="text-micro font-medium text-red-600 animate-in fade-in">
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
