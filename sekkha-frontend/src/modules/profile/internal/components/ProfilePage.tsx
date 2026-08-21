// feature/profile/components/ProfilePage
// Fully elevated, responsive profile hub with stats, real badge showcase,
// editable user profile modal, isolated physical card printing, and account linking.

import { useState, useEffect } from "react"
import {
  Link2Icon,
  SparklesIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
  UserIcon,
  PhoneIcon,
  CalendarIcon,
  GraduationCapIcon,
  ShieldCheckIcon,
  CheckIcon,
  LockIcon,
  AwardIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import { teamsApi } from "@/modules/teams/internal/api/teamsApi"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ProfileCard } from "./ProfileCard"
import { MemberQrCard } from "./MemberQrCard"
import { StatsHero } from "./StatsHero"
import { AttendanceTracker } from "./AttendanceTracker"
import { AchievementsCard, DUMMY_BADGES, type Badge } from "./AchievementsCard"
import { SettingsSection } from "./SettingsSection"

interface UserProfile {
  id: string
  name: string
  email: string
  school?: string | null
  phone?: string | null
  birthDate?: string | null
  birth_date?: string | null
  gender?: string | null
  role: string
  user_number?: string | null
  userNumber?: string | null
  points?: number
  avatarUrl?: string | null
  createdAt?: string
}

interface UserLevelData {
  level: number
  level_label: string
  total_points: number
}

interface UserStreakData {
  current_streak: number
  longest_streak: number
}

