// feature/configure/components/EventTimePage
// Master Data: Preset Jam Umum Vihara management — with Base components, Wheel Time Picker, & Category targeting.

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, ClockIcon, CheckIcon, CalendarIcon, SparklesIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
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
import {
  Button,
  Input,
  TableContainer,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge,
} from "@/components/base"

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
    updateAndPersistPresets(presets.filter(p => p.id !== id))
  }

  return (
    <main className="min-h-screen bg-sekkha-surface pb-32 md:pb-12 font-sans text-left">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Vihara Time Presets" }]} />
      <div className="px-4 py-6 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sekkha-hairline-soft pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-sekkha-brand-blue border border-blue-200/60 shrink-0">
              <ClockIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-body-base sm:text-heading-5 font-black text-sekkha-ink">Vihara Time Presets Master Data</h1>
              <p className="text-micro text-sekkha-slate">Manage preset event times and days for fast scheduling across Vihara activities</p>
            </div>
          </div>

          {isPengurusOrAdmin && (
            <Button
              type="button"
              onClick={openCreate}
              className="w-full sm:w-auto shrink-0"
            >
              <PlusIcon className="size-4 mr-1.5" />
              <span>Add Time Preset</span>
            </Button>
          )}
        </div>

        {/* Table Container */}
        <TableContainer>
          <Table className="min-w-[650px]">
            <TableHeader>
              <TableRow>
                <TableHead>Time Preset Label</TableHead>
                <TableHead>Target Day</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Event Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Status</TableHead>
                {isPengurusOrAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {presets.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="font-bold text-sekkha-ink">
                    <div className="flex items-center gap-2">
                      <ClockIcon className="size-4 text-sekkha-brand-blue shrink-0" />
                      <span>{p.label}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.day_of_week !== undefined && p.day_of_week >= 0 ? (
                      <Badge variant="purple" icon={<CalendarIcon className="size-3" />}>
                        {DAY_NAMES[p.day_of_week]}
                      </Badge>
                    ) : (
                      <Badge variant="slate">
                        Any Day (Time Only)
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="blue">
                      {p.time}
                    </Badge>
                  </TableCell>
                  {/* Event Category column */}
                  <TableCell>
                    {!p.target_category_tags || p.target_category_tags.length === 0 ? (
                      <span className="text-micro text-sekkha-slate font-medium">All Categories</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {p.target_category_tags.map(tag => (
                          <Badge key={tag} variant="slate" size="sm" className="capitalize">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sekkha-slate">
                    {p.description || "-"}
                  </TableCell>
                  <TableCell className="text-center">
                    {p.is_active !== false ? (
                      <Badge variant="emerald">
                        <CheckIcon className="size-3 mr-0.5" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="slate">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  {isPengurusOrAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(p.id)}
                          className={`rounded-lg border px-2.5 py-1 text-micro font-bold transition-all cursor-pointer ${p.is_active !== false
                              ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          title={p.is_active !== false ? "Deactivate" : "Activate"}
                        >
                          {p.is_active !== false ? "Deactivate" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="rounded-lg border border-sekkha-hairline bg-sekkha-canvas p-1.5 text-sekkha-ink hover:bg-blue-50 hover:text-sekkha-brand-blue transition-colors cursor-pointer"
                          title="Edit Time Preset"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                          title="Delete Time Preset"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Form Modal Sub-Dialog */}
        {showForm && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in-0">
            <div className="w-full sm:max-w-xl max-h-[93vh] sm:max-h-[90vh] rounded-t-[28px] sm:rounded-3xl border border-sekkha-hairline bg-white p-5 sm:p-6 shadow-2xl text-left font-sans overflow-y-auto animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200 space-y-4">

              {/* Mobile Drag Handle */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-2 mb-1 sm:hidden shrink-0" />

              <div className="flex items-center justify-between pb-3 border-b border-sekkha-hairline-soft">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-5 text-sekkha-brand-blue" />
                  <h3 className="text-body-base font-extrabold text-sekkha-ink">
                    {editing ? "Edit Time Preset" : "Add New Time Preset"}
                  </h3>
                </div>
                <button type="button" onClick={resetForm} className="text-sekkha-slate hover:text-sekkha-ink cursor-pointer p-1">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Time Preset Label *"
                  required
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="e.g. Morning Puja / Evening Session"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-caption font-bold text-sekkha-ink">Time *</label>
                    <WheelTimePickerTrigger
                      value={time}
                      onChange={setTime}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 w-full">
                    <label className="text-caption font-bold text-sekkha-ink">Target Specific Day</label>
                    <select
                      value={dayOfWeek}
                      onChange={e => setDayOfWeek(Number(e.target.value))}
                      className="w-full rounded-2xl bg-slate-50/70 border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
                    >
                      <option value={-1}>Any Day (Applies to all)</option>
                      {DAY_NAMES.map((d, idx) => (
                        <option key={d} value={idx}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-caption font-bold text-sekkha-ink">Associated Event Category</label>
                  <p className="text-micro text-sekkha-slate">This preset will be highlighted when the selected category is active.</p>
                  <MultiSelectDropdown
                    options={allCategories.map(c => ({ value: c.tag, label: c.name }))}
                    value={targetCategoryTags}
                    onChange={v => setTargetCategoryTags(v)}
                    placeholder="All Categories (default)..."
                  />
                </div>

                <Input
                  label="Additional Description"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. Weekly youth schedule"
                />

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-sekkha-hairline-soft">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={resetForm}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                  >
                    {editing ? "Save Changes" : "Create Preset"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  )
}
