// feature/configure/components/EventTimePage
// Master Data: Preset Jam Umum Vihara management — with Clay Design, Wheel Time Picker, & Category targeting.

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, ClockIcon, CalendarIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import { WheelTimePickerTrigger } from "@/components/ui/WheelTimePicker"
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown"
import {
  type EventTimePresetItem,
  DAY_NAMES,
  getMasterTimePresets,
  getMasterCategories,
  saveMasterTimePresets,
} from "@/modules/events/internal/masterdata"

export function EventTimePage() {
  const { authState } = useAuth()
  const isPengurusOrAdmin = authState.status === "authenticated" && (authState.role === "admin" || authState.role === "pengurus")

  const [presets, setPresets] = useState<EventTimePresetItem[]>(() => getMasterTimePresets())
  const [editing, setEditing] = useState<EventTimePresetItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const allCategories = getMasterCategories(true)

  const [label, setLabel] = useState("")
  const [time, setTime] = useState("08:00")
  const [dayOfWeek, setDayOfWeek] = useState<number>(-1)
  const [description, setDescription] = useState("")
  const [targetCategoryTags, setTargetCategoryTags] = useState<string[]>([])

  function updateAndPersistPresets(newPresets: EventTimePresetItem[]) {
    setPresets(newPresets)
    saveMasterTimePresets(newPresets)
  }

  function resetForm() {
    setLabel("")
    setTime("08:00")
    setDayOfWeek(-1)
    setDescription("")
    setTargetCategoryTags([])
    setEditing(null)
    setShowForm(false)
  }

  function openCreate() {
    resetForm()
    setShowForm(true)
  }

  function openEdit(item: EventTimePresetItem) {
    setLabel(item.label)
    setTime(item.time)
    setDayOfWeek(item.day_of_week ?? -1)
    setDescription(item.description ?? "")
    setTargetCategoryTags(item.target_category_tags ?? [])
    setEditing(item)
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !time) return

    if (editing) {
      updateAndPersistPresets(
        presets.map(p => (p.id === editing.id ? { ...p, label, time, day_of_week: dayOfWeek, description, target_category_tags: targetCategoryTags } : p))
      )
    } else {
      const newPreset: EventTimePresetItem = {
        id: `etp-${Date.now()}`,
        label,
        time,
        day_of_week: dayOfWeek,
        description,
        is_active: true,
        target_category_tags: targetCategoryTags,
      }
      updateAndPersistPresets([...presets, newPreset])
    }
    resetForm()
  }

  function handleToggleActive(id: string) {
    updateAndPersistPresets(
      presets.map(p => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    )
  }

  function handleDelete(id: string) {
    if (window.confirm("Are you sure you want to delete this time preset?")) {
      updateAndPersistPresets(presets.filter(p => p.id !== id))
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 md:pb-12 font-sans text-left">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Vihara Time Presets" }]} />
      
      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shrink-0 shadow-xs">
              <ClockIcon className="size-5 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-[#0a0a0a]">Vihara Time Presets Master Data</h1>
              <p className="text-xs text-[#6a6a6a]">Manage preset event times and days for fast scheduling across Vihara activities</p>
            </div>
          </div>

          {isPengurusOrAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="h-10 w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-white px-4 text-xs font-bold hover:bg-[#1f1f1f] transition-all cursor-pointer shadow-xs shrink-0"
            >
              <PlusIcon className="size-4" />
              <span>Add Time Preset</span>
            </button>
          )}
        </div>

        {/* 📱 MOBILE VIEW: Clean Clay Cards (<md) */}
        <div className="block md:hidden space-y-3">
          {presets.map(p => (
            <div
              key={p.id}
              className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#0a0a0a] text-white shadow-2xs">
                    <ClockIcon className="size-4 text-[#e8b94a]" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs sm:text-sm text-[#0a0a0a] truncate">{p.label}</p>
                    <span className="font-mono text-xs font-bold text-[#0a0a0a] bg-[#faf5e8] border border-[#e5e5e5] px-2 py-0.5 rounded-[6px] inline-block mt-0.5">
                      {p.time}
                    </span>
                  </div>
                </div>

                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                  p.is_active !== false ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-zinc-100 text-zinc-600 border-zinc-200"
                }`}>
                  {p.is_active !== false ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Target Day & Category */}
              <div className="grid grid-cols-2 gap-2 text-xs text-[#6a6a6a] pt-2 border-t border-[#e5e5e5] bg-[#faf5e8] -mx-4 p-3">
                <div>
                  <span className="font-bold text-[#6a6a6a] block text-[10px] uppercase">Target Day</span>
                  <span className="font-medium text-[#0a0a0a] text-xs">
                    {p.day_of_week !== undefined && p.day_of_week >= 0 ? `📅 ${DAY_NAMES[p.day_of_week]}` : "Any Day"}
                  </span>
                </div>
                <div>
                  <span className="font-bold text-[#6a6a6a] block text-[10px] uppercase">Category</span>
                  <span className="font-medium text-[#0a0a0a] text-xs truncate block">
                    {!p.target_category_tags || p.target_category_tags.length === 0
                      ? "All Categories"
                      : p.target_category_tags.join(", ")}
                  </span>
                </div>
                {p.description && (
                  <div className="col-span-2 pt-1">
                    <span className="font-bold text-[#6a6a6a] block text-[10px] uppercase">Description</span>
                    <p className="text-xs text-[#0a0a0a] line-clamp-2">{p.description}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {isPengurusOrAdmin && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(p.id)}
                    className={`h-8 px-3 rounded-[8px] border text-xs font-bold transition-all cursor-pointer ${
                      p.is_active !== false
                        ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                    }`}
                  >
                    {p.is_active !== false ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="h-8 px-3 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-xs font-bold text-[#0a0a0a] transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="size-8 flex items-center justify-center rounded-[8px] border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 🖥️ DESKTOP VIEW: Structured Table (100% width, No Horizontal Scrollbar) */}
        <div className="hidden md:block overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs">
          <table className="w-full text-left text-xs font-sans table-auto">
            <thead>
              <tr className="border-b border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] font-bold">
                <th className="px-4 py-3 w-[22%]">Time Preset Label</th>
                <th className="px-4 py-3 w-[15%]">Target Day</th>
                <th className="px-4 py-3 w-[10%]">Time</th>
                <th className="px-4 py-3 w-[15%]">Event Category</th>
                <th className="px-4 py-3 w-[20%]">Description</th>
                <th className="px-4 py-3 w-[8%] text-center">Status</th>
                {isPengurusOrAdmin && <th className="px-4 py-3 w-[10%] text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {presets.map(p => (
                <tr key={p.id} className="hover:bg-[#faf5e8]/70 transition-colors">
                  {/* Preset Label */}
                  <td className="px-4 py-3 font-bold text-[#0a0a0a]">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="size-4 text-[#0a0a0a] shrink-0" />
                      <span className="truncate">{p.label}</span>
                    </div>
                  </td>

                  {/* Target Day */}
                  <td className="px-4 py-3">
                    {p.day_of_week !== undefined && p.day_of_week >= 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-[6px] bg-[#b8a4ed]/30 text-[#0a0a0a] border border-[#b8a4ed]/50">
                        <CalendarIcon className="size-3" />
                        {DAY_NAMES[p.day_of_week]}
                      </span>
                    ) : (
                      <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-[6px] bg-[#faf5e8] text-[#6a6a6a] border border-[#e5e5e5]">
                        Any Day (Time Only)
                      </span>
                    )}
                  </td>

                  {/* Time */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-bold text-[#0a0a0a] bg-[#0a0a0a] text-white px-2 py-0.5 rounded-[6px] shadow-2xs">
                      {p.time}
                    </span>
                  </td>

                  {/* Event Category */}
                  <td className="px-4 py-3 text-xs">
                    {!p.target_category_tags || p.target_category_tags.length === 0 ? (
                      <span className="text-[#6a6a6a] font-medium">All Categories</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {p.target_category_tags.map(tag => (
                          <span key={tag} className="text-[11px] font-semibold px-1.5 py-0.5 rounded-[4px] bg-[#faf5e8] text-[#0a0a0a] border border-[#e5e5e5] capitalize">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3 text-[#6a6a6a] max-w-[200px]">
                    <p className="truncate" title={p.description || "—"}>
                      {p.description || "—"}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                      p.is_active !== false ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-zinc-100 text-zinc-600 border-zinc-200"
                    }`}>
                      {p.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Actions */}
                  {isPengurusOrAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p.id)}
                          className={`rounded-[6px] border px-2 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                            p.is_active !== false
                              ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                          title={p.is_active !== false ? "Deactivate" : "Activate"}
                        >
                          {p.is_active !== false ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="rounded-[6px] border border-[#e5e5e5] bg-[#fffaf0] p-1.5 text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
                          title="Edit Time Preset"
                        >
                          <PencilIcon className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="rounded-[6px] border border-rose-200 bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Delete Time Preset"
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

        {/* Form Modal Sub-Dialog */}
        <ResponsiveFormModal
          open={showForm}
          onOpenChange={setShowForm}
          onClose={resetForm}
          title={editing ? "Edit Time Preset" : "Add New Time Preset"}
          description="Configure default schedule times and day mapping for activities."
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-left font-sans">
            {/* Label Input */}
            <div className="space-y-1.5">
              <label htmlFor="tp-label" className="text-xs font-bold text-[#0a0a0a]">
                Time Preset Label <span className="text-rose-500">*</span>
              </label>
              <input
                id="tp-label"
                type="text"
                required
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder="e.g. Morning Puja / Evening Session"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Time Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">Time <span className="text-rose-500">*</span></label>
                <WheelTimePickerTrigger
                  value={time}
                  onChange={setTime}
                />
              </div>

              {/* Target Day */}
              <div className="flex flex-col gap-1.5 w-full">
                <label className="text-xs font-bold text-[#0a0a0a]">Target Specific Day</label>
                <select
                  value={dayOfWeek}
                  onChange={e => setDayOfWeek(Number(e.target.value))}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                >
                  <option value={-1}>Any Day (Applies to all)</option>
                  {DAY_NAMES.map((d, idx) => (
                    <option key={d} value={idx}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Event Category Multi-Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">Associated Event Category</label>
              <p className="text-[11px] text-[#6a6a6a]">This preset will be highlighted when the selected category is active.</p>
              <MultiSelectDropdown
                options={allCategories.map(c => ({ value: c.tag, label: c.name }))}
                value={targetCategoryTags}
                onChange={v => setTargetCategoryTags(v)}
                placeholder="All Categories (default)..."
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label htmlFor="tp-desc" className="text-xs font-bold text-[#0a0a0a]">
                Additional Description <span className="text-[11px] text-[#6a6a6a] font-normal">(Optional)</span>
              </label>
              <input
                id="tp-desc"
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Weekly youth schedule"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e5e5]">
              <button
                type="button"
                onClick={resetForm}
                className="h-11 px-4 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-bold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-11 px-5 rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all cursor-pointer"
              >
                {editing ? "Save Changes" : "Create Preset"}
              </button>
            </div>
          </form>
        </ResponsiveFormModal>

      </div>
    </main>
  )
}
