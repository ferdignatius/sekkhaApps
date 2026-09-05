// feature/configure/components/LevelPage
// Master Data: Level tiers management — CRUD level (level, label, min_points).
// Connected to backend: GET/POST/PUT/DELETE /api/configure/levels

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, ZapIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import { levelsApi } from "../api/configureApi"
import { useConfigureCrud } from "../hooks/useConfigureCrud"
import type { LevelDto } from "../api/configureApi"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Level {
  id: string
  level: number
  label: string
  min_points: number
}

// ─── Dummy data ──────────────────────────────────────────────────────────────

const INITIAL_LEVELS: Level[] = [
  { id: "lvl-1", level: 1, label: "Newcomer", min_points: 0 },
  { id: "lvl-2", level: 2, label: "Regular Attendee", min_points: 50 },
  { id: "lvl-3", level: 3, label: "Dedicated Member", min_points: 150 },
  { id: "lvl-4", level: 4, label: "Community Pillar", min_points: 300 },
  { id: "lvl-5", level: 5, label: "Bodhisattva Spirit", min_points: 500 },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function LevelPage() {
  const { authState } = useAuth()
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const { items: levels, create: apiCreate, update: apiUpdate, remove: apiRemove } = useConfigureCrud<LevelDto>(levelsApi, INITIAL_LEVELS as any)
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
    if (!label.trim() || !isAdmin) return

    const payload = { level: Number(levelNum), label, min_points: Number(minPoints) || 0 }

    if (editing) {
      void apiUpdate(editing.id, payload).catch(() => { })
    } else {
      void apiCreate(payload as any).catch(() => { })
    }
    resetForm()
  }

  function handleDelete(id: string) {
    if (!isAdmin) return
    void apiRemove(id).catch(() => { })
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 md:pb-12 font-sans text-left">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Gamification" }, { label: "Member Levels" }]} />
      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shrink-0 shadow-xs">
              <ZapIcon className="size-5 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-[#0a0a0a]">Member Progression Levels</h1>
              <p className="text-xs text-[#6a6a6a]">Manage member level tiers and minimum required points per progression rank</p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="h-10 w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-white px-4 text-xs font-bold hover:bg-[#1f1f1f] transition-all cursor-pointer shadow-xs shrink-0"
            >
              <PlusIcon className="size-4" />
              <span>Add Level</span>
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] font-bold">
                  <th className="px-4 py-3 w-28">Tier Badge</th>
                  <th className="px-4 py-3">Level Rank Label</th>
                  <th className="px-4 py-3">Min. Required Points</th>
                  {isAdmin && <th className="px-4 py-3 w-28 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {levels.map((lvl) => (
                  <tr key={lvl.id} className="hover:bg-[#faf5e8]/70 transition-colors">
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-[6px] text-[11px] font-bold bg-[#b8a4ed]/30 text-[#0a0a0a] border border-[#b8a4ed]/50">
                        <ZapIcon className="size-3 text-[#0a0a0a]" />
                        Level {lvl.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#0a0a0a]">{lvl.label}</td>
                    <td className="px-4 py-3 font-mono font-bold text-[#0a0a0a]">
                      <span className="bg-[#faf5e8] border border-[#e5e5e5] px-2 py-0.5 rounded-[6px]">
                        {lvl.min_points} Pts
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(lvl)}
                            className="h-8 px-2.5 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-xs font-bold text-[#0a0a0a] transition-colors cursor-pointer flex items-center gap-1"
                            title="Edit Level"
                          >
                            <PencilIcon className="size-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(lvl.id)}
                            className="size-8 flex items-center justify-center rounded-[8px] border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Delete Level"
                          >
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
          {levels.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-xs text-[#6a6a6a]">No levels defined yet.</p>
            </div>
          )}
        </div>

        {/* Responsive Modal Form */}
        <ResponsiveFormModal
          isOpen={showForm && isAdmin}
          onClose={resetForm}
          title={editing ? "Edit Level" : "Add New Level"}
          description="Configure level progression tier, title label, and minimum points required."
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-left font-sans">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">Level (Number) *</label>
                <input
                  type="number"
                  required
                  value={levelNum}
                  onChange={(e) => setLevelNum(e.target.value)}
                  placeholder="1"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">Level Label *</label>
                <input
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Active Member"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">Min. Points *</label>
                <input
                  type="number"
                  required
                  value={minPoints}
                  onChange={(e) => setMinPoints(e.target.value)}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 justify-end border-t border-[#e5e5e5]">
              <button
                type="button"
                onClick={resetForm}
                className="h-10 px-4 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-xs font-bold text-[#0a0a0a] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 px-5 rounded-[12px] bg-[#0a0a0a] hover:bg-[#1f1f1f] text-xs font-bold text-white shadow-xs transition-colors cursor-pointer"
              >
                {editing ? "Save Changes" : "Create Level"}
              </button>
            </div>
          </form>
        </ResponsiveFormModal>
      </div>
    </main>
  )
}
