// feature/configure/components/SeasonPage
// Master Data: Season Management for Leaderboard
// Allows pengurus/admin to configure seasons, start/end dates, community target, and active status.

import { useState, useEffect } from "react"
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  TrophyIcon,
  CalendarIcon,
  CheckCircleIcon,
  SparklesIcon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { seasonsApi, type SeasonDto } from "../api/configureApi"

interface SeasonFormData {
  name: string
  code: string
  start_date: string
  end_date: string
  is_active: boolean
  target_attendance: number
  bonus_points: number
  description: string
}

const DEFAULT_FORM: SeasonFormData = {
  name: "",
  code: "",
  start_date: new Date().toISOString().slice(0, 10),
  end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  is_active: false,
  target_attendance: 500,
  bonus_points: 100,
  description: "",
}

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

  const [modalOpen, setModalOpen] = useState(false)
  const [editingSeason, setEditingSeason] = useState<SeasonDto | null>(null)
  const [formData, setFormData] = useState<SeasonFormData>(DEFAULT_FORM)
  const [submitting, setSubmitting] = useState(false)

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

  function handleOpenCreate() {
    setEditingSeason(null)
    setFormData(DEFAULT_FORM)
    setModalOpen(true)
  }

  function handleOpenEdit(s: SeasonDto) {
    setEditingSeason(s)
    setFormData({
      name: s.name,
      code: s.code || "",
      start_date: s.start_date.slice(0, 10),
      end_date: s.end_date.slice(0, 10),
      is_active: s.is_active,
      target_attendance: s.target_attendance,
      bonus_points: s.bonus_points,
      description: s.description || "",
    })
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formData.name.trim() || !formData.start_date || !formData.end_date) {
      alert("Mohon lengkapi nama dan rentang tanggal season.")
      return
    }

    try {
      setSubmitting(true)
      if (editingSeason) {
        await seasonsApi.update(editingSeason.id, {
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          start_date: new Date(formData.start_date).toISOString(),
          end_date: new Date(formData.end_date + "T23:59:59").toISOString(),
          is_active: formData.is_active,
          target_attendance: Number(formData.target_attendance) || 500,
          bonus_points: Number(formData.bonus_points) || 100,
          description: formData.description.trim() || undefined,
        })
      } else {
        await seasonsApi.create({
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          start_date: new Date(formData.start_date).toISOString(),
          end_date: new Date(formData.end_date + "T23:59:59").toISOString(),
          is_active: formData.is_active,
          target_attendance: Number(formData.target_attendance) || 500,
          bonus_points: Number(formData.bonus_points) || 100,
          description: formData.description.trim() || undefined,
        })
      }
      setModalOpen(false)
      await loadSeasons()
    } catch (err: any) {
      console.error("Gagal menyimpan season:", err)
      alert(err.message || "Gagal menyimpan data season.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(s: SeasonDto) {
    if (!confirm(`Hapus season "${s.name}"?`)) return
    try {
      await seasonsApi.remove(s.id)
      await loadSeasons()
    } catch (err: any) {
      console.error("Gagal menghapus season:", err)
      alert(err.message || "Gagal menghapus season.")
    }
  }

  async function handleActivate(s: SeasonDto) {
    try {
      await seasonsApi.activate(s.id)
      await loadSeasons()
    } catch (err: any) {
      console.error("Gagal mengaktifkan season:", err)
      alert(err.message || "Gagal mengaktifkan season.")
    }
  }

  return (
    <main className="relative font-sans overflow-hidden">
      <PageBreadcrumb
        items={[
          { label: "Konfigurasi" },
          { label: "Master Data" },
          { label: "Season Leaderboard" },
        ]}
      />

      <div className="px-3.5 py-4 pb-24 md:pb-8 lg:pb-10 sm:px-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-5">
          {/* Header Row */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                  <TrophyIcon className="size-4.5" />
                </span>
                <h1 className="text-body-lg sm:text-heading-5 font-black text-sekkha-ink">
                  Manajemen Season Leaderboard
                </h1>
              </div>
              <p className="mt-1 text-caption text-sekkha-slate">
                Atur periode aktif season dan rentang tanggal absensi yang masuk ke kalkulasi peringkat leaderboard.
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sekkha-brand-blue px-4 py-2.5 text-caption-bold text-white shadow-md hover:bg-blue-700 transition-all cursor-pointer shrink-0 active:scale-98"
            >
              <PlusIcon className="size-4" />
              <span>Tambah Season Baru</span>
            </button>
          </div>

          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-caption font-bold text-rose-700">
              {error}
            </div>
          )}

          {/* Season Cards Grid */}
          {loading ? (
            <div className="py-12 text-center text-caption text-sekkha-slate">
              Memuat data season...
            </div>
          ) : seasons.length === 0 ? (
            <div className="rounded-3xl border border-sekkha-hairline bg-white/70 backdrop-blur-md p-10 text-center space-y-3">
              <TrophyIcon className="size-10 text-sekkha-slate/40 mx-auto" />
              <p className="text-body-sm-medium font-bold text-sekkha-slate">Belum ada season terdaftar.</p>
              <button
                type="button"
                onClick={handleOpenCreate}
                className="text-caption font-bold text-sekkha-brand-blue hover:underline"
              >
                Buat Season Pertama
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {seasons.map((s) => {
                const isOngoing = new Date(s.start_date) <= new Date() && new Date(s.end_date) >= new Date()
                const isFinished = new Date(s.end_date) < new Date()

                return (
                  <div
                    key={s.id}
                    className={`relative flex flex-col justify-between overflow-hidden rounded-3xl border bg-white/90 backdrop-blur-2xl p-5 shadow-lg transition-all ${
                      s.is_active
                        ? "border-amber-400/80 ring-2 ring-amber-300/40 shadow-amber-500/5"
                        : "border-sekkha-hairline hover:border-sekkha-brand-blue/30"
                    }`}
                  >
                    {/* Top Status Badges */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {s.is_active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-micro-bold text-emerald-800 animate-pulse shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              Season Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-micro-bold text-slate-600">
                              Tidak Aktif
                            </span>
                          )}

                          {isOngoing && !s.is_active && (
                            <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                              Dalam Periode
                            </span>
                          )}
                          {isFinished && (
                            <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                              Selesai
                            </span>
                          )}
                        </div>

                        {s.code && (
                          <span className="text-[10px] font-mono font-bold uppercase text-sekkha-slate/70 bg-sekkha-surface px-2 py-0.5 rounded-lg border border-sekkha-hairline-soft">
                            {s.code}
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="mt-3 text-body-base font-black text-sekkha-ink">{s.name}</h3>
                      {s.description && (
                        <p className="mt-1 text-caption text-sekkha-slate line-clamp-2">{s.description}</p>
                      )}

                      {/* Date Range Box */}
                      <div className="mt-3 rounded-2xl bg-sekkha-canvas/80 border border-sekkha-hairline-soft p-3 space-y-1.5">
                        <div className="flex items-center gap-2 text-caption font-bold text-sekkha-ink">
                          <CalendarIcon className="size-3.5 text-sekkha-brand-blue shrink-0" />
                          <span>
                            {formatDateDisplay(s.start_date)} — {formatDateDisplay(s.end_date)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-micro text-sekkha-slate pt-1 border-t border-sekkha-hairline-soft font-medium">
                          <span className="flex items-center gap-1">
                            <UsersIcon className="size-3 text-sekkha-brand-blue" />
                            Absensi Masuk: <strong>{s.total_attendances ?? 0}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <SparklesIcon className="size-3 text-amber-500" />
                            Target: <strong>{s.target_attendance}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Actions */}
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-sekkha-hairline-soft pt-3">
                      {!s.is_active ? (
                        <button
                          type="button"
                          onClick={() => handleActivate(s)}
                          className="inline-flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-300/80 px-2.5 py-1.5 text-micro-bold text-amber-900 hover:bg-amber-100 transition-all cursor-pointer active:scale-95"
                        >
                          <CheckCircleIcon className="size-3.5 text-amber-600" />
                          <span>Aktifkan Season</span>
                        </button>
                      ) : (
                        <span className="text-micro-bold text-emerald-700 flex items-center gap-1">
                          <CheckCircleIcon className="size-3.5 text-emerald-600" />
                          Sedang Aktif
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-sekkha-surface border border-sekkha-hairline text-sekkha-slate hover:bg-white hover:text-sekkha-brand-blue transition-all cursor-pointer"
                          title="Edit Season"
                        >
                          <PencilIcon className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(s)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all cursor-pointer"
                          title="Hapus Season"
                        >
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal Create / Edit */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/80 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-sekkha-hairline-soft">
              <h2 className="text-body-base font-black text-sekkha-ink">
                {editingSeason ? "Edit Season Leaderboard" : "Tambah Season Baru"}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl p-1 text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {/* Nama Season */}
              <div>
                <label className="block text-caption-bold font-extrabold text-sekkha-ink">
                  Nama Season <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Season 1 · Q1 2026"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-sekkha-hairline bg-sekkha-canvas/60 px-3.5 py-2.5 text-caption font-medium text-sekkha-ink focus:border-sekkha-brand-blue focus:outline-hidden"
                />
              </div>

              {/* Kode Season */}
              <div>
                <label className="block text-caption-bold font-extrabold text-sekkha-ink">
                  Kode Identitas Season (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: S2026-Q1"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-sekkha-hairline bg-sekkha-canvas/60 px-3.5 py-2.5 text-caption font-medium text-sekkha-ink focus:border-sekkha-brand-blue focus:outline-hidden"
                />
              </div>

              {/* Date Range: Start & End */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption-bold font-extrabold text-sekkha-ink">
                    Tanggal Mulai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-sekkha-hairline bg-sekkha-canvas/60 px-3 py-2 text-caption font-medium text-sekkha-ink focus:border-sekkha-brand-blue focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-caption-bold font-extrabold text-sekkha-ink">
                    Tanggal Selesai <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-sekkha-hairline bg-sekkha-canvas/60 px-3 py-2 text-caption font-medium text-sekkha-ink focus:border-sekkha-brand-blue focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Targets: Target Attendance & Bonus Points */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-caption-bold font-extrabold text-sekkha-ink">
                    Target Absensi Komunitas
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.target_attendance}
                    onChange={(e) => setFormData({ ...formData, target_attendance: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-sekkha-hairline bg-sekkha-canvas/60 px-3 py-2 text-caption font-medium text-sekkha-ink focus:border-sekkha-brand-blue focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-caption-bold font-extrabold text-sekkha-ink">
                    Bonus Poin Tercapai
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bonus_points}
                    onChange={(e) => setFormData({ ...formData, bonus_points: Number(e.target.value) })}
                    className="mt-1 w-full rounded-xl border border-sekkha-hairline bg-sekkha-canvas/60 px-3 py-2 text-caption font-medium text-sekkha-ink focus:border-sekkha-brand-blue focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-caption-bold font-extrabold text-sekkha-ink">
                  Deskripsi / Catatan Season
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan tema atau periode season..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 w-full rounded-xl border border-sekkha-hairline bg-sekkha-canvas/60 px-3.5 py-2 text-caption font-medium text-sekkha-ink focus:border-sekkha-brand-blue focus:outline-hidden"
                />
              </div>

              {/* Is Active Switch */}
              <label className="flex items-center gap-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="size-4 rounded-md accent-amber-600"
                />
                <span className="text-caption font-extrabold text-amber-950">
                  Jadikan sebagai Season Aktif saat ini
                </span>
              </label>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-sekkha-hairline-soft">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-sekkha-hairline px-4 py-2 text-caption font-bold text-sekkha-slate hover:bg-sekkha-surface cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-sekkha-brand-blue px-5 py-2 text-caption-bold text-white shadow-md hover:bg-blue-700 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : editingSeason ? "Simpan Perubahan" : "Buat Season"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  )
}
