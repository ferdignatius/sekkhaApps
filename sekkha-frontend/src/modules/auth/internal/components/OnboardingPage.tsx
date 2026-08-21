import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
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
} from "lucide-react"
import QRCode from "react-qr-code"
import { api } from "@/lib/api"
import { useAuth } from "@/modules/auth"
import { teamsApi } from "@/modules/teams/internal/api/teamsApi"

type OnboardingStep = "choice" | "claim" | "profile" | "success"

export function OnboardingPage() {
  const { authState } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<OnboardingStep>("choice")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ name?: string; phone?: string; school?: string }>("/users/me")
      .then((u) => {
        if (u.name) setProfileForm((prev) => ({ ...prev, name: u.name || "" }))
        if (u.phone) setProfileForm((prev) => ({ ...prev, phone: u.phone || "" }))
        if (u.school) setProfileForm((prev) => ({ ...prev, school: u.school || "" }))
      })
      .catch(() => {})
  }, [])

  // Step 2A: Claim Form
  const [claimForm, setClaimForm] = useState({
    target_user_id: "",
    verification_value: "",
  })

  // Step 2B: New User Profile Form
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    school: "",
    birth_date: "",
    gender: "L",
  })

  // Success state data
  const [successData, setSuccessData] = useState<{
    mode: "claimed" | "created"
    userNumber: string
    name: string
    attendancesCount?: number
    badgesCount?: number
    points?: number
  } | null>(null)

  const [copied, setCopied] = useState(false)

  // Handle Claim Submission
  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!claimForm.target_user_id.trim() || !claimForm.verification_value.trim()) return

    try {
      setSubmitting(true)
      setErrorMsg(null)
      const res = await teamsApi.linkLegacyAccount({
        target_user_id: claimForm.target_user_id.trim(),
        verification_value: claimForm.verification_value.trim(),
      })

      setSuccessData({
        mode: "claimed",
        userNumber: res.data.claimed_user_number,
        name: authState.status === "authenticated" ? (authState as any).name || "Umat Sekkha" : "Umat Sekkha",
        attendancesCount: res.data.merged_attendances_count,
        badgesCount: res.data.merged_badges_count,
        points: res.data.new_total_points,
      })
      setStep("success")
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menautkan akun. Pastikan Nomor Anggota dan nama/nomor HP cocok.")
    } finally {
      setSubmitting(false)
    }
  }

  // Handle New Profile Submission
  async function handleProfileSubmit(e: React.FormEvent) {
    e.preventDefault()

    try {
      setSubmitting(true)
      setErrorMsg(null)
      const res = await api.patch<{
        name: string
        user_number: string
        points: number
      }>("/users/me", {
        name: profileForm.name.trim() || undefined,
        phone: profileForm.phone.trim() || null,
        school: profileForm.school.trim() || null,
        birth_date: profileForm.birth_date || null,
        gender: profileForm.gender || "L",
      })

      setSuccessData({
        mode: "created",
        userNumber: res.user_number,
        name: res.name || profileForm.name || "Umat Sekkha",
        points: 0,
      })
      setStep("success")
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan profil. Silakan coba lagi.")
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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-blue-50/50 p-4 py-12">
      <div className="w-full max-w-xl space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sekkha-brand-blue to-blue-700 text-white shadow-md shadow-blue-500/20">
            <SparklesIcon className="size-6" />
          </div>
          <h1 className="text-heading-4 font-black text-sekkha-ink">Selamat Datang di Sekkha</h1>
          <p className="text-body-sm text-sekkha-slate">
            {step === "choice" && "Satu langkah singkat untuk menyesuaikan akun dan riwayat kehadiran Anda"}
            {step === "claim" && "Tautkan data historis yang telah dicatat oleh Pengurus Vihara"}
            {step === "profile" && "Lengkapi profil Anda untuk menerbitkan Nomor Anggota resmi"}
            {step === "success" && "Akun Anda telah siap digunakan!"}
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border border-sekkha-hairline bg-white/95 p-6 sm:p-8 shadow-xl shadow-slate-200/50 backdrop-blur-sm space-y-6">

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 1: CHOICE (Claim Existing vs New Member)                      */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === "choice" && (
            <div className="space-y-5 animate-in fade-in">
              <p className="text-caption font-bold uppercase tracking-wider text-sekkha-slate text-center">
                Pilih Status Keanggotaan Anda
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Option A: Sudah Pernah Didaftarkan Pengurus (Claim) */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null)
                    setStep("claim")
                  }}
                  className="group flex flex-col justify-between rounded-2xl border-2 border-sekkha-hairline bg-white p-5 text-left transition-all hover:border-sekkha-brand-blue hover:bg-blue-50/40 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="space-y-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-blue-100 text-sekkha-brand-blue group-hover:bg-sekkha-brand-blue group-hover:text-white transition-colors">
                      <CreditCardIcon className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-body-base font-extrabold text-sekkha-ink group-hover:text-sekkha-brand-blue transition-colors">
                        Punya Nomor Anggota
                      </h3>
                      <p className="text-micro text-sekkha-slate leading-relaxed">
                        Pernah dicatat presensi oleh pengurus saat kebaktian atau sudah memiliki kartu ID fisik vihara.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 text-caption-bold text-sekkha-brand-blue">
                    <span>Tautkan Akun</span>
                    <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Option B: Pengguna Baru (Create New) */}
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null)
                    setStep("profile")
                  }}
                  className="group flex flex-col justify-between rounded-2xl border-2 border-sekkha-hairline bg-white p-5 text-left transition-all hover:border-emerald-500 hover:bg-emerald-50/40 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="space-y-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                      <UserPlusIcon className="size-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-body-base font-extrabold text-sekkha-ink group-hover:text-emerald-700 transition-colors">
                        Saya Anggota Baru
                      </h3>
                      <p className="text-micro text-sekkha-slate leading-relaxed">
                        Belum pernah dicatat di sistem. Buat profil baru dan dapatkan Nomor Unik ID Sekkha perdana.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 text-caption-bold text-emerald-700">
                    <span>Lengkapi Data</span>
                    <ArrowRightIcon className="size-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>

              {/* Skip Option */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="text-caption font-semibold text-sekkha-slate hover:text-sekkha-ink hover:underline transition-colors"
                >
                  Lewati untuk sekarang (bisa ditautkan nanti di menu Profil) →
                </button>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 2A: CLAIM EXISTING PRE-PROVISIONED ACCOUNT                    */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === "claim" && (
            <form onSubmit={handleClaimSubmit} className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
                <button
                  type="button"
                  onClick={() => setStep("choice")}
                  className="flex items-center gap-1 text-caption font-semibold text-sekkha-slate hover:text-sekkha-ink"
                >
                  <ArrowLeftIcon className="size-4" />
                  <span>Kembali</span>
                </button>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-micro-bold text-sekkha-brand-blue">
                  Klaim ID Anggota
                </span>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 border border-red-200 text-caption text-red-800 animate-in fade-in">
                  <AlertTriangleIcon className="size-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
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
                <p className="text-micro text-sekkha-slate">Nomor ID yang tertera pada kartu atau yang dibagikan pengurus.</p>
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
                <p className="text-micro text-sekkha-slate">Sistem mencocokkan data ini untuk memastikan kepemilikan akun Anda.</p>
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
          {/* STEP 2B: COMPLETE NEW MEMBER PROFILE                               */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === "profile" && (
            <form onSubmit={handleProfileSubmit} className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
                <button
                  type="button"
                  onClick={() => setStep("choice")}
                  className="flex items-center gap-1 text-caption font-semibold text-sekkha-slate hover:text-sekkha-ink"
                >
                  <ArrowLeftIcon className="size-4" />
                  <span>Kembali</span>
                </button>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-micro-bold text-emerald-800">
                  Lengkapi Profil Baru
                </span>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 border border-red-200 text-caption text-red-800">
                  <AlertTriangleIcon className="size-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-caption font-bold text-sekkha-ink">Nama Lengkap / Panggilan</label>
                <input
                  type="text"
                  placeholder="Nama Lengkap Anda"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Nomor HP / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="081234567890"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Asal Sekolah / Kampus</label>
                  <input
                    type="text"
                    placeholder="SMA Dharma Widya"
                    value={profileForm.school}
                    onChange={(e) => setProfileForm({ ...profileForm, school: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
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
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-caption font-semibold text-sekkha-slate">Jenis Kelamin</label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
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
          {/* STEP 3: SUCCESS & DIGITAL ID CARD PREVIEW                          */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === "success" && successData && (
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
                <span>Masuk ke Dashboard Sekkha</span>
                <ArrowRightIcon className="size-4" />
              </button>
            </div>
          )}

        </div>

      </div>
    </main>
  )
}
