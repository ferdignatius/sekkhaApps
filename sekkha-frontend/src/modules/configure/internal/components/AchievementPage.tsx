// feature/configure/components/AchievementPage
// Master Data: Achievement management — CRUD achievement/badge rules.
// Connected to backend: GET/POST/PUT/DELETE /api/configure/achievements

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, TrophyIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { achievementsApi } from "../api/configureApi"
import { useConfigureCrud } from "../hooks/useConfigureCrud"
import type { AchievementDto } from "../api/configureApi"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Achievement {
  id: string
  name: string
  icon_url: string
  description: string
  condition_type: "streak" | "attendance" | "points" | "event_count" | "manual"
  condition_value: number
  is_active: boolean
}

// ─── Dummy data ──────────────────────────────────────────────────────────────

const INITIAL_ACHIEVEMENTS: Achievement[] = [
  { id: "ach-1", name: "Pertama Hadir", icon_url: "🎯", description: "Hadir di kebaktian pertama", condition_type: "attendance", condition_value: 1, is_active: true },
  { id: "ach-2", name: "Streak 5", icon_url: "🔥", description: "Hadir 5 minggu berturut-turut", condition_type: "streak", condition_value: 5, is_active: true },
  { id: "ach-3", name: "Streak 10", icon_url: "⚡", description: "Hadir 10 minggu berturut-turut", condition_type: "streak", condition_value: 10, is_active: true },
  { id: "ach-4", name: "Streak 20", icon_url: "💎", description: "Hadir 20 minggu berturut-turut", condition_type: "streak", condition_value: 20, is_active: true },
  { id: "ach-5", name: "Loyal", icon_url: "❤️", description: "Aktif selama 3 bulan tanpa putus", condition_type: "attendance", condition_value: 12, is_active: true },
  { id: "ach-6", name: "Rajin", icon_url: "📚", description: "Hadir 4x berturut-turut di event rutin", condition_type: "event_count", condition_value: 4, is_active: true },
  { id: "ach-7", name: "100 Poin", icon_url: "⭐", description: "Kumpulkan total 100 poin", condition_type: "points", condition_value: 100, is_active: true },
  { id: "ach-8", name: "500 Poin", icon_url: "🏆", description: "Kumpulkan total 500 poin", condition_type: "points", condition_value: 500, is_active: true },
  { id: "ach-9", name: "1000 Poin", icon_url: "👑", description: "Kumpulkan total 1000 poin", condition_type: "points", condition_value: 1000, is_active: false },
  { id: "ach-10", name: "Sosial", icon_url: "🤝", description: "Ikut 3 kegiatan bakti sosial", condition_type: "event_count", condition_value: 3, is_active: true },
]

