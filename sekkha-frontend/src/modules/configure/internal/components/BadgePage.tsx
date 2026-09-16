// feature/configure/components/BadgePage
// Master Data: Badge management — CRUD badge (nama, icon, kondisi).
// Connected to backend: GET/POST/PUT/DELETE /api/configure/badges

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, AwardIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import { badgesApi } from "../api/configureApi"
import { useConfigureCrud } from "../hooks/useConfigureCrud"
import type { BadgeDto } from "../api/configureApi"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Badge {
  id: string
  name: string
  description: string
  icon_url: string
  condition_type: "streak" | "attendance" | "points" | "event_count" | "manual"
  condition_value: number
  is_active: boolean
}

// ─── Dummy data ──────────────────────────────────────────────────────────────

const INITIAL_BADGES: Badge[] = [
  {
    id: "badge-1",
    name: "First Attendance",
    description: "Successfully scanned QR code for the first time",
    icon_url: "🎯",
    condition_type: "attendance",
    condition_value: 1,
    is_active: true,
  },
  {
    id: "badge-2",
    name: "Streak 5",
    description: "Attended 5 weeks consecutively",
    icon_url: "🔥",
    condition_type: "streak",
    condition_value: 5,
    is_active: true,
  },
  {
    id: "badge-3",
    name: "Streak 10",
    description: "Attended 10 weeks consecutively",
    icon_url: "⚡",
    condition_type: "streak",
    condition_value: 10,
    is_active: true,
  },
  {
    id: "badge-4",
    name: "100 Points Collector",
    description: "Accumulated 100 total points",
    icon_url: "⭐",
    condition_type: "points",
    condition_value: 100,
    is_active: true,
  },
]

const CONDITION_OPTIONS = [
  { value: "attendance", label: "Total Attendance" },
  { value: "streak", label: "Streak (weeks)" },
  { value: "points", label: "Total Points" },
  { value: "event_count", label: "Event Count" },
  { value: "manual", label: "Manual" },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function BadgePage() {
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

  const {
    items: badges,
    create: apiCreate,
    update: apiUpdate,
    remove: apiRemove,
  } = useConfigureCrud<BadgeDto>(badgesApi, INITIAL_BADGES)
  const [editing, setEditing] = useState<Badge | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [iconUrl, setIconUrl] = useState("")
  const [conditionType, setConditionType] =
    useState<Badge["condition_type"]>("attendance")
  const [conditionValue, setConditionValue] = useState("")

  function resetForm() {
    setName("")
    setDescription("")
    setIconUrl("")
    setConditionType("attendance")
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
    if (!name.trim() || !isAdmin) return

    const payload = {
      name,
      description,
      icon_url: iconUrl || "🏅",
      condition_type: conditionType as any,
      condition_value: Number(conditionValue) || 0,
      is_active: true,
    }

    if (editing) {
      void apiUpdate(editing.id, payload).catch(() => {})
    } else {
      void apiCreate(payload).catch(() => {})
    }
    resetForm()
  }

  function handleDelete(id: string) {
    if (!isAdmin) return
    void apiRemove(id).catch(() => {})
  }

  const conditionLabel: Record<Badge["condition_type"], string> = {
    attendance: "Total Attendance",
    streak: "Streak (weeks)",
    points: "Total Points",
    event_count: "Event Count",
    manual: "Manual",
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 text-left font-sans md:pb-12">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Gamification" },
          { label: "Master Badges" },
        ]}
      />
      <div className="mx-auto max-w-7xl space-y-5 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-[#e5e5e5] pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shadow-xs">
              <AwardIcon className="size-5 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#0a0a0a] sm:text-xl">
                Member Achievement Badges
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Manage master badges and member gamification trigger conditions
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
              <span>Add Badge</span>
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
                  <th className="px-4 py-3">Badge Details</th>
                  <th className="hidden px-4 py-3 sm:table-cell">
                    Trigger Condition
                  </th>
                  <th className="hidden px-4 py-3 sm:table-cell">
                    Threshold Value
                  </th>
                  {isAdmin && (
                    <th className="w-28 px-4 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {badges.map((badge) => (
                  <tr
                    key={badge.id}
                    className="transition-colors hover:bg-[#faf5e8]/70"
                  >
                    <td className="px-4 py-3 text-2xl">{badge.icon_url}</td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-[#0a0a0a]">{badge.name}</p>
                      <p className="text-xs text-[#6a6a6a]">
                        {badge.description}
                      </p>
                    </td>
                    <td className="hidden px-4 py-3 sm:table-cell">
                      <span className="inline-flex items-center rounded-[6px] border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-0.5 text-[11px] font-semibold text-[#0a0a0a]">
                        {conditionLabel[badge.condition_type]}
                      </span>
                    </td>
                    <td className="hidden px-4 py-3 font-mono font-bold text-[#0a0a0a] sm:table-cell">
                      {badge.condition_value}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(badge)}
                            className="flex h-8 cursor-pointer items-center gap-1 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
                            title="Edit Badge"
                          >
                            <PencilIcon className="size-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(badge.id)}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-[8px] border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
                            title="Delete Badge"
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
          {badges.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-xs text-[#6a6a6a]">No badges saved yet.</p>
            </div>
          )}
        </div>

        {/* Responsive Modal Form */}
        <ResponsiveFormModal
          isOpen={showForm && isAdmin}
          onClose={resetForm}
          title={editing ? "Edit Badge" : "Add New Badge"}
          description="Configure achievement badge name, icon, and trigger condition."
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-4 text-left font-sans"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Badge Name *
                </label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Streak 5"
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Icon (Emoji / URL)
                </label>
                <input
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Attend 5 consecutive weeks"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Trigger Condition
                </label>
                <select
                  value={conditionType}
                  onChange={(e) =>
                    setConditionType(e.target.value as Badge["condition_type"])
                  }
                  className="h-11 w-full cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                >
                  {CONDITION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Target Value
                </label>
                <input
                  type="number"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="5"
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
                {editing ? "Save Changes" : "Create Badge"}
              </button>
            </div>
          </form>
        </ResponsiveFormModal>
      </div>
    </main>
  )
}