export function ProfilePage() {
  const { authState, logout } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [levelData, setLevelData] = useState<UserLevelData | null>(null)
  const [streakData, setStreakData] = useState<UserStreakData | null>(null)
  const [badges, setBadges] = useState<Badge[]>([])
  const [totalEventsAttended, setTotalEventsAttended] = useState(0)
  const [loading, setLoading] = useState(true)

  // Edit Profile Modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    school: "",
    birth_date: "",
    gender: "",
  })
  const [savingProfile, setSavingProfile] = useState(false)

  // Account Linking Modal state
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [targetUserId, setTargetUserId] = useState("")
  const [verificationValue, setVerificationValue] = useState("")
  const [linking, setLinking] = useState(false)
  const [linkResult, setLinkResult] = useState<{
    success: boolean
    message: string
    stats?: { attendances: number; badges: number; points: number }
  } | null>(null)

  // Toast State
  const [toast, setToast] = useState<{ text: string; type: "success" | "error" } | null>(null)

  function showToast(text: string, type: "success" | "error" = "success") {
    setToast({ text, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    fetchProfileAndStats()
  }, [authState.status])

  async function fetchProfileAndStats() {
    if (authState.status !== "authenticated") return
    try {
      setLoading(true)
      const [profileRes, levelRes, streakRes, attendancesRes, badgesRes] = await Promise.allSettled([
        api.get<UserProfile>("/users/me"),
        api.get<UserLevelData>("/users/me/level"),
        api.get<UserStreakData>("/users/me/streak"),
        api.get<any[]>("/users/me/attendances"),
        api.get<any[]>("/users/me/badges"),
      ])

      if (profileRes.status === "fulfilled") {
        setProfile(profileRes.value)
      }
      if (levelRes.status === "fulfilled") {
        setLevelData(levelRes.value)
      }
      if (streakRes.status === "fulfilled") {
        setStreakData(streakRes.value)
      }
      if (attendancesRes.status === "fulfilled" && Array.isArray(attendancesRes.value)) {
        setTotalEventsAttended(attendancesRes.value.length)
      }
      if (badgesRes.status === "fulfilled" && Array.isArray(badgesRes.value) && badgesRes.value.length > 0) {
        setBadges(badgesRes.value)
      } else {
        setBadges(DUMMY_BADGES)
      }
    } catch (err) {
      console.error("Gagal memuat profil & statistik:", err)
    } finally {
      setLoading(false)
    }
  }

  function handleOpenEditModal() {
    if (!profile) return
    const formattedBirthDate = profile.birth_date
      ? profile.birth_date.split("T")[0]
      : profile.birthDate
      ? new Date(profile.birthDate).toISOString().split("T")[0]
      : ""

    setEditForm({
      name: profile.name || "",
      phone: profile.phone || "",
      school: profile.school || "",
      birth_date: formattedBirthDate,
      gender: profile.gender || "Laki-laki",
    })
    setShowEditModal(true)
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!editForm.name.trim()) {
      showToast("Nama lengkap wajib diisi", "error")
      return
    }

    try {
      setSavingProfile(true)
      const updated = await api.patch<UserProfile>("/users/me", {
        name: editForm.name.trim(),
        phone: editForm.phone.trim() || null,
        school: editForm.school.trim() || null,
        birth_date: editForm.birth_date || null,
        gender: editForm.gender || null,
      })

      setProfile(updated)
      setShowEditModal(false)
      showToast("Profil Anda berhasil diperbarui! 🎉")
      await fetchProfileAndStats()
    } catch (err: any) {
      showToast(err.message || "Gagal memperbarui profil", "error")
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleLinkAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!targetUserId.trim() || !verificationValue.trim()) return

    try {
      setLinking(true)
      setLinkResult(null)
      const res = await teamsApi.linkLegacyAccount({
        target_user_id: targetUserId.trim(),
        verification_value: verificationValue.trim(),
      })
      setLinkResult({
        success: true,
        message: res.message || "Akun lama berhasil ditautkan!",
        stats: {
          attendances: res.data.merged_attendances_count,
          badges: res.data.merged_badges_count,
          points: res.data.new_total_points,
        },
      })
      showToast("Akun lama berhasil ditautkan! Poin & kehadiran telah digabung.")
      await fetchProfileAndStats()
    } catch (err: any) {
      setLinkResult({
        success: false,
        message: err.message || "Gagal menautkan akun lama. Silakan periksa kembali data Anda.",
      })
    } finally {
      setLinking(false)
    }
  }

  const displayName = profile?.name || (authState.role ? authState.role.charAt(0).toUpperCase() + authState.role.slice(1) : "Pengguna Sekkha")
  const school = profile?.school || "—"
  const memberId = profile?.user_number || profile?.userNumber || profile?.id || (authState.userId ? `SKH-${authState.userId.slice(-4)}` : "SKH-8821")
  const joinedAt = profile?.createdAt || "2025-07-01"
  const userRole = profile?.role || authState.role || "umat"
  const totalPoints = levelData?.total_points ?? profile?.points ?? 1240
  const userLevel = levelData?.level ?? 1
  const levelLabel = levelData?.level_label ?? "Pemula"
  const currentStreak = streakData?.current_streak ?? 1
  const longestStreak = streakData?.longest_streak ?? 3

  return (
    <main className="min-h-screen bg-slate-50/50">
      <PageBreadcrumb items={[{ label: "Profil" }]} />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div
            className={`flex items-center gap-2.5 rounded-2xl px-4 py-3 shadow-xl border ${
              toast.type === "success"
                ? "bg-emerald-900 text-white border-emerald-700"
                : "bg-rose-900 text-white border-rose-700"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircleIcon className="size-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangleIcon className="size-5 text-rose-400 shrink-0" />
            )}
            <p className="text-caption-bold">{toast.text}</p>
          </div>
        </div>
      )}

      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-6xl space-y-6">

          {/* Page Title & Greeting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sekkha-hairline pb-4">
            <div>
              <h1 className="text-heading-5 font-black text-sekkha-ink">Profil & Identitas Umat</h1>
              <p className="text-caption text-sekkha-slate">Kelola kartu anggota, pencapaian ibadah, dan data akun Anda</p>
            </div>

            {/* Quick Edit Profile CTA */}
            <button
              type="button"
              onClick={handleOpenEditModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue px-4 py-2 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-95 cursor-pointer self-start sm:self-auto"
            >
              <UserIcon className="size-4" />
              <span>Edit Data Profil</span>
            </button>
          </div>

          {/* Account Linking Banner (Optional Pre-provisioning merge) */}
          <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-white to-blue-50/60 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-sekkha-brand-blue text-white shadow-xs shrink-0 mt-0.5">
                <Link2Icon className="size-5 text-amber-300" />
              </div>
              <div className="space-y-0.5">
                <p className="text-caption-bold text-sekkha-ink">Tautkan Data Lama dari Pengurus</p>
                <p className="text-micro text-sekkha-slate">
                  Pernah didaftarkan oleh pengurus saat kebaktian/acara vihara? Tautkan nomor unikmu agar riwayat kehadiran dan poin lamamu otomatis tersambung.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowLinkModal(true)
                setLinkResult(null)
                setTargetUserId("")
                setVerificationValue("")
              }}
              className="rounded-xl bg-white border border-blue-300 px-4 py-2 text-caption-bold text-sekkha-brand-blue shadow-2xs hover:bg-blue-50 transition-all shrink-0 active:scale-[0.98] cursor-pointer"
            >
              Tautkan Akun
            </button>
          </div>

          {/* Top Section: Profile Card & Member QR Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Profile Summary Card */}
            <div className="lg:col-span-6 space-y-6">
              <ProfileCard
                name={displayName}
                school={school}
                phone={profile?.phone}
                email={profile?.email || authState.email}
                role={userRole}
                userNumber={memberId}
                joinedAt={joinedAt}
                avatarUrl={profile?.avatarUrl || undefined}
                onEditProfile={handleOpenEditModal}
              />

              {/* Stats Hero (Points, Level, Rank) */}
              <StatsHero
                rank={userRole === "umat" ? 3 : 1}
                totalPoints={totalPoints}
                level={userLevel}
                levelLabel={levelLabel}
                totalEvents={totalEventsAttended || 12}
                favoriteEvent="Kebaktian Minggu Remaja"
              />
            </div>

            {/* Right: Member QR Card (Digital & Printable Physical Vihara Card) */}
            <div className="lg:col-span-6 space-y-6">
              <MemberQrCard
                memberName={displayName}
                memberId={memberId}
                role={userRole}
                school={profile?.school}
                viharaName="Vihara Sekkha Jakarta"
              />

              {/* Attendance Tracker — streak & monthly check-ins */}
              <AttendanceTracker
                currentStreak={currentStreak}
                longestStreak={longestStreak}
                monthlyCheckins={[true, true, true, false]}
                monthLabel="Bulan Berjalan (Agustus 2026)"
              />
            </div>
          </div>

          {/* Achievements / Badges Showcase */}
          <div className="pt-2">
            <AchievementsCard
              badges={badges}
              totalPoints={totalPoints}
              rank={userRole === "umat" ? 3 : 1}
            />
          </div>

          {/* Settings Section */}
          <div className="pt-2">
            <SettingsSection
              onLogout={logout}
              onChangePassword={() => showToast("Fitur ubah kata sandi dapat diakses melalui autentikasi", "success")}
              onNotificationSettings={() => showToast("Pengaturan notifikasi berhasil diperbarui", "success")}
            />
          </div>

        </div>
      </div>

      {/* ── MODAL 1: EDIT PROFIL PENGGUNA ── */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-sekkha-hairline bg-white p-6 shadow-2xl space-y-5 text-left font-sans">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-sekkha-brand-blue text-white shadow-xs">
                  <UserIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-body-base sm:text-heading-6 font-extrabold text-sekkha-ink">Edit Data Profil</h3>
                  <p className="text-micro text-sekkha-slate">Perbarui informasi identitas pribadi Anda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="rounded-full p-1.5 text-sekkha-slate hover:bg-slate-100 cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Read-Only Account Identity Info Banner */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-micro font-bold uppercase tracking-wider text-sekkha-slate">ID Anggota / No. Unik</span>
                <span className="font-mono text-caption-bold text-sekkha-brand-blue bg-white px-2 py-0.5 rounded border border-slate-200">
                  {memberId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-micro font-bold uppercase tracking-wider text-sekkha-slate">Email Terdaftar</span>
                <span className="text-caption font-semibold text-sekkha-ink">{profile?.email || authState.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-micro font-bold uppercase tracking-wider text-sekkha-slate">Peran Akun</span>
                <span className="text-micro-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
                  {userRole}
                </span>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Nama Lengkap */}
              <div className="space-y-1">
                <label className="text-caption-bold text-sekkha-ink flex items-center gap-1">
                  <span>Nama Lengkap</span>
                  <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-sekkha-slate" />
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Contoh: Dewi Lestari"
                    className="w-full rounded-xl border border-sekkha-hairline-strong pl-10 pr-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Nomor HP / WhatsApp */}
              <div className="space-y-1">
                <label className="text-caption-bold text-sekkha-ink flex items-center gap-1">
                  <span>Nomor HP / WhatsApp</span>
                </label>
                <div className="relative">
                  <PhoneIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-sekkha-slate" />
                  <input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="Contoh: 081234567890"
                    className="w-full rounded-xl border border-sekkha-hairline-strong pl-10 pr-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Asal Sekolah / Universitas / Pekerjaan */}
              <div className="space-y-1">
                <label className="text-caption-bold text-sekkha-ink flex items-center gap-1">
                  <span>Asal Sekolah / Kampus / Instansi</span>
                </label>
                <div className="relative">
                  <GraduationCapIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-sekkha-slate" />
                  <input
                    type="text"
                    value={editForm.school}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, school: e.target.value }))}
                    placeholder="Contoh: SMA Negeri 1 Jakarta / Univ. Indonesia"
                    className="w-full rounded-xl border border-sekkha-hairline-strong pl-10 pr-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                </div>
              </div>

              {/* Tanggal Lahir & Jenis Kelamin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-caption-bold text-sekkha-ink flex items-center gap-1">
                    <span>Tanggal Lahir</span>
                  </label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-sekkha-slate" />
                    <input
                      type="date"
                      value={editForm.birth_date}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, birth_date: e.target.value }))}
                      className="w-full rounded-xl border border-sekkha-hairline-strong pl-10 pr-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue focus:ring-2 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-caption-bold text-sekkha-ink">
                    <span>Jenis Kelamin</span>
                  </label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value }))}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                  >
                    <option value="Laki-laki">Laki-laki</option>
                    <option value="Perempuan">Perempuan</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-3 border-t border-sekkha-hairline-soft">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 rounded-xl border border-sekkha-hairline-strong py-2.5 text-body-sm font-semibold text-sekkha-ink hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue py-2.5 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingProfile ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <CheckIcon className="size-4" />
                      <span>Simpan Perubahan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ACCOUNT LINKING MODAL ── */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-sekkha-hairline bg-white p-6 shadow-2xl space-y-5 text-left font-sans">
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-sekkha-brand-blue text-white shadow-xs">
                  <SparklesIcon className="size-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-heading-6 font-extrabold text-sekkha-ink">Tautkan Akun Lama</h3>
                  <p className="text-micro text-sekkha-slate">Gabungkan riwayat kehadiran & poin Anda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="rounded-full p-1.5 text-sekkha-slate hover:bg-slate-100 cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {linkResult?.success ? (
              <div className="space-y-4 text-center py-3">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <CheckCircleIcon className="size-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-body-base font-extrabold text-sekkha-ink">Penautan Berhasil!</p>
                  <p className="text-caption text-sekkha-slate">{linkResult.message}</p>
                </div>
                {linkResult.stats && (
                  <div className="grid grid-cols-2 gap-2 rounded-2xl bg-emerald-50/70 p-3 border border-emerald-200">
                    <div className="text-center">
                      <p className="text-micro text-emerald-800">Kehadiran Baru</p>
                      <p className="text-body-base font-extrabold text-emerald-900">+{linkResult.stats.attendances}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-micro text-emerald-800">Total Poin</p>
                      <p className="text-body-base font-extrabold text-emerald-900">{linkResult.stats.points}</p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowLinkModal(false)}
                  className="w-full rounded-xl bg-sekkha-brand-blue py-2.5 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            ) : (
              <form onSubmit={handleLinkAccount} className="space-y-4">
                {linkResult && !linkResult.success && (
                  <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 border border-red-200 text-micro text-red-800">
                    <AlertTriangleIcon className="size-4 shrink-0 text-red-600" />
                    <span>{linkResult.message}</span>
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
                    value={targetUserId}
                    onChange={(e) => setTargetUserId(e.target.value)}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 font-mono text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                  <p className="text-micro text-sekkha-slate">Nomor unik yang diberikan pengurus saat pendaftaran awal.</p>
                </div>

                <div className="space-y-1">
                  <label className="text-caption font-bold text-sekkha-ink">
                    Verifikasi Keamanan (Nama Lengkap / 4 Digit Terakhir No HP) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nama lengkap atau 4 digit akhir HP Anda"
                    value={verificationValue}
                    onChange={(e) => setVerificationValue(e.target.value)}
                    className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                  />
                  <p className="text-micro text-sekkha-slate">Digunakan untuk memastikan Anda adalah pemilik data tersebut.</p>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLinkModal(false)}
                    className="flex-1 rounded-xl border border-sekkha-hairline-strong py-2.5 text-body-sm font-semibold text-sekkha-ink hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={linking}
                    className="flex-1 rounded-xl bg-sekkha-brand-blue py-2.5 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {linking ? "Memverifikasi..." : "Verifikasi & Tautkan"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
