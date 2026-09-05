import { useState, useEffect } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  CheckCircleIcon,
  AlertTriangleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckIcon,
  CopyIcon,
  UserIcon,
  GraduationCapIcon,
  UsersIcon,
  SparklesIcon,
  PhoneIcon,
  CalendarIcon,
  AtSignIcon,
} from "lucide-react"
import QRCode from "react-qr-code"
import { api } from "@/lib/api"
import { useAuth } from "@/modules/auth"
import { SchoolCombobox, type SchoolOption } from "@/components/ui/SchoolCombobox"

type OnboardingStep = "identity" | "academic" | "success"

interface SimilarUsersStats {
  school: string
  class_grade: string
  totalInSchool: number
  totalInClass: number
}

// Tingkatan HANYA untuk SMP, SMA, dan SMK. Tidak ada untuk Universitas & Umum.
const SMP_GRADE_OPTIONS = [
  { label: "Kelas 7 (SMP)", value: "Kelas 7" },
  { label: "Kelas 8 (SMP)", value: "Kelas 8" },
  { label: "Kelas 9 (SMP)", value: "Kelas 9" },
]

const SMA_SMK_GRADE_OPTIONS = [
  { label: "Kelas 10 (SMA / SMK)", value: "Kelas 10" },
  { label: "Kelas 11 (SMA / SMK)", value: "Kelas 11" },
  { label: "Kelas 12 (SMA / SMK)", value: "Kelas 12" },
]

