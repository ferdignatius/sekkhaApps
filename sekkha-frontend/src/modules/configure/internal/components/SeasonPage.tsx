import { useState, useEffect } from "react"
import {
  TrophyIcon,
  PencilIcon,
  CheckCircleIcon,
  CalendarIcon,
  SparklesIcon,
  UsersIcon,
  ShieldCheckIcon,
  InfoIcon,
  AlertCircleIcon,
  FlameIcon,
  LayersIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { seasonsApi, type SeasonDto } from "../api/configureApi"

interface SeasonSectionConfig {
  code: string
  label: string
  subtitle: string
  badge: string
  icon: React.ReactNode
  accentColor: string
}

const HARDCODED_SEASONS: SeasonSectionConfig[] = [
  {
    code: "semester",
    label: "Season Semester (6 Bulan)",
    subtitle: "Format periode kompetisi 6 bulanan resmi vihara untuk peringkat klasemen dan target komunitas.",
    badge: "Default Utama",
    icon: <SparklesIcon className="size-5 text-amber-600" />,
    accentColor: "from-amber-500/10 to-amber-500/5 border-amber-300/60",
  },
  {
    code: "quarterly",
    label: "Season Kuartal (3 Bulan)",
    subtitle: "Format periode intensif 3 bulanan per kuartal (Q1, Q2, Q3, Q4) untuk evaluasi dinamis.",
    badge: "3 Bulanan",
    icon: <LayersIcon className="size-5 text-blue-600" />,
    accentColor: "from-blue-500/10 to-blue-500/5 border-blue-300/60",
  },
  {
    code: "annual",
    label: "Season Tahunan (1 Tahun Penuh)",
    subtitle: "Format periode akbar satu tahun kalender penuh untuk rekapitulasi poin dan apresiasi tahunan.",
    badge: "1 Tahun",
    icon: <TrophyIcon className="size-5 text-purple-600" />,
    accentColor: "from-purple-500/10 to-purple-500/5 border-purple-300/60",
  },
]

function formatDateDisplay(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
  } catch {
    return iso
  }
}

