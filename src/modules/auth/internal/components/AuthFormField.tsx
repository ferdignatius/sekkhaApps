// Feature: auth-flow
// AuthFormField — labeled input field with inline error and ARIA integration.
// Requirements: 1.3–1.6, 3.1–3.8, 10.2–10.4, 10.6

import { useState } from "react"
import { cn } from "@/lib/utils"

interface AuthFormFieldProps {
  id: string
  label: string
  type: "email" | "password" | "text"
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string | null
}

/**
 * A single labeled form field with:
 * - Explicit label → input linkage via htmlFor / id (req 10.2)
 * - Dynamic border states: default, focused, error, focused+error
 * - aria-invalid + aria-describedby wired to the inline error element (req 10.3)
 * - Minimum 44px touch target height (req 9.5)
 * - Visible focus ring (req 10.4)
 */
export function AuthFormField({
  id,
  label,
  type,
  value,
  onChange,
  onBlur,
  error,
}: AuthFormFieldProps) {
  const [isFocused, setIsFocused] = useState(false)
  const hasError = Boolean(error)
  const errorId = `${id}-error`

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label — body-sm-medium typography (14px/500), sekkha-ink color */}
      <label
        htmlFor={id}
        className="text-body-sm-medium text-sekkha-ink"
      >
        {label}
      </label>

      {/* Input — text-input token: canvas bg, min-height 44px, rounded-md */}
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={type === "email" ? "email" : type === "password" ? "current-password" : "off"}
        aria-invalid={hasError ? "true" : "false"}
        aria-describedby={hasError ? errorId : undefined}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false)
          onBlur?.()
        }}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          // Base — text-input token
          "w-full rounded-md bg-sekkha-canvas px-4 py-3 text-sekkha-ink",
          "text-body-sm-medium min-h-[44px]",
          "outline-none transition-all duration-100",
          "focus-visible:ring-2 focus-visible:ring-offset-2",
          // Border state: default (no error, no focus)
          !hasError && !isFocused && "border border-sekkha-hairline-strong",
          // Border state: focused without error → brand-blue 2px
          !hasError && isFocused && "border-2 border-sekkha-brand-blue focus-visible:ring-sekkha-brand-blue",
          // Border state: error without focus → brand-red-dark 1px
          hasError && !isFocused && "border border-sekkha-brand-red-dark",
          // Border state: focused with error → brand-red-dark 2px
          hasError && isFocused && "border-2 border-sekkha-brand-red-dark focus-visible:ring-sekkha-brand-red-dark",
        )}
      />

      {/* Inline error message — caption typography (13px/400), sekkha-brand-red-dark */}
      {hasError && (
        <p
          id={errorId}
          className="text-caption text-sekkha-brand-red-dark"
        >
          {error}
        </p>
      )}
    </div>
  )
}
