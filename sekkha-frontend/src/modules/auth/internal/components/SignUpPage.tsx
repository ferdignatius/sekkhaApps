import { useState } from "react"
import { useNavigate, Link } from "@tanstack/react-router"
import {
  SparklesIcon,
  CreditCardIcon,
  UserPlusIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  LockIcon,
  MailIcon,
  UserIcon,
} from "lucide-react"
import QRCode from "react-qr-code"
import { useAuth } from "../hooks/useAuth"
import { api } from "@/lib/api"
import { teamsApi } from "@/modules/teams/internal/api/teamsApi"
import { SocialAuthButton } from "./SocialAuthButton"

type SignUpStep = 1 | 2 | 3 | 4

export function SignUpPage() {
  const { authState, register } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<SignUpStep>(1)
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  // Step 1: Account Credentials Form
  const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({})

  // Step 2 choice ("claim" or "new")
  const [memberChoice, setMemberChoice] = useState<"claim" | "new">("claim")

  // Step 3A: Claim Existing Member Form
  const [claimForm, setClaimForm] = useState({
    target_user_id: "",
    verification_value: "",
  })

  // Step 3B: New Member Profile Form
  const [profileForm, setProfileForm] = useState({
    phone: "",
    school: "",
    birth_date: "",
    gender: "L",
  })

  // Step 4: Success state data
  const [successData, setSuccessData] = useState<{
    mode: "claimed" | "created"
    userNumber: string
    name: string
    attendancesCount?: number
    badgesCount?: number
    points?: number
  } | null>(null)

  const [copied, setCopied] = useState(false)

  // ── Step 1 Validation ────────────────────────────────────────────────────────
  function validateStep1(): boolean {
    const errs: Record<string, string> = {}
    if (!accountForm.name.trim()) {
      errs.name = "Nama lengkap wajib diisi."
    }
    if (!accountForm.email.trim()) {
      errs.email = "Email wajib diisi."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(accountForm.email.trim())) {
      errs.email = "Format email tidak valid."
    }
    if (!accountForm.password) {
      errs.password = "Password wajib diisi."
    } else if (accountForm.password.length < 6) {
      errs.password = "Password minimal 6 karakter."
    }
    if (!accountForm.confirmPassword) {
      errs.confirmPassword = "Konfirmasi password wajib diisi."
    } else if (accountForm.password !== accountForm.confirmPassword) {
      errs.confirmPassword = "Password dan konfirmasi password tidak cocok."
    }

    setAccountErrors(errs)
    return Object.keys(errs).length === 0
  }

  // ── Handle Step 1 Submit (Register Account) ──────────────────────────────────
  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validateStep1()) return

    try {
      setSubmitting(true)
      setApiError(null)
      await register(accountForm.email.trim(), accountForm.password, accountForm.name.trim())
      // Move to Step 2: Choose membership status
      setStep(2)
    } catch (err: any) {
      if (err.message?.includes("sudah terdaftar") || err.code === "EMAIL_ALREADY_EXISTS") {
        setApiError("Email sudah terdaftar. Silakan masuk atau gunakan email lain.")
      } else {
        setApiError(err.message || "Terjadi kesalahan saat mendaftar. Silakan coba lagi.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Handle Step 3A: Claim Existing Member ────────────────────────────────────
  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!claimForm.target_user_id.trim() || !claimForm.verification_value.trim()) return

    try {
      setSubmitting(true)
      setApiError(null)
      const res = await teamsApi.linkLegacyAccount({
        target_user_id: claimForm.target_user_id.trim(),
        verification_value: claimForm.verification_value.trim(),
      })

      setSuccessData({
        mode: "claimed",
        userNumber: res.data.claimed_user_number,
        name: accountForm.name.trim() || "Anggota Sekkha",
        attendancesCount: res.data.merged_attendances_count,
        badgesCount: res.data.merged_badges_count,
        points: res.data.new_total_points,
      })
      setStep(4)
    } catch (err: any) {
      setApiError(err.message || "Gagal menautkan akun. Pastikan Nomor Anggota dan nama/nomor HP cocok.")
    } finally {
      setSubmitting(false)
    }
  }

  // ── Handle Step 3B: Complete New Profile ─────────────────────────────────────
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSubmitting(true)
      setApiError(null)
      const res = await api.patch<{
        name: string
        user_number: string
        points: number
      }>("/users/me", {
        name: accountForm.name.trim() || undefined,
        phone: profileForm.phone.trim() || null,
        school: profileForm.school.trim() || null,
        birth_date: profileForm.birth_date || null,
        gender: profileForm.gender || "L",
      })

      setSuccessData({
        mode: "created",
        userNumber: res.user_number,
        name: res.name || accountForm.name.trim() || "Anggota Sekkha",
        points: 0,
      })
      setStep(4)
    } catch (err: any) {
      setApiError(err.message || "Gagal menyimpan data profil. Silakan coba lagi.")
    } finally {
      setSubmitting(false)
    }
  }

  function handleCopy(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleFinish() {
    void navigate({ to: "/home" })
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-4 py-8">
      <div className="w-full max-w-lg space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-1">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sekkha-brand-blue to-blue-700 text-white shadow-md shadow-blue-500/20 mb-2">
            <SparklesIcon className="size-6" />
          </div>
          <h1 className="text-heading-4 font-black text-sekkha-ink">Daftar Akun Sekkha</h1>
          <p className="text-body-sm text-sekkha-slate">
            {step === 1 && "Langkah 1 dari 3: Buat akun login Anda"}
            {step === 2 && "Langkah 2 dari 3: Pilih status keanggotaan"}
            {step === 3 && (memberChoice === "claim" ? "Langkah 3 dari 3: Tautkan nomor ID umat" : "Langkah 3 dari 3: Lengkapi profil data diri")}
            {step === 4 && "Selesai! Akun & ID Anggota Anda telah siap"}
          </p>
        </div>

        {/* Multi-Step Progress Indicator */}
        <div className="flex items-center justify-center gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-all duration-300 ${
                s === step
                  ? "w-8 bg-sekkha-brand-blue"
                  : s < step
                  ? "w-4 bg-emerald-500"
                  : "w-4 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Main Card Container */}
        <div className="rounded-3xl border border-sekkha-hairline bg-white p-6 sm:p-8 shadow-xl shadow-slate-200/50 space-y-5">

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 1: Account Credentials Form                                   */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === 1 && (
            <form onSubmit={handleAccountSubmit} className="space-y-4 animate-in fade-in">
              {apiError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 border border-red-200 text-caption text-red-800 animate-in fade-in">
                  <AlertTriangleIcon className="size-4 shrink-0 text-red-600" />
                  <span>{apiError}</span>
                </div>
              )}

              {/* Nama Lengkap */}
              <div className="space-y-1">
                <label className="text-caption font-bold text-sekkha-ink">Nama Lengkap</label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-3 size-4 text-sekkha-slate" />
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap Anda"
                    value={accountForm.name}
                    onChange={(e) => {
                      setAccountForm({ ...accountForm, name: e.target.value })
                      if (accountErrors.name) setAccountErrors({ ...accountErrors, name: "" })
                    }}
                    className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none transition-colors ${
                      accountErrors.name
                        ? "border-red-400 focus:border-red-500 bg-red-50/30"
                        : "border-sekkha-hairline-strong focus:border-sekkha-brand-blue"
                    }`}
                  />
                </div>
                {accountErrors.name && <p className="text-micro text-red-600">{accountErrors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-caption font-bold text-sekkha-ink">Email</label>
                <div className="relative">
                  <MailIcon className="absolute left-3.5 top-3 size-4 text-sekkha-slate" />
                  <input
                    type="email"
                    required
                    placeholder="nama@email.com"
                    value={accountForm.email}
                    onChange={(e) => {
                      setAccountForm({ ...accountForm, email: e.target.value })
                      if (accountErrors.email) setAccountErrors({ ...accountErrors, email: "" })
                    }}
                    className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none transition-colors ${
                      accountErrors.email
                        ? "border-red-400 focus:border-red-500 bg-red-50/30"
                        : "border-sekkha-hairline-strong focus:border-sekkha-brand-blue"
                    }`}
                  />
                </div>
                {accountErrors.email && <p className="text-micro text-red-600">{accountErrors.email}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-caption font-bold text-sekkha-ink">Password</label>
                <div className="relative">
                  <LockIcon className="absolute left-3.5 top-3 size-4 text-sekkha-slate" />
                  <input
                    type="password"
                    required
                    placeholder="Minimal 6 karakter"
                    value={accountForm.password}
                    onChange={(e) => {
                      setAccountForm({ ...accountForm, password: e.target.value })
                      if (accountErrors.password) setAccountErrors({ ...accountErrors, password: "" })
                    }}
                    className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none transition-colors ${
                      accountErrors.password
                        ? "border-red-400 focus:border-red-500 bg-red-50/30"
                        : "border-sekkha-hairline-strong focus:border-sekkha-brand-blue"
                    }`}
                  />
                </div>
                {accountErrors.password && <p className="text-micro text-red-600">{accountErrors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="text-caption font-bold text-sekkha-ink">Konfirmasi Password</label>
                <div className="relative">
                  <LockIcon className="absolute left-3.5 top-3 size-4 text-sekkha-slate" />
                  <input
                    type="password"
                    required
                    placeholder="Ulangi password Anda"
                    value={accountForm.confirmPassword}
                    onChange={(e) => {
                      setAccountForm({ ...accountForm, confirmPassword: e.target.value })
                      if (accountErrors.confirmPassword) setAccountErrors({ ...accountErrors, confirmPassword: "" })
                    }}
                    className={`w-full rounded-xl border pl-10 pr-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none transition-colors ${
                      accountErrors.confirmPassword
                        ? "border-red-400 focus:border-red-500 bg-red-50/30"
                        : "border-sekkha-hairline-strong focus:border-sekkha-brand-blue"
                    }`}
                  />
                </div>
                {accountErrors.confirmPassword && (
                  <p className="text-micro text-red-600">{accountErrors.confirmPassword}</p>
                )}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue py-3 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  <span>{submitting ? "Mendaftarkan..." : "Lanjut ke Data Keanggotaan"}</span>
                  <ArrowRightIcon className="size-4" />
                </button>
              </div>

              {/* Social Login Divider */}
              <div className="relative my-4 text-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-sekkha-hairline-soft" />
                </div>
                <span className="relative bg-white px-3 text-micro font-medium uppercase text-sekkha-slate">
                  atau
                </span>
              </div>

              <SocialAuthButton
                provider="google"
                mode="sign-up"
                onError={(err) => setApiError(err)}
              />

              <p className="text-center text-caption text-sekkha-slate pt-2">
                Sudah punya akun?{" "}
                <Link to="/login" className="font-bold text-sekkha-brand-blue hover:underline">
                  Masuk di sini
                </Link>
              </p>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 2: Choose Membership Status                                   */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in">
              <div className="text-center space-y-1">
                <p className="text-caption-bold text-sekkha-ink">
                  Apakah Anda pernah didaftarkan oleh Pengurus Vihara sebelumnya?
                </p>
                <p className="text-micro text-sekkha-slate">
                  Pilih opsi di bawah agar riwayat kebaktian dan poin Anda tidak hilang.
                </p>
              </div>

              <div className="grid gap-3.5 sm:grid-cols-2">
                {/* Option A: Claim ID */}
                <button
                  type="button"
                  onClick={() => {
                    setMemberChoice("claim")
                    setApiError(null)
                    setStep(3)
                  }}
                  className="group flex flex-col justify-between rounded-2xl border-2 border-sekkha-hairline bg-white p-4.5 text-left transition-all hover:border-sekkha-brand-blue hover:bg-blue-50/40 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="space-y-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-blue-100 text-sekkha-brand-blue group-hover:bg-sekkha-brand-blue group-hover:text-white transition-colors">
                      <CreditCardIcon className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-body-sm font-extrabold text-sekkha-ink group-hover:text-sekkha-brand-blue transition-colors">
                        Punya Nomor Anggota
                      </h3>
                      <p className="text-micro text-sekkha-slate leading-relaxed">
                        Pernah dicatat presensi saat kebaktian atau sudah memegang kartu ID fisik vihara.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center gap-1 text-caption-bold text-sekkha-brand-blue">
                    <span>Tautkan ID</span>
                    <ArrowRightIcon className="size-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Option B: New Member */}
                <button
                  type="button"
                  onClick={() => {
                    setMemberChoice("new")
                    setApiError(null)
                    setStep(3)
                  }}
                  className="group flex flex-col justify-between rounded-2xl border-2 border-sekkha-hairline bg-white p-4.5 text-left transition-all hover:border-emerald-500 hover:bg-emerald-50/40 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="space-y-2.5">
                    <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <UserPlusIcon className="size-5" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-body-sm font-extrabold text-sekkha-ink group-hover:text-emerald-700 transition-colors">
                        Saya Anggota Baru
                      </h3>
                      <p className="text-micro text-sekkha-slate leading-relaxed">
                        Belum pernah dicatat sebelumnya. Buat profil baru dan dapatkan ID Anggota Sekkha resmi.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3.5 flex items-center gap-1 text-caption-bold text-emerald-700">
                    <span>Lengkapi Data</span>
                    <ArrowRightIcon className="size-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="text-caption font-semibold text-sekkha-slate hover:text-sekkha-ink hover:underline transition-colors"
                >
                  Lewati untuk sekarang (bisa ditautkan nanti di Profil) →
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 3A: Claim Existing Member Form                                */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === 3 && memberChoice === "claim" && (
            <form onSubmit={handleClaimSubmit} className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 text-caption font-semibold text-sekkha-slate hover:text-sekkha-ink"
                >
                  <ArrowLeftIcon className="size-4" />
                  <span>Kembali</span>
                </button>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-micro-bold text-sekkha-brand-blue">
                  Klaim ID Anggota
                </span>
              </div>

              {apiError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 border border-red-200 text-caption text-red-800 animate-in fade-in">
                  <AlertTriangleIcon className="size-4 shrink-0 text-red-600" />
                  <span>{apiError}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-caption font-bold text-sekkha-ink">
                  Nomor Unik Anggota (User ID) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 202608210001"
                  value={claimForm.target_user_id}
                  onChange={(e) => setClaimForm({ ...claimForm, target_user_id: e.target.value })}
                  className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 font-mono text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                />
                <p className="text-micro text-sekkha-slate">Nomor ID yang tertera pada kartu fisik atau yang diberikan pengurus.</p>
              </div>

              <div className="space-y-1">
                <label className="text-caption font-bold text-sekkha-ink">
                  Verifikasi Keamanan (Nama Lengkap / 4 Digit No HP) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nama lengkap atau 4 digit akhir HP Anda"
                  value={claimForm.verification_value}
                  onChange={(e) => setClaimForm({ ...claimForm, verification_value: e.target.value })}
                  className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                />
                <p className="text-micro text-sekkha-slate">Untuk memastikan Anda adalah pemilik sah dari data keanggotaan ini.</p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue py-3 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {submitting ? "Memverifikasi & Menggabungkan..." : "Verifikasi & Hubungkan Akun"}
                </button>
              </div>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 3B: Complete Profile Form for New Member                      */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === 3 && memberChoice === "new" && (
            <form onSubmit={handleProfileSubmit} className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-1 text-caption font-semibold text-sekkha-slate hover:text-sekkha-ink"
                >
                  <ArrowLeftIcon className="size-4" />
                  <span>Kembali</span>
                </button>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-micro-bold text-emerald-800">
                  Lengkapi Profil
                </span>
              </div>

              {apiError && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 border border-red-200 text-caption text-red-800">
                  <AlertTriangleIcon className="size-4 shrink-0 text-red-600" />
                  <span>{apiError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Nomor HP / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="081234567890"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Asal Sekolah / Kampus</label>
                  <input
                    type="text"
                    placeholder="SMA Dharma Widya"
                    value={profileForm.school}
                    onChange={(e) => setProfileForm({ ...profileForm, school: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={profileForm.birth_date}
                    onChange={(e) => setProfileForm({ ...profileForm, birth_date: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Jenis Kelamin</label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue py-3 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan & Buat ID Anggota"}
                </button>
              </div>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 4: Success & Digital ID Card                                   */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === 4 && successData && (
            <div className="space-y-5 text-center animate-in fade-in">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                <CheckCircleIcon className="size-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-heading-5 font-black text-sekkha-ink">
                  {successData.mode === "claimed" ? "Akun Berhasil Ditautkan!" : "ID Anggota Anda Siap!"}
                </h3>
                <p className="text-body-sm text-sekkha-slate">
                  {successData.mode === "claimed"
                    ? "Seluruh riwayat presensi & poin lama berhasil digabungkan ke akun Anda."
                    : "Nomor ID resmi Vihara Sekkha Anda berhasil dibuat."}
                </p>
              </div>

              {/* Digital Card Preview */}
              <div className="rounded-2xl border-2 border-sekkha-brand-blue/30 bg-gradient-to-br from-blue-50/60 via-white to-indigo-50/40 p-5 text-left shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-2">
                  <span className="text-micro-bold uppercase tracking-wider text-sekkha-brand-blue">
                    Kartu Anggota Sekkha
                  </span>
                  <span className="rounded-full bg-emerald-100 border border-emerald-300 px-2 py-0.5 text-micro-bold text-emerald-800">
                    Aktif
                  </span>
                </div>

                <div className="flex items-center gap-4 py-1">
                  <div className="rounded-xl border border-slate-200 bg-white p-2 shrink-0">
                    <QRCode
                      value={successData.userNumber}
                      size={90}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox="0 0 256 256"
                    />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <p className="text-body-base font-extrabold text-sekkha-ink truncate">{successData.name}</p>
                    <p className="font-mono text-caption-bold text-sekkha-brand-blue">{successData.userNumber}</p>
                    <button
                      type="button"
                      onClick={() => handleCopy(successData.userNumber)}
                      className="flex items-center gap-1 text-micro-bold text-sekkha-slate hover:text-sekkha-brand-blue transition-colors"
                    >
                      {copied ? <CheckIcon className="size-3 text-emerald-600" /> : <CopyIcon className="size-3" />}
                      <span>{copied ? "ID Tersalin!" : "Salin ID Anggota"}</span>
                    </button>
                  </div>
                </div>

                {successData.attendancesCount !== undefined && successData.attendancesCount > 0 && (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 p-2.5 border border-emerald-200 text-micro text-emerald-900">
                    <span>🎉 Riwayat Hadir Tersambung:</span>
                    <span className="font-bold">+{successData.attendancesCount} Hadir ({successData.points} Poin)</span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue py-3 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all"
              >
                <span>Masuk ke Beranda Sekkha</span>
                <ArrowRightIcon className="size-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </main>
  )
}
