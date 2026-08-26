import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.ComponentProps<"input"> {
  label?: string
  error?: string | null
  helperText?: string
  startIcon?: React.ReactNode
  endIcon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, error, helperText, startIcon, endIcon, className, ...props }, ref) => {
    const generatedId = React.useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`
    const hasError = Boolean(error)

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label htmlFor={inputId} className="text-caption font-bold text-sekkha-ink">
            {label}
          </label>
        )}
        <div className="relative flex items-center w-full">
          {startIcon && (
            <div className="pointer-events-none absolute left-3.5 flex items-center text-sekkha-slate">
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
              "w-full rounded-2xl bg-slate-50/70 py-2.5 text-body-sm text-sekkha-ink outline-none transition-all duration-200 placeholder:text-slate-400 border border-sekkha-hairline-strong focus:border-sekkha-brand-blue focus:bg-white focus:shadow-xs focus:ring-2 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50",
              startIcon ? "pl-11" : "px-3.5",
              endIcon ? "pr-11" : "px-3.5",
              hasError && "border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-red-500/10",
              className
            )}
            {...props}
          />
          {endIcon && (
            <div className="absolute right-3.5 flex items-center text-sekkha-slate">
              {endIcon}
            </div>
          )}
        </div>
        {hasError ? (
          <p id={errorId} className="text-micro font-medium text-red-600 animate-in fade-in">
            {error}
          </p>
        ) : helperText ? (
          <p id={helperId} className="text-micro text-sekkha-slate">
            {helperText}
          </p>
        ) : null}
      </div>
    )
  }
)
Input.displayName = "Input"