const conditionLabel: Record<Achievement["condition_type"], string> = {
  streak: "Streak",
  attendance: "Kehadiran",
  points: "Poin",
  event_count: "Jumlah Event",
  manual: "Manual",
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AchievementPage() {
  const { authState } = useAuth()
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const { items: achievements, create: apiCreate, update: apiUpdate, remove: apiRemove } = useConfigureCrud<AchievementDto>(achievementsApi, INITIAL_ACHIEVEMENTS as any)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Achievement | null>(null)

  // Form fields
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("")
  const [description, setDescription] = useState("")
  const [conditionType, setConditionType] = useState<Achievement["condition_type"]>("streak")
  const [conditionValue, setConditionValue] = useState(1)

  function openCreate() {
    setEditTarget(null)
    setName("")
    setIcon("")
    setDescription("")
    setConditionType("streak")
    setConditionValue(1)
    setFormOpen(true)
  }

  function openEdit(ach: Achievement) {
    setEditTarget(ach)
    setName(ach.name)
    setIcon(ach.icon_url)
    setDescription(ach.description)
    setConditionType(ach.condition_type)
    setConditionValue(ach.condition_value)
    setFormOpen(true)
  }

  function handleSave() {
    if (!name.trim()) return
    const payload = {
      name,
      icon_url: icon || "🏅",
      description,
      condition_type: conditionType as any,
      condition_value: conditionValue,
      is_active: true,
    }

    if (editTarget) {
      void apiUpdate(editTarget.id, payload).catch(() => { })
    } else {
      void apiCreate(payload).catch(() => { })
    }
    setFormOpen(false)
  }

  function handleDelete(id: string) {
    void apiRemove(id).catch(() => { })
  }

  function toggleActive(id: string) {
    const item = achievements.find(a => a.id === id)
    if (item) {
      void apiUpdate(id, { is_active: !(item as any).is_active }).catch(() => { })
    }
  }

  return (
    <main>
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Gamifikasi" }, { label: "Achievement" }]} />
      <div className="px-4 py-6 pb-32 sm:pb-36 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-8xl space-y-5">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <TrophyIcon className="size-5 text-sekkha-brand-yellow shrink-0" />
              <h1 className="text-body-base sm:text-heading-5 font-extrabold text-sekkha-ink">Achievement</h1>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={openCreate}
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 rounded-full bg-sekkha-primary px-4 py-2.5 sm:py-2 text-body-sm-medium text-white transition-opacity hover:opacity-90 cursor-pointer"
              >
                <PlusIcon className="size-4" />
                <span>Tambah Achievement</span>
              </button>
            )}
          </div>

          {/* Inline form */}
          {formOpen && isAdmin && (
            <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
              <h2 className="mb-4 text-body-sm-medium text-sekkha-ink">
                {editTarget ? "Edit Achievement" : "Tambah Achievement Baru"}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-caption text-sekkha-slate">Nama</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full rounded-md border border-sekkha-hairline-strong bg-sekkha-canvas px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" placeholder="Streak 5" />
                </div>
                <div>
                  <label className="mb-1 block text-caption text-sekkha-slate">Icon (emoji)</label>
                  <input type="text" value={icon} onChange={e => setIcon(e.target.value)} className="w-full rounded-md border border-sekkha-hairline-strong bg-sekkha-canvas px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" placeholder="🔥" />
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-caption text-sekkha-slate">Deskripsi</label>
                  <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="w-full rounded-md border border-sekkha-hairline-strong bg-sekkha-canvas px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" placeholder="Hadir 5 minggu berturut-turut" />
                </div>
                <div>
                  <label className="mb-1 block text-caption text-sekkha-slate">Tipe Kondisi</label>
                  <select value={conditionType} onChange={e => setConditionType(e.target.value as Achievement["condition_type"])} className="w-full rounded-md border border-sekkha-hairline-strong bg-sekkha-canvas px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue">
                    <option value="streak">Streak</option>
                    <option value="attendance">Kehadiran</option>
                    <option value="points">Poin</option>
                    <option value="event_count">Jumlah Event</option>
                    <option value="manual">Manual</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-caption text-sekkha-slate">Nilai Kondisi</label>
                  <input type="number" value={conditionValue} onChange={e => setConditionValue(Number(e.target.value))} className="w-full rounded-md border border-sekkha-hairline-strong bg-sekkha-canvas px-3 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue" min={1} />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button type="button" onClick={handleSave} className="rounded-full bg-sekkha-brand-blue px-5 py-2 text-body-sm-medium text-white transition-opacity hover:opacity-90">
                  {editTarget ? "Simpan" : "Tambah"}
                </button>
                <button type="button" onClick={() => setFormOpen(false)} className="rounded-full border border-sekkha-hairline-strong px-5 py-2 text-body-sm-medium text-sekkha-ink transition-colors hover:bg-sekkha-surface">
                  Batal
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-hidden rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full min-w-[600px] text-body-sm">
                <thead>
                  <tr className="border-b border-sekkha-hairline-soft bg-sekkha-surface">
                    <th className="px-4 py-3 text-left font-medium text-sekkha-slate">Icon</th>
                    <th className="px-4 py-3 text-left font-medium text-sekkha-slate">Nama</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-sekkha-slate sm:table-cell">Kondisi</th>
                    <th className="hidden px-4 py-3 text-left font-medium text-sekkha-slate sm:table-cell">Nilai</th>
                    <th className="px-4 py-3 text-left font-medium text-sekkha-slate">Status</th>
                    {isAdmin && <th className="px-4 py-3 text-left font-medium text-sekkha-slate">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {achievements.map((ach) => (
                    <tr key={ach.id} className="border-b border-sekkha-hairline-soft last:border-0">
                      <td className="px-4 py-3 text-lg">{ach.icon_url}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-sekkha-ink">{ach.name}</p>
                        <p className="text-caption text-sekkha-muted">{ach.description}</p>
                      </td>
                      <td className="hidden px-4 py-3 text-sekkha-slate sm:table-cell">{conditionLabel[ach.condition_type]}</td>
                      <td className="hidden px-4 py-3 text-sekkha-ink sm:table-cell">{ach.condition_value}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          disabled={!isAdmin}
                          onClick={() => toggleActive(ach.id)}
                          className={`rounded-full px-2.5 py-0.5 text-caption-bold ${!isAdmin ? "" : "cursor-pointer"
                            } ${ach.is_active
                              ? "bg-sekkha-teal-light text-sekkha-brand-blue"
                              : "bg-sekkha-surface text-sekkha-muted"
                            }`}
                        >
                          {ach.is_active ? "Aktif" : "Nonaktif"}
                        </button>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => openEdit(ach)} className="rounded-md p-1.5 text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink" aria-label="Edit">
                              <PencilIcon className="size-3.5" />
                            </button>
                            <button type="button" onClick={() => handleDelete(ach.id)} className="rounded-md p-1.5 text-sekkha-slate hover:bg-red-50 hover:text-red-500" aria-label="Hapus">
                              <TrashIcon className="size-3.5" />
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
        </div>
      </div>
    </main>
  )
}
