// feature/configure/components/EventTimePage
// Master Data: Preset Jam Umum Vihara management — with Clay Design, Wheel Time Picker, & Category targeting.

import { useState } from "react"
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ClockIcon,
  CalendarIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import { WheelTimePickerTrigger } from "@/components/ui/WheelTimePicker"
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown"
import {
  DAY_NAMES,
  getMasterTimePresets,
  getMasterCategories,
  saveMasterTimePresets,
} from "@/modules/events/internal/masterdata"
import type { EventTimePresetItem } from "@/modules/events/internal/masterdata"

export function EventTimePage() {
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

  const [presets, setPresets] = useState<EventTimePresetItem[]>(() =>
    getMasterTimePresets()
  )
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
    if (!label.trim() || !time || !isAdmin) return

    if (editing) {
      updateAndPersistPresets(
        presets.map((p) =>
          p.id === editing.id
            ? {
                ...p,
                label,
                time,
                day_of_week: dayOfWeek,
                description,
                target_category_tags: targetCategoryTags,
              }
            : p
        )
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
    if (!isAdmin) return
    updateAndPersistPresets(
      presets.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p))
    )
  }

  function handleDelete(id: string) {
    if (!isAdmin) return
    if (window.confirm("Are you sure you want to delete this time preset?")) {
      updateAndPersistPresets(presets.filter((p) => p.id !== id))
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 text-left font-sans md:pb-12">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          { label: "Time Presets" },
        ]}
      />

      <div className="mx-auto max-w-7xl space-y-5 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-3 border-b border-[#e5e5e5] pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shadow-xs">
              <ClockIcon className="size-5 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#0a0a0a] sm:text-xl">
                Vihara Time Presets Master Data
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Manage preset event times and days for fast scheduling across
                Vihara activities
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
              <span>Add Time Preset</span>
            </button>
          )}
        </div>

        {/* 📱 MOBILE VIEW: Clean Clay Cards (<md) */}
        <div className="block space-y-3 md:hidden">
          {presets.map((p) => (
            <div
              key={p.id}
              className="space-y-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-[#0a0a0a] text-white shadow-2xs">
                    <ClockIcon className="size-4 text-[#e8b94a]" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-[#0a0a0a] sm:text-sm">
                      {p.label}
                    </p>
                    <span className="mt-0.5 inline-block rounded-[6px] border border-[#e5e5e5] bg-[#faf5e8] px-2 py-0.5 font-mono text-xs font-bold text-[#0a0a0a]">
                      {p.time}
                    </span>
                  </div>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    p.is_active !== false
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-zinc-200 bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {p.is_active !== false ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Target Day & Category */}
              <div className="-mx-4 grid grid-cols-2 gap-2 border-t border-[#e5e5e5] bg-[#faf5e8] p-3 pt-2 text-xs text-[#6a6a6a]">
                <div>
                  <span className="block text-[10px] font-bold text-[#6a6a6a] uppercase">
                    Target Day
                  </span>
                  <span className="text-xs font-medium text-[#0a0a0a]">
                    {p.day_of_week !== undefined && p.day_of_week >= 0
                      ? `📅 ${DAY_NAMES[p.day_of_week]}`
                      : "Any Day"}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-[#6a6a6a] uppercase">
                    Category
                  </span>
                  <span className="block truncate text-xs font-medium text-[#0a0a0a]">
                    {!p.target_category_tags ||
                    p.target_category_tags.length === 0
                      ? "All Categories"
                      : p.target_category_tags.join(", ")}
                  </span>
                </div>
                {p.description && (
                  <div className="col-span-2 pt-1">
                    <span className="block text-[10px] font-bold text-[#6a6a6a] uppercase">
                      Description
                    </span>
                    <p className="line-clamp-2 text-xs text-[#0a0a0a]">
                      {p.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {isAdmin && (
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(p.id)}
                    className={`h-8 cursor-pointer rounded-[8px] border px-3 text-xs font-bold transition-all ${
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
                    className="h-8 cursor-pointer rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-3 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p.id)}
                    className="flex size-8 cursor-pointer items-center justify-center rounded-[8px] border border-rose-200 bg-rose-50 text-rose-700 transition-colors hover:bg-rose-100"
                  >
                    <TrashIcon className="size-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 🖥️ DESKTOP VIEW: Structured Table (100% width, No Horizontal Scrollbar) */}
        <div className="hidden overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs md:block">
          <table className="w-full table-auto text-left font-sans text-xs">
            <thead>
              <tr className="border-b border-[#e5e5e5] bg-[#faf5e8] font-bold text-[#6a6a6a]">
                <th className="w-[22%] px-4 py-3">Time Preset Label</th>
                <th className="w-[15%] px-4 py-3">Target Day</th>
                <th className="w-[10%] px-4 py-3">Time</th>
                <th className="w-[15%] px-4 py-3">Event Category</th>
                <th className="w-[20%] px-4 py-3">Description</th>
                <th className="w-[8%] px-4 py-3 text-center">Status</th>
                {isAdmin && (
                  <th className="w-[10%] px-4 py-3 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f0f0]">
              {presets.map((p) => (
                <tr
                  key={p.id}
                  className="transition-colors hover:bg-[#faf5e8]/70"
                >
                  {/* Preset Label */}
                  <td className="px-4 py-3 font-bold text-[#0a0a0a]">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="size-4 shrink-0 text-[#0a0a0a]" />
                      <span className="truncate">{p.label}</span>
                    </div>
                  </td>

                  {/* Target Day */}
                  <td className="px-4 py-3">
                    {p.day_of_week !== undefined && p.day_of_week >= 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-[6px] border border-[#b8a4ed]/50 bg-[#b8a4ed]/30 px-2 py-0.5 text-[11px] font-semibold text-[#0a0a0a]">
                        <CalendarIcon className="size-3" />
                        {DAY_NAMES[p.day_of_week]}
                      </span>
                    ) : (
                      <span className="inline-block rounded-[6px] border border-[#e5e5e5] bg-[#faf5e8] px-2 py-0.5 text-[11px] font-medium text-[#6a6a6a]">
                        Any Day (Time Only)
                      </span>
                    )}
                  </td>

                  {/* Time */}
                  <td className="px-4 py-3">
                    <span className="rounded-[6px] bg-[#0a0a0a] px-2 py-0.5 font-mono text-xs font-bold text-[#0a0a0a] text-white shadow-2xs">
                      {p.time}
                    </span>
                  </td>

                  {/* Event Category */}
                  <td className="px-4 py-3 text-xs">
                    {!p.target_category_tags ||
                    p.target_category_tags.length === 0 ? (
                      <span className="font-medium text-[#6a6a6a]">
                        All Categories
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {p.target_category_tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-[4px] border border-[#e5e5e5] bg-[#faf5e8] px-1.5 py-0.5 text-[11px] font-semibold text-[#0a0a0a] capitalize"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* Description */}
                  <td className="max-w-[200px] px-4 py-3 text-[#6a6a6a]">
                    <p className="truncate" title={p.description || "—"}>
                      {p.description || "—"}
                    </p>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                        p.is_active !== false
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-zinc-200 bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {p.is_active !== false ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Actions */}
                  {isAdmin && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p.id)}
                          className={`cursor-pointer rounded-[6px] border px-2 py-1 text-[11px] font-bold transition-all ${
                            p.is_active !== false
                              ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                          }`}
                          title={
                            p.is_active !== false ? "Deactivate" : "Activate"
                          }
                        >
                          {p.is_active !== false ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="cursor-pointer rounded-[6px] border border-[#e5e5e5] bg-[#fffaf0] p-1.5 text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
                          title="Edit Time Preset"
                        >
                          <PencilIcon className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="cursor-pointer rounded-[6px] border border-rose-200 bg-rose-50 p-1.5 text-rose-700 transition-colors hover:bg-rose-100"
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
          open={showForm && isAdmin}
          onOpenChange={setShowForm}
          onClose={resetForm}
          title={editing ? "Edit Time Preset" : "Add New Time Preset"}
          description="Configure default schedule times and day mapping for activities."
        >
          <form
            onSubmit={handleSubmit}
            className="space-y-4 text-left font-sans"
          >
            {/* Label Input */}
            <div className="space-y-1.5">
              <label
                htmlFor="tp-label"
                className="text-xs font-bold text-[#0a0a0a]"
              >
                Time Preset Label <span className="text-rose-500">*</span>
              </label>
              <input
                id="tp-label"
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. Morning Puja / Evening Session"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* Time Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Time <span className="text-rose-500">*</span>
                </label>
                <WheelTimePickerTrigger value={time} onChange={setTime} />
              </div>

              {/* Target Day */}
              <div className="flex w-full flex-col gap-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Target Specific Day
                </label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(Number(e.target.value))}
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
                >
                  <option value={-1}>Any Day (Applies to all)</option>
                  {DAY_NAMES.map((d, idx) => (
                    <option key={d} value={idx}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Event Category Multi-Select */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Associated Event Category
              </label>
              <p className="text-[11px] text-[#6a6a6a]">
                This preset will be highlighted when the selected category is
                active.
              </p>
              <MultiSelectDropdown
                options={allCategories.map((c) => ({
                  value: c.tag,
                  label: c.name,
                }))}
                value={targetCategoryTags}
                onChange={(v) => setTargetCategoryTags(v)}
                placeholder="All Categories (default)..."
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label
                htmlFor="tp-desc"
                className="text-xs font-bold text-[#0a0a0a]"
              >
                Additional Description{" "}
                <span className="text-[11px] font-normal text-[#6a6a6a]">
                  (Optional)
                </span>
              </label>
              <input
                id="tp-desc"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Weekly youth schedule"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] pt-3">
              <button
                type="button"
                onClick={resetForm}
                className="h-11 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="h-11 cursor-pointer rounded-[12px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f]"
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
