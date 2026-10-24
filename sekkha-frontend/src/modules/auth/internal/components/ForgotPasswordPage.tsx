import React, { useState, useRef, useEffect } from "react"
import { Link } from "@tanstack/react-router"
import {
  KeyRoundIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  SparklesIcon,
  RefreshCwIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  ShieldCheckIcon,
} from "lucide-react"
import { Button } from "@/components/base/Button"
import { api } from "@/lib/api"

type ForgotStep = "email" | "otp" | "new-password" | "success"

export function ForgotPasswordPage() {
  const [step, setStep] = useState<ForgotStep>("email")
  const [email, setEmail] = useState("")
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendCountdown, setResendCountdown] = useState(60)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Resend Countdown timer
  useEffect(() => {
    if (step !== "otp" || resendCountdown <= 0) return
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [step, resendCountdown])

  // Focus first OTP input on step transition
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus()
      }, 50)
    }
  }, [step])

  // ── Step 1: Submit Email Request ──────────────────────────────────────────
  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail) {
      setError("Email is required")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Invalid email format")
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      await api.post<{ success: boolean; message: string }>(
        "/auth/forgot-password/request",
        {
          email: cleanEmail,
        }
      )
      setStep("otp")
      setResendCountdown(60)
    } catch (err: any) {
      setError(err?.message || "Email is not registered in Sekkha.")
    } finally {
      setIsLoading(false)
    }
  }

  // ── Step 2: OTP Handlers ──────────────────────────────────────────────────
  function handleChangeDigit(index: number, value: string) {
    const numeric = value.replace(/\D/g, "")
    if (!numeric) {
      const next = [...otpDigits]
      next[index] = ""
      setOtpDigits(next)
      return
    }

    const next = [...otpDigits]
    next[index] = numeric.slice(-1)
    setOtpDigits(next)

    if (index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    }

    const completeOtp = next.join("")
    if (completeOtp.length === 6 && !next.includes("")) {
      void verifyOtpCode(completeOtp)
    }
  }

  function handleOtpKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    } else if (e.key === "ArrowLeft" && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6)
    if (!pasted) return

    const next = [...otpDigits]
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i]
    }
    setOtpDigits(next)

    const nextFocusIndex = Math.min(pasted.length, 5)
    otpInputsRef.current[nextFocusIndex]?.focus()

    if (pasted.length === 6) {
      void verifyOtpCode(pasted)
    }
  }

  async function verifyOtpCode(otp: string) {
    setError(null)
    setIsLoading(true)

    try {
      await api.post<{ success: boolean; message: string }>(
        "/auth/forgot-password/verify-otp",
        {
          email: email.trim().toLowerCase(),
          otp,
        }
      )
      setStep("new-password")
    } catch (err: any) {
      setError(err?.message || "Incorrect or expired verification code.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleResendOtp() {
    if (resendCountdown > 0 || isResending) return
    setIsResending(true)
    setError(null)
    setResendSuccess(false)

    try {
      await api.post<{ success: boolean; message: string }>(
        "/auth/forgot-password/request",
        {
          email: email.trim().toLowerCase(),
        }
      )
      setResendCountdown(60)
      setResendSuccess(true)
      setTimeout(() => setResendSuccess(false), 4000)
    } catch (err: any) {
      setError(err?.message || "Failed to resend code.")
    } finally {
      setIsResending(false)
    }
  }

  // ── Step 3: Reset Password Submit ─────────────────────────────────────────
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Password confirmation does not match")
      return
    }

    setError(null)
    setIsLoading(true)

    try {
      await api.post<{ success: boolean; message: string }>(
        "/auth/forgot-password/reset",
        {
          email: email.trim().toLowerCase(),
          otp: otpDigits.join(""),
          newPassword,
        }
      )
      setStep("success")
    } catch (err: any) {
      setError(err?.message || "Failed to reset password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen w-full items-center justify-center bg-[#fffaf0] p-4 py-12 font-sans selection:bg-[#faf5e8] selection:text-[#0a0a0a]">
      {/* Ambient background soft blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[15%] -left-[10%] size-96 rounded-full bg-[#faf5e8] opacity-60 blur-3xl" />
        <div className="absolute top-[35%] -right-[15%] size-80 rounded-full bg-[#ffb084] opacity-15 blur-3xl" />
        <div className="absolute -bottom-[10%] left-[20%] size-72 rounded-full bg-[#b8a4ed] opacity-15 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-[460px] animate-in space-y-6 duration-200 zoom-in-95 fade-in">
        {/* Brand Header */}
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-[16px] bg-[#0a0a0a] text-white shadow-xs">
            {step === "success" ? (
              <CheckCircle2Icon className="size-6 text-[#22c55e]" />
            ) : step === "new-password" ? (
              <ShieldCheckIcon className="size-6 text-[#e8b94a]" />
            ) : (
              <KeyRoundIcon className="size-5.5 text-[#e8b94a]" />
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0a0a0a]">
            {step === "email" && "Forgot Password?"}
            {step === "otp" && "Verify Code"}
            {step === "new-password" && "Create New Password"}
            {step === "success" && "Password Updated!"}
          </h1>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-[#6a6a6a]">
            {step === "email" &&
              "Enter your registered email address to receive a recovery code."}
            {step === "otp" && (
              <>
                Enter the 6-digit verification code sent to{" "}
                <span className="font-bold text-[#0a0a0a]">{email}</span>
              </>
            )}
            {step === "new-password" &&
              "Enter your new password with a minimum of 8 characters."}
            {step === "success" &&
              "Your Sekkha account password has been updated successfully. Please sign in with your new password."}
          </p>
        </div>

        {/* Card Container */}
        <div className="space-y-5 rounded-[24px] border border-[#e5e5e5] bg-white p-6 shadow-xl shadow-[#0a0a0a]/5 sm:p-8">
          {/* Error Banner */}
          {error && (
            <div className="flex animate-in items-center gap-2 rounded-[12px] border border-[#ef4444]/20 bg-[#ef4444]/10 p-3.5 text-xs font-medium text-[#ef4444] fade-in">
              <AlertCircleIcon className="size-4 shrink-0 text-[#ef4444]" />
              <span>{error}</span>
            </div>
          )}

          {/* Resend Notice */}
          {resendSuccess && (
            <div className="flex animate-in items-center gap-2 rounded-[12px] border border-[#22c55e]/20 bg-[#22c55e]/10 p-3 text-xs font-semibold text-[#22c55e] fade-in">
              <SparklesIcon className="size-4 shrink-0" />
              <span>A new verification code has been sent to your email!</span>
            </div>
          )}

          {/* STEP 1: Input Email */}
          {step === "email" && (
            <form
              onSubmit={handleEmailSubmit}
              noValidate
              className="space-y-4 text-left"
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold text-[#0a0a0a]"
                >
                  Your Account Email
                </label>
                <div className="relative">
                  <MailIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6a6a6a]" />
                  <input
                    id="email"
                    type="email"
                    placeholder="name@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError(null)
                    }}
                    required
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pr-3.5 pl-10 text-xs font-medium text-[#0a0a0a] transition-all outline-none placeholder:text-[#767676] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                </div>
              </div>

              <Button
                variant="filled"
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full"
              >
                {isLoading ? (
                  <span>Sending Recovery Code...</span>
                ) : (
                  <>
                    <span>Send Reset Code</span>
                    <ArrowRightIcon className="ml-1 size-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* STEP 2: Input 6-Digit OTP */}
          {step === "otp" && (
            <div className="space-y-5">
              {/* 6 Digit Segmented Inputs */}
              <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputsRef.current[idx] = el
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChangeDigit(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={handleOtpPaste}
                    className="size-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-center font-mono text-lg font-bold text-[#0a0a0a] shadow-2xs transition-all outline-none focus:scale-105 focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:size-13 sm:text-xl"
                  />
                ))}
              </div>

              {/* Resend & Back Helper */}
              <div className="flex flex-col items-center justify-between gap-2 pt-1 text-xs text-[#6a6a6a] sm:flex-row">
                <span>Didn't receive the email?</span>
                {resendCountdown > 0 ? (
                  <span className="rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-0.5 font-semibold text-[#0a0a0a]">
                    Resend in {resendCountdown}s
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResending}
                    className="inline-flex cursor-pointer items-center gap-1 font-bold text-[#0a0a0a] hover:underline disabled:opacity-50"
                  >
                    <RefreshCwIcon
                      className={`size-3 ${isResending ? "animate-spin" : ""}`}
                    />
                    <span>
                      {isResending ? "Sending..." : "Resend Verification Code"}
                    </span>
                  </button>
                )}
              </div>

              <Button
                variant="filled"
                type="button"
                onClick={() => verifyOtpCode(otpDigits.join(""))}
                disabled={otpDigits.some((d) => !d) || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <span>Verifying Code...</span>
                ) : (
                  <>
                    <span>Verify Code</span>
                    <ArrowRightIcon className="ml-1 size-4" />
                  </>
                )}
              </Button>

              <div className="border-t border-[#e5e5e5] pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep("email")
                    setError(null)
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
                >
                  <ArrowLeftIcon className="size-3.5" />
                  <span>Change Email Address</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Input New Password */}
          {step === "new-password" && (
            <form
              onSubmit={handleResetSubmit}
              noValidate
              className="space-y-4 text-left"
            >
              {/* New Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="newPassword"
                  className="text-xs font-semibold text-[#0a0a0a]"
                >
                  New Password
                </label>
                <div className="relative">
                  <LockIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6a6a6a]" />
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pr-10 pl-10 text-xs font-medium text-[#0a0a0a] transition-all outline-none placeholder:text-[#767676] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#6a6a6a] hover:text-[#0a0a0a]"
                  >
                    {showPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-xs font-semibold text-[#0a0a0a]"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <LockIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#6a6a6a]" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pr-10 pl-10 text-xs font-medium text-[#0a0a0a] transition-all outline-none placeholder:text-[#767676] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#6a6a6a] hover:text-[#0a0a0a]"
                  >
                    {showConfirmPassword ? (
                      <EyeOffIcon className="size-4" />
                    ) : (
                      <EyeIcon className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                variant="filled"
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full"
              >
                {isLoading ? (
                  <span>Saving New Password...</span>
                ) : (
                  <>
                    <span>Save New Password</span>
                    <ArrowRightIcon className="ml-1 size-4" />
                  </>
                )}
              </Button>
            </form>
          )}

          {/* STEP 4: Success State */}
          {step === "success" && (
            <div className="space-y-5 text-center">
              <div className="rounded-[16px] border border-[#22c55e]/20 bg-[#22c55e]/10 p-4 text-xs leading-relaxed font-medium text-[#15803d]">
                Your account password has been successfully updated! Please use
                your new password to sign in to Sekkha.
              </div>

              <Link to="/login" className="block w-full">
                <Button variant="filled" className="w-full">
                  <span>Sign In to Your Account</span>
                  <ArrowRightIcon className="size-4" />
                </Button>
              </Link>
            </div>
          )}

          {/* Footer Back to Login Link */}
          {step !== "success" && (
            <div className="border-t border-[#e5e5e5] pt-2 text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
              >
                <ArrowLeftIcon className="size-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          )}
        </div>

        {/* Sekkha Footer Brand */}
        <p className="text-center text-[11px] text-[#6a6a6a]">
          © 2026 Sekkha Youth Community.
        </p>
      </div>
    </div>
  )
}
