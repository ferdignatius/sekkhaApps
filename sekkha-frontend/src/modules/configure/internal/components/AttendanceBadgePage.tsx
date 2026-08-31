// feature/configure/components/AttendanceBadgePage
// Master Data: Attendance Bonus Badges management — CRUD badge tugas & bonus poin presensi event Vihara.

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, AwardIcon, SparklesIcon, CheckIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
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
  const isPengurusOrAdmin = authState.status === "authenticated" && (authState.role === "admin" || authState.role === "pengurus")

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

  function openEdit(item: AttendanceBadge) {
    setName(item.name)
    setPoints(item.points)
    setColor(item.color ?? COLOR_OPTIONS[0].value)
    setEditing(item)
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || points < 0) return

    if (editing) {
      const updated = badges.map(b => (b.id === editing.id ? { ...b, name, points, color } : b))
      saveToStorage(updated)
    } else {
      const newBadge: AttendanceBadge = {
        id: `badge-${Date.now()}`,
        name,
        points,
        color,
        is_active: true,
      }
      saveToStorage([...badges, newBadge])
    }
    resetForm()
  }

  function handleToggleActive(id: string) {
    const updated = badges.map(b =>
      b.id === id ? { ...b, is_active: !b.is_active } : b
    )
    saveToStorage(updated)
  }

  function handleDelete(id: string) {
    const updated = badges.filter(b => b.id !== id)
    saveToStorage(updated)
  }

  return (
    <main className="font-sans text-left">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Attendance Duty Badges" }]} />
      <div className="px-4 py-6 pb-32 sm:pb-36 md:px-8 md:pb-12 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-5">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shrink-0">
                <AwardIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-body-base sm:text-heading-5 font-extrabold text-sekkha-ink">Attendance Duty Badges Master Data</h1>
                <p className="text-micro text-sekkha-slate">Manage bonus duty badges and volunteer points for Vihara events</p>
              </div>
            </div>

            {isPengurusOrAdmin && (
              <button
                type="button"
                onClick={openCreate}
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-1.5 rounded-xl bg-sekkha-brand-blue px-4 py-2.5 sm:py-2 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
              >
                <PlusIcon className="size-4" />
                <span>Add Duty Badge</span>
              </button>
            )}
          </div>

          {/* Table Container */}
          <div className="rounded-2xl border border-sekkha-hairline bg-white/95 backdrop-blur-md p-4 shadow-xs">
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full min-w-[600px] text-left text-caption border-collapse">
                <thead>
                  <tr className="border-b border-sekkha-hairline-soft bg-sekkha-canvas/60 text-micro-bold uppercase tracking-wider text-sekkha-slate">
                    <th className="py-3 px-4">Duty Badge Name</th>
                    <th className="py-3 px-4">Badge Pill Preview</th>
                    <th className="py-3 px-4">Bonus Points</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    {isPengurusOrAdmin && <th className="py-3 px-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-sekkha-hairline-soft font-sans">
                  {badges.map(b => (
                    <tr key={b.id} className="hover:bg-sekkha-surface/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-sekkha-ink">
                        {b.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-micro-bold border shadow-2xs ${b.color ?? "bg-blue-50/90 text-blue-700 border-blue-200/80"}`}>
                          <span>{b.name}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-amber-700">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-micro-bold text-amber-900">
                          <SparklesIcon className="size-3 text-amber-600" />
                          +{b.points} Pts
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {b.is_active !== false ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-micro-bold text-emerald-800">
                            <CheckIcon className="size-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-300 px-2.5 py-0.5 text-micro-bold text-slate-500">
                            Inactive
                          </span>
                        )}
                      </td>
                      {isPengurusOrAdmin && (
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(b.id)}
                              className={`rounded-lg border px-2.5 py-1 text-micro-bold transition-all ${b.is_active !== false
                                  ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                }`}
                              title={b.is_active !== false ? "Deactivate" : "Activate"}
                            >
                              {b.is_active !== false ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(b)}
                              className="rounded-lg border border-sekkha-hairline bg-sekkha-canvas p-1.5 text-sekkha-ink hover:bg-blue-50 hover:text-sekkha-brand-blue transition-colors"
                              title="Edit Duty Badge"
                            >
                              <PencilIcon className="size-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(b.id)}
                              className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition-colors"
                              title="Delete Duty Badge"
                            >
                              <TrashIcon className="size-4" />
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

          {/* Form Modal Sub-Dialog (Responsive Bottom Sheet on Mobile) */}
          {showForm && (
            <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in-0">
              <div className="w-full sm:max-w-md max-h-[92vh] sm:max-h-[90vh] rounded-t-[28px] sm:rounded-2xl border-t sm:border border-sekkha-hairline bg-white p-5 shadow-2xl space-y-4 text-left font-sans overflow-y-auto animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">

                {/* Mobile Drag Handle */}
                <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-2 mb-1 sm:hidden shrink-0" />

                <div className="flex items-center justify-between pb-2 border-b border-sekkha-hairline-soft">
                  <h3 className="text-body-base font-bold text-sekkha-ink">
                    {editing ? "Edit Duty Badge" : "Add New Duty Badge"}
                  </h3>
                  <button type="button" onClick={resetForm} className="text-sekkha-slate hover:text-sekkha-ink cursor-pointer p-1">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-caption font-bold text-sekkha-ink">Duty Badge Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="e.g. Refreshments Officer / Committee"
                      className="w-full h-11 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-caption font-bold text-sekkha-ink">Attendee Bonus Points *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={points}
                      onChange={e => setPoints(Number(e.target.value))}
                      placeholder="e.g. 25"
                      className="w-full h-11 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-caption font-bold text-sekkha-ink">Pill Color Scheme *</label>
                    <select
                      value={color}
                      onChange={e => setColor(e.target.value)}
                      className="w-full h-11 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                    >
                      {COLOR_OPTIONS.map(c => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="p-3 rounded-xl border border-sekkha-hairline bg-sekkha-canvas/60 space-y-1">
                    <p className="text-micro font-bold text-sekkha-slate uppercase">Badge Appearance Preview:</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-micro-bold border shadow-2xs ${color}`}>
                        <span>{name || "Badge Name"}</span>
                      </span>
                      <span className="text-micro font-extrabold text-amber-700">+{points} Pts</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-sekkha-hairline-soft">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-sekkha-hairline bg-sekkha-surface px-4 py-2 text-caption-bold text-sekkha-slate"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="rounded-xl bg-sekkha-brand-blue px-4 py-2 text-caption-bold text-white shadow-xs hover:bg-blue-700"
                    >
                      {editing ? "Save Changes" : "Add Badge"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
    </main>
  )
}
