import { useState } from "react"
import { EyeIcon, EyeOffIcon, MailIcon, LockIcon, UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface AuthFormFieldProps {
  id: string
  label: string
  type: "email" | "password" | "text"
  value: string
  placeholder?: string
  onChange: (value: string) => void
  onBlur?: () => void
  error?: string | null
}

export function AuthFormField({
  id,
  label,
  type,
  value,
  placeholder,
  onChange,
  onBlur,
  error,
}: AuthFormFieldProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const hasError = Boolean(error)
  const errorId = `${id}-error`

  const isPasswordType = type === "password"
  const resolvedType = isPasswordType ? (showPassword ? "text" : "password") : type

  return (
    <div className="flex flex-col gap-1.5">
      {/* Label */}
      <label htmlFor={id} className="text-caption font-bold text-sekkha-ink">
        {label}
      </label>

      {/* Input container with leading icon and optional toggle */}
      <div className="relative flex items-center">
        {/* Leading Icon */}
        <div className="pointer-events-none absolute left-3.5 flex items-center text-sekkha-slate">
          {type === "email" && <MailIcon className="size-4.5" />}
          {type === "password" && <LockIcon className="size-4.5" />}
          {type === "text" && <UserIcon className="size-4.5" />}
        </div>

        <input
          id={id}
          type={resolvedType}
          value={value}
          placeholder={
            placeholder ||
            (type === "email"
              ? "nama@email.com"
              : type === "password"
              ? "••••••••"
              : "")
          }
          autoComplete={
            type === "email"
              ? "email"
              : type === "password"
              ? id === "confirmPassword"
                ? "new-password"
                : "current-password"
              : "off"
          }
          aria-invalid={hasError ? "true" : "false"}
          aria-describedby={hasError ? errorId : undefined}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false)
            onBlur?.()
          }}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            "w-full rounded-2xl bg-slate-50/80 pl-11 pr-11 py-3 text-body-sm text-sekkha-ink outline-none transition-all duration-200 placeholder:text-slate-400",
            "border",
            // State: Default
            !hasError && !isFocused && "border-sekkha-hairline-strong hover:border-slate-400 bg-slate-50/60",
            // State: Focused
            !hasError && isFocused && "border-sekkha-brand-blue bg-white shadow-sm ring-2 ring-blue-500/10",
            // State: Error
            hasError && "border-red-400 bg-red-50/30 text-red-900 focus:border-red-500 focus:ring-2 focus:ring-red-500/10",
          )}
        />

        {/* Trailing Show/Hide Password Toggle */}
        {isPasswordType && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 flex items-center justify-center text-sekkha-slate hover:text-sekkha-ink focus:outline-none transition-colors p-1 rounded-lg"
            title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
          >
            {showPassword ? (
              <EyeOffIcon className="size-4" />
            ) : (
              <EyeIcon className="size-4" />
            )}
          </button>
        )}
      </div>

      {/* Inline Error Message */}
      {hasError && (
        <p id={errorId} className="text-micro font-medium text-red-600 animate-in fade-in">
          {error}
        </p>
      )}
    </div>
  )
}
