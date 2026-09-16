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
import { Button } from "@/components/ui/button"
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
      setError("Email wajib diisi")
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Format email tidak valid")
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
      setError(err?.message || "Email tidak terdaftar di sistem Sekkha.")
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
      setError(err?.message || "Kode OTP salah atau telah kedaluwarsa.")
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
      setError(err?.message || "Gagal mengirim ulang OTP.")
    } finally {
      setIsResending(false)
    }
  }

  // ── Step 3: Reset Password Submit ─────────────────────────────────────────
  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (newPassword.length < 8) {
      setError("Kata sandi baru minimal 8 karakter")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi kata sandi tidak cocok")
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
      setError(err?.message || "Gagal mereset kata sandi. Silakan coba lagi.")
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
            {step === "email" && "Lupa Kata Sandi?"}
            {step === "otp" && "Verifikasi Kode OTP"}
            {step === "new-password" && "Buat Kata Sandi Baru"}
            {step === "success" && "Kata Sandi Diperbarui!"}
          </h1>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-[#6a6a6a]">
            {step === "email" &&
              "Masukkan email terdaftar Anda untuk menerima kode OTP pemulihan kata sandi."}
            {step === "otp" && (
              <>
                Masukkan 6 digit kode OTP yang kami kirimkan ke{" "}
                <span className="font-bold text-[#0a0a0a]">{email}</span>
              </>
            )}
            {step === "new-password" &&
              "Masukkan kata sandi baru Anda dengan minimal 8 karakter."}
            {step === "success" &&
              "Kata sandi akun Sekkha Anda berhasil diperbarui. Silakan masuk kembali."}
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
              <span>Kode OTP baru telah dikirim ke email Anda!</span>
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
                  Email Akun Anda
                </label>
                <div className="relative">
                  <MailIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#9a9a9a]" />
                  <input
                    id="email"
                    type="email"
                    placeholder="nama@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      if (error) setError(null)
                    }}
                    required
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pr-3.5 pl-10 text-xs font-medium text-[#0a0a0a] transition-all outline-none placeholder:text-[#9a9a9a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-40"
              >
                {isLoading ? (
                  <span>Mengirim Kode OTP...</span>
                ) : (
                  <>
                    <span>Kirim Kode OTP Reset</span>
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
                <span>Tidak menerima email?</span>
                {resendCountdown > 0 ? (
                  <span className="rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-0.5 font-semibold text-[#0a0a0a]">
                    Kirim ulang dalam {resendCountdown}d
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
                      {isResending ? "Mengirim..." : "Kirim Ulang Kode OTP"}
                    </span>
                  </button>
                )}
              </div>

              <Button
                type="button"
                onClick={() => verifyOtpCode(otpDigits.join(""))}
                disabled={otpDigits.some((d) => !d) || isLoading}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-40"
              >
                {isLoading ? (
                  <span>Memverifikasi Kode OTP...</span>
                ) : (
                  <>
                    <span>Verifikasi Kode OTP</span>
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
                  <span>Ubah Alamat Email</span>
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
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <LockIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#9a9a9a]" />
                  <input
                    id="newPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimal 8 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pr-10 pl-10 text-xs font-medium text-[#0a0a0a] transition-all outline-none placeholder:text-[#9a9a9a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#9a9a9a] hover:text-[#0a0a0a]"
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
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <LockIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#9a9a9a]" />
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Ketik ulang kata sandi baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pr-10 pl-10 text-xs font-medium text-[#0a0a0a] transition-all outline-none placeholder:text-[#9a9a9a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#9a9a9a] hover:text-[#0a0a0a]"
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
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-40"
              >
                {isLoading ? (
                  <span>Menyimpan Kata Sandi...</span>
                ) : (
                  <>
                    <span>Simpan Kata Sandi Baru</span>
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
                Kata sandi akun Anda berhasil diperbarui! Silakan gunakan kata
                sandi baru untuk masuk ke Sekkha Apps.
              </div>

              <Link to="/login" className="block w-full">
                <Button className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-xs font-semibold text-white shadow-xs hover:bg-[#1f1f1f]">
                  <span>Masuk ke Akun Anda</span>
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
                <span>Kembali ke Halaman Masuk</span>
              </Link>
            </div>
          )}
        </div>

        {/* Sekkha Footer Brand */}
        <p className="text-center text-[11px] text-[#9a9a9a]">
          © 2026 Komunitas Pemuda Vihara Sekkha.
        </p>
      </div>
    </div>
  )
}
