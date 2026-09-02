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
    <main className="min-h-screen flex items-center justify-center bg-[#fffaf0] p-4 py-12 font-sans selection:bg-[#f5f0e0] selection:text-[#0a0a0a]">
      <div className="w-full max-w-xl space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2.5">
          <div className="mx-auto flex size-13 items-center justify-center rounded-[16px] bg-[#0a0a0a] text-white shadow-xs">
            <SparklesIcon className="size-6 text-[#e8b94a]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a0a0a]">Selamat Datang di Sekkha</h1>
          <p className="text-xs sm:text-sm text-[#6a6a6a] font-medium">
            {step === "profile" && "Lengkapi profil singkat Anda untuk mengaktifkan Nomor Anggota resmi"}
            {step === "success" && "Akun Anda telah siap digunakan!"}
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] p-6 sm:p-8 shadow-xl shadow-[#0a0a0a]/5 space-y-6">

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 1: COMPLETE PROFILE                                           */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === "profile" && (
            <form onSubmit={handleProfileSubmit} className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                <span className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider">Lengkapi Informasi Diri</span>
                <span className="rounded-full bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-0.5 text-xs font-semibold text-[#0a0a0a]">
                  Langkah 1 dari 1
                </span>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 rounded-[12px] bg-[#ef4444]/10 p-3.5 border border-[#ef4444]/20 text-xs text-[#ef4444] font-medium">
                  <AlertTriangleIcon className="size-4 shrink-0 text-[#ef4444]" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0a0a0a]">Nama Lengkap</label>
                <input
                  type="text"
                  placeholder="Nama Lengkap Anda"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] placeholder:text-[#9a9a9a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0a0a0a]">Nomor HP / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="081234567890"
                    value={profileForm.phone}
                    onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] placeholder:text-[#9a9a9a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0a0a0a]">Asal Sekolah / Kampus</label>
                  <input
                    type="text"
                    placeholder="Contoh: SMA Dharma Widya"
                    value={profileForm.school}
                    onChange={(e) => setProfileForm({ ...profileForm, school: e.target.value })}
                    className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] placeholder:text-[#9a9a9a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0a0a0a]">Tanggal Lahir</label>
                  <input
                    type="date"
                    value={profileForm.birth_date}
                    onChange={(e) => setProfileForm({ ...profileForm, birth_date: e.target.value })}
                    className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] placeholder:text-[#9a9a9a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0a0a0a]">Jenis Kelamin</label>
                  <select
                    value={profileForm.gender}
                    onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                    className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
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
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-sm font-semibold text-white shadow-xs hover:bg-[#1f1f1f] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Menyimpan..." : "Simpan & Dapatkan ID Anggota"}
                </button>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full text-center text-xs font-semibold text-[#6a6a6a] hover:text-[#0a0a0a] py-2 transition-colors cursor-pointer"
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
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#22c55e]/10 text-[#22c55e] border border-[#22c55e]/20 shadow-xs">
                <CheckCircleIcon className="size-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-bold text-[#0a0a0a]">
                  ID Anggota Anda Siap!
                </h3>
                <p className="text-xs text-[#6a6a6a]">
                  Nomor ID resmi Vihara Sekkha Anda berhasil dibuat dan siap digunakan untuk presensi.
                </p>
              </div>

              {/* Digital Card Preview — Clay Card Token */}
              <div className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-5 text-left shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-[1.5px] text-[#0a0a0a]">
                    Kartu Anggota Sekkha
                  </span>
                  <span className="rounded-full bg-[#22c55e]/10 border border-[#22c55e]/30 px-2 py-0.5 text-[11px] font-bold text-[#22c55e]">
                    Aktif
                  </span>
                </div>

                <div className="flex items-center gap-4 py-1">
                  <div className="rounded-[12px] border border-[#e5e5e5] bg-white p-2.5 shrink-0 shadow-2xs">
                    <QRCode
                      value={successData.userNumber}
                      size={90}
                      style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                      viewBox="0 0 256 256"
                    />
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <p className="text-sm font-bold text-[#0a0a0a] truncate">{successData.name}</p>
                    <p className="font-mono text-xs font-bold text-[#0a0a0a] bg-[#ebe6d6] px-2 py-0.5 rounded-[6px] inline-block">{successData.userNumber}</p>
                    <div>
                      <button
                        type="button"
                        onClick={() => handleCopy(successData.userNumber)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors cursor-pointer"
                      >
                        {copied ? <CheckIcon className="size-3.5 text-[#22c55e]" /> : <CopyIcon className="size-3.5" />}
                        <span>{copied ? "ID Tersalin!" : "Salin ID Anggota"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleFinish}
                className="w-full h-11 flex items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-sm font-semibold text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer"
              >
                <span>Masuk ke Dashboard Sekkha</span>
                <ArrowRightIcon className="size-4 ml-1" />
              </button>
            </div>
          )}

        </div>

      </div>
    </main>
  )
}
