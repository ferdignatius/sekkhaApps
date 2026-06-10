// feature/configure/components/EventTypePage
// Master Data: Event Type management — rutin / special + custom types.

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, TagIcon } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface EventTypeItem {
  id: string
  code: string
  label: string
  color: string
  is_default: boolean
}

// ─── Dummy data ──────────────────────────────────────────────────────────────

const INITIAL_TYPES: EventTypeItem[] = [
  { id: "et-1", code: "rutin", label: "Rutin", color: "#4262ff", is_default: true },
  { id: "et-2", code: "special", label: "Spesial", color: "#ffd02f", is_default: true },
  { id: "et-3", code: "retreat", label: "Retreat", color: "#8b5cf6", is_default: false },
  { id: "et-4", code: "meditasi", label: "Meditasi", color: "#10b981", is_default: false },
  { id: "et-5", code: "sosial", label: "Sosial", color: "#f97316", is_default: false },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function EventTypePage() {
  const [types, setTypes] = useState<EventTypeItem[]>(INITIAL_TYPES)
  const [editing, setEditing] = useState<EventTypeItem | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [code, setCode] = useState("")
  const [label, setLabel] = useState("")
  const [color, setColor] = useState("#4262ff")

  function resetForm() {
    setCode("")
    setLabel("")
    setColor("#4262ff")
    setEditing(null)
    setShowForm(false)
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(item: EventTypeItem) {
    setCode(item.code)
    setLabel(item.label)
    setColor(item.color)
    setEditing(item)
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!code.trim() || !label.trim()) return

    if (editing) {
      setTypes((prev) =>
        prev.map((t) =>
          t.id === editing.id ? { ...t, code, label, color } : t,
        ),
      )
    } else {
      setTypes((prev) => [
        ...prev,
        { id: `et-${Date.now()}`, code: code.toLowerCase().replace(/\s+/g, "_"), label, color, is_default: false },
      ])
    }
    resetForm()
  }

  function handleDelete(id: string) {
    setTypes((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TagIcon className="size-5 text-sekkha-brand-blue" />
            <h1 className="text-heading-5 text-sekkha-ink">Event Type</h1>
          </div>
          <button type="button" onClick={openCreate} className="flex items-center gap-1.5 rounded-full bg-sekkha-primary px-4 py-2 text-body-sm-medium text-white transition-opacity hover:opacity-90">
            <PlusIcon className="size-4" />
            Tambah Tipe
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
            <h2 className="mb-4 text-body-sm-medium text-sekkha-ink">{editing ? "Edit Tipe" : "Tipe Baru"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="et-code" className="text-caption text-sekkha-slate">Kode</label>
                  <input id="et-code" type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="retreat" className="rounded-lg border border-sekkha-hairline-strong px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="et-label" className="text-caption text-sekkha-slate">Label</label>
                  <input id="et-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Retreat" className="rounded-lg border border-sekkha-hairline-strong px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="et-color" className="text-caption text-sekkha-slate">Warna</label>
                  <div className="flex items-center gap-2">
                    <input id="et-color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-9 w-9 cursor-pointer rounded-lg border border-sekkha-hairline-strong p-0.5" />
                    <span className="text-caption text-sekkha-muted">{color}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 rounded-full border border-sekkha-hairline-strong py-2 text-body-sm-medium text-sekkha-ink">Batal</button>
                <button type="submit" className="flex-1 rounded-full bg-sekkha-primary py-2 text-body-sm-medium text-white">{editing ? "Simpan" : "Buat"}</button>
              </div>
            </form>
          </div>
        )}

        <div className="overflow-hidden rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-sekkha-hairline-soft bg-sekkha-surface">
                  <th className="px-4 py-3 font-medium text-sekkha-slate">Warna</th>
                  <th className="px-4 py-3 font-medium text-sekkha-slate">Kode</th>
                  <th className="px-4 py-3 font-medium text-sekkha-slate">Label</th>
                  <th className="px-4 py-3 font-medium text-sekkha-slate">Default</th>
                  <th className="px-4 py-3 font-medium text-sekkha-slate">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {types.map((item) => (
                  <tr key={item.id} className="border-b border-sekkha-hairline-soft last:border-0">
                    <td className="px-4 py-3">
                      <div className="h-5 w-5 rounded-full" style={{ backgroundColor: item.color }} />
                    </td>
                    <td className="px-4 py-3 font-mono text-caption text-sekkha-slate">{item.code}</td>
                    <td className="px-4 py-3 font-medium text-sekkha-ink">{item.label}</td>
                    <td className="px-4 py-3 text-sekkha-slate">{item.is_default ? "Ya" : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(item)} className="rounded-md p-1.5 text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink" aria-label="Edit"><PencilIcon className="size-3.5" /></button>
                        {!item.is_default && (
                          <button type="button" onClick={() => handleDelete(item.id)} className="rounded-md p-1.5 text-sekkha-slate hover:bg-red-50 hover:text-red-500" aria-label="Hapus"><TrashIcon className="size-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {types.length === 0 && <div className="py-10 text-center"><p className="text-body-sm text-sekkha-muted">Belum ada tipe event.</p></div>}
        </div>
      </div>
    </main>
  )
}
