// feature/configure/components/AttendanceBadgePage
// Master Data: Attendance Bonus Badges management — CRUD badge tugas & bonus poin presensi event Vihara.

import { useState } from "react"
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  AwardIcon,
  SparklesIcon,
  CheckIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import type { AttendanceBadge } from "@/modules/events/internal/types"
import { getMasterBadges } from "@/modules/events/internal/masterdata"

const COLOR_OPTIONS = [
  {
    label: "Blue (Puja)",
    value: "bg-blue-50/90 text-blue-700 border-blue-200/80",
  },
  {
    label: "Amber / Yellow (Paritta)",
    value: "bg-amber-50/90 text-amber-800 border-amber-200/80",
  },
  {
    label: "Purple (Committee/Volunteer)",
    value: "bg-purple-50/90 text-purple-800 border-purple-200/80",
  },
  {
    label: "Rose / Red (Musician/Audio)",
    value: "bg-rose-50/90 text-rose-800 border-rose-200/80",
  },
  {
    label: "Emerald / Green (Cleanliness)",
    value: "bg-emerald-50/90 text-emerald-800 border-emerald-200/80",
  },
  {
    label: "Orange (Refreshments)",
    value: "bg-orange-50/90 text-orange-800 border-orange-200/80",
  },
  {
    label: "Sky Blue (Secretariat)",
    value: "bg-sky-50/90 text-sky-800 border-sky-200/80",
  },
]

export function AttendanceBadgePage() {
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

  const [badges, setBadges] = useState<AttendanceBadge[]>(() =>
    getMasterBadges()
  )
  const [editing, setEditing] = useState<AttendanceBadge | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState("")
  const [points, setPoints] = useState<number>(20)
  const [color, setColor] = useState(COLOR_OPTIONS[0].value)

  function saveToStorage(updated: AttendanceBadge[]) {
    setBadges(updated)
    try {
      localStorage.setItem("sekkha_master_badges", JSON.stringify(updated))
    } catch {}
  }

  function resetForm() {
    setName("")
    setPoints(20)
    setColor(COLOR_OPTIONS[0].value)
    setEditing(null)
    setShowForm(false)
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(b: AttendanceBadge) {
    setName(b.name)
    setPoints(b.points)
    setColor(b.color ?? COLOR_OPTIONS[0].value)
    setEditing(b)
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !isAdmin) return

    const newBadge: AttendanceBadge = {
      id: editing ? editing.id : `badge_${Date.now()}`,
      name: name.trim(),
      points: Number(points) || 0,
      color,
      is_active: editing ? editing.is_active : true,
    }

    if (editing) {
      const updated = badges.map((b) => (b.id === editing.id ? newBadge : b))
      saveToStorage(updated)
    } else {
      saveToStorage([...badges, newBadge])
    }
    resetForm()
  }

  function handleToggleActive(id: string) {
    if (!isAdmin) return
    const updated = badges.map((b) =>
      b.id === id
        ? { ...b, is_active: b.is_active === false ? true : false }
        : b
    )
    saveToStorage(updated)
  }

  function handleDelete(id: string) {
    if (!isAdmin) return
    const updated = badges.filter((b) => b.id !== id)
    saveToStorage(updated)
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 text-left font-sans md:pb-12">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          { label: "Attendance Duty Badges" },
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
                Attendance Duty Badges Master Data
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Manage bonus duty badges and volunteer points for Vihara events
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
              <span>Add Duty Badge</span>
            </button>
          )}
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs">
          <div className="scrollbar-none overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#faf5e8] font-bold text-[#6a6a6a]">
                  <th className="px-4 py-3">Duty Badge Name</th>
                  <th className="px-4 py-3">Badge Pill Preview</th>
                  <th className="px-4 py-3">Bonus Points</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {badges.map((b) => (
                  <tr
                    key={b.id}
                    className="transition-colors hover:bg-[#faf5e8]/70"
                  >
                    <td className="px-4 py-3 font-bold text-[#0a0a0a]">
                      {b.name}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-2xs ${b.color ?? "border-blue-200/80 bg-blue-50/90 text-blue-700"}`}
                      >
                        <span>{b.name}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-[#0a0a0a]">
                      <span className="inline-flex items-center gap-1 rounded-[6px] border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#0a0a0a]">
                        <SparklesIcon className="size-3 text-[#e8b94a]" />+
                        {b.points} Pts
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {b.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <CheckIcon className="size-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-0.5 text-[11px] font-semibold text-[#6a6a6a]">
                          Inactive
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(b.id)}
                            className={`h-8 cursor-pointer rounded-[8px] border px-2.5 text-xs font-bold transition-all ${
                              b.is_active !== false
                                ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            }`}
                            title={
                              b.is_active !== false ? "Deactivate" : "Activate"
                            }
                          >
                            {b.is_active !== false ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(b)}
                            className="flex h-8 cursor-pointer items-center gap-1 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
                            title="Edit Duty Badge"
                          >
                            <PencilIcon className="size-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(b.id)}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-[8px] border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
                            title="Delete Duty Badge"
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
              <p className="text-xs text-[#6a6a6a]">
                No duty badges saved yet.
              </p>
            </div>
          )}
        </div>

        {/* Form Modal */}
        <ResponsiveFormModal
          isOpen={showForm && isAdmin}
          onClose={resetForm}
          title={editing ? "Edit Duty Badge" : "Add New Duty Badge"}
          description="Configure volunteer duty badges and attendee reward points."
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-3.5 text-left font-sans"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Duty Badge Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Refreshments Officer / Committee"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Attendee Bonus Points *
              </label>
              <input
                type="number"
                required
                min={0}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                placeholder="e.g. 25"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Pill Color Scheme *
              </label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-11 w-full cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3">
              <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                Badge Appearance Preview:
              </p>
              <div className="flex items-center gap-2 pt-0.5">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold shadow-2xs ${color}`}
                >
                  <span>{name || "Badge Name"}</span>
                </span>
                <span className="font-mono text-xs font-bold text-[#0a0a0a]">
                  +{points} Pts
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] pt-3">
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
                {editing ? "Save Changes" : "Add Badge"}
              </button>
            </div>
          </form>
        </ResponsiveFormModal>
      </div>
    </main>
  )
}
