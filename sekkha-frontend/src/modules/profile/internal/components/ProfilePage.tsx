// feature/profile/components/ProfilePage
// Redesigned: stats-focused profile for gamified community app.
// - Prominent rank/points hero
// - Streak + attendance calendar
// - Account linking for pre-provisioned data

import { useState, useEffect } from "react"
import { Link2Icon, SparklesIcon, CheckCircleIcon, AlertTriangleIcon, XIcon } from "lucide-react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import { teamsApi } from "@/modules/teams/internal/api/teamsApi"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ProfileCard } from "./ProfileCard"
import { MemberQrCard } from "./MemberQrCard"
import { StatsHero } from "./StatsHero"
import { AttendanceTracker } from "./AttendanceTracker"

interface UserProfile {
  id: string
  name: string
  email: string
  school?: string | null
  role: string
  user_number?: string | null
  userNumber?: string | null
  points?: number
  avatarUrl?: string | null
  createdAt?: string
}

export function ProfilePage() {
  const { authState } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)

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

  useEffect(() => {
    fetchProfile()
  }, [authState.status])

  async function fetchProfile() {
    if (authState.status === "authenticated") {
      try {
        const data = await api.get<UserProfile>("/users/me")
        setProfile(data)
      } catch (err) {
        console.error("Gagal memuat profil:", err)
      }
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
      await fetchProfile()
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

  return (
    <main className="min-h-screen bg-slate-50/50">
      <PageBreadcrumb items={[{ label: "Profil" }]} />
      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4">

          {/* Header row: title */}
          <div className="flex items-center justify-between">
            <h1 className="text-heading-5 font-extrabold text-sekkha-ink">Profil Saya</h1>
          </div>

          {/* Account Linking Banner */}
          <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-white to-blue-50/60 p-4 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-sekkha-brand-blue text-white shadow-xs shrink-0 mt-0.5">
                <Link2Icon className="size-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-caption-bold text-sekkha-ink">Tautkan Data Lama dari Pengurus</p>
                <p className="text-micro text-sekkha-slate">
                  Pernah didaftarkan oleh pengurus saat acara vihara? Tautkan nomor anggotamu agar riwayat kehadiran dan poin lamamu bergabung ke akun ini.
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
              className="rounded-xl bg-sekkha-brand-blue px-4 py-2 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all shrink-0 active:scale-[0.98]"
            >
              Tautkan Akun
            </button>
          </div>

          {/* Profile card */}
          <ProfileCard
            name={displayName}
            school={school}
            joinedAt={joinedAt}
            avatarUrl={profile?.avatarUrl || undefined}
          />

          {/* Member QR Card (Digital & Printable Physical Vihara Card) */}
          <MemberQrCard
            memberName={displayName}
            memberId={memberId}
          />

          {/* Stats hero — rank & points prominent */}
          <StatsHero
            rank={5}
            totalPoints={profile?.points || 1240}
            level={3}
            levelLabel="Umat Setia"
            totalEvents={18}
            favoriteEvent="Kebaktian Minggu"
          />

          {/* Attendance tracker — streak + monthly calendar */}
          <AttendanceTracker
            currentStreak={5}
            longestStreak={8}
            monthlyCheckins={[true, true, true, false]}
            monthLabel="Agustus 2026"
          />
        </div>
      </div>

      {/* Account Linking Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-sekkha-hairline bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl bg-sekkha-brand-blue text-white shadow-xs">
                  <SparklesIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-heading-6 font-extrabold text-sekkha-ink">Tautkan Akun Lama</h3>
                  <p className="text-micro text-sekkha-slate">Gabungkan riwayat kehadiran & poin Anda</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLinkModal(false)}
                className="rounded-full p-1.5 text-sekkha-slate hover:bg-slate-100"
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
                  className="w-full rounded-xl bg-sekkha-brand-blue py-2.5 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all"
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
                    className="flex-1 rounded-xl border border-sekkha-hairline-strong py-2.5 text-body-sm font-semibold text-sekkha-ink hover:bg-slate-100 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={linking}
                    className="flex-1 rounded-xl bg-sekkha-brand-blue py-2.5 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all disabled:opacity-50"
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
