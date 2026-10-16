// feature/configure/components/AchievementPage
// Master Data: Achievement management — CRUD achievement/badge rules.
// Connected to backend: GET/POST/PUT/DELETE /api/configure/achievements

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, TrophyIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
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
  {
    id: "ach-1",
    name: "First Attendance",
    icon_url: "🎯",
    description: "Attended first service",
    condition_type: "attendance",
    condition_value: 1,
    is_active: true,
  },
  {
    id: "ach-2",
    name: "Streak 5",
    icon_url: "🔥",
    description: "Attended 5 weeks consecutively",
    condition_type: "streak",
    condition_value: 5,
    is_active: true,
  },
  {
    id: "ach-3",
    name: "Streak 10",
    icon_url: "⚡",
    description: "Attended 10 weeks consecutively",
    condition_type: "streak",
    condition_value: 10,
    is_active: true,
  },
  {
    id: "ach-4",
    name: "Streak 20",
    icon_url: "💎",
    description: "Attended 20 weeks consecutively",
    condition_type: "streak",
    condition_value: 20,
    is_active: true,
  },
  {
    id: "ach-5",
    name: "Loyal",
    icon_url: "❤️",
    description: "Active for 3 months unbroken",
    condition_type: "attendance",
    condition_value: 12,
    is_active: true,
  },
  {
    id: "ach-6",
    name: "Diligent",
    icon_url: "📚",
    description: "Attended 4 consecutive routine events",
    condition_type: "event_count",
    condition_value: 4,
    is_active: true,
  },
  {
    id: "ach-7",
    name: "100 Points",
    icon_url: "⭐",
    description: "Accumulate 100 points total",
    condition_type: "points",
    condition_value: 100,
    is_active: true,
  },
  {
    id: "ach-8",
    name: "500 Points",
    icon_url: "🏆",
    description: "Accumulate 500 points total",
    condition_type: "points",
    condition_value: 500,
    is_active: true,
  },
  {
    id: "ach-9",
    name: "1000 Points",
    icon_url: "👑",
    description: "Accumulate 1000 points total",
    condition_type: "points",
    condition_value: 1000,
    is_active: false,
  },
  {
    id: "ach-10",
    name: "Social Service",
    icon_url: "🤝",
    description: "Participated in 3 charity drives",
    condition_type: "event_count",
    condition_value: 3,
    is_active: true,
  },
]

const conditionLabel: Record<Achievement["condition_type"], string> = {
  streak: "Streak",
  attendance: "Attendance",
  points: "Points",
  event_count: "Event Count",
  manual: "Manual",
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AchievementPage() {
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

  const {
    items: achievements,
    create: apiCreate,
    update: apiUpdate,
    remove: apiRemove,
  } = useConfigureCrud<AchievementDto>(
    achievementsApi,
    INITIAL_ACHIEVEMENTS as any
  )
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Achievement | null>(null)

  // Form fields
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("")
  const [description, setDescription] = useState("")
  const [conditionType, setConditionType] =
    useState<Achievement["condition_type"]>("streak")
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
    if (!name.trim() || !isAdmin) return
    const payload = {
      name,
      icon_url: icon || "🏅",
      description,
      condition_type: conditionType as any,
      condition_value: conditionValue,
      is_active: true,
    }

    if (editTarget) {
      void apiUpdate(editTarget.id, payload).catch(() => {})
    } else {
      void apiCreate(payload).catch(() => {})
    }
    setFormOpen(false)
  }

  function handleDelete(id: string) {
    if (!isAdmin) return
    void apiRemove(id).catch(() => {})
  }

  function toggleActive(id: string) {
    if (!isAdmin) return
    const item = achievements.find((a) => a.id === id)
    if (item) {
      void apiUpdate(id, { is_active: !(item as any).is_active }).catch(
        () => {}
      )
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 text-left font-sans md:pb-12">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Gamification" },
          { label: "Achievements" },
        ]}
      />
      <div className="mx-auto max-w-7xl space-y-5 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-[#e5e5e5] pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shadow-xs">
              <TrophyIcon className="size-5 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#0a0a0a] sm:text-xl">
                Member Achievements
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Manage gamification milestones, streak achievements, and
                attendance recognition
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
              <span>Add Achievement</span>
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs">
          <div className="scrollbar-none overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#faf5e8] font-bold text-[#6a6a6a]">
                  <th className="w-16 px-4 py-3">Icon</th>
                  <th className="px-4 py-3">Achievement Details</th>
                  <th className="hidden px-4 py-3 sm:table-cell">Condition</th>
                  <th className="hidden px-4 py-3 sm:table-cell">
                    Target Value
                  </th>
                  <th className="px-4 py-3 text-center">Status</th>
                  {isAdmin && (
                    <th className="w-28 px-4 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {achievements.map((ach) => (
                  <tr
                    key={ach.id}
                    className="transition-colors hover:bg-[#faf5e8]/70"
                  >
                    <td className="px-4 py-3 text-2xl">{ach.icon_url}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-[#0a0a0a]">{ach.name}</p>
                      <p className="text-xs text-[#6a6a6a]">
                        {ach.description}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="inline-flex items-center rounded-[6px] border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-0.5 text-[11px] font-semibold text-[#0a0a0a]">
                        {conditionLabel[ach.condition_type]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 font-mono font-bold text-[#0a0a0a] sm:table-cell">
                      {ach.condition_value}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        type="button"
                        disabled={!isAdmin}
                        onClick={() => toggleActive(ach.id)}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all ${
                          !isAdmin ? "cursor-default" : "cursor-pointer"
                        } ${
                          ach.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a]"
                        }`}
                      >
                        {ach.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(ach)}
                            className="flex h-8 cursor-pointer items-center gap-1 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
                            title="Edit Achievement"
                          >
                            <PencilIcon className="size-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(ach.id)}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-[8px] border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
                            title="Delete Achievement"
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
          {achievements.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-xs text-[#6a6a6a]">No achievements found.</p>
            </div>
          )}
        </div>

        {/* Responsive Modal Form */}
        <ResponsiveFormModal
          isOpen={formOpen && isAdmin}
          onClose={() => setFormOpen(false)}
          title={editTarget ? "Edit Achievement" : "Add New Achievement"}
          description="Configure achievement milestone, criteria type, and trigger target."
        >
          <div className="space-y-4 text-left font-sans">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Streak 5"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Icon (Emoji)
                </label>
                <input
                  type="text"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  placeholder="🔥"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Description
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Attended 5 consecutive weeks"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Condition Type
                </label>
                <select
                  value={conditionType}
                  onChange={(e) =>
                    setConditionType(
                      e.target.value as Achievement["condition_type"]
                    )
                  }
                  className="h-11 w-full cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                >
                  <option value="streak">Streak</option>
                  <option value="attendance">Attendance</option>
                  <option value="points">Points</option>
                  <option value="event_count">Event Count</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Target Value
                </label>
                <input
                  type="number"
                  min={1}
                  value={conditionValue}
                  onChange={(e) => setConditionValue(Number(e.target.value))}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#e5e5e5] pt-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="h-10 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="h-10 cursor-pointer rounded-[12px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1f1f1f]"
              >
                {editTarget ? "Save Changes" : "Create Achievement"}
              </button>
            </div>
          </div>
        </ResponsiveFormModal>
      </div>
    </main>
  )
}
