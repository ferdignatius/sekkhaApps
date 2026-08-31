import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  SparklesIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
} from "lucide-react"
import QRCode from "react-qr-code"
import { api } from "@/lib/api"
import { useAuth } from "@/modules/auth"

type OnboardingStep = "profile" | "success"

export function OnboardingPage() {
  const { authState } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<OnboardingStep>("profile")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Profile Form
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    school: "",
    birth_date: "",
    gender: "L",
  })

  // Success state data
  const [successData, setSuccessData] = useState<{
    userNumber: string
    name: string
  } | null>(null)

  const [copied, setCopied] = useState(false)

  useEffect(() => {
    api.get<{ name?: string; phone?: string; school?: string }>("/users/me")
      .then((u) => {
        if (u.name) setProfileForm((prev) => ({ ...prev, name: u.name || "" }))
        if (u.phone) setProfileForm((prev) => ({ ...prev, phone: u.phone || "" }))
        if (u.school) setProfileForm((prev) => ({ ...prev, school: u.school || "" }))
      })
      .catch(() => {})
  }, [])

  // Handle Profile Submission
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
        userNumber: res.user_number,
        name: res.name || profileForm.name || (authState.name ? authState.name : "Umat Sekkha"),
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
            {step === "profile" && "Lengkapi profil singkat Anda untuk mengaktifkan Nomor Anggota resmi"}
            {step === "success" && "Akun Anda telah siap digunakan!"}
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border border-sekkha-hairline bg-white/95 p-6 sm:p-8 shadow-xl shadow-slate-200/50 backdrop-blur-sm space-y-6">

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 1: COMPLETE PROFILE                                           */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === "profile" && (
            <form onSubmit={handleProfileSubmit} className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
                <span className="text-caption-bold text-sekkha-ink">Lengkapi Informasi Diri</span>
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-micro-bold text-emerald-800">
                  Langkah 1 dari 1
                </span>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3.5 border border-red-200 text-caption text-red-800">
                  <AlertTriangleIcon className="size-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-caption font-bold text-sekkha-ink">Nama Lengkap</label>
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
                    placeholder="Contoh: SMA Dharma Widya"
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
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue bg-white"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 space-y-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue py-3 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Menyimpan..." : "Simpan & Dapatkan ID Anggota"}
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full text-center text-caption font-semibold text-sekkha-slate hover:text-sekkha-ink py-1.5 transition-colors cursor-pointer"
                >
                  Lewati untuk sekarang →
                </button>
              </div>
            </form>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 2: SUCCESS & DIGITAL ID CARD PREVIEW                          */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === "success" && successData && (
            <div className="space-y-5 text-center animate-in fade-in">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                <CheckCircleIcon className="size-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-heading-5 font-black text-sekkha-ink">
                  ID Anggota Anda Siap!
                </h3>
                <p className="text-body-sm text-sekkha-slate">
                  Nomor ID resmi Vihara Sekkha Anda berhasil dibuat dan siap digunakan untuk presensi.
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
                      className="flex items-center gap-1 text-micro-bold text-sekkha-slate hover:text-sekkha-brand-blue transition-colors cursor-pointer"
                    >
                      {copied ? <CheckIcon className="size-3 text-emerald-600" /> : <CopyIcon className="size-3" />}
                      <span>{copied ? "ID Tersalin!" : "Salin ID Anggota"}</span>
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue py-3 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
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