export function OnboardingPage() {
  const { authState, updateUser } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState<OnboardingStep>("identity")
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Profile Form State:
  // - username: autofilled from existing account/email, editable, mandatory
  // - name (fullname): empty by default, typed by user, mandatory
  const [profileForm, setProfileForm] = useState({
    username: "",
    name: "",
    phone: "",
    birth_date: "",
    gender: "L",
    school: "",
    class_grade: "",
  })

  // Selected school metadata
  const [selectedSchoolType, setSelectedSchoolType] = useState<string | null>(null)

  // Stats for matching/similar users
  const [stats, setStats] = useState<SimilarUsersStats | null>(null)
  const [loadingStats, setLoadingStats] = useState(false)

  // Success state data
  const [successData, setSuccessData] = useState<{
    userNumber: string
    name: string
    username?: string
    school?: string
    classGrade?: string
  } | null>(null)

  const [copied, setCopied] = useState(false)

  // Whether the selected institution has grade levels (Only SMP, SMA, SMK)
  const hasGradeLevel =
    selectedSchoolType === "SMP" ||
    selectedSchoolType === "SMA" ||
    selectedSchoolType === "SMK"

  // Grade options based on school type
  const availableGradeOptions =
    selectedSchoolType === "SMP"
      ? SMP_GRADE_OPTIONS
      : selectedSchoolType === "SMA" || selectedSchoolType === "SMK"
      ? SMA_SMK_GRADE_OPTIONS
      : []

  // Prefill profile data on mount:
  // Autofill username, but keep name (fullname) EMPTY by default.
  useEffect(() => {
    api.get<{
      username?: string
      name?: string
      email?: string
      phone?: string
      school?: string
      class_grade?: string
      birth_date?: string
      gender?: string
    }>("/users/me")
      .then(async (u) => {
        const autoUsername =
          u.username ||
          (u.email ? u.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "") : "")

        setProfileForm((prev) => ({
          ...prev,
          username: autoUsername || prev.username,
          name: "", // Full Name must be empty by default!
          phone: u.phone || prev.phone,
          school: u.school || prev.school,
          class_grade: u.class_grade || prev.class_grade,
          gender: u.gender || prev.gender,
          birth_date: u.birth_date ? u.birth_date.split("T")[0] : prev.birth_date,
        }))

        // Look up school type if school is already set
        if (u.school) {
          try {
            const res = await api.get<{ schools: SchoolOption[] }>(
              `/schools?limit=200&search=${encodeURIComponent(u.school)}`
            )
            const matched = res.schools?.find(
              (s) => s.name.toLowerCase() === u.school?.toLowerCase()
            )
            if (matched) {
              setSelectedSchoolType(matched.type)
            }
          } catch {}
        }
      })
      .catch(() => {})
  }, [])

  // Fetch similar users stats when school or class_grade changes
  useEffect(() => {
    if (!profileForm.school) {
      setStats(null)
      return
    }

    let isCurrent = true
    setLoadingStats(true)

    const params = new URLSearchParams()
    params.set("school", profileForm.school)
    if (hasGradeLevel && profileForm.class_grade) {
      params.set("class_grade", profileForm.class_grade)
    }

    api
      .get<SimilarUsersStats>(`/schools/stats?${params.toString()}`)
      .then((res) => {
        if (isCurrent) {
          setStats(res)
        }
      })
      .catch(() => {
        if (isCurrent) setStats(null)
      })
      .finally(() => {
        if (isCurrent) setLoadingStats(false)
      })

    return () => {
      isCurrent = false
    }
  }, [profileForm.school, profileForm.class_grade, hasGradeLevel])

  // Step 1 Validation & Next
  function handleGoToStep2(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    // 1. Username Validation (Mandatory)
    const cleanUsername = profileForm.username.trim().toLowerCase()
    if (!cleanUsername) {
      setErrorMsg("Username wajib diisi.")
      return
    }
    if (cleanUsername.length < 3) {
      setErrorMsg("Username minimal 3 karakter.")
      return
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      setErrorMsg("Username hanya boleh berisi huruf, angka, titik (.), atau garis bawah (_).")
      return
    }

    // 2. Full Name Validation (Mandatory & must not be empty)
    if (!profileForm.name.trim()) {
      setErrorMsg("Nama Lengkap (Full Name) wajib diisi.")
      return
    }
    if (profileForm.name.trim().length < 2) {
      setErrorMsg("Nama Lengkap minimal 2 karakter.")
      return
    }

    // 3. Tanggal Lahir (Mandatory)
    if (!profileForm.birth_date) {
      setErrorMsg("Tanggal lahir wajib diisi untuk verifikasi data anggota.")
      return
    }

    // 4. Nomor Telepon (Mandatory)
    if (!profileForm.phone.trim()) {
      setErrorMsg("Nomor HP / WhatsApp wajib diisi.")
      return
    }

    // Move to step 2
    setStep("academic")
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  // Handle School Selection Change
  function handleSchoolChange(schoolName: string, schoolObj?: SchoolOption) {
    const nextType = schoolObj?.type || null
    setSelectedSchoolType(nextType)

    const nextHasGrade =
      nextType === "SMP" || nextType === "SMA" || nextType === "SMK"

    setProfileForm((prev) => ({
      ...prev,
      school: schoolName,
      // Clear class_grade if the new school has no grade levels (Universitas or Umum)
      class_grade: nextHasGrade ? prev.class_grade : "",
    }))
  }

  // Step 2 Submission (Complete Onboarding)
  async function handleCompleteOnboarding(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg(null)

    if (!profileForm.school.trim()) {
      setErrorMsg("Silakan pilih asal sekolah atau kampus Anda dari master data.")
      return
    }

    // Hanya SMP, SMA, SMK yang wajib mengisi tingkatan kelas
    if (hasGradeLevel && !profileForm.class_grade.trim()) {
      setErrorMsg("Silakan pilih kelas Anda saat ini.")
      return
    }

    try {
      setSubmitting(true)
      setErrorMsg(null)
      const res = await api.patch<{
        name: string
        username?: string
        user_number: string
        points: number
        school?: string
        class_grade?: string
      }>("/users/me", {
        username: profileForm.username.trim().toLowerCase(),
        name: profileForm.name.trim(),
        phone: profileForm.phone.trim() || null,
        school: profileForm.school.trim() || null,
        class_grade: hasGradeLevel && profileForm.class_grade ? profileForm.class_grade.trim() : null,
        birth_date: profileForm.birth_date || null,
        gender: profileForm.gender || "L",
      })

      const finalName = res.name || profileForm.name.trim()
      updateUser({ name: finalName })
      window.dispatchEvent(new CustomEvent("sekkha:profile_updated", { detail: { name: finalName } }))

      setSuccessData({
        userNumber: res.user_number,
        name: finalName || (authState.name ? authState.name : "Umat Sekkha"),
        username: res.username || profileForm.username.trim().toLowerCase(),
        school: profileForm.school,
        classGrade: hasGradeLevel ? profileForm.class_grade : undefined,
      })
      setStep("success")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data onboarding. Silakan coba lagi.")
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
    <main className="min-h-screen flex items-center justify-center bg-[#fffaf0] p-4 py-10 font-sans selection:bg-[#f5f0e0] selection:text-[#0a0a0a]">
      <div className="w-full max-w-xl space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex size-14 items-center justify-center">
            <img src="/sekkha_logo.svg" alt="Sekkha Logo" className="size-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0a0a0a]">
            Selamat Datang di Sekkha
          </h1>
          <p className="text-xs sm:text-sm text-[#6a6a6a] font-medium max-w-md mx-auto">
            {step === "identity" && "Langkah 1: Lengkapi profil identitas Anda untuk penerbitan ID Anggota resmi"}
            {step === "academic" && "Langkah 2: Lengkapi almamater Anda & temukan rekan sekomunitas"}
            {step === "success" && "Akun & Kartu Anggota Digital Anda telah siap digunakan!"}
          </p>
        </div>

        {/* Step Progress Indicator */}
        {step !== "success" && (
          <div className="rounded-[16px] border border-[#e5e5e5] bg-[#ffffff] p-3 shadow-xs">
            <div className="flex items-center justify-between gap-2">
              {/* Step 1 Indicator */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-semibold ${
                  step === "identity"
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/30"
                }`}
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-current/20 text-[11px] font-bold">
                  {step === "academic" ? <CheckIcon className="size-3" /> : "1"}
                </span>
                <span className="hidden sm:inline">Data Pribadi</span>
              </div>

              {/* Progress Connector Line */}
              <div className="h-0.5 flex-1 bg-[#e5e5e5] relative overflow-hidden rounded-full mx-1">
                <div
                  className={`h-full bg-[#0a0a0a] transition-all duration-300 ${
                    step === "academic" ? "w-full" : "w-1/2"
                  }`}
                />
              </div>

              {/* Step 2 Indicator */}
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all text-xs font-semibold ${
                  step === "academic"
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-[#faf5e8] text-[#6a6a6a] border border-[#e5e5e5]"
                }`}
              >
                <span className="flex size-5 items-center justify-center rounded-full bg-current/20 text-[11px] font-bold">
                  2
                </span>
                <span className="hidden sm:inline">
                  {hasGradeLevel ? "Sekolah & Kelas" : "Almamater / Institusi"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Main Card */}
        <div className="rounded-[24px] border border-[#e5e5e5] bg-[#ffffff] p-6 sm:p-8 shadow-xl shadow-[#0a0a0a]/5 space-y-6">

          {/* Error Alert */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-[12px] bg-[#ef4444]/10 p-3.5 border border-[#ef4444]/20 text-xs text-[#ef4444] font-medium animate-in fade-in">
              <AlertTriangleIcon className="size-4 shrink-0 text-[#ef4444]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────────── */}
          {/* STEP 1: USERNAME, FULLNAME, TANGGAL LAHIR, NOMOR TELEPON            */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === "identity" && (
            <form onSubmit={handleGoToStep2} className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                <div className="flex items-center gap-2">
                  <UserIcon className="size-4 text-[#0a0a0a]" />
                  <span className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider">
                    Informasi Identitas Diri
                  </span>
                </div>
                <span className="rounded-full bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-0.5 text-[11px] font-semibold text-[#0a0a0a]">
                  Langkah 1 dari 2
                </span>
              </div>

              {/* Username (Autofilled & Editable, Mandatory) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#0a0a0a] flex items-center gap-1">
                    <AtSignIcon className="size-3 text-[#6a6a6a]" />
                    <span>Username</span>
                    <span className="text-[#ef4444]">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-[#22c55e] bg-[#22c55e]/10 border border-[#22c55e]/25 px-2 py-0.2 rounded-full">
                    Autofill
                  </span>
                </div>
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-sm font-semibold text-[#6a6a6a] select-none pointer-events-none">
                    @
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="username_anda"
                    value={profileForm.username}
                    onChange={(e) =>
                      setProfileForm({
                        ...profileForm,
                        username: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""),
                      })
                    }
                    className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pl-8 pr-3.5 py-2 text-sm font-medium text-[#0a0a0a] placeholder:text-[#9a9a9a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                  />
                </div>
                <p className="text-[11px] text-[#6a6a6a]">
                  Username unik akun Anda. Dapat disesuaikan bila diinginkan.
                </p>
              </div>

              {/* Nama Lengkap / Full Name (Empty by default, Mandatory) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0a0a0a] flex items-center gap-1">
                  <span>Nama Lengkap (Full Name)</span>
                  <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ketik nama lengkap resmi Anda..."
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                  className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] placeholder:text-[#9a9a9a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                />
                <p className="text-[11px] text-[#6a6a6a]">
                  Wajib diisi sesuai identitas resmi untuk penerbitan Kartu Anggota.
                </p>
              </div>

              {/* Tanggal Lahir & Jenis Kelamin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#0a0a0a] flex items-center gap-1">
                    <CalendarIcon className="size-3 text-[#6a6a6a]" />
                    <span>Tanggal Lahir</span>
                    <span className="text-[#ef4444]">*</span>
                  </label>
                  <input
                    type="date"
                    required
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
                    className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all cursor-pointer"
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>

              {/* Nomor Telepon */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[#0a0a0a] flex items-center gap-1">
                  <PhoneIcon className="size-3 text-[#6a6a6a]" />
                  <span>Nomor HP / WhatsApp</span>
                  <span className="text-[#ef4444]">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="081234567890"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] placeholder:text-[#9a9a9a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                />
                <p className="text-[11px] text-[#6a6a6a]">
                  Digunakan untuk notifikasi jadwal kebaktian & pemulihan akun.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 space-y-2">
                <button
                  type="submit"
                  className="w-full h-11 flex items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-sm font-semibold text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer"
                >
                  <span>Lanjut ke Almamater / Institusi</span>
                  <ArrowRightIcon className="size-4" />
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
          {/* STEP 2: SEKOLAH / ALMAMATER & KELAS (JIKA SMP/SMA/SMK)              */}
          {/* ─────────────────────────────────────────────────────────────────── */}
          {step === "academic" && (
            <form onSubmit={handleCompleteOnboarding} className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
                <div className="flex items-center gap-2">
                  <GraduationCapIcon className="size-4 text-[#0a0a0a]" />
                  <span className="text-xs font-bold text-[#0a0a0a] uppercase tracking-wider">
                    {hasGradeLevel ? "Sekolah & Kelas" : "Almamater / Institusi"}
                  </span>
                </div>
                <span className="rounded-full bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-0.5 text-[11px] font-semibold text-[#0a0a0a]">
                  Langkah 2 dari 2
                </span>
              </div>

              {/* Sekolah (Master Data Combobox) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#0a0a0a] flex items-center gap-1">
                    <span>Asal Sekolah / Kampus / Institusi</span>
                    <span className="text-[#ef4444]">*</span>
                  </label>
                  <span className="text-[10px] font-semibold text-[#6a6a6a] uppercase tracking-wider">
                    Master Data
                  </span>
                </div>
                <SchoolCombobox
                  value={profileForm.school}
                  onChange={handleSchoolChange}
                  placeholder="Cari sekolah (misal: Dharma Widya, Tzu Chi, UI, Umum...)"
                />
                <p className="text-[11px] text-[#6a6a6a]">
                  Pilih dari master data resmi. Untuk umum/pekerja, pilih opsi <span className="font-semibold text-[#0a0a0a]">"Umum"</span>.
                </p>
              </div>

              {/* Kelas / Tingkat — HANYA TAMPIL UNTUK SMP, SMA, dan SMK */}
              {hasGradeLevel && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[#0a0a0a] flex items-center gap-1">
                      <span>Tingkat / Kelas</span>
                      <span className="text-[#ef4444]">*</span>
                    </label>
                    <span className="text-[10px] font-semibold text-[#0a0a0a] bg-[#ebe6d6] px-1.5 py-0.2 rounded">
                      Jenjang {selectedSchoolType}
                    </span>
                  </div>
                  <select
                    value={profileForm.class_grade}
                    onChange={(e) => setProfileForm({ ...profileForm, class_grade: e.target.value })}
                    className="w-full h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-sm text-[#0a0a0a] outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all cursor-pointer"
                  >
                    <option value="">Pilih Kelas Anda...</option>
                    {availableGradeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#6a6a6a]">
                    Pilih tingkat kelas Anda saat ini untuk terhubung dengan teman seangkatan.
                  </p>
                </div>
              )}

              {/* ─────────────────────────────────────────────────────────────── */}
              {/* SOCIAL PROOF WIDGET: "BERAPA USER MIRIP DENGAN ANDA"            */}
              {/* ─────────────────────────────────────────────────────────────── */}
              <div className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 sm:p-5 shadow-2xs space-y-2.5 transition-all">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-bold tracking-[1.5px] uppercase text-[#0a0a0a]">
                    <UsersIcon className="size-3.5 text-[#0a0a0a]" />
                    <span>Komunitas Almamater</span>
                  </span>
                  {stats && stats.totalInSchool > 0 && (
                    <span className="rounded-full bg-[#22c55e]/15 border border-[#22c55e]/30 px-2 py-0.5 text-[10px] font-bold text-[#22c55e]">
                      Aktif di Sekkha
                    </span>
                  )}
                </div>

                {/* Content based on selection state */}
                {!profileForm.school ? (
                  <div className="flex items-center gap-3 py-1 text-xs text-[#6a6a6a]">
                    <div className="size-8 rounded-full bg-[#ebe6d6] flex items-center justify-center shrink-0 text-[#0a0a0a]">
                      💡
                    </div>
                    <p className="leading-relaxed">
                      Pilih sekolah atau institusi Anda di atas untuk melihat berapa banyak teman yang sudah aktif di Sekkha.
                    </p>
                  </div>
                ) : loadingStats ? (
                  <div className="flex items-center gap-3 py-2 text-xs text-[#6a6a6a] animate-pulse">
                    <div className="size-8 rounded-full bg-[#ebe6d6] shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-3 w-3/4 bg-[#ebe6d6] rounded" />
                      <div className="h-2.5 w-1/2 bg-[#ebe6d6] rounded" />
                    </div>
                  </div>
                ) : stats && stats.totalInSchool > 0 ? (
                  <div className="space-y-2 py-1">
                    <div className="flex items-start gap-3">
                      {/* Avatar Stack Illustration */}
                      <div className="flex -space-x-2 shrink-0 pt-0.5">
                        <div className="size-7 rounded-full bg-[#ffb084] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#0a0a0a]">
                          🧑
                        </div>
                        <div className="size-7 rounded-full bg-[#b8a4ed] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#0a0a0a]">
                          👧
                        </div>
                        <div className="size-7 rounded-full bg-[#a4d4c5] border-2 border-white flex items-center justify-center text-[10px] font-bold text-[#0a0a0a]">
                          {stats.totalInSchool > 2 ? `+${stats.totalInSchool - 2}` : "✨"}
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="text-[#0a0a0a] font-medium leading-snug">
                          Ada <span className="font-bold text-[#0a0a0a] text-sm bg-[#ebe6d6] px-1.5 py-0.2 rounded-[6px]">{stats.totalInSchool} rekan</span> dari{" "}
                          <span className="font-semibold text-[#0a0a0a]">{profileForm.school}</span> yang sudah bergabung di Sekkha!
                        </p>

                        {hasGradeLevel && profileForm.class_grade && stats.totalInClass > 0 ? (
                          <p className="text-[11px] text-[#22c55e] font-semibold flex items-center gap-1">
                            <SparklesIcon className="size-3 shrink-0" />
                            <span>
                              {stats.totalInClass} di antaranya satu tingkat di {profileForm.class_grade}!
                            </span>
                          </p>
                        ) : hasGradeLevel && profileForm.class_grade ? (
                          <p className="text-[11px] text-[#6a6a6a]">
                            Jadilah perwakilan pertama untuk tingkat {profileForm.class_grade}!
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-1 text-xs text-[#6a6a6a]">
                    <div className="size-8 rounded-full bg-[#e8b94a]/20 border border-[#e8b94a]/30 flex items-center justify-center shrink-0 text-sm">
                      🌟
                    </div>
                    <p className="leading-relaxed">
                      Belum ada rekan terdaftar dari <span className="font-semibold text-[#0a0a0a]">{profileForm.school}</span>. Jadilah pionir pertama dan ajak rekan-rekanmu bergabung!
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 space-y-2">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null)
                      setStep("identity")
                    }}
                    className="h-11 px-4 flex items-center justify-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-sm font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] transition-all cursor-pointer shrink-0"
                  >
                    <ArrowLeftIcon className="size-4" />
                    <span>Kembali</span>
                  </button>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 h-11 flex items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] text-sm font-semibold text-white shadow-xs hover:bg-[#1f1f1f] transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? "Menyimpan..." : "Simpan & Dapatkan ID Anggota"}
                    <ArrowRightIcon className="size-4 ml-1" />
                  </button>
                </div>

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
          {/* STEP 3: SUCCESS & DIGITAL ID CARD PREVIEW                          */}
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
                  Nomor ID resmi Vihara Sekkha Anda berhasil dibuat dan siap digunakan untuk presensi kebaktian.
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
                    {successData.username && (
                      <p className="text-[11px] font-semibold text-[#6a6a6a]">@{successData.username}</p>
                    )}
                    <p className="font-mono text-xs font-bold text-[#0a0a0a] bg-[#ebe6d6] px-2 py-0.5 rounded-[6px] inline-block">
                      {successData.userNumber}
                    </p>

                    {successData.school && (
                      <p className="text-[11px] text-[#6a6a6a] font-medium truncate flex items-center gap-1">
                        <span>🏫</span>
                        <span>{successData.school}</span>
                        {successData.classGrade && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-[#0a0a0a]">{successData.classGrade}</span>
                          </>
                        )}
                      </p>
                    )}

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
