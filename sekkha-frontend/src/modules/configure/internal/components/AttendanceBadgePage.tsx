// feature/configure/components/AttendanceBadgePage
// Master Data: Attendance Bonus Badges management — CRUD badge tugas & bonus poin presensi event Vihara.

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, AwardIcon, SparklesIcon, CheckIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import type { AttendanceBadge } from "@/modules/events/internal/types"
import { getMasterBadges } from "@/modules/events/internal/masterdata"

const COLOR_OPTIONS = [
  { label: "Blue (Puja)", value: "bg-blue-50/90 text-blue-700 border-blue-200/80" },
  { label: "Amber / Yellow (Paritta)", value: "bg-amber-50/90 text-amber-800 border-amber-200/80" },
  { label: "Purple (Committee/Volunteer)", value: "bg-purple-50/90 text-purple-800 border-purple-200/80" },
  { label: "Rose / Red (Musician/Audio)", value: "bg-rose-50/90 text-rose-800 border-rose-200/80" },
  { label: "Emerald / Green (Cleanliness)", value: "bg-emerald-50/90 text-emerald-800 border-emerald-200/80" },
  { label: "Orange (Refreshments)", value: "bg-orange-50/90 text-orange-800 border-orange-200/80" },
  { label: "Sky Blue (Secretariat)", value: "bg-sky-50/90 text-sky-800 border-sky-200/80" },
]

export function AttendanceBadgePage() {
  const { authState } = useAuth()
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const [badges, setBadges] = useState<AttendanceBadge[]>(() => getMasterBadges())
  const [editing, setEditing] = useState<AttendanceBadge | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState("")
  const [points, setPoints] = useState<number>(20)
  const [color, setColor] = useState(COLOR_OPTIONS[0].value)

  function saveToStorage(updated: AttendanceBadge[]) {
    setBadges(updated)
    try {
      localStorage.setItem("sekkha_master_badges", JSON.stringify(updated))
    } catch { }
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
      const updated = badges.map(b => (b.id === editing.id ? newBadge : b))
      saveToStorage(updated)
    } else {
      saveToStorage([...badges, newBadge])
    }
    resetForm()
  }

  function handleToggleActive(id: string) {
    if (!isAdmin) return
    const updated = badges.map(b =>
      b.id === id ? { ...b, is_active: b.is_active === false ? true : false } : b
    )
    saveToStorage(updated)
  }

  function handleDelete(id: string) {
    if (!isAdmin) return
    const updated = badges.filter(b => b.id !== id)
    saveToStorage(updated)
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 md:pb-12 font-sans text-left">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Master Data" }, { label: "Attendance Duty Badges" }]} />
      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shrink-0 shadow-xs">
              <AwardIcon className="size-5 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-[#0a0a0a]">Attendance Duty Badges Master Data</h1>
              <p className="text-xs text-[#6a6a6a]">Manage bonus duty badges and volunteer points for Vihara events</p>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="h-10 w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-white px-4 text-xs font-bold hover:bg-[#1f1f1f] transition-all cursor-pointer shadow-xs shrink-0"
            >
              <PlusIcon className="size-4" />
              <span>Add Duty Badge</span>
            </button>
          )}
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] font-bold">
                  <th className="py-3 px-4">Duty Badge Name</th>
                  <th className="py-3 px-4">Badge Pill Preview</th>
                  <th className="py-3 px-4">Bonus Points</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  {isAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {badges.map(b => (
                  <tr key={b.id} className="hover:bg-[#faf5e8]/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#0a0a0a]">
                      {b.name}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border shadow-2xs ${b.color ?? "bg-blue-50/90 text-blue-700 border-blue-200/80"}`}>
                        <span>{b.name}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0a0a0a]">
                      <span className="inline-flex items-center gap-1 rounded-[6px] bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-0.5 text-[11px] font-mono font-bold text-[#0a0a0a]">
                        <SparklesIcon className="size-3 text-[#e8b94a]" />
                        +{b.points} Pts
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {b.is_active !== false ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                          <CheckIcon className="size-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-0.5 text-[11px] font-semibold text-[#6a6a6a]">
                          Inactive
                        </span>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(b.id)}
                            className={`h-8 px-2.5 rounded-[8px] border text-xs font-bold transition-all cursor-pointer ${
                              b.is_active !== false
                                ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                            }`}
                            title={b.is_active !== false ? "Deactivate" : "Activate"}
                          >
                            {b.is_active !== false ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(b)}
                            className="h-8 px-2.5 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-xs font-bold text-[#0a0a0a] transition-colors cursor-pointer flex items-center gap-1"
                            title="Edit Duty Badge"
                          >
                            <PencilIcon className="size-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(b.id)}
                            className="size-8 flex items-center justify-center rounded-[8px] border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
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
              <p className="text-xs text-[#6a6a6a]">No duty badges saved yet.</p>
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
          <form onSubmit={handleSubmit} className="space-y-3.5 text-left font-sans">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">Duty Badge Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Refreshments Officer / Committee"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">Attendee Bonus Points *</label>
              <input
                type="number"
                required
                min={0}
                value={points}
                onChange={e => setPoints(Number(e.target.value))}
                placeholder="e.g. 25"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">Pill Color Scheme *</label>
              <select
                value={color}
                onChange={e => setColor(e.target.value)}
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3 text-xs sm:text-sm text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all cursor-pointer"
              >
                {COLOR_OPTIONS.map(c => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-3 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6a6a6a]">Badge Appearance Preview:</p>
              <div className="flex items-center gap-2 pt-0.5">
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold border shadow-2xs ${color}`}>
                  <span>{name || "Badge Name"}</span>
                </span>
                <span className="text-xs font-mono font-bold text-[#0a0a0a]">+{points} Pts</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e5e5]">
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
                {editing ? "Save Changes" : "Add Badge"}
              </button>
            </div>
          </form>
        </ResponsiveFormModal>

      </div>
    </main>
  )
}
