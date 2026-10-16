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
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

  const {
    items: levels,
    create: apiCreate,
    update: apiUpdate,
    remove: apiRemove,
  } = useConfigureCrud<LevelDto>(levelsApi, INITIAL_LEVELS as any)
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

    const payload = {
      level: Number(levelNum),
      label,
      min_points: Number(minPoints) || 0,
    }

    if (editing) {
      void apiUpdate(editing.id, payload).catch(() => {})
    } else {
      void apiCreate(payload as any).catch(() => {})
    }
    resetForm()
  }

  function handleDelete(id: string) {
    if (!isAdmin) return
    void apiRemove(id).catch(() => {})
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 text-left font-sans md:pb-12">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Gamification" },
          { label: "Member Levels" },
        ]}
      />
      <div className="mx-auto max-w-7xl space-y-5 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8">
        <div className="flex flex-col justify-between gap-3 border-b border-[#e5e5e5] pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shadow-xs">
              <ZapIcon className="size-5 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#0a0a0a] sm:text-xl">
                Member Progression Levels
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Manage member level tiers and minimum required points per
                progression rank
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="flex h-10 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-4 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] sm:w-auto"
            >
              <PlusIcon className="size-4" />
              <span>Add Level</span>
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs">
          <div className="scrollbar-none overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#faf5e8] font-bold text-[#6a6a6a]">
                  <th className="w-28 px-4 py-3">Tier Badge</th>
                  <th className="px-4 py-3">Level Rank Label</th>
                  <th className="px-4 py-3">Min. Required Points</th>
                  {isAdmin && (
                    <th className="w-28 px-4 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {levels.map((lvl) => (
                  <tr
                    key={lvl.id}
                    className="transition-colors hover:bg-[#faf5e8]/70"
                  >
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 rounded-[6px] border border-[#b8a4ed]/50 bg-[#b8a4ed]/30 px-2.5 py-0.5 text-[11px] font-bold text-[#0a0a0a]">
                        <ZapIcon className="size-3 text-[#0a0a0a]" />
                        Level {lvl.level}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#0a0a0a]">
                      {lvl.label}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[#0a0a0a]">
                      <span className="rounded-[6px] border border-[#e5e5e5] bg-[#faf5e8] px-2 py-0.5">
                        {lvl.min_points} Pts
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(lvl)}
                            className="flex h-8 cursor-pointer items-center gap-1 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
                            title="Edit Level"
                          >
                            <PencilIcon className="size-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(lvl.id)}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-[8px] border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
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
          <form
            onSubmit={handleSubmit}
            className="space-y-4 text-left font-sans"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Level (Number) *
                </label>
                <input
                  type="number"
                  required
                  value={levelNum}
                  onChange={(e) => setLevelNum(e.target.value)}
                  placeholder="1"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Level Label *
                </label>
                <input
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Active Member"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Min. Points *
                </label>
                <input
                  type="number"
                  required
                  value={minPoints}
                  onChange={(e) => setMinPoints(e.target.value)}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#e5e5e5] pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="h-10 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-10 cursor-pointer rounded-[12px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1f1f1f]"
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
