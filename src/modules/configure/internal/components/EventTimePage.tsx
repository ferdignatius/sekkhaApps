// feature/configure/components/EventTimePage
// Master Data: Preset Jam Umum Vihara management — CRUD preset jam & label kegiatan Vihara.

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, ClockIcon, CheckIcon, CalendarIcon, SparklesIcon, TagIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { WheelTimePickerTrigger } from "@/components/ui/WheelTimePicker"
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown"
import {
  type EventTimePresetItem,
  DAY_NAMES,
  getMasterTimePresets,
  getMasterCategories,
  saveMasterTimePresets,
} from "@/modules/events/internal/masterdata"

export function EventTimePage() {
  const { authState } = useAuth()
  const isPengurusOrAdmin = authState.status === "authenticated" && (authState.role === "admin" || authState.role === "pengurus")

  const [presets, setPresets] = useState<EventTimePresetItem[]>(() => getMasterTimePresets())
  const [editing, setEditing] = useState<EventTimePresetItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const allCategories = getMasterCategories(true)

  const [label, setLabel] = useState("")
  const [time, setTime] = useState("08:00")
  const [dayOfWeek, setDayOfWeek] = useState<number>(-1)
  const [description, setDescription] = useState("")
  const [targetCategoryTags, setTargetCategoryTags] = useState<string[]>([])

  function updateAndPersistPresets(newPresets: EventTimePresetItem[]) {
    setPresets(newPresets)
    saveMasterTimePresets(newPresets)
  }

  function resetForm() {
    setLabel("")
    setTime("08:00")
    setDayOfWeek(-1)
    setDescription("")
    setTargetCategoryTags([])
    setEditing(null)
    setShowForm(false)
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(item: EventTimePresetItem) {
    setLabel(item.label)
    setTime(item.time)
    setDayOfWeek(item.day_of_week ?? -1)
    setDescription(item.description ?? "")
    setTargetCategoryTags(item.target_category_tags ?? [])
    setEditing(item)
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !time) return

    if (editing) {
      updateAndPersistPresets(
        presets.map(p => (p.id === editing.id ? { ...p, label, time, day_of_week: dayOfWeek, description, target_category_tags: targetCategoryTags } : p))
      )
    } else {
      const newPreset: EventTimePresetItem = {
        id: `etp-${Date.now()}`,
        label,
        time,
        day_of_week: dayOfWeek,
        description,
        is_active: true,
        target_category_tags: targetCategoryTags,
      }
      updateAndPersistPresets([...presets, newPreset])
    }
    resetForm()
  }

  function handleToggleActive(id: string) {
    updateAndPersistPresets(
      presets.map(p => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    )
  }

  function handleDelete(id: string) {
    updateAndPersistPresets(presets.filter(p => p.id !== id))
  }

  return (
    <main className="font-sans text-left">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Preset Waktu Vihara" }]} />
      <div className="px-4 py-6 pb-32 sm:pb-36 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-5">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shrink-0">
                <ClockIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-body-base sm:text-heading-5 font-extrabold text-sekkha-ink">Master Data Preset Waktu Vihara</h1>
                <p className="text-micro text-sekkha-slate">Kelola daftar pilihan waktu & hari pelaksanaan cepat untuk kegiatan Vihara</p>
              </div>
            </div>

            {isPengurusOrAdmin && (
              <button
                type="button"
                onClick={openCreate}
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-sekkha-brand-blue px-4 py-2.5 sm:py-2 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
              >
                <PlusIcon className="size-4" />
                <span>Tambah Preset Waktu</span>
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-sekkha-hairline bg-white/95 backdrop-blur-md p-4 shadow-xs">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full min-w-[650px] text-left text-caption border-collapse">
                <thead>
                  <tr className="border-b border-sekkha-hairline-soft bg-sekkha-canvas/60 text-micro-bold uppercase tracking-wider text-sekkha-slate">
                    <th className="py-3 px-4">Label Preset Waktu</th>
                    <th className="py-3 px-4">Target Hari</th>
                    <th className="py-3 px-4">Jam WIB</th>
                    <th className="py-3 px-4">Kategori Event</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {isPengurusOrAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sekkha-hairline-soft font-sans">
                  {presets.map(p => (
                    <tr key={p.id} className="hover:bg-sekkha-surface/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-sekkha-ink">
                        <div className="flex items-center gap-2">
                          <ClockIcon className="size-4 text-sekkha-brand-blue shrink-0" />
                          <span>{p.label}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {p.day_of_week !== undefined && p.day_of_week >= 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-xl bg-purple-50 border border-purple-200 px-2.5 py-0.5 text-micro-bold text-purple-800">
                            <CalendarIcon className="size-3 text-purple-600" />
                            Hari {DAY_NAMES[p.day_of_week]}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-micro font-medium text-slate-600">
                            Bebas (Hanya Jam)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-sky-50 border border-sky-200 px-2.5 py-0.5 text-micro-bold text-sky-800">
                          {p.time} WIB
                        </span>
                      </td>
                      {/* Kategori Event column */}
                      <td className="py-3 px-4">
                        {!p.target_category_tags || p.target_category_tags.length === 0 ? (
                          <span className="text-micro text-sekkha-slate font-medium">Semua Kategori</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {p.target_category_tags.map(tag => (
                              <span key={tag} className="inline-flex items-center gap-0.5 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-800 capitalize">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
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
                              className={`rounded-lg border px-2.5 py-1 text-micro-bold transition-all cursor-pointer ${p.is_active !== false
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
                              className="rounded-lg border border-sekkha-hairline bg-sekkha-canvas p-1.5 text-sekkha-ink hover:bg-blue-50 hover:text-sekkha-brand-blue transition-colors cursor-pointer"
                              title="Edit Preset Jam"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(p.id)}
                              className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
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

          {/* Form Modal Sub-Dialog (Responsive Bottom Sheet on Mobile) */}
          {showForm && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in-0">
              <div className="w-full sm:max-w-xl max-h-[93vh] sm:max-h-[90vh] rounded-t-[28px] sm:rounded-2xl border-t sm:border border-sekkha-hairline bg-white p-5 shadow-2xl text-left font-sans overflow-y-auto animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">

                {/* Mobile Drag Handle */}
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-2 mb-1 sm:hidden shrink-0" />

                <div className="flex items-center justify-between pb-2 border-b border-sekkha-hairline-soft">
                  <h3 className="text-body-base font-bold text-sekkha-ink">
                    {editing ? "Edit Preset Waktu & Hari" : "Tambah Preset Waktu Vihara"}
                  </h3>
                  <button type="button" onClick={resetForm} className="text-sekkha-slate hover:text-sekkha-ink cursor-pointer p-1">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-caption font-bold text-sekkha-ink">Label Tampilan Preset *</label>
                    <input
                      type="text"
                      required
                      value={label}
                      onChange={e => setLabel(e.target.value)}
                      placeholder="Misal: 14:00 WIB (Kebaktian Siang)"
                      className="w-full h-11 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                    />
                  </div>

                  {/* Wheel Time Picker Integration */}
                  <div className="space-y-1">
                    <label className="text-caption font-bold text-sekkha-ink">Jam WIB (Wheel Time Picker) *</label>
                    <WheelTimePickerTrigger
                      value={time}
                      onChange={setTime}
                      label="Pilih Jam Preset"
                    />
                  </div>

                  {/* Target Hari Selection — Custom Day Selector Pills UI */}
                  <div className="space-y-2 rounded-2xl border border-sekkha-hairline bg-sekkha-surface/60 p-3">
                    <div className="flex items-center justify-between">
                      <label className="text-caption font-bold text-sekkha-ink flex items-center gap-1.5">
                        <CalendarIcon className="size-4 text-purple-600" />
                        <span>Target Hari Pelaksanaan</span>
                      </label>
                      {dayOfWeek >= 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 border border-purple-200 px-2 py-0.5 text-[11px] font-bold text-purple-800">
                          Hari {DAY_NAMES[dayOfWeek]}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/80 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          Bebas Jam Saja
                        </span>
                      )}
                    </div>

                    {/* Day Selection Chips Grid */}
                    <div className="space-y-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => setDayOfWeek(-1)}
                        className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 px-3 text-micro-bold transition-all border cursor-pointer ${dayOfWeek === -1
                            ? "bg-sekkha-brand-blue text-white border-sekkha-brand-blue shadow-xs ring-2 ring-blue-200"
                            : "bg-white border-sekkha-hairline text-sekkha-slate hover:border-sekkha-brand-blue/40 hover:text-sekkha-ink"
                          }`}
                      >
                        <SparklesIcon className="size-3.5 text-amber-400 shrink-0" />
                        <span>Bebas / Setiap Hari (Hanya Set Jam)</span>
                      </button>

                      <div className="grid grid-cols-4 gap-1.5">
                        {DAY_NAMES.map((name, idx) => {
                          const isSelected = dayOfWeek === idx
                          const isSunday = idx === 0
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setDayOfWeek(idx)}
                              className={`flex items-center justify-center rounded-xl py-2 px-1 text-micro-bold transition-all border cursor-pointer ${isSelected
                                  ? isSunday
                                    ? "bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-200"
                                    : "bg-sekkha-brand-blue text-white border-sekkha-brand-blue shadow-xs ring-2 ring-blue-200"
                                  : isSunday
                                    ? "bg-purple-50/80 text-purple-700 border-purple-200 hover:bg-purple-100"
                                    : "bg-white text-sekkha-ink border-sekkha-hairline hover:bg-sekkha-canvas hover:border-sekkha-brand-blue/30"
                                }`}
                            >
                              <span>{name}</span>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <p className="text-[11px] text-sekkha-slate font-medium pt-0.5 flex items-center gap-1">
                      <SparklesIcon className="size-3 text-amber-500 shrink-0" />
                      <span>
                        {dayOfWeek >= 0
                          ? `Sistem otomatis cari tanggal Hari ${DAY_NAMES[dayOfWeek]} terdekat saat buat event.`
                          : "Hanya mengeset waktu tanpa mengubah tanggal terpilih."}
                      </span>
                    </p>
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

                  {/* Kategori Event Multi-Select Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-caption font-bold text-sekkha-ink flex items-center gap-1.5">
                      <TagIcon className="size-4 text-indigo-600" />
                      <span>Kategori Event yang Bisa Pakai</span>
                    </label>
                    <p className="text-micro text-sekkha-slate flex items-center gap-1">
                      <SparklesIcon className="size-3 text-amber-500 shrink-0" />
                      <span>Kosong = tampil di semua kategori event.</span>
                    </p>
                    <MultiSelectDropdown
                      options={allCategories.map(cat => ({
                        value: cat.tag,
                        label: cat.name,
                        colorHex: cat.colorHex,
                      }))}
                      value={targetCategoryTags}
                      onChange={setTargetCategoryTags}
                      placeholder="Semua kategori (kosong = tidak dibatasi)"
                      defaultValue={[]}
                      allowEmpty={true}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-sekkha-hairline-soft">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-sekkha-hairline bg-sekkha-surface px-4 py-2 text-caption-bold text-sekkha-slate cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-sekkha-brand-blue px-4 py-2 text-caption-bold text-white shadow-xs hover:bg-blue-700 cursor-pointer"
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

