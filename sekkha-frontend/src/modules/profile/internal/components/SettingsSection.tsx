// feature/profile/components/SettingsSection
// Complete Clay-styled Settings & Goals management with interactive sub-views

import { useState } from "react"
import {
  LogOutIcon,
  KeyRoundIcon,
  BellIcon,
  ChevronRightIcon,
  TargetIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  AlertCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react"
import { api } from "@/lib/api"

interface SettingsSectionProps {
  onLogout: () => void
  onClose?: () => void
  onChangePassword?: () => void
  onNotificationSettings?: () => void
  onMonthlyTargetSettings?: () => void
}

type SettingsView = "menu" | "target" | "password" | "notifications" | "logout_confirm"

export function SettingsSection({
  onLogout,
  onClose,
  onChangePassword,
  onNotificationSettings,
  onMonthlyTargetSettings,
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
      localStorage.setItem("sekkha_monthly_attendance_target", targetAttendance.toString())
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
    if (passwordForm.new_password.length < 6) {
      setPasswordError("Kata sandi baru minimal 6 karakter.")
      return
    }

    try {
      setPasswordLoading(true)
      setPasswordError(null)
      await api.post("/auth/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
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

  // ── 3. Notification Preferences State ──
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem("sekkha_notification_preferences")
      return saved
        ? JSON.parse(saved)
        : {
            eventReminders: true,
            pointsAndBadges: true,
            viharaAnnouncements: true,
          }
    } catch {
      return {
        eventReminders: true,
        pointsAndBadges: true,
        viharaAnnouncements: true,
      }
    }
  })
  const [notifSaved, setNotifSaved] = useState(false)

  const handleToggleNotif = (key: "eventReminders" | "pointsAndBadges" | "viharaAnnouncements") => {
    const next = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(next)
    try {
      localStorage.setItem("sekkha_notification_preferences", JSON.stringify(next))
      setNotifSaved(true)
      setTimeout(() => setNotifSaved(false), 2000)
    } catch (err) {
      console.error(err)
    }
  }

  // ─── Sub-View: Target Kehadiran Bulanan ──────────────────────────────────────
  if (currentView === "target") {
    return (
      <div className="space-y-4 font-sans text-left animate-in fade-in-50 duration-200">
        <button
          type="button"
          onClick={() => setCurrentView("menu")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Kembali ke Pengaturan</span>
        </button>

        <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-3">
          <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#e8b94a]/20 text-[#0a0a0a] shadow-xs shrink-0">
            <TargetIcon className="size-5 text-[#0a0a0a]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">
              Target Kehadiran Bulanan
            </h3>
            <p className="text-xs text-[#6a6a6a]">
              Tentukan target jumlah kebaktian atau event yang ingin kamu ikuti setiap bulan
            </p>
          </div>
        </div>

        {targetSaved && (
          <div className="flex items-center gap-2 rounded-[12px] bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 shadow-xs">
            <CheckCircleIcon className="size-4 text-emerald-600 shrink-0" />
            <span>Target kehadiran bulanan berhasil disimpan!</span>
          </div>
        )}

        {/* Target Selector Card */}
        <div className="rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 sm:p-5 space-y-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-bold text-[#6a6a6a] uppercase tracking-wider">
              Target Kamu
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#0a0a0a]">
              {targetAttendance} <span className="text-xs font-semibold text-[#6a6a6a]">Sesi / Bulan</span>
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
                  className={`h-10 rounded-[12px] text-xs font-bold transition-all cursor-pointer shadow-xs ${
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
              onChange={(e) => setTargetAttendance(parseInt(e.target.value, 10))}
              className="w-full accent-[#0a0a0a] cursor-pointer"
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
          <SparklesIcon className="size-4 text-[#e8b94a] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            Target ini membantu kamu memantau progress kehadiran bulanan serta mempertahankan rentetan streak dan lencana penghargaan di Sekkha.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => setCurrentView("menu")}
            className="h-10 px-4 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-xs font-bold text-[#0a0a0a] transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSaveTarget}
            className="h-10 px-5 rounded-[12px] bg-[#0a0a0a] hover:bg-[#1f1f1f] text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
          >
            Simpan Target
          </button>
        </div>
      </div>
    )
  }

  // ─── Sub-View: Ubah Kata Sandi ─────────────────────────────────────────────
  if (currentView === "password") {
    return (
      <div className="space-y-4 font-sans text-left animate-in fade-in-50 duration-200">
        <button
          type="button"
          onClick={() => setCurrentView("menu")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Kembali ke Pengaturan</span>
        </button>

        <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-3">
          <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#b8a4ed]/30 text-[#0a0a0a] shadow-xs shrink-0">
            <KeyRoundIcon className="size-5 text-[#0a0a0a]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">
              Ubah Kata Sandi
            </h3>
            <p className="text-xs text-[#6a6a6a]">
              Perbarui kata sandi akun untuk menjaga keamanan
            </p>
          </div>
        </div>

        {passwordError && (
          <div className="flex items-center gap-2 rounded-[12px] bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-800 shadow-xs">
            <AlertCircleIcon className="size-4 text-rose-600 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        {passwordSuccess && (
          <div className="flex items-center gap-2 rounded-[12px] bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 shadow-xs">
            <CheckCircleIcon className="size-4 text-emerald-600 shrink-0" />
            <span>Kata sandi berhasil diperbarui!</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">Kata Sandi Saat Ini *</label>
            <input
              type="password"
              required
              placeholder="Masukkan kata sandi lama"
              value={passwordForm.current_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">Kata Sandi Baru *</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Minimal 6 karakter"
              value={passwordForm.new_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">Konfirmasi Kata Sandi Baru *</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Ulangi kata sandi baru"
              value={passwordForm.confirm_password}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e5e5]">
            <button
              type="button"
              onClick={() => setCurrentView("menu")}
              className="h-10 px-4 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-xs font-bold text-[#0a0a0a] transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={passwordLoading}
              className="h-10 px-5 rounded-[12px] bg-[#0a0a0a] hover:bg-[#1f1f1f] text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {passwordLoading ? "Menyimpan..." : "Perbarui Kata Sandi"}
            </button>
          </div>
        </form>
      </div>
    )
  }

  // ─── Sub-View: Notifikasi ──────────────────────────────────────────────────
  if (currentView === "notifications") {
    return (
      <div className="space-y-4 font-sans text-left animate-in fade-in-50 duration-200">
        <button
          type="button"
          onClick={() => setCurrentView("menu")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Kembali ke Pengaturan</span>
        </button>

        <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-3">
          <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#faf5e8] border border-[#e5e5e5] text-[#0a0a0a] shadow-xs shrink-0">
            <BellIcon className="size-5 text-[#0a0a0a]" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#0a0a0a]">
              Pengaturan Notifikasi
            </h3>
            <p className="text-xs text-[#6a6a6a]">
              Atur preferensi pengingat dan pemberitahuan di Sekkha
            </p>
          </div>
        </div>

        {notifSaved && (
          <div className="flex items-center gap-2 rounded-[12px] bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 shadow-xs">
            <CheckCircleIcon className="size-4 text-emerald-600 shrink-0" />
            <span>Preferensi notifikasi tersimpan!</span>
          </div>
        )}

        <div className="space-y-2.5">
          {/* Item 1 */}
          <div className="flex items-center justify-between rounded-[14px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 shadow-xs">
            <div className="space-y-0.5 pr-3">
              <p className="text-xs sm:text-sm font-bold text-[#0a0a0a]">Pengingat Kebaktian Rutin</p>
              <p className="text-[11px] text-[#6a6a6a]">Kirim notifikasi 1 hari dan 2 jam sebelum kebaktian dimulai</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleNotif("eventReminders")}
              className={`h-6 w-11 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                notifPrefs.eventReminders ? "bg-[#0a0a0a]" : "bg-[#e5e5e5]"
              }`}
            >
              <div
                className={`size-5 rounded-full bg-white shadow-xs transition-transform ${
                  notifPrefs.eventReminders ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Item 2 */}
          <div className="flex items-center justify-between rounded-[14px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 shadow-xs">
            <div className="space-y-0.5 pr-3">
              <p className="text-xs sm:text-sm font-bold text-[#0a0a0a]">Poin & Lencana Gamifikasi</p>
              <p className="text-[11px] text-[#6a6a6a]">Pemberitahuan saat kamu meraih badge atau naik level anggota</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleNotif("pointsAndBadges")}
              className={`h-6 w-11 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                notifPrefs.pointsAndBadges ? "bg-[#0a0a0a]" : "bg-[#e5e5e5]"
              }`}
            >
              <div
                className={`size-5 rounded-full bg-white shadow-xs transition-transform ${
                  notifPrefs.pointsAndBadges ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Item 3 */}
          <div className="flex items-center justify-between rounded-[14px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 shadow-xs">
            <div className="space-y-0.5 pr-3">
              <p className="text-xs sm:text-sm font-bold text-[#0a0a0a]">Pengumuman & Agenda Vihara</p>
              <p className="text-[11px] text-[#6a6a6a]">Berita penting, puja bakti khusus, atau perubahan jadwal</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleNotif("viharaAnnouncements")}
              className={`h-6 w-11 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                notifPrefs.viharaAnnouncements ? "bg-[#0a0a0a]" : "bg-[#e5e5e5]"
              }`}
            >
              <div
                className={`size-5 rounded-full bg-white shadow-xs transition-transform ${
                  notifPrefs.viharaAnnouncements ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end pt-3 border-t border-[#e5e5e5]">
          <button
            type="button"
            onClick={() => setCurrentView("menu")}
            className="h-10 px-5 rounded-[12px] bg-[#0a0a0a] hover:bg-[#1f1f1f] text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    )
  }

  // ─── Sub-View: Konfirmasi Keluar (Logout) ──────────────────────────────────
  if (currentView === "logout_confirm") {
    return (
      <div className="space-y-4 font-sans text-left animate-in fade-in-50 duration-200">
        <button
          type="button"
          onClick={() => setCurrentView("menu")}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6a6a6a] hover:text-[#0a0a0a] transition-colors cursor-pointer"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Kembali ke Pengaturan</span>
        </button>

        <div className="rounded-[16px] border border-rose-200 bg-rose-50/70 p-5 text-center space-y-2">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-rose-100 text-rose-600 shadow-xs">
            <LogOutIcon className="size-6" />
          </div>
          <h3 className="text-base font-bold text-rose-950">
            Keluar dari Akun Sekkha?
          </h3>
          <p className="text-xs text-rose-700 max-w-sm mx-auto leading-relaxed">
            Kamu perlu memasukkan kembali kredensial akun untuk mengakses data kehadiran dan fitur lainnya.
          </p>
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => setCurrentView("menu")}
            className="h-11 flex-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-xs font-bold text-[#0a0a0a] transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onLogout()
              onClose?.()
            }}
            className="h-11 flex-1 rounded-[12px] bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs transition-all cursor-pointer"
          >
            Ya, Keluar
          </button>
        </div>
      </div>
    )
  }

  // ─── Main View: Settings & Goals Menu ─────────────────────────────────────
  return (
    <div className="space-y-2.5 font-sans text-left">
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
        className="flex w-full items-center gap-3.5 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 text-left transition-all hover:bg-[#faf5e8] hover:border-[#d5d5d5] active:scale-[0.99] shadow-xs cursor-pointer"
      >
        <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#e8b94a]/20 text-[#0a0a0a] shadow-xs shrink-0">
          <TargetIcon className="size-5 text-[#0a0a0a]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm font-bold text-[#0a0a0a]">Target Kehadiran Bulanan</p>
            <span className="rounded-full bg-[#faf5e8] border border-[#e5e5e5] px-2 py-0.5 text-[10px] font-bold text-[#0a0a0a]">
              {targetAttendance}x / bln
            </span>
          </div>
          <p className="text-xs text-[#6a6a6a] truncate mt-0.5">
            Atur target kehadiran untuk streak & lencana
          </p>
        </div>
        <ChevronRightIcon className="size-4 text-[#6a6a6a] shrink-0" />
      </button>

      {/* 2. Ubah Kata Sandi */}
      <button
        type="button"
        onClick={() => {
          if (onChangePassword) {
            onChangePassword()
          } else {
            setCurrentView("password")
          }
        }}
        className="flex w-full items-center gap-3.5 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 text-left transition-all hover:bg-[#faf5e8] hover:border-[#d5d5d5] active:scale-[0.99] shadow-xs cursor-pointer"
      >
        <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#b8a4ed]/30 text-[#0a0a0a] shadow-xs shrink-0">
          <KeyRoundIcon className="size-5 text-[#0a0a0a]" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm font-bold text-[#0a0a0a]">Ubah Kata Sandi</p>
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#6a6a6a]">
              <ShieldCheckIcon className="size-3 text-emerald-600" />
              <span>Aman</span>
            </span>
          </div>
          <p className="text-xs text-[#6a6a6a] truncate mt-0.5">
            Ganti kata sandi akun Sekkha kamu
          </p>
        </div>
        <ChevronRightIcon className="size-4 text-[#6a6a6a] shrink-0" />
      </button>

      {/* 3. Notifikasi */}
      <button
        type="button"
        onClick={() => {
          if (onNotificationSettings) {
            onNotificationSettings()
          } else {
            setCurrentView("notifications")
          }
        }}
        className="flex w-full items-center gap-3.5 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 text-left transition-all hover:bg-[#faf5e8] hover:border-[#d5d5d5] active:scale-[0.99] shadow-xs cursor-pointer"
      >
        <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#faf5e8] border border-[#e5e5e5] text-[#0a0a0a] shadow-xs shrink-0">
          <BellIcon className="size-5 text-[#0a0a0a]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-bold text-[#0a0a0a]">Notifikasi</p>
          <p className="text-xs text-[#6a6a6a] truncate mt-0.5">
            Atur pengingat kebaktian, event & lencana
          </p>
        </div>
        <ChevronRightIcon className="size-4 text-[#6a6a6a] shrink-0" />
      </button>

      {/* 4. Keluar (Logout) */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setCurrentView("logout_confirm")}
          className="flex w-full items-center gap-3.5 rounded-[16px] border border-rose-200 bg-rose-50/50 p-3.5 text-left transition-all hover:bg-rose-100/70 active:scale-[0.99] shadow-xs cursor-pointer group"
        >
          <div className="flex size-10 items-center justify-center rounded-[12px] bg-rose-100 border border-rose-200 text-rose-600 shadow-xs shrink-0 group-hover:bg-rose-200 transition-colors">
            <LogOutIcon className="size-5 text-rose-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-bold text-rose-700">Keluar</p>
            <p className="text-xs text-rose-600/80 truncate mt-0.5">
              Keluar dari akun Sekkha kamu
            </p>
          </div>
          <ChevronRightIcon className="size-4 text-rose-400 shrink-0" />
        </button>
      </div>
    </div>
  )
}

