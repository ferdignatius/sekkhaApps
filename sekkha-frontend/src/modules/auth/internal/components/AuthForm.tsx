import { Link } from "@tanstack/react-router"
import { ArrowRightIcon } from "lucide-react"
import { AuthErrorBanner } from "./AuthErrorBanner"
import { AuthFormField } from "./AuthFormField"
import { Button } from "@/components/ui/button"

type AuthFormMode = "sign-up" | "login"

interface AuthFormProps {
  mode: AuthFormMode
  onSubmit: () => Promise<void>
  isLoading: boolean
  apiError: string | null
  onInputChange?: () => void
  onOAuthError?: (message: string) => void
  fields: {
    email: string
    password: string
    confirmPassword?: string
  }
  errors: {
    email?: string
    password?: string
    confirmPassword?: string
  }
  onFieldChange: (field: string, value: string) => void
  onFieldBlur: (field: string) => void
}

export function AuthForm({
  mode,
  onSubmit,
  isLoading,
  apiError,
  onInputChange,
  fields,
  errors,
  onFieldChange,
  onFieldBlur,
}: AuthFormProps) {
  const isSignUp = mode === "sign-up"

  function handleChange(field: string, value: string) {
    onFieldChange(field, value)
    onInputChange?.()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit()
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
      aria-label={isSignUp ? "Formulir pendaftaran" : "Formulir masuk"}
    >
      {/* Mode Switcher Tabs */}
      <div className="flex rounded-full bg-surface-soft p-1 border border-hairline/60">
        <Link
          to="/login"
          search={{ redirectTo: undefined }}
          className={`flex-1 rounded-full py-2 text-center text-xs font-semibold transition-all ${
            !isSignUp
              ? "bg-surface-card text-ink shadow-xs"
              : "text-text-muted hover:text-ink"
          }`}
        >
          Masuk
        </Link>
        <Link
          to="/sign-up"
          className={`flex-1 rounded-full py-2 text-center text-xs font-semibold transition-all ${
            isSignUp
              ? "bg-surface-card text-ink shadow-xs"
              : "text-text-muted hover:text-ink"
          }`}
        >
          Daftar Akun
        </Link>
      </div>

      {/* API error banner */}
      <AuthErrorBanner message={apiError} />

      {/* Fields */}
      <div className="space-y-4">
        {/* Email / Username field */}
        <AuthFormField
          id="email"
          label={isSignUp ? "Email" : "Email atau Username"}
          type={isSignUp ? "email" : "text"}
          placeholder={isSignUp ? "nama@email.com" : "nama@email.com atau username"}
          value={fields.email}
          onChange={(val) => handleChange("email", val)}
          onBlur={() => onFieldBlur("email")}
          error={errors.email}
        />

        {/* Password field */}
        <AuthFormField
          id="password"
          label="Password"
          type="password"
          placeholder="Minimal 6 karakter"
          value={fields.password}
          onChange={(val) => handleChange("password", val)}
          onBlur={() => onFieldBlur("password")}
          error={errors.password}
        />

        {/* Confirm password — Sign Up only */}
        {isSignUp && (
          <AuthFormField
            id="confirmPassword"
            label="Konfirmasi Password"
            type="password"
            placeholder="Ulangi password Anda"
            value={fields.confirmPassword ?? ""}
            onChange={(val) => handleChange("confirmPassword", val)}
            onBlur={() => onFieldBlur("confirmPassword")}
            error={errors.confirmPassword}
          />
        )}
      </div>

      {/* "Lupa password?" link — Login only */}
      {!isSignUp && (
        <div className="flex justify-end -mt-1">
          <a
            href="/forgot-password"
            className="text-micro-bold text-sekkha-brand-blue hover:underline"
          >
            Lupa password?
          </a>
        </div>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full py-3.5 flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg
              aria-hidden="true"
              className="size-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4Z"
              />
            </svg>
            <span>{isSignUp ? "Mendaftarkan..." : "Memproses Masuk..."}</span>
          </>
        ) : (
          <>
            <span>{isSignUp ? "Daftar Akun Baru" : "Masuk ke Akun"}</span>
            <ArrowRightIcon className="size-4 ml-1" />
          </>
        )}
      </Button>
    </form>
  )
}
