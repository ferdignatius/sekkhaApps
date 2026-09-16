import React, { useState, useRef, useEffect } from "react"
import {
  MailCheckIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  SparklesIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface OtpVerificationViewProps {
  email: string
  onVerify: (otp: string) => Promise<void>
  onResend: () => Promise<void>
  onBack: () => void
  isLoading: boolean
  error: string | null
}

export function OtpVerificationView({
  email,
  onVerify,
  onResend,
  onBack,
  isLoading,
  error,
}: OtpVerificationViewProps) {
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""])
  const [resendCountdown, setResendCountdown] = useState(60)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccessNotice, setResendSuccessNotice] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for resend
  useEffect(() => {
    if (resendCountdown <= 0) return
    const timer = setInterval(() => {
      setResendCountdown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCountdown])

  // Focus first input on mount
  useEffect(() => {
    inputsRef.current[0]?.focus()
  }, [])

  function handleChangeDigit(index: number, value: string) {
    const numeric = value.replace(/\D/g, "")
    if (!numeric) {
      const next = [...digits]
      next[index] = ""
      setDigits(next)
      return
    }

    // Handle single digit input
    const next = [...digits]
    next[index] = numeric.slice(-1)
    setDigits(next)

    // Move to next input box
    if (index < 5) {
      inputsRef.current[index + 1]?.focus()
    }

    // Auto submit if all 6 digits entered
    const completeOtp = next.join("")
    if (completeOtp.length === 6 && !next.includes("")) {
      void onVerify(completeOtp)
    }
  }

  function handleKeyDown(
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, 6)
    if (!pasted) return

    const next = [...digits]
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i]
    }
    setDigits(next)

    const nextFocusIndex = Math.min(pasted.length, 5)
    inputsRef.current[nextFocusIndex]?.focus()

    if (pasted.length === 6) {
      void onVerify(pasted)
    }
  }

  async function handleResendClick() {
    if (resendCountdown > 0 || isResending) return
    setIsResending(true)
    setResendSuccessNotice(false)
    try {
      await onResend()
      setResendCountdown(60)
      setResendSuccessNotice(true)
      setTimeout(() => setResendSuccessNotice(false), 4000)
    } finally {
      setIsResending(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const otp = digits.join("")
    if (otp.length < 6) return
    await onVerify(otp)
  }

  const isComplete = digits.every((d) => d !== "")

  return (
    <div className="animate-in space-y-6 text-left font-sans duration-150 zoom-in-95 fade-in">
      {/* Header Info */}
      <div className="space-y-2 text-center">
        <div className="mx-auto flex size-12 items-center justify-center rounded-[16px] bg-[#0a0a0a] text-white shadow-xs">
          <MailCheckIcon className="size-6 text-[#e8b94a]" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#0a0a0a]">
          Verifikasi Email Anda
        </h2>
        <p className="mx-auto max-w-xs text-xs leading-relaxed text-[#6a6a6a]">
          Masukkan 6 digit kode OTP yang kami kirimkan ke:
          <br />
          <span className="mt-0.5 inline-block rounded-[6px] border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-0.5 font-bold text-[#0a0a0a]">
            {email}
          </span>
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex animate-in items-center gap-2 rounded-[12px] border border-[#ef4444]/20 bg-[#ef4444]/10 p-3.5 text-xs font-medium text-[#ef4444] fade-in">
          <AlertCircleIcon className="size-4 shrink-0 text-[#ef4444]" />
          <span>{error}</span>
        </div>
      )}

      {/* Resend Success Notice */}
      {resendSuccessNotice && (
        <div className="flex animate-in items-center gap-2 rounded-[12px] border border-[#22c55e]/20 bg-[#22c55e]/10 p-3 text-xs font-semibold text-[#22c55e] fade-in">
          <SparklesIcon className="size-4 shrink-0" />
          <span>Kode OTP baru telah dikirim ke email Anda!</span>
        </div>
      )}

      {/* OTP Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 6 Digit Segmented Inputs */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {digits.map((digit, idx) => (
            <input
              key={idx}
              ref={(el) => {
                inputsRef.current[idx] = el
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChangeDigit(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
              className="size-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-center font-mono text-lg font-bold text-[#0a0a0a] shadow-2xs transition-all outline-none focus:scale-105 focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:size-13 sm:text-xl"
            />
          ))}
        </div>

        {/* Resend & Expiry Help */}
        <div className="flex flex-col items-center justify-between gap-2 pt-1 text-xs text-[#6a6a6a] sm:flex-row">
          <span>Tidak menerima email?</span>
          {resendCountdown > 0 ? (
            <span className="rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-2 py-0.5 font-semibold text-[#0a0a0a]">
              Kirim ulang dalam {resendCountdown}d
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResendClick}
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

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={!isComplete || isLoading}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-xs font-semibold text-white shadow-xs transition-all hover:bg-[#1f1f1f] active:scale-[0.99] disabled:opacity-40"
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
              <span>Memverifikasi OTP...</span>
            </>
          ) : (
            <>
              <span>Verifikasi & Selesaikan Pendaftaran</span>
              <ArrowRightIcon className="ml-1 size-4" />
            </>
          )}
        </Button>

        {/* Back to Form link */}
        <div className="border-t border-[#e5e5e5] pt-2 text-center">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
          >
            <ArrowLeftIcon className="size-3.5" />
            <span>Salah memasukkan email? Ubah Email</span>
          </button>
        </div>
      </form>
    </div>
  )
}
