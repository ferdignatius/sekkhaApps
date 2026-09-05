import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { ArrowRightIcon } from "lucide-react"
import { AuthErrorBanner } from "./AuthErrorBanner"
import { AuthFormField } from "./AuthFormField"
import { PrivacyPolicyModal } from "./PrivacyPolicyModal"
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
    agreeToPrivacy?: boolean
  }
  errors: {
    email?: string
    password?: string
    confirmPassword?: string
    agreeToPrivacy?: string
  }
  onFieldChange: (field: string, value: any) => void
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
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)

  function handleChange(field: string, value: string | boolean) {
    onFieldChange(field, value)
    onInputChange?.()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await onSubmit()
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        noValidate
        className="flex flex-col gap-5 font-sans"
        aria-label={isSignUp ? "Sign Up Form" : "Log In Form"}
      >
        {/* Mode Switcher Tabs — Category pill tabs in Clay style */}
        <div className="flex rounded-full bg-[#faf5e8] p-1 border border-[#e5e5e5]">
          <Link
            to="/login"
            search={{ redirectTo: undefined }}
            className={`flex-1 rounded-full py-2 text-center text-xs font-semibold transition-all cursor-pointer ${
              !isSignUp
                ? "bg-[#0a0a0a] text-white shadow-xs"
                : "text-[#6a6a6a] hover:text-[#0a0a0a]"
            }`}
          >
            Sign In
          </Link>
          <Link
            to="/sign-up"
            className={`flex-1 rounded-full py-2 text-center text-xs font-semibold transition-all cursor-pointer ${
              isSignUp
                ? "bg-[#0a0a0a] text-white shadow-xs"
                : "text-[#6a6a6a] hover:text-[#0a0a0a]"
            }`}
          >
            Register
          </Link>
        </div>

        {/* API error banner */}
        <AuthErrorBanner message={apiError} />

        {/* Fields */}
        <div className="space-y-3.5">
          {/* Email / Username field */}
          <AuthFormField
            id="email"
            label={isSignUp ? "Email Address" : "Email or Username"}
            type={isSignUp ? "email" : "text"}
            placeholder={isSignUp ? "name@email.com" : "name@email.com or username"}
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
            placeholder="Minimum 6 characters"
            value={fields.password}
            onChange={(val) => handleChange("password", val)}
            onBlur={() => onFieldBlur("password")}
            error={errors.password}
          />

          {/* Confirm password — Sign Up only */}
          {isSignUp && (
            <AuthFormField
              id="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="Repeat your password"
              value={fields.confirmPassword ?? ""}
              onChange={(val) => handleChange("confirmPassword", val)}
              onBlur={() => onFieldBlur("confirmPassword")}
              error={errors.confirmPassword}
            />
          )}

          {/* Privacy Policy Checkbox & Trigger — Sign Up only (Mandatory) */}
          {isSignUp && (
            <div className="flex flex-col gap-1.5 pt-1 text-left">
              <label
                htmlFor="agreeToPrivacy"
                className="flex items-start gap-2.5 cursor-pointer text-xs text-[#3a3a3a] select-none"
              >
                <input
                  type="checkbox"
                  id="agreeToPrivacy"
                  checked={Boolean(fields.agreeToPrivacy)}
                  onChange={(e) => {
                    if (e.target.checked && !fields.agreeToPrivacy) {
                      // Open modal so user scrolls through policy
                      setShowPrivacyModal(true)
                    } else {
                      handleChange("agreeToPrivacy", e.target.checked)
                    }
                  }}
                  className="size-4 shrink-0 rounded-[4px] border border-[#e5e5e5] bg-[#fffaf0] accent-[#0a0a0a] cursor-pointer mt-0.5"
                />
                <span className="leading-relaxed">
                  Saya telah membaca dan menyetujui{" "}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setShowPrivacyModal(true)
                    }}
                    className="font-bold text-[#0a0a0a] underline underline-offset-2 hover:text-[#1a3a3a] cursor-pointer inline"
                  >
                    Kebijakan Privasi Sekkha
                  </button>
                  <span className="text-[#ef4444] ml-0.5">*</span>
                </span>
              </label>

              {errors.agreeToPrivacy && (
                <p className="text-xs font-medium text-[#ef4444] animate-in fade-in pl-6.5">
                  {errors.agreeToPrivacy}
                </p>
              )}
            </div>
          )}
        </div>

        {/* "Forgot password?" link — Login only */}
        {!isSignUp && (
          <div className="flex justify-end -mt-1">
            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-[#0a0a0a] hover:underline cursor-pointer"
            >
              Forgot password?
            </Link>
          </div>
        )}

        {/* Submit Button — Clay button-primary token */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full h-11 rounded-[12px] bg-[#0a0a0a] text-white font-semibold hover:bg-[#1f1f1f] shadow-xs active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer transition-all"
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
              <span>{isSignUp ? "Creating Account..." : "Signing in..."}</span>
            </>
          ) : (
            <>
              <span>{isSignUp ? "Create Account" : "Sign In"}</span>
              <ArrowRightIcon className="size-4 ml-1" />
            </>
          )}
        </Button>
      </form>

      {/* Privacy Policy Modal with Scroll-to-bottom agreement */}
      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAgree={() => {
          handleChange("agreeToPrivacy", true)
        }}
      />
    </>
  )
}
