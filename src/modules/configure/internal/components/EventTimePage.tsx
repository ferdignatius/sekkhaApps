// feature/configure/components/EventTimePage
// Master Data: Preset Jam Umum Vihara management — CRUD preset jam & label kegiatan Vihara.

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, ClockIcon, CheckIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"

export interface EventTimePreset {
  id: string
  label: string
  time: string
  description?: string
  is_active: boolean
}

export const INITIAL_TIME_PRESETS: EventTimePreset[] = [
  { id: "etp-1", label: "08:00 WIB (Puja Pagi)", time: "08:00", description: "Jadwal Puja Bakti Pagi Umat & Pemuda", is_active: true },
  { id: "etp-2", label: "14:00 WIB (Kebaktian Siang)", time: "14:00", description: "Kebaktian Umum & Sekolah Minggu", is_active: true },
  { id: "etp-3", label: "18:30 WIB (Puja Malam)", time: "18:30", description: "Puja Bakti Malam & Meditasi", is_active: true },
  { id: "etp-4", label: "19:00 WIB (Diskusi Dhamma)", time: "19:00", description: "Sesi Dhammasakaccha & Kelas Dhamma", is_active: true },
]

export function EventTimePage() {
  const { authState } = useAuth()
  const isPengurusOrAdmin = authState.status === "authenticated" && (authState.role === "admin" || authState.role === "pengurus")

  const [presets, setPresets] = useState<EventTimePreset[]>(INITIAL_TIME_PRESETS)
  const [editing, setEditing] = useState<EventTimePreset | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [label, setLabel] = useState("")
  const [time, setTime] = useState("08:00")
  const [description, setDescription] = useState("")

  function resetForm() {
    setLabel("")
    setTime("08:00")
    setDescription("")
    setEditing(null)
    setShowForm(false)
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(item: EventTimePreset) {
    setLabel(item.label)
    setTime(item.time)
    setDescription(item.description ?? "")
    setEditing(item)
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !time) return

    if (editing) {
      setPresets(prev =>
        prev.map(p => (p.id === editing.id ? { ...p, label, time, description } : p))
      )
    } else {
      const newPreset: EventTimePreset = {
        id: `etp-${Date.now()}`,
        label,
        time,
        description,
        is_active: true,
      }
      setPresets(prev => [...prev, newPreset])
    }
    resetForm()
  }

  function handleToggleActive(id: string) {
    setPresets(prev =>
      prev.map(p => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    )
  }

  function handleDelete(id: string) {
    setPresets(prev => prev.filter(p => p.id !== id))
  }

  return (
    <main className="font-sans text-left">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Preset Jam Vihara" }]} />
      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-5">
          
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                <ClockIcon className="size-5" />
              </div>
              <div>
                <h1 className="text-heading-5 font-extrabold text-sekkha-ink">Master Data Preset Jam Vihara</h1>
                <p className="text-micro text-sekkha-slate">Kelola daftar pilihan waktu cepat untuk pembuatan kegiatan Vihara</p>
              </div>
            </div>

            {isPengurusOrAdmin && (
              <button
                type="button"
                onClick={openCreate}
                className="flex items-center gap-1.5 rounded-xl bg-sekkha-brand-blue px-4 py-2 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-95"
              >
                <PlusIcon className="size-4" />
                Tambah Preset Jam
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-sekkha-hairline bg-white/95 backdrop-blur-md p-4 shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-caption border-collapse">
                <thead>
                  <tr className="border-b border-sekkha-hairline-soft bg-sekkha-canvas/60 text-micro-bold uppercase tracking-wider text-sekkha-slate">
                    <th className="py-3 px-4">Label Preset Jam</th>
                    <th className="py-3 px-4">Jam WIB</th>
                    <th className="py-3 px-4">Keterangan Kegiatan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {isPengurusOrAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sekkha-hairline-soft font-sans">
                  {presets.map(p => (
                    <tr key={p.id} className="hover:bg-sekkha-surface/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-sekkha-ink flex items-center gap-2">
                        <ClockIcon className="size-4 text-sekkha-brand-blue shrink-0" />
                        <span>{p.label}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-micro-bold text-sky-800">
                          {p.time} WIB
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sekkha-slate">
                        {p.description || "-"}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {p.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-micro-bold text-emerald-800">
                            <CheckIcon className="size-3" /> Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-micro-bold text-slate-500">
                            Non-Aktif
                          </span>
                        )}
                      </td>
                      {isPengurusOrAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(p.id)}
                              className={`rounded-lg border px-2.5 py-1 text-micro-bold transition-all ${
                                p.is_active !== false
                                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                              title={p.is_active !== false ? "Non-Aktifkan" : "Aktifkan"}
                            >
                              {p.is_active !== false ? "Non-Aktifkan" : "Aktifkan"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="rounded-lg border border-sekkha-hairline bg-sekkha-canvas p-1.5 text-sekkha-ink hover:bg-blue-50 hover:text-sekkha-brand-blue transition-colors"
                              title="Edit Preset Jam"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Hapus Preset Jam"
                            >
                              <TrashIcon className="size-4" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Modal Sub-Dialog */}
          {showForm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
              <div className="w-full max-w-md rounded-2xl border border-sekkha-hairline bg-white p-5 shadow-2xl space-y-4 text-left font-sans animate-in zoom-in-95">
                <div className="flex items-center justify-between pb-2 border-b border-sekkha-hairline-soft">
                  <h3 className="text-body-base font-bold text-sekkha-ink">
                    {editing ? "Edit Preset Jam" : "Tambah Preset Jam Vihara"}
                  </h3>
                  <button type="button" onClick={resetForm} className="text-sekkha-slate hover:text-sekkha-ink">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-caption font-bold text-sekkha-ink">Label Tampilan Preset *</label>
                    <input
                      type="text"
                      required
                      value={label}
                      onChange={e => setLabel(e.target.value)}
                      placeholder="Misal: 08:00 WIB (Puja Pagi)"
                      className="w-full h-11 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-caption font-bold text-sekkha-ink">Jam WIB *</label>
                    <input
                      type="time"
                      required
                      value={time}
                      onChange={e => setTime(e.target.value)}
                      className="w-full h-11 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-caption font-bold text-sekkha-ink">Deskripsi / Keterangan (Opsional)</label>
                    <input
                      type="text"
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                      placeholder="Misal: Sesi Kebaktian Minggu"
                      className="w-full h-11 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-sekkha-hairline-soft">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-sekkha-hairline bg-sekkha-surface px-4 py-2 text-caption-bold text-sekkha-slate"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-sekkha-brand-blue px-4 py-2 text-caption-bold text-white shadow-xs hover:bg-blue-700"
                    >
                      {editing ? "Simpan Perubahan" : "Tambah Preset"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
