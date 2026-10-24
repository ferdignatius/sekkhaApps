// feature/profile/components/SettingsSection
// Complete Clay-styled Settings & Goals management with interactive sub-views

import { useState, useEffect } from "react"
import {
  LogOutIcon,
  KeyRoundIcon,
  ChevronRightIcon,
  TargetIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  MailIcon,
  RotateCwIcon,
} from "lucide-react"
import { api } from "@/lib/api"

interface SettingsSectionProps {
  onLogout: () => void
  onClose?: () => void
  onChangePassword?: () => void
  onMonthlyTargetSettings?: () => void
  currentEmail?: string | null
  emailVerified?: boolean
  pendingEmail?: string | null
  onEmailUpdated?: (newEmail: string) => void
}

type SettingsView = "menu" | "target" | "password" | "email" | "logout_confirm"

export function SettingsSection({
  onLogout,
  onClose,
  onChangePassword,
  onMonthlyTargetSettings,
  currentEmail,
  emailVerified = true,
  pendingEmail,
  onEmailUpdated,
}: SettingsSectionProps) {
  const [currentView, setCurrentView] = useState<SettingsView>("menu")

  // ── 1. Monthly Target State ──
  const [targetAttendance, setTargetAttendance] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("sekkha_monthly_attendance_target")
      return saved ? parseInt(saved, 10) : 4
    } catch {
      return 4
    }
  })
  const [targetSaved, setTargetSaved] = useState(false)

  const handleSaveTarget = () => {
    try {
      localStorage.setItem(
        "sekkha_monthly_attendance_target",
        targetAttendance.toString()
      )
      setTargetSaved(true)
      setTimeout(() => {
        setTargetSaved(false)
        setCurrentView("menu")
      }, 1200)
    } catch (err) {
      console.error(err)
    }
  }

  // ── 2. Password Change State ──
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  })
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("Konfirmasi kata sandi baru tidak cocok.")
      return
    }
    if (passwordForm.new_password.length < 8) {
      setPasswordError("Kata sandi baru minimal 8 karakter.")
      return
    }

    try {
      setPasswordLoading(true)
      setPasswordError(null)
      await api.post("/users/change-password", {
        currentPassword: passwordForm.current_password,
        newPassword: passwordForm.new_password,
      })
      setPasswordSuccess(true)
      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      })
      setTimeout(() => {
        setPasswordSuccess(false)
        setCurrentView("menu")
      }, 1500)
    } catch (err: any) {
      setPasswordError(err.message || "Gagal mengubah kata sandi.")
    } finally {
      setPasswordLoading(false)
    }
  }

  // ── 3. Email Change & Verification State ──
  const [emailStep, setEmailStep] = useState<"request" | "verify">("request")
  const [newEmailInput, setNewEmailInput] = useState("")
  const [otpCodeInput, setOtpCodeInput] = useState("")
  const [emailLoading, setEmailLoading] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailSuccess, setEmailSuccess] = useState(false)
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [cooldown])

  const handleRequestVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanEmail = newEmailInput.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setEmailError("Silakan masukkan alamat email yang valid.")
      return
    }

    try {
      setEmailLoading(true)
      setEmailError(null)
      await api.post("/users/email-verification/request", { email: cleanEmail })
      setEmailStep("verify")
      setCooldown(60)
    } catch (err: any) {
      setEmailError(err.message || "Gagal mengirimkan kode verifikasi.")
    } finally {
      setEmailLoading(false)
    }
  }

  const handleConfirmVerificationCode = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanCode = otpCodeInput.trim()
    if (cleanCode.length !== 6) {
      setEmailError("Kode verifikasi harus berupa 6 digit angka.")
      return
    }

    try {
      setEmailLoading(true)
      setEmailError(null)
      const res: any = await api.post("/users/email-verification/confirm", {
        code: cleanCode,
      })
      setEmailSuccess(true)
      const updatedEmail = res?.email || newEmailInput.trim().toLowerCase()
      onEmailUpdated?.(updatedEmail)
      setTimeout(() => {
        setEmailSuccess(false)
        setEmailStep("request")
        setNewEmailInput("")
        setOtpCodeInput("")
        setCurrentView("menu")
      }, 1500)
    } catch (err: any) {
      setEmailError(
        err.message || "Kode verifikasi tidak cocok atau kedaluwarsa."
      )
    } finally {
      setEmailLoading(false)
    }
  }

  // ─── Sub-View: Target Kehadiran Bulanan ──────────────────────────────────────
  if (currentView === "target") {
    return (
      <div className="animate-in space-y-4 text-left font-sans duration-200 fade-in-50">
        <button
          type="button"
          onClick={() => setCurrentView("menu")}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Kembali ke Pengaturan</span>
        </button>

        <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#e8b94a]/20 text-[#0a0a0a] shadow-xs">
            <TargetIcon className="size-5 text-[#0a0a0a]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              Target Kehadiran Bulanan
            </h3>
            <p className="text-xs text-[#6a6a6a]">
              Tentukan target jumlah kebaktian atau event yang ingin kamu ikuti
              setiap bulan
            </p>
          </div>
        </div>

        {targetSaved && (
          <div className="flex items-center gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 shadow-xs">
            <CheckCircleIcon className="size-4 shrink-0 text-emerald-600" />
            <span>Target kehadiran bulanan berhasil disimpan!</span>
          </div>
        )}

        {/* Target Selector Card */}
        <div className="space-y-4 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 sm:p-5">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold tracking-wider text-[#6a6a6a] uppercase">
              Target Kamu
            </span>
            <span className="text-xl font-black text-[#0a0a0a] sm:text-2xl">
              {targetAttendance}{" "}
              <span className="text-xs font-semibold text-[#6a6a6a]">
                Sesi / Bulan
              </span>
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[2, 4, 6, 8].map((num) => {
              const isSelected = targetAttendance === num
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => setTargetAttendance(num)}
                  className={`h-10 cursor-pointer rounded-[12px] text-xs font-bold shadow-xs transition-all ${
                    isSelected
                      ? "bg-[#0a0a0a] text-white"
                      : "border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8]"
                  }`}
                >
                  {num}x Sesi
                </button>
              )
            })}
          </div>

          {/* Range Slider */}
          <div className="space-y-1.5 pt-1">
            <input
              type="range"
              min={1}
              max={16}
              value={targetAttendance}
              onChange={(e) =>
                setTargetAttendance(parseInt(e.target.value, 10))
              }
              className="w-full cursor-pointer accent-[#0a0a0a]"
            />
            <div className="flex justify-between text-[10px] font-semibold text-[#6a6a6a]">
              <span>1 sesi (Santai)</span>
              <span>4 sesi (Rekomendasi)</span>
              <span>16 sesi (Intensif)</span>
            </div>
          </div>
        </div>

        {/* Motivational Clay Note */}
        <div className="flex items-start gap-2.5 rounded-[14px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 text-xs text-[#6a6a6a]">
          <SparklesIcon className="mt-0.5 size-4 shrink-0 text-[#e8b94a]" />
          <p className="leading-relaxed">
            Target ini membantu kamu memantau progress kehadiran bulanan serta
            mempertahankan rentetan streak dan keaktifan di Sekkha.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setCurrentView("menu")}
            className="h-10 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveTarget}
            className="h-10 cursor-pointer rounded-[12px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1f1f1f]"
          >
            Simpan Target
          </button>
        </div>
      </div>
    )
  }

  // ─── Sub-View: Ubah Alamat Email & Verifikasi ──────────────────────────────
  if (currentView === "email") {
    return (
      <div className="animate-in space-y-4 text-left font-sans duration-200 fade-in-50">
        <button
          type="button"
          onClick={() => {
            setEmailError(null)
            setEmailStep("request")
            setCurrentView("menu")
          }}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Kembali ke Pengaturan</span>
        </button>

        <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-blue-100 text-blue-700 shadow-xs">
            <MailIcon className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              Verifikasi & Ubah Email
            </h3>
            <p className="text-xs text-[#6a6a6a]">
              Email aktif digunakan untuk pemulihan akun dan notifikasi resmi
            </p>
          </div>
        </div>

        {/* Current Email Card */}
        <div className="rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
              Email Saat Ini
            </span>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                emailVerified
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {emailVerified ? "Terverifikasi" : "Belum Verifikasi"}
            </span>
          </div>
          <p className="mt-1 font-mono text-sm font-bold text-[#0a0a0a]">
            {currentEmail || "Belum ada email"}
          </p>
          {pendingEmail && (
            <p className="mt-1 text-[11px] text-amber-700">
              Menunggu verifikasi untuk: <strong>{pendingEmail}</strong>
            </p>
          )}
        </div>

        {emailError && (
          <div className="flex items-center gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 shadow-xs">
            <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
            <span>{emailError}</span>
          </div>
        )}

        {emailSuccess && (
          <div className="flex items-center gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 shadow-xs">
            <CheckCircleIcon className="size-4 shrink-0 text-emerald-600" />
            <span>Alamat email berhasil diverifikasi dan diperbarui!</span>
          </div>
        )}

        {emailStep === "request" ? (
          <form
            onSubmit={handleRequestVerificationCode}
            className="space-y-3.5"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Alamat Email Baru *
              </label>
              <input
                type="email"
                required
                placeholder="nama@example.com"
                value={newEmailInput}
                onChange={(e) => setNewEmailInput(e.target.value)}
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
              <p className="text-[11px] text-[#6a6a6a]">
                Kode OTP 6 digit akan dikirim ke alamat email baru ini.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] pt-3">
              <button
                type="button"
                onClick={() => setCurrentView("menu")}
                className="h-10 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={emailLoading}
                className="h-10 cursor-pointer rounded-[12px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1f1f1f] disabled:opacity-50"
              >
                {emailLoading ? "Mengirim Kode..." : "Kirim Kode Verifikasi"}
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={handleConfirmVerificationCode}
            className="space-y-3.5"
          >
            <div className="rounded-[12px] border border-blue-200 bg-blue-50/70 p-3 text-xs text-blue-900">
              Kode verifikasi telah dikirim ke <strong>{newEmailInput}</strong>.
              Berlaku selama 10 menit.
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Kode Verifikasi 6 Digit *
              </label>
              <input
                type="text"
                required
                maxLength={6}
                placeholder="123456"
                value={otpCodeInput}
                onChange={(e) =>
                  setOtpCodeInput(e.target.value.replace(/\D/g, ""))
                }
                className="h-12 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-center font-mono text-xl tracking-[6px] text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-[#6a6a6a]">
              <span>Tidak menerima kode?</span>
              <button
                type="button"
                disabled={cooldown > 0 || emailLoading}
                onClick={handleRequestVerificationCode}
                className="inline-flex cursor-pointer items-center gap-1 font-bold text-[#0a0a0a] hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
              >
                <RotateCwIcon className="size-3" />
                <span>
                  {cooldown > 0
                    ? `Kirim Ulang (${cooldown}s)`
                    : "Kirim Ulang Kode"}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] pt-3">
              <button
                type="button"
                onClick={() => setEmailStep("request")}
                className="h-10 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
              >
                Ganti Email
              </button>
              <button
                type="submit"
                disabled={emailLoading || otpCodeInput.length !== 6}
                className="h-10 cursor-pointer rounded-[12px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1f1f1f] disabled:opacity-50"
              >
                {emailLoading ? "Memverifikasi..." : "Verifikasi & Simpan"}
              </button>
            </div>
          </form>
        )}
      </div>
    )
  }

  // ─── Sub-View: Ubah Kata Sandi ─────────────────────────────────────────────
  if (currentView === "password") {
    return (
      <div className="animate-in space-y-4 text-left font-sans duration-200 fade-in-50">
        <button
          type="button"
          onClick={() => setCurrentView("menu")}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Kembali ke Pengaturan</span>
        </button>

        <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#b8a4ed]/30 text-[#0a0a0a] shadow-xs">
            <KeyRoundIcon className="size-5 text-[#0a0a0a]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              Ubah Kata Sandi
            </h3>
            <p className="text-xs text-[#6a6a6a]">
              Perbarui kata sandi akun untuk menjaga keamanan
            </p>
          </div>
        </div>

        {passwordError && (
          <div className="flex items-center gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800 shadow-xs">
            <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="flex items-center gap-2 rounded-[12px] border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800 shadow-xs">
            <CheckCircleIcon className="size-4 shrink-0 text-emerald-600" />
            <span>Kata sandi berhasil diperbarui!</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">
              Kata Sandi Saat Ini *
            </label>
            <input
              type="password"
              required
              placeholder="Masukkan kata sandi lama"
              value={passwordForm.current_password}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  current_password: e.target.value,
                })
              }
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">
              Kata Sandi Baru *
            </label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="Minimal 8 karakter"
              value={passwordForm.new_password}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  new_password: e.target.value,
                })
              }
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">
              Konfirmasi Kata Sandi Baru *
            </label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="Ulangi kata sandi baru"
              value={passwordForm.confirm_password}
              onChange={(e) =>
                setPasswordForm({
                  ...passwordForm,
                  confirm_password: e.target.value,
                })
              }
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] pt-3">
            <button
              type="button"
              onClick={() => setCurrentView("menu")}
              className="h-10 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={passwordLoading}
              className="h-10 cursor-pointer rounded-[12px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1f1f1f] disabled:opacity-50"
            >
              {passwordLoading ? "Menyimpan..." : "Perbarui Kata Sandi"}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ─── Sub-View: Konfirmasi Keluar (Logout) ──────────────────────────────────
  if (currentView === "logout_confirm") {
    return (
      <div className="animate-in space-y-4 text-left font-sans duration-200 fade-in-50">
        <button
          type="button"
          onClick={() => setCurrentView("menu")}
          className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-bold text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Kembali ke Pengaturan</span>
        </button>

        <div className="space-y-2 rounded-[16px] border border-rose-200 bg-rose-50/70 p-5 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-xs">
            <LogOutIcon className="size-6" />
          </div>
          <h3 className="text-base font-bold text-rose-950">
            Keluar dari Akun Sekkha?
          </h3>
          <p className="mx-auto max-w-sm text-xs leading-relaxed text-rose-700">
            Kamu perlu memasukkan kembali kredensial akun untuk mengakses data
            kehadiran dan fitur lainnya.
          </p>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setCurrentView("menu")}
            className="h-11 flex-1 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onLogout()
              onClose?.()
            }}
            className="h-11 flex-1 cursor-pointer rounded-[12px] bg-rose-600 text-xs font-bold text-white shadow-xs transition-all hover:bg-rose-700"
          >
            Ya, Keluar
          </button>
        </div>
      </div>
    )
  }

  // ─── Main View: Settings & Goals Menu ─────────────────────────────────────
  return (
    <div className="space-y-2.5 text-left font-sans">
      {/* 1. Target Kehadiran Bulanan */}
      <button
        type="button"
        onClick={() => {
          if (onMonthlyTargetSettings) {
            onMonthlyTargetSettings()
          } else {
            setCurrentView("target")
          }
        }}
        className="flex w-full cursor-pointer items-center gap-3.5 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 text-left shadow-xs transition-all hover:border-[#d5d5d5] hover:bg-[#faf5e8] active:scale-[0.99]"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#e8b94a]/20 text-[#0a0a0a] shadow-xs">
          <TargetIcon className="size-5 text-[#0a0a0a]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-[#0a0a0a] sm:text-sm">
              Target Kehadiran Bulanan
            </p>
            <span className="rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-2 py-0.5 text-[10px] font-bold text-[#0a0a0a]">
              {targetAttendance}x / bln
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-[#6a6a6a]">
            Atur target kehadiran untuk konsistensi kehadiran
          </p>
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-[#6a6a6a]" />
      </button>

      {/* 2. Verifikasi & Ubah Email */}
      <button
        type="button"
        onClick={() => setCurrentView("email")}
        className="flex w-full cursor-pointer items-center gap-3.5 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 text-left shadow-xs transition-all hover:border-[#d5d5d5] hover:bg-[#faf5e8] active:scale-[0.99]"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-blue-100 text-blue-700 shadow-xs">
          <MailIcon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-[#0a0a0a] sm:text-sm">
              Alamat Email
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                emailVerified
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {emailVerified ? "Terverifikasi" : "Belum Verifikasi"}
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-[#6a6a6a]">
            {currentEmail || "Atur dan verifikasi email akun"}
          </p>
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-[#6a6a6a]" />
      </button>

      {/* 3. Ubah Kata Sandi */}
      <button
        type="button"
        onClick={() => {
          if (onChangePassword) {
            onChangePassword()
          } else {
            setCurrentView("password")
          }
        }}
        className="flex w-full cursor-pointer items-center gap-3.5 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 text-left shadow-xs transition-all hover:border-[#d5d5d5] hover:bg-[#faf5e8] active:scale-[0.99]"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#b8a4ed]/30 text-[#0a0a0a] shadow-xs">
          <KeyRoundIcon className="size-5 text-[#0a0a0a]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs font-bold text-[#0a0a0a] sm:text-sm">
              Ubah Kata Sandi
            </p>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#6a6a6a]">
              <ShieldCheckIcon className="size-3 text-emerald-600" />
              <span>Aman</span>
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-[#6a6a6a]">
            Ganti kata sandi akun Sekkha kamu
          </p>
        </div>
        <ChevronRightIcon className="size-4 shrink-0 text-[#6a6a6a]" />
      </button>

      {/* 4. Keluar (Logout) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setCurrentView("logout_confirm")}
          className="group flex w-full cursor-pointer items-center gap-3.5 rounded-[16px] border border-rose-200 bg-rose-50/50 p-3.5 text-left shadow-xs transition-all hover:bg-rose-100/70 active:scale-[0.99]"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-rose-200 bg-rose-100 text-rose-600 shadow-xs transition-colors group-hover:bg-rose-200">
            <LogOutIcon className="size-5 text-rose-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-rose-700 sm:text-sm">Keluar</p>
            <p className="mt-0.5 truncate text-xs text-rose-600/80">
              Keluar dari akun Sekkha kamu
            </p>
          </div>
          <ChevronRightIcon className="size-4 shrink-0 text-rose-400" />
        </button>
      </div>
    </div>
  )
}