export function SeasonPage() {
  const [seasons, setSeasons] = useState<SeasonDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSeason, setEditingSeason] = useState<SeasonDto | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    target_attendance: 500,
    bonus_points: 100,
    description: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  useEffect(() => {
    loadSeasons()
  }, [])

  async function loadSeasons() {
    try {
      setLoading(true)
      const data = await seasonsApi.list()
      setSeasons(data)
      setError(null)
    } catch (err: any) {
      console.error("Gagal memuat seasons:", err)
      setError("Gagal memuat data season dari server.")
    } finally {
      setLoading(false)
    }
  }

  function handleOpenEdit(s: SeasonDto) {
    setEditingSeason(s)
    setFormData({
      name: s.name,
      start_date: s.start_date.slice(0, 10),
      end_date: s.end_date.slice(0, 10),
      target_attendance: s.target_attendance,
      bonus_points: s.bonus_points,
      description: s.description || "",
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingSeason) return

    if (!formData.name.trim() || !formData.start_date || !formData.end_date) {
      setFormError("Mohon lengkapi nama dan rentang tanggal season.")
      return
    }

    try {
      setSubmitting(true)
      setFormError(null)
      await seasonsApi.update(editingSeason.id, {
        name: formData.name.trim(),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date + "T23:59:59").toISOString(),
        target_attendance: Number(formData.target_attendance) || 500,
        bonus_points: Number(formData.bonus_points) || 100,
        description: formData.description.trim() || null,
      })
      await loadSeasons()
      setModalOpen(false)
    } catch (err: any) {
      console.error("Gagal menyimpan season:", err)
      setFormError(err.message || "Gagal menyimpan perubahan season.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleActivate(s: SeasonDto) {
    try {
      setActivatingId(s.id)
      await seasonsApi.activate(s.id)
      await loadSeasons()
    } catch (err: any) {
      console.error("Gagal mengaktifkan season:", err)
      alert(err.message || "Gagal mengaktifkan season.")
    } finally {
      setActivatingId(null)
    }
  }

  function getSeasonByCode(code: string): SeasonDto | undefined {
    return seasons.find((s) => s.code === code)
  }

  return (
    <main className="min-h-screen bg-sekkha-surface pb-32 md:pb-12 font-sans">
      <PageBreadcrumb
        items={[
          { label: "Konfigurasi" },
          { label: "Rules" },
          { label: "Season Leaderboard" },
        ]}
      />

      <div className="px-4 py-6 sm:px-6 md:px-8 max-w-6xl mx-auto space-y-7">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sekkha-hairline-soft pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
                <TrophyIcon className="size-5" />
              </div>
              <h1 className="text-heading-5 font-black text-sekkha-ink">
                Aturan Periode Season Leaderboard
              </h1>
            </div>
            <p className="text-body-sm text-sekkha-slate">
              Struktur 3 periode season tetap: <strong>Semester</strong> (Default), <strong>Kuartal</strong>, dan <strong>Tahunan</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-100/90 border border-slate-200/80 px-3.5 py-2 text-micro font-bold text-sekkha-slate shrink-0">
            <ShieldCheckIcon className="size-4 text-sekkha-brand-blue" />
            <span>Format Inti (3 Opsi Tetap, Data Dapat Diedit)</span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 p-4 text-body-sm text-amber-950 shadow-2xs">
          <InfoIcon className="size-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-caption text-amber-950">Mekanisme Season Aktif</p>
            <p className="text-micro text-amber-800 leading-relaxed">
              Hanya ada <strong>satu season yang aktif</strong> dalam satu waktu. Poin peringkat dan target komunitas di Leaderboard akan difilter sesuai rentang tanggal season yang sedang aktif.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 border border-red-200 text-body-sm text-red-800">
            <AlertCircleIcon className="size-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Hardcoded 3 Season Sections */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-3xl bg-white border border-sekkha-hairline animate-pulse p-6" />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {HARDCODED_SEASONS.map((cfg) => {
              const season = getSeasonByCode(cfg.code)
              if (!season) return null

              const isActive = season.is_active

              return (
                <div
                  key={cfg.code}
                  className={`rounded-3xl border bg-white p-5 sm:p-7 shadow-xs space-y-5 transition-all relative overflow-hidden ${
                    isActive
                      ? "border-amber-400/80 ring-2 ring-amber-400/20 shadow-md"
                      : "border-sekkha-hairline hover:border-slate-300"
                  }`}
                >
                  {/* Active Header Badge */}
                  {isActive && (
                    <div className="absolute top-0 right-0 rounded-bl-2xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-1.5 text-micro-bold text-white shadow-xs flex items-center gap-1.5">
                      <CheckCircleIcon className="size-3.5" />
                      <span>SEDANG AKTIF DI LEADERBOARD</span>
                    </div>
                  )}

                  {/* Section Title & Subtitle */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-sekkha-hairline-soft pb-4">
                    <div className="space-y-1.5 max-w-2xl">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
                          {cfg.icon}
                        </div>
                        <h2 className="text-heading-6 font-black text-sekkha-ink">
                          {season.name}
                        </h2>
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-micro-bold text-sekkha-slate">
                          {cfg.badge}
                        </span>
                      </div>
                      <p className="text-caption text-sekkha-slate leading-relaxed">
                        {season.description || cfg.subtitle}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 pt-2 sm:pt-0">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-caption font-bold text-emerald-700">
                          <CheckCircleIcon className="size-4 text-emerald-600" />
                          <span>Status: Aktif</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={activatingId === season.id}
                          onClick={() => handleActivate(season)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-caption font-bold text-white shadow-xs hover:bg-black transition-colors disabled:opacity-50"
                        >
                          <SparklesIcon className="size-3.5 text-amber-300" />
                          <span>{activatingId === season.id ? "Mengaktifkan..." : "Jadikan Season Aktif"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(season)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-sekkha-hairline-strong bg-white px-3 py-2 text-caption font-bold text-sekkha-ink shadow-2xs hover:bg-slate-50 hover:border-sekkha-brand-blue hover:text-sekkha-brand-blue transition-colors"
                      >
                        <PencilIcon className="size-3.5" />
                        <span>Edit Konfigurasi</span>
                      </button>
                    </div>
                  </div>

                  {/* Season Metrics Grid */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* Period Date Range */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-1">
                      <div className="flex items-center gap-2 text-micro font-bold text-sekkha-slate uppercase tracking-wider">
                        <CalendarIcon className="size-3.5 text-blue-600" />
                        <span>Rentang Periode</span>
                      </div>
                      <p className="text-body-sm font-extrabold text-sekkha-ink">
                        {formatDateDisplay(season.start_date)} – {formatDateDisplay(season.end_date)}
                      </p>
                    </div>

                    {/* Community Target */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-1">
                      <div className="flex items-center gap-2 text-micro font-bold text-sekkha-slate uppercase tracking-wider">
                        <UsersIcon className="size-3.5 text-emerald-600" />
                        <span>Target Kehadiran</span>
                      </div>
                      <p className="text-body-sm font-extrabold text-sekkha-ink flex items-baseline gap-1.5">
                        <span>{season.target_attendance}</span>
                        <span className="text-micro font-medium text-sekkha-slate">
                          (Tercatat: {season.total_attendances || 0} hadir)
                        </span>
                      </p>
                    </div>

                    {/* Bonus Points */}
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-1">
                      <div className="flex items-center gap-2 text-micro font-bold text-sekkha-slate uppercase tracking-wider">
                        <FlameIcon className="size-3.5 text-orange-600" />
                        <span>Bonus Akhir Season</span>
                      </div>
                      <p className="text-body-sm font-extrabold text-sekkha-ink">
                        +{season.bonus_points} Poin Komunitas
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Edit Season Modal */}
      <ResponsiveFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit Konfigurasi Season"
        description={`Perbarui rentang tanggal dan target untuk ${editingSeason?.name || "season ini"}.`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 border border-red-200 text-caption text-red-800">
              <AlertCircleIcon className="size-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-caption font-bold text-sekkha-ink">Nama Season</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-caption font-bold text-sekkha-ink">Tanggal Mulai</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
              />
            </div>
            <div className="space-y-1">
              <label className="text-caption font-bold text-sekkha-ink">Tanggal Selesai</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-caption font-bold text-sekkha-ink">Target Kehadiran</label>
              <input
                type="number"
                min={1}
                value={formData.target_attendance}
                onChange={(e) => setFormData({ ...formData, target_attendance: Number(e.target.value) })}
                className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
              />
            </div>
            <div className="space-y-1">
              <label className="text-caption font-bold text-sekkha-ink">Bonus Poin Selesai</label>
              <input
                type="number"
                min={0}
                value={formData.bonus_points}
                onChange={(e) => setFormData({ ...formData, bonus_points: Number(e.target.value) })}
                className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-caption font-bold text-sekkha-ink">Deskripsi / Tema Musim</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Jelaskan fokus tema season kali ini..."
              className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-sekkha-hairline-soft">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-sekkha-hairline-strong px-4 py-2.5 text-body-sm font-bold text-sekkha-slate hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-sekkha-brand-blue px-5 py-2.5 text-body-sm font-bold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </ResponsiveFormModal>
    </main>
  )
}
