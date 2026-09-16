import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  label?: string
  error?: string | null
  helperText?: string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

/**
 * Sekkha base Input — aligned strictly with DESIGN.md specifications.
 * - text-input: bg #fffaf0, text #0a0a0a, 1px #e5e5e5 border, rounded 12px, height 44px.
 * - text-input-focused: border #0a0a0a ring.
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    { id, label, error, helperText, startIcon, endIcon, className, ...props },
    ref
  ) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`
    const hasError = Boolean(error)

    return (
      <div className="flex w-full flex-col gap-1.5 text-left font-sans">
        {label && (
          <label
            htmlFor={inputId}
            className="text-xs font-semibold tracking-tight text-[#0a0a0a]"
          >
            {label}
          </label>
        )}
        <div className="relative flex w-full items-center">
          {startIcon && (
            <div className="pointer-events-none absolute top-1/2 left-3.5 z-10 flex shrink-0 -translate-y-1/2 items-center justify-center text-[#6a6a6a]">
              {startIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={hasError ? "true" : "false"}
            aria-describedby={
              hasError ? errorId : helperText ? helperId : undefined
            }
            className={cn(
              "h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 py-2.5 text-sm text-[#0a0a0a] shadow-2xs transition-all outline-none placeholder:text-[#9a9a9a] focus:border-[#0a0a0a] focus:bg-[#fffaf0] focus:ring-1 focus:ring-[#0a0a0a] disabled:cursor-not-allowed disabled:bg-[#e5e5e5]/50 disabled:opacity-60",
              startIcon && "pl-10",
              endIcon && "pr-10",
              hasError &&
                "border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]",
              className
            )}
            {...props}
          />
          {endIcon && (
            <div className="absolute top-1/2 right-3.5 z-10 flex shrink-0 -translate-y-1/2 items-center justify-center text-[#6a6a6a]">
              {endIcon}
            </div>
          )}
        </div>
        {hasError ? (
          <p
            id={errorId}
            className="animate-in text-xs font-medium text-[#ef4444] fade-in"
          >
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-xs text-[#6a6a6a]">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = "Input"
