// feature/configure/components/EventTypePage
// Master Data: Event Category & Type management — with Custom Autofill Templates for Event Creation.

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, TagIcon, SparklesIcon, CheckIcon, Wand2Icon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { getMasterCategories } from "@/modules/events/internal/masterdata"
import type { EventCategoryItem } from "@/modules/events/internal/masterdata"
import { WheelTimePickerTrigger } from "@/components/ui/WheelTimePicker"

export function EventTypePage() {
  const { authState } = useAuth()
  const isPengurusOrAdmin = authState.status === "authenticated" && (authState.role === "admin" || authState.role === "pengurus")

  const [categories, setCategories] = useState<EventCategoryItem[]>(() => getMasterCategories())
  const [editing, setEditing] = useState<EventCategoryItem | null>(null)
  const [showModal, setShowModal] = useState(false)

  const [tag, setTag] = useState("")
  const [name, setName] = useState("")
  const [autofillTitle, setAutofillTitle] = useState("")
  const [autofillLocation, setAutofillLocation] = useState("")
  const [autofillDesc, setAutofillDesc] = useState("")
  const [autofillTime, setAutofillTime] = useState("08:00")

  function saveToStorage(updated: EventCategoryItem[]) {
    setCategories(updated)
    try {
      localStorage.setItem("sekkha_master_categories", JSON.stringify(updated))
    } catch {}
  }

  function resetForm() {
    setTag("")
    setName("")
    setAutofillTitle("")
    setAutofillLocation("")
    setAutofillDesc("")
    setAutofillTime("08:00")
    setEditing(null)
    setShowModal(false)
  }

  function openCreate() {
    resetForm()
    setShowModal(true)
  }

  function openEdit(item: EventCategoryItem) {
    setTag(item.tag)
    setName(item.name)
    setAutofillTitle(`Kegiatan ${item.name} Vihara`)
    setAutofillLocation("Vihara Sekkha")
    setAutofillDesc(`Kegiatan ${item.name.toLowerCase()} bersama Umat Vihara Sekkha.`)
    setAutofillTime(item.autofillTime ?? "08:00")
    setEditing(item)
    setShowModal(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !tag.trim()) return

    const tagKey = tag.toLowerCase().replace(/\s+/g, "_")
    const newCat: EventCategoryItem = {
      id: editing ? editing.id : `cat-${Date.now()}`,
      tag: tagKey,
      name,
      bg: editing?.bg ?? "bg-sky-100/90",
      text: editing?.text ?? "text-sky-800",
      dot: editing?.dot ?? "bg-sky-500",
      points: editing?.points ?? 50,
      is_active: editing?.is_active ?? true,
      autofillTime,
    }

    if (editing) {
      const updated = categories.map(c => (c.id === editing.id ? newCat : c))
      saveToStorage(updated)
    } else {
      saveToStorage([...categories, newCat])
    }
    resetForm()
  }

  function handleToggleActive(id: string) {
    const updated = categories.map(c =>
      c.id === id ? { ...c, is_active: !c.is_active } : c
    )
    saveToStorage(updated)
  }

  function handleDelete(id: string) {
    const updated = categories.filter(c => c.id !== id)
    saveToStorage(updated)
  }

  return (
    <main className="font-sans text-left">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Kategori Event" }]} />
      <div className="px-4 py-6 pb-32 sm:pb-36 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-5">
          
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 shrink-0">
                <TagIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-body-base sm:text-heading-5 font-extrabold text-sekkha-ink">Master Data Kategori Event</h1>
                <p className="text-micro text-sekkha-slate">Kelola kategori event dan template autofill untuk formulir kegiatan</p>
              </div>
            </div>

            {isPengurusOrAdmin && (
              <button
                type="button"
                onClick={openCreate}
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-sekkha-brand-blue px-4 py-2.5 sm:py-2 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-95"
              >
                <PlusIcon className="size-4" />
                <span>Tambah Kategori Event</span>
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-sekkha-hairline bg-white/95 backdrop-blur-md p-4 shadow-xs">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full min-w-[650px] text-left text-caption border-collapse">
                <thead>
                  <tr className="border-b border-sekkha-hairline-soft bg-sekkha-canvas/60 text-micro-bold uppercase tracking-wider text-sekkha-slate">
                    <th className="py-3 px-4">Nama Kategori</th>
                    <th className="py-3 px-4">Kode Tag</th>
                    <th className="py-3 px-4">Template Autofill Judul</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {isPengurusOrAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sekkha-hairline-soft font-sans">
                  {categories.map(c => (
                    <tr key={c.id} className="hover:bg-sekkha-surface/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-sekkha-ink">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-micro-bold capitalize ${c.bg} ${c.text}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                          {c.name}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-micro text-sekkha-slate">
                        {c.tag}
                      </td>
                      <td className="py-3 px-4 text-sekkha-ink font-medium">
                        <span className="flex items-center gap-1">
                          <Wand2Icon className="size-3 text-sekkha-brand-blue" />
                          <span>Kegiatan {c.name} Vihara</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {c.is_active !== false ? (
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
                              onClick={() => handleToggleActive(c.id)}
                              className={`rounded-lg border px-2.5 py-1 text-micro-bold transition-all ${
                                c.is_active !== false
                                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                              title={c.is_active !== false ? "Non-Aktifkan" : "Aktifkan"}
                            >
                              {c.is_active !== false ? "Non-Aktifkan" : "Aktifkan"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="rounded-lg border border-sekkha-hairline bg-sekkha-canvas p-1.5 text-sekkha-ink hover:bg-blue-50 hover:text-sekkha-brand-blue transition-colors"
                              title="Edit Kategori & Template Autofill"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c.id)}
                              className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Hapus Kategori"
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

          {/* Form Pop-Up Modal Sub-Dialog (Responsive Bottom Sheet on Mobile) */}
          {showModal && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in-0">
              <div className="w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] rounded-t-[28px] sm:rounded-2xl border-t sm:border border-sekkha-hairline bg-white p-5 sm:p-6 shadow-2xl space-y-4 text-left font-sans overflow-y-auto animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
                
                {/* Mobile Drag Handle */}
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-2 mb-1 sm:hidden shrink-0" />

                <div className="flex items-center justify-between pb-3 border-b border-sekkha-hairline-soft">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="size-5 text-sekkha-brand-blue" />
                    <h3 className="text-body-base font-extrabold text-sekkha-ink">
                      {editing ? "Edit Kategori & Autofill" : "Tambah Kategori Event Baru"}
                    </h3>
                  </div>
                  <button type="button" onClick={resetForm} className="text-sekkha-slate hover:text-sekkha-ink">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-caption font-bold text-sekkha-ink">Nama Kategori *</label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Misal: Youth / Sekolah Minggu"
                        className="w-full h-11 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-caption font-bold text-sekkha-ink">Kode Tag *</label>
                      <input
                        type="text"
                        required
                        value={tag}
                        onChange={e => setTag(e.target.value)}
                        placeholder="Misal: youth / sekolah_minggu"
                        className="w-full h-11 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                      />
                    </div>
                  </div>

                  {/* Autofill Template Configuration */}
                  <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-2.5">
                    <p className="text-micro font-bold text-sekkha-brand-blue uppercase tracking-wider flex items-center gap-1.5">
                      <Wand2Icon className="size-3.5" />
                      <span>Pengaturan Template Autofill Form Create Event:</span>
                    </p>
                    
                    <div className="space-y-1">
                      <label className="text-micro-bold text-sekkha-ink">Template Judul Event Autofill:</label>
                      <input
                        type="text"
                        value={autofillTitle}
                        onChange={e => setAutofillTitle(e.target.value)}
                        placeholder="Misal: Kebaktian Youth Vihara Sekkha"
                        className="w-full h-10 rounded-xl border border-sekkha-hairline bg-white px-3 text-caption font-semibold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-micro-bold text-sekkha-ink">Template Lokasi Tempat Autofill:</label>
                      <input
                        type="text"
                        value={autofillLocation}
                        onChange={e => setAutofillLocation(e.target.value)}
                        placeholder="Misal: Dhammasala Utama Vihara Sekkha"
                        className="w-full h-10 rounded-xl border border-sekkha-hairline bg-white px-3 text-caption font-semibold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-micro-bold text-sekkha-ink">Template Deskripsi Event Autofill:</label>
                      <input
                        type="text"
                        value={autofillDesc}
                        onChange={e => setAutofillDesc(e.target.value)}
                        placeholder="Misal: Sesi kebaktian pemuda, paritta, dan Dhammadesana."
                        className="w-full h-10 rounded-xl border border-sekkha-hairline bg-white px-3 text-caption font-semibold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-micro-bold text-sekkha-ink flex items-center gap-1">
                        <span>⏰</span>
                        <span>Template Jam Default Autofill:</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <WheelTimePickerTrigger
                          value={autofillTime}
                          onChange={setAutofillTime}
                          label="Pilih Jam Default Autofill"
                        />
                      </div>
                      <p className="text-micro text-sekkha-slate">Saat memilih kategori ini, jam event akan diisi otomatis sesuai waktu yang diatur.</p>
                    </div>
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
                      {editing ? "Simpan Perubahan" : "Buat Kategori"}
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
