import { useState, useEffect, useRef } from "react"
import {
  KeyRoundIcon,
  MailIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  EyeIcon,
  EyeOffIcon,
  Loader2Icon,
  LogOutIcon,
  RefreshCwIcon,
} from "lucide-react"
import { Button } from "@/components/base"
import { userApi } from "../api/userApi"

interface SecuritySettingsSectionProps {
  currentEmail?: string | null
  emailVerified?: boolean
  onEmailUpdated?: (newEmail: string) => void
  onLogout: () => void
  onToast: (message: string, type?: "success" | "error") => void
}

export function SecuritySettingsSection({
  currentEmail,
  emailVerified = true,
  onEmailUpdated,
  onLogout,
  onToast,
}: SecuritySettingsSectionProps) {
  // Password State
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [showCurrentPass, setShowCurrentPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // Email Change & OTP State
  const [emailStep, setEmailStep] = useState<"idle" | "request" | "verify">("idle")
  const [newEmail, setNewEmail] = useState("")
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""])
  const [cooldown, setCooldown] = useState(0)
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpError, setOtpError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)

  // Logout confirm modal state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  // OTP inputs ref
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  // Handle password submit
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordForm.current_password) {
      onToast("Current password is required", "error")
      return
    }
    if (passwordForm.new_password.length < 8) {
      onToast("New password must be at least 8 characters", "error")
      return
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      onToast("New passwords do not match", "error")
      return
    }

    setSavingPassword(true)
    try {
      await userApi.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      })
      setPasswordSuccess(true)
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      })
      onToast("Password updated successfully! Other sessions have been signed out.")
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: any) {
      onToast(err.message || "Failed to update password", "error")
    } finally {
      setSavingPassword(false)
    }
  }

  // Handle Request OTP
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault()
    const cleanEmail = newEmail.trim().toLowerCase()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(cleanEmail)) {
      setOtpError("Please enter a valid email address")
      return
    }

    setSendingOtp(true)
    setOtpError(null)
    try {
      await userApi.requestEmailVerification(cleanEmail)
      setEmailStep("verify")
      setCooldown(60)
      setOtpDigits(["", "", "", "", "", ""])
      onToast("A 6-digit verification code has been dispatched to your email")
      setTimeout(() => otpInputRefs.current[0]?.focus(), 150)
    } catch (err: any) {
      setOtpError(err.message || "Failed to send verification code")
      onToast(err.message || "Failed to send verification code", "error")
    } finally {
      setSendingOtp(false)
    }
  }

  // Handle OTP digit box change
  function handleOtpChange(index: number, value: string) {
    const cleanChar = value.replace(/\D/g, "").slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = cleanChar
    setOtpDigits(newDigits)
    setOtpError(null)

    // Move focus forward
    if (cleanChar && index < 5) {
      otpInputRefs.current[index + 1]?.focus()
    }
  }

  // Handle Backspace navigation in OTP
  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus()
    }
  }

  // Handle OTP paste
  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return

    const newDigits = [...otpDigits]
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || ""
    }
    setOtpDigits(newDigits)

    const focusIndex = Math.min(pasted.length, 5)
    otpInputRefs.current[focusIndex]?.focus()
  }

  // Handle Confirm OTP
  async function handleConfirmOtp(e: React.FormEvent) {
    e.preventDefault()
    const code = otpDigits.join("")
    if (code.length !== 6) {
      setOtpError("Please enter all 6 digits")
      return
    }

    setVerifyingOtp(true)
    setOtpError(null)
    try {
      const res = await userApi.confirmEmailVerification(code, newEmail)
      setEmailSuccess(true)
      const updated = res.email || newEmail.trim().toLowerCase()
      onEmailUpdated?.(updated)
      onToast("Email address verified and updated successfully!")
      setTimeout(() => {
        setEmailSuccess(false)
        setEmailStep("idle")
        setNewEmail("")
        setOtpDigits(["", "", "", "", "", ""])
      }, 2000)
    } catch (err: any) {
      setOtpError(err.message || "Invalid or expired verification code")
      onToast(err.message || "Verification code is invalid or expired", "error")
    } finally {
      setVerifyingOtp(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* ── CARD 1: CHANGE PASSWORD ── */}
      <div className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-2.5 border-b border-[#e5e5e5] pb-3.5">
          <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
            <KeyRoundIcon className="size-4.5 text-[#e8b94a]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              Change Account Password
            </h3>
            <p className="text-xs text-[#6a6a6a]">
              Ensure your account stays secure with a strong password
            </p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="flex items-center gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">
            <CheckCircleIcon className="size-4 text-emerald-600" />
            <span>Password updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Current Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPass ? "text" : "password"}
                  required
                  value={passwordForm.current_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      current_password: e.target.value,
                    }))
                  }
                  placeholder="Enter current password"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] pr-10 pl-3.5 text-xs font-semibold text-[#0a0a0a] outline-none transition-colors focus:border-[#0a0a0a] focus:bg-[#fffaf0] sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPass(!showCurrentPass)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#6a6a6a] hover:text-[#0a0a0a]"
                >
                  {showCurrentPass ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                New Password (min 8 chars)
              </label>
              <div className="relative">
                <input
                  type={showNewPass ? "text" : "password"}
                  required
                  minLength={8}
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({
                      ...prev,
                      new_password: e.target.value,
                    }))
                  }
                  placeholder="Minimum 8 characters"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] pr-10 pl-3.5 text-xs font-semibold text-[#0a0a0a] outline-none transition-colors focus:border-[#0a0a0a] focus:bg-[#fffaf0] sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer text-[#6a6a6a] hover:text-[#0a0a0a]"
                >
                  {showNewPass ? (
                    <EyeOffIcon className="size-4" />
                  ) : (
                    <EyeIcon className="size-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={passwordForm.confirm_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({
                    ...prev,
                    confirm_password: e.target.value,
                  }))
                }
                placeholder="Re-enter new password"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] px-3.5 text-xs font-semibold text-[#0a0a0a] outline-none transition-colors focus:border-[#0a0a0a] focus:bg-[#fffaf0] sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingPassword}
              className="flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-6 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-50 sm:text-sm"
            >
              {savingPassword ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ── CARD 2: CHANGE EMAIL WITH 6-DIGIT OTP (ANTI-TAKEOVER) ── */}
      <div className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-2.5 border-b border-[#e5e5e5] pb-3.5">
          <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
            <MailIcon className="size-4.5 text-[#e8b94a]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              Email Address & OTP Verification
            </h3>
            <p className="text-xs text-[#6a6a6a]">
              Change email securely protected by 6-digit cryptographic verification
            </p>
          </div>
        </div>

        {/* Current Email Status Display */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] p-4">
          <div className="space-y-0.5">
            <span className="block text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
              Current Registered Email
            </span>
            <p className="text-sm font-bold text-[#0a0a0a]">
              {currentEmail || "No email registered yet"}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {emailVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                <CheckCircleIcon className="size-3 text-emerald-600" />
                <span>Verified</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                <AlertCircleIcon className="size-3 text-amber-600" />
                <span>Unverified</span>
              </span>
            )}

            {emailStep === "idle" && (
              <Button
                variant="outlined"
                type="button"
                onClick={() => setEmailStep("request")}
                className="rounded-[10px] text-xs font-semibold"
              >
                Change Email
              </Button>
            )}
          </div>
        </div>

        {/* ── SUB-STEP A: REQUEST OTP TO NEW EMAIL ── */}
        {emailStep === "request" && (
          <form
            onSubmit={handleRequestOtp}
            className="animate-in space-y-3.5 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 duration-200 fade-in"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#0a0a0a] sm:text-sm">
                Step 1: Enter New Email Address
              </h4>
              <button
                type="button"
                onClick={() => {
                  setEmailStep("idle")
                  setOtpError(null)
                }}
                className="cursor-pointer text-xs font-bold text-[#6a6a6a] hover:text-[#0a0a0a]"
              >
                Cancel
              </button>
            </div>

            {otpError && (
              <div className="flex items-center gap-2 rounded-[10px] border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-800">
                <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
                <span>{otpError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0a0a0a]">
                New Email Address
              </label>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="e.g. yourname@domain.com"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs font-semibold text-[#0a0a0a] outline-none transition-colors focus:border-[#0a0a0a] sm:text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="filled"
                type="submit"
                disabled={sendingOtp}
                className="rounded-[12px] text-xs font-bold sm:text-sm"
              >
                {sendingOtp ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  <span>Send 6-Digit Code</span>
                )}
              </Button>
            </div>
          </form>
        )}

        {/* ── SUB-STEP B: ENTER 6-DIGIT OTP CODE ── */}
        {emailStep === "verify" && (
          <form
            onSubmit={handleConfirmOtp}
            className="animate-in space-y-4 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 duration-200 fade-in sm:p-5"
          >
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2.5">
              <div>
                <h4 className="text-xs font-bold text-[#0a0a0a] sm:text-sm">
                  Step 2: Enter 6-Digit Verification Code
                </h4>
                <p className="text-[11px] text-[#6a6a6a]">
                  Sent to <strong>{newEmail}</strong>. Code valid for 10 minutes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEmailStep("request")
                  setOtpError(null)
                }}
                className="cursor-pointer text-xs font-bold text-[#6a6a6a] hover:text-[#0a0a0a]"
              >
                Change Email
              </button>
            </div>

            {otpError && (
              <div className="flex items-center gap-2 rounded-[10px] border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-800">
                <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
                <span>{otpError}</span>
              </div>
            )}

            {emailSuccess && (
              <div className="flex items-center gap-2 rounded-[10px] border border-emerald-200 bg-emerald-50 p-2.5 text-xs font-bold text-emerald-800">
                <CheckCircleIcon className="size-4 shrink-0 text-emerald-600" />
                <span>Email successfully updated!</span>
              </div>
            )}

            {/* 6 Digit Input Boxes */}
            <div className="flex justify-center gap-2 sm:gap-3">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={handleOtpPaste}
                  className="size-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-center font-mono text-base font-bold text-[#0a0a0a] outline-none transition-colors focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/20 sm:size-12 sm:text-lg"
                />
              ))}
            </div>

            {/* Action Bar & Resend Timer */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div>
                {cooldown > 0 ? (
                  <span className="text-xs text-[#6a6a6a]">
                    Resend code in <strong>{cooldown}s</strong>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={sendingOtp}
                    className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#0a0a0a] hover:underline"
                  >
                    <RefreshCwIcon className="size-3" />
                    <span>Resend Code</span>
                  </button>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEmailStep("idle")}
                  className="h-10 cursor-pointer rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-semibold text-[#0a0a0a] hover:bg-[#faf5e8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifyingOtp || otpDigits.join("").length !== 6}
                  className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] disabled:opacity-50"
                >
                  {verifyingOtp ? (
                    <>
                      <Loader2Icon className="size-3.5 animate-spin" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Confirm Code</span>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>

      {/* ── CARD 3: ACCOUNT & SESSION MANAGEMENT ── */}
      <div className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:p-6">
        <div className="flex items-center gap-2.5 border-b border-[#e5e5e5] pb-3.5">
          <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
            <ShieldCheckIcon className="size-4.5 text-[#e8b94a]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              Session & Sign Out
            </h3>
            <p className="text-xs text-[#6a6a6a]">
              Manage your active authentication session on this device
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#0a0a0a]">Sign out of Sekkha</p>
            <p className="text-[11px] text-[#6a6a6a]">
              End your active session securely on this browser
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] border border-rose-200 bg-rose-50 px-4 text-xs font-bold text-rose-700 transition-colors hover:bg-rose-100"
          >
            <LogOutIcon className="size-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* ── MODAL: LOGOUT CONFIRMATION ── */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/60 p-4 backdrop-blur-xs fade-in">
          <div className="relative w-full max-w-sm space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 text-left shadow-2xl">
            <h3 className="text-base font-bold text-[#0a0a0a]">
              Confirm Sign Out
            </h3>
            <p className="text-xs leading-relaxed text-[#6a6a6a]">
              Are you sure you want to end your current session? You will need your
              username or member ID to sign back in.
            </p>

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="h-10 flex-1 cursor-pointer rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-semibold text-[#0a0a0a] hover:bg-[#faf5e8]"
              >
                Stay Signed In
              </button>
              <button
                type="button"
                onClick={onLogout}
                className="h-10 flex-1 cursor-pointer rounded-[10px] bg-rose-600 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
