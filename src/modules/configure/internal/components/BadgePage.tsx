// feature/configure/components/BadgePage
// Master Data: Badge management — CRUD badge (nama, icon, kondisi).
// Connected to backend: GET/POST/PUT/DELETE /api/configure/badges

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, AwardIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { badgesApi } from "../api/configureApi"
import { useConfigureCrud } from "../hooks/useConfigureCrud"
import type { BadgeDto } from "../api/configureApi"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Badge {
  id: string
  name: string
  description: string
  icon_url: string
  condition_type: "total_attendance" | "streak" | "points"
  condition_value: number
}

// ─── Dummy data ──────────────────────────────────────────────────────────────

const INITIAL_BADGES: Badge[] = [
  {
    id: "badge-1",
    name: "Pertama Kali Hadir",
    description: "Berhasil scan QR pertama kalinya",
    icon_url: "🎯",
    condition_type: "total_attendance",
    condition_value: 1,
  },
  {
    id: "badge-2",
    name: "Streak 5",
    description: "Hadir 5 minggu berturut-turut",
    icon_url: "🔥",
    condition_type: "streak",
    condition_value: 5,
  },
  {
    id: "badge-3",
    name: "Streak 10",
    description: "Hadir 10 minggu berturut-turut",
    icon_url: "⚡",
    condition_type: "streak",
    condition_value: 10,
  },
  {
    id: "badge-4",
    name: "Kolektor 100 Poin",
    description: "Mengumpulkan 100 poin total",
    icon_url: "⭐",
    condition_type: "points",
    condition_value: 100,
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function BadgePage() {
  const { items: badges, create: apiCreate, update: apiUpdate, remove: apiRemove, loading } = useConfigureCrud<BadgeDto>(badgesApi, INITIAL_BADGES as any)
  const [editing, setEditing] = useState<Badge | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [iconUrl, setIconUrl] = useState("")
  const [conditionType, setConditionType] = useState<Badge["condition_type"]>("total_attendance")
  const [conditionValue, setConditionValue] = useState("")

  function resetForm() {
    setName("")
    setDescription("")
    setIconUrl("")
    setConditionType("total_attendance")
    setConditionValue("")
    setEditing(null)
    setShowForm(false)
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(badge: Badge) {
    setName(badge.name)
    setDescription(badge.description)
    setIconUrl(badge.icon_url)
    setConditionType(badge.condition_type)
    setConditionValue(String(badge.condition_value))
    setEditing(badge)
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    const payload = {
      name,
      description,
      icon_url: iconUrl || "🏅",
      condition_type: conditionType as any,
      condition_value: Number(conditionValue) || 0,
    }

    if (editing) {
      void apiUpdate(editing.id, payload).catch(() => {})
    } else {
      void apiCreate(payload).catch(() => {})
    }
    resetForm()
  }

  function handleDelete(id: string) {
    void apiRemove(id).catch(() => {})
  }

  const conditionLabel = {
    total_attendance: "Total Kehadiran",
    streak: "Streak (minggu)",
    points: "Total Poin",
  }

  return (
    <main>
      <PageBreadcrumb items={[{ label: "Beranda", href: "/home" }, { label: "Configure" }, { label: "Badge" }]} />
      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-8xl space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AwardIcon className="size-5 text-sekkha-brand-blue" />
              <h1 className="text-heading-5 text-sekkha-ink">Badge</h1>
            </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-full bg-sekkha-primary px-4 py-2 text-body-sm-medium text-white transition-opacity hover:opacity-90"
          >
            <PlusIcon className="size-4" />
            Tambah Badge
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
            <h2 className="mb-4 text-body-sm-medium text-sekkha-ink">
              {editing ? "Edit Badge" : "Badge Baru"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="badge-name" className="text-caption text-sekkha-slate">Nama</label>
                  <input id="badge-name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Streak 5" className="rounded-lg border border-sekkha-hairline-strong px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="badge-icon" className="text-caption text-sekkha-slate">Icon (emoji/URL)</label>
                  <input id="badge-icon" type="text" value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} placeholder="🔥" className="rounded-lg border border-sekkha-hairline-strong px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="badge-desc" className="text-caption text-sekkha-slate">Deskripsi</label>
                <input id="badge-desc" type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Hadir 5 minggu berturut-turut" className="rounded-lg border border-sekkha-hairline-strong px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="badge-cond-type" className="text-caption text-sekkha-slate">Kondisi</label>
                  <select id="badge-cond-type" value={conditionType} onChange={(e) => setConditionType(e.target.value as Badge["condition_type"])} className="rounded-lg border border-sekkha-hairline-strong px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue">
                    <option value="total_attendance">Total Kehadiran</option>
                    <option value="streak">Streak (minggu)</option>
                    <option value="points">Total Poin</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="badge-cond-val" className="text-caption text-sekkha-slate">Nilai</label>
                  <input id="badge-cond-val" type="number" value={conditionValue} onChange={(e) => setConditionValue(e.target.value)} placeholder="5" className="rounded-lg border border-sekkha-hairline-strong px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={resetForm} className="flex-1 rounded-full border border-sekkha-hairline-strong py-2 text-body-sm-medium text-sekkha-ink">Batal</button>
                <button type="submit" className="flex-1 rounded-full bg-sekkha-primary py-2 text-body-sm-medium text-white">{editing ? "Simpan" : "Buat"}</button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body-sm">
              <thead>
                <tr className="border-b border-sekkha-hairline-soft bg-sekkha-surface">
                  <th className="px-4 py-3 font-medium text-sekkha-slate">Icon</th>
                  <th className="px-4 py-3 font-medium text-sekkha-slate">Nama</th>
                  <th className="hidden px-4 py-3 font-medium text-sekkha-slate sm:table-cell">Kondisi</th>
                  <th className="hidden px-4 py-3 font-medium text-sekkha-slate sm:table-cell">Nilai</th>
                  <th className="px-4 py-3 font-medium text-sekkha-slate">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {badges.map((badge) => (
                  <tr key={badge.id} className="border-b border-sekkha-hairline-soft last:border-0">
                    <td className="px-4 py-3 text-lg">{badge.icon_url}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-sekkha-ink">{badge.name}</p>
                      <p className="text-caption text-sekkha-muted">{badge.description}</p>
                    </td>
                    <td className="hidden px-4 py-3 text-sekkha-slate sm:table-cell">{conditionLabel[badge.condition_type]}</td>
                    <td className="hidden px-4 py-3 text-sekkha-ink sm:table-cell">{badge.condition_value}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => openEdit(badge)} className="rounded-md p-1.5 text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink" aria-label="Edit">
                          <PencilIcon className="size-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDelete(badge.id)} className="rounded-md p-1.5 text-sekkha-slate hover:bg-red-50 hover:text-red-500" aria-label="Hapus">
                          <TrashIcon className="size-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {badges.length === 0 && (
            <div className="py-10 text-center">
              <p className="text-body-sm text-sekkha-muted">Belum ada badge.</p>
            </div>
          )}
          </div>
        </div>
      </div>
    </main>
  )
}
