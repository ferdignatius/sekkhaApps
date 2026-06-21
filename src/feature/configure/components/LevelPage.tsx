// feature/configure/components/LevelPage
// Master Data: Level management — threshold tiap level & label.

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, ZapIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Level {
  id: string
  level: number
  label: string
  min_points: number
}

// ─── Dummy data ──────────────────────────────────────────────────────────────

const INITIAL_LEVELS: Level[] = [
  { id: "lvl-1", level: 1, label: "Umat Baru", min_points: 0 },
  { id: "lvl-2", level: 2, label: "Umat Aktif", min_points: 50 },
  { id: "lvl-3", level: 3, label: "Umat Setia", min_points: 200 },
  { id: "lvl-4", level: 4, label: "Umat Teladan", min_points: 500 },
  { id: "lvl-5", level: 5, label: "Umat Inspirasi", min_points: 1000 },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function LevelPage() {
  const [levels, setLevels] = useState<Level[]>(INITIAL_LEVELS)
  const [editing, setEditing] = useState<Level | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [levelNum, setLevelNum] = useState("")
  const [label, setLabel] = useState("")
  const [minPoints, setMinPoints] = useState("")

  function resetForm() {
    setLevelNum("")
    setLabel("")
    setMinPoints("")
    setEditing(null)
    setShowForm(false)
  }

  function openCreate() {
    resetForm()
    setLevelNum(String(levels.length + 1))
    setShowForm(true)
  }

  function openEdit(lvl: Level) {
    setLevelNum(String(lvl.level))
    setLabel(lvl.label)
    setMinPoints(String(lvl.min_points))
    setEditing(lvl)
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return

    if (editing) {
      setLevels((prev) =>
        prev.map((l) =>
          l.id === editing.id
            ? { ...l, level: Number(levelNum), label, min_points: Number(minPoints) || 0 }
            : l,
        ),
      )
    } else {
      setLevels((prev) =>
        [...prev, { id: `lvl-${Date.now()}`, level: Number(levelNum) || prev.length + 1, label, min_points: Number(minPoints) || 0 }]
          .sort((a, b) => a.level - b.level),
      )
    }
    resetForm()
  }

  function handleDelete(id: string) {
    setLevels((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <main>
      <PageBreadcrumb items={[{ label: "Beranda", href: "/home" }, { label: "Configure" }, { label: "Level" }]} />
      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-8xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ZapIcon className="size-5 text-sekkha-brand-blue" />
              <h1 className="text-heading-5 text-sekkha-ink">Level</h1>
            </div>
            <button type="button" onClick={openCreate} className="flex items-center gap-1.5 rounded-full bg-sekkha-primary px-4 py-2 text-body-sm-medium text-white transition-opacity hover:opacity-90">
              <PlusIcon className="size-4" />
            Tambah Level
          </button>
        </div>

        {showForm && (
          <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
            <h2 className="mb-4 text-body-sm-medium text-sekkha-ink">{editing ? "Edit Level" : "Level Baru"}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="lvl-num" className="text-caption text-sekkha-slate">Level</label>
                  <input id="lvl-num" type="number" value={levelNum} onChange={(e) => setLevelNum(e.target.value)} className="rounded-lg border border-sekkha-hairline-strong px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="lvl-label" className="text-caption text-sekkha-slate">Label</label>
                  <input id="lvl-label" type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Umat Setia" className="rounded-lg border border-sekkha-hairline-strong px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="lvl-pts" className="text-caption text-sekkha-slate">Min. Poin</label>
                  <input id="lvl-pts" type="number" value={minPoints} onChange={(e) => setMinPoints(e.target.value)} placeholder="200" className="rounded-lg border border-sekkha-hairline-strong px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" />
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
                  <th className="px-4 py-3 font-medium text-sekkha-slate">Level</th>
                  <th className="px-4 py-3 font-medium text-sekkha-slate">Label</th>
                  <th className="px-4 py-3 font-medium text-sekkha-slate">Min. Poin</th>
                  <th className="px-4 py-3 font-medium text-sekkha-slate">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {levels.map((lvl) => (
                  <tr key={lvl.id} className="border-b border-sekkha-hairline-soft last:border-0">
                    <td className="px-4 py-3 font-medium text-sekkha-ink">{lvl.level}</td>
                    <td className="px-4 py-3 text-sekkha-ink">{lvl.label}</td>
                    <td className="px-4 py-3 text-sekkha-slate">{lvl.min_points.toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(lvl)} className="rounded-md p-1.5 text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink" aria-label="Edit"><PencilIcon className="size-3.5" /></button>
                        <button type="button" onClick={() => handleDelete(lvl.id)} className="rounded-md p-1.5 text-sekkha-slate hover:bg-red-50 hover:text-red-500" aria-label="Hapus"><TrashIcon className="size-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {levels.length === 0 && <div className="py-10 text-center"><p className="text-body-sm text-sekkha-muted">Belum ada level.</p></div>}
          </div>
        </div>
      </div>
    </main>
  )
}
