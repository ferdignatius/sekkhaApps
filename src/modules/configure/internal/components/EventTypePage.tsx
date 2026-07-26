// feature/configure/components/EventTypePage
// Master Data: Event Category & Type management — with Shadcn Color Wheel Picker, Role Access Permissions, & Custom Autofill Templates.

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, TagIcon, SparklesIcon, CheckIcon, Wand2Icon, ShieldCheckIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { getMasterCategories, ALL_USER_ROLES } from "@/modules/events/internal/masterdata"
import type { EventCategoryItem, UserRoleName } from "@/modules/events/internal/masterdata"
import { ColorWheelPicker } from "@/components/ui/ColorWheelPicker"
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown"

export function EventTypePage() {
  const { authState } = useAuth()
  const isPengurusOrAdmin = authState.status === "authenticated" && (authState.role === "admin" || authState.role === "pengurus")

  const [categories, setCategories] = useState<EventCategoryItem[]>(() => getMasterCategories())
  const [editing, setEditing] = useState<EventCategoryItem | null>(null)
  const [showModal, setShowModal] = useState(false)

  const [name, setName] = useState("")
  const [colorHex, setColorHex] = useState("#0284c7")
  const [autofillTitle, setAutofillTitle] = useState("")
  const [autofillLocation, setAutofillLocation] = useState("")
  const [autofillDesc, setAutofillDesc] = useState("")
  const [targetRoles, setTargetRoles] = useState<string[]>(["admin", "pengurus", "aktivis", "umat"])

  function saveToStorage(updated: EventCategoryItem[]) {
    setCategories(updated)
    try {
      localStorage.setItem("sekkha_master_categories", JSON.stringify(updated))
    } catch { }
  }

  function resetForm() {
    setName("")
    setColorHex("#0284c7")
    setAutofillTitle("")
    setAutofillLocation("")
    setAutofillDesc("")
    setTargetRoles(["admin", "pengurus", "aktivis", "umat"])
    setEditing(null)
    setShowModal(false)
  }

  function openCreate() {
    resetForm()
    setShowModal(true)
  }

  function openEdit(item: EventCategoryItem) {
    setName(item.name)
    setColorHex(item.colorHex || "#0284c7")
    setAutofillTitle(item.autofillTitle ?? `Kegiatan ${item.name} Vihara`)
    setAutofillLocation(item.autofillLocation ?? "Vihara Sekkha")
    setAutofillDesc(item.autofillDesc ?? `Kegiatan ${item.name.toLowerCase()} bersama Umat Vihara Sekkha.`)
    setTargetRoles(item.target_roles && item.target_roles.length > 0 ? item.target_roles : ["admin", "pengurus", "aktivis", "umat"])
    setEditing(item)
    setShowModal(true)
  }


  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const tagKey = editing ? editing.tag : name.toLowerCase().trim().replace(/\s+/g, "_")
    const newCat: EventCategoryItem = {
      id: editing ? editing.id : `cat-${Date.now()}`,
      tag: tagKey,
      name: name.trim(),
      colorHex: colorHex,
      bg: editing?.bg ?? "bg-sky-100/90",
      text: editing?.text ?? "text-sky-800",
      dot: editing?.dot ?? "bg-sky-500",
      points: editing?.points ?? 50,
      is_active: editing?.is_active ?? true,
      autofillTitle: autofillTitle.trim(),
      autofillLocation: autofillLocation.trim(),
      autofillDesc: autofillDesc.trim(),
      target_roles: targetRoles,
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
                <p className="text-micro text-sekkha-slate">Kelola kategori event, skema warna, hak akses role pengguna, dan template autofill formulir</p>
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
              <table className="w-full min-w-[700px] text-left text-caption border-collapse">
                <thead>
                  <tr className="border-b border-sekkha-hairline-soft bg-sekkha-canvas/60 text-micro-bold uppercase tracking-wider text-sekkha-slate">
                    <th className="py-3 px-4">Nama Kategori & Color Badge</th>
                    <th className="py-3 px-4">Hak Akses Role Pengguna</th>
                    <th className="py-3 px-4">Template Judul Autofill</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {isPengurusOrAdmin && <th className="py-3 px-4 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sekkha-hairline-soft font-sans">
                  {categories.map(c => {
                    const activeHex = c.colorHex || "#0284c7"
                    const roles = c.target_roles && c.target_roles.length > 0 ? c.target_roles : ["admin", "pengurus", "aktivis", "umat"]
                    return (
                      <tr key={c.id} className="hover:bg-sekkha-surface/60 transition-colors">
                        <td className="py-3 px-4 font-bold text-sekkha-ink">
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-micro-bold capitalize border font-extrabold shadow-2xs"
                            style={{
                              backgroundColor: `${activeHex}1a`,
                              color: activeHex,
                              borderColor: `${activeHex}40`,
                            }}
                          >
                            <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: activeHex }} />
                            {c.name}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap items-center gap-1">
                            {ALL_USER_ROLES.map(role => {
                              const hasRole = roles.includes(role.id)
                              if (!hasRole) return null
                              return (
                                <span key={role.id} className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${role.bg} ${role.text}`}>
                                  {role.label}
                                </span>
                              )
                            })}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sekkha-ink font-medium">
                          <span className="flex items-center gap-1">
                            <Wand2Icon className="size-3 text-sekkha-brand-blue shrink-0" />
                            <span className="truncate max-w-xs">{c.autofillTitle || `Kegiatan ${c.name} Vihara`}</span>
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
                                className={`rounded-lg border px-2.5 py-1 text-micro-bold transition-all ${c.is_active !== false
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
                                title="Edit Kategori, Warna, & Hak Akses"
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
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Form Pop-Up Modal Sub-Dialog */}
          {showModal && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in-0">
              <div className="w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] rounded-t-[28px] sm:rounded-2xl border-t sm:border border-sekkha-hairline bg-white p-5 sm:p-6 shadow-2xl space-y-4 text-left font-sans overflow-y-auto animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">

                {/* Mobile Drag Handle */}
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-2 mb-1 sm:hidden shrink-0" />

                <div className="flex items-center justify-between pb-3 border-b border-sekkha-hairline-soft">
                  <div className="flex items-center gap-2">
                    <SparklesIcon className="size-5 text-sekkha-brand-blue" />
                    <h3 className="text-body-base font-extrabold text-sekkha-ink">
                      {editing ? "Edit Kategori & Hak Akses" : "Tambah Kategori Event Baru"}
                    </h3>
                  </div>
                  <button type="button" onClick={resetForm} className="text-sekkha-slate hover:text-sekkha-ink">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Nama Kategori */}
                  <div className="space-y-1">
                    <label className="text-caption font-bold text-sekkha-ink">Nama Kategori *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => {
                        const val = e.target.value
                        setName(val)
                        if (!editing) {
                          setAutofillTitle(`Kegiatan ${val} Vihara`)
                          setAutofillDesc(`Kegiatan ${val.toLowerCase()} bersama Umat Vihara Sekkha.`)
                        }
                      }}
                      placeholder="Misal: Youth / Sekolah Minggu / Acara Pengurus"
                      className="w-full h-11 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                    />
                  </div>

                  {/* Color Wheel Picker Component */}
                  <ColorWheelPicker
                    color={colorHex}
                    onChange={setColorHex}
                    label="Warna Badge Kategori"
                  />

                  {/* Many-to-Many Target Roles Access Permissions */}
                  <div className="space-y-1.5">
                    <label className="text-caption font-bold text-sekkha-ink flex items-center gap-1.5">
                      <ShieldCheckIcon className="size-4 text-purple-600" />
                      <span>Hak Akses Role Pengguna</span>
                    </label>
                    <p className="text-micro text-sekkha-slate">Hanya role yang dipilih yang bisa melihat kategori ini di kalender event.</p>
                    <MultiSelectDropdown
                      options={ALL_USER_ROLES.map(r => ({ value: r.id, label: r.label }))}
                      value={targetRoles}
                      onChange={v => setTargetRoles(v as UserRoleName[])}
                      placeholder="Pilih role yang boleh akses..."
                      defaultValue={["admin", "pengurus", "aktivis", "umat"]}
                      allowEmpty={false}
                    />
                  </div>

                  {/* Autofill Template Configuration */}
                  <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-2.5">
                    <p className="text-micro font-bold text-sekkha-brand-blue uppercase tracking-wider flex items-center gap-1.5">
                      <Wand2Icon className="size-3.5" />
                      <span>Pengaturan Template Autofill Form Create Event:</span>
                    </p>

                    <div className="space-y-1">
                      <label className="text-micro-bold text-sekkha-ink">Judul Event:</label>
                      <input
                        type="text"
                        value={autofillTitle}
                        onChange={e => setAutofillTitle(e.target.value)}
                        placeholder="Misal: Kebaktian Youth Vihara Sekkha"
                        className="w-full h-10 rounded-xl border border-sekkha-hairline bg-white px-3 text-caption font-semibold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-micro-bold text-sekkha-ink">Lokasi Tempat:</label>
                      <input
                        type="text"
                        value={autofillLocation}
                        onChange={e => setAutofillLocation(e.target.value)}
                        placeholder="Misal: Dhammasala Utama Vihara Sekkha"
                        className="w-full h-10 rounded-xl border border-sekkha-hairline bg-white px-3 text-caption font-semibold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-micro-bold text-sekkha-ink">Deskripsi Event:</label>
                      <input
                        type="text"
                        value={autofillDesc}
                        onChange={e => setAutofillDesc(e.target.value)}
                        placeholder="Misal: Sesi kebaktian pemuda, paritta, dan Dhammadesana."
                        className="w-full h-10 rounded-xl border border-sekkha-hairline bg-white px-3 text-caption font-semibold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                      />
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
