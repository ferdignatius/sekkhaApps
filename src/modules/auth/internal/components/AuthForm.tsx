// Feature: auth-flow
// AuthForm — shared form component for Sign Up and Login modes.
// Requirements: 1.2–1.6, 2.2–2.6, 3.9, 7.5, 7.7, 8.1–8.3, 9.5, 9.6, 10.1, 10.5, 10.6

import { Link } from "@tanstack/react-router"
import { AuthErrorBanner } from "./AuthErrorBanner"
import { AuthFormField } from "./AuthFormField"
import { SocialAuthButton } from "./SocialAuthButton"

// ─── Types ─────────────────────────────────────────────────────────────────────

type AuthFormMode = "sign-up" | "login"

interface AuthFormProps {
  mode: AuthFormMode
  onSubmit: () => Promise<void>
  isLoading: boolean
  apiError: string | null
  /** Called when the user types in any field — used to dismiss the error banner */
  onInputChange?: () => void
  /** Called when Google OAuth encounters an error — used to show the error banner */
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

// ─── Component ─────────────────────────────────────────────────────────────────

/**
 * Shared form component rendered by SignUpPage (mode="sign-up") and
 * LoginPage (mode="login").
 *
 * Composition:
 *   AuthErrorBanner (API error)
 *   SocialAuthButton (Google)
 *   "atau" divider
 *   Field(s): email, password, [confirmPassword]
 *   Submit button (disabled + spinner while loading)
 *   Navigation links
 */
export function AuthForm({
  mode,
  onSubmit,
  isLoading,
  apiError,
  onInputChange,
  onOAuthError,
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
      className="flex flex-col gap-4"
      aria-label={isSignUp ? "Formulir pendaftaran" : "Formulir masuk"}
    >
      {/* API error banner — above all fields (req 7.6) */}
      <AuthErrorBanner message={apiError} />

      {/* Google OAuth button */}
      <SocialAuthButton provider="google" onError={onOAuthError} />

      {/* Divider "atau" */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-sekkha-hairline" />
        <span className="text-[13px] leading-[1.4] text-sekkha-muted">atau</span>
        <div className="h-px flex-1 bg-sekkha-hairline" />
      </div>

      {/* Email field */}
      <AuthFormField
        id="email"
        label="Email"
        type="email"
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
        value={fields.password}
        onChange={(val) => handleChange("password", val)}
        onBlur={() => onFieldBlur("password")}
        error={errors.password}
      />

      {/* Confirm password — Sign Up only */}
      {isSignUp && (
        <AuthFormField
          id="confirmPassword"
          label="Konfirmasi password"
          type="password"
          value={fields.confirmPassword ?? ""}
          onChange={(val) => handleChange("confirmPassword", val)}
          onBlur={() => onFieldBlur("confirmPassword")}
          error={errors.confirmPassword}
        />
      )}

      {/* "Lupa password?" link — Login only */}
      {!isSignUp && (
        <div className="flex justify-end">
          <a
            href="/forgot-password"
            className="text-body-sm-medium text-sekkha-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sekkha-primary focus-visible:ring-offset-2"
          >
            Lupa password?
          </a>
        </div>
      )}

      {/* Submit button — full width, disabled while loading (req 3.9, 9.6) */}
      <button
        type="submit"
        disabled={isLoading}
        className="
          mt-1 flex w-full items-center justify-center gap-2
          rounded-full bg-sekkha-primary px-6 py-3
          text-body-sm-medium text-sekkha-on-primary
          transition-opacity disabled:pointer-events-none disabled:opacity-50
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sekkha-primary focus-visible:ring-offset-2
        "
      >
        {isLoading && (
          /* Spinner */
          <svg
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
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
        )}
        {isSignUp ? "Daftar" : "Masuk"}
      </button>

      {/* Navigation links */}
      {isSignUp ? (
        <p className="text-center text-[13px] leading-[1.4] text-sekkha-slate">
          Sudah punya akun?{" "}
          <Link
            to="/login"
            search={{ redirectTo: undefined }}
            className="text-sekkha-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sekkha-primary focus-visible:ring-offset-2"
          >
            Masuk
          </Link>
        </p>
      ) : (
        <p className="text-center text-[13px] leading-[1.4] text-sekkha-slate">
          Belum punya akun?{" "}
          <Link
            to="/sign-up"
            className="text-sekkha-brand-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sekkha-primary focus-visible:ring-offset-2"
          >
            Daftar
          </Link>
        </p>
      )}
    </form>
  )
}
