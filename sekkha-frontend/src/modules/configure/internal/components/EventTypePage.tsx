// feature/configure/components/EventTypePage
// Master Data: Event Category & Type management — with Clay components, Color Wheel Picker, Role Access Permissions, & Custom Autofill Templates.

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, TagIcon, CheckIcon, Wand2Icon, ShieldCheckIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import { getMasterCategories, ALL_USER_ROLES } from "@/modules/events/internal/masterdata"
import type { EventCategoryItem, UserRoleName } from "@/modules/events/internal/masterdata"
import { ColorWheelPicker } from "@/components/ui/ColorWheelPicker"
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown"

export function EventTypePage() {
  const { authState } = useAuth()
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const [categories, setCategories] = useState<EventCategoryItem[]>(() => getMasterCategories())
  const [editing, setEditing] = useState<EventCategoryItem | null>(null)
  const [showModal, setShowModal] = useState(false)

  const [name, setName] = useState("")
  const [colorHex, setColorHex] = useState("#0284c7")
  const [autofillTitle, setAutofillTitle] = useState("")
  const [autofillLocation, setAutofillLocation] = useState("")
  const [autofillDesc, setAutofillDesc] = useState("")
  const [targetRoles, setTargetRoles] = useState<string[]>(["admin", "pengurus", "aktivis", "umat"])

  function saveToStorage(updated: EventCategoryItem[]) {
    setCategories(updated)
    try {
      localStorage.setItem("sekkha_master_categories", JSON.stringify(updated))
    } catch { }
  }

  function resetForm() {
    setName("")
    setColorHex("#0284c7")
    setAutofillTitle("")
    setAutofillLocation("")
    setAutofillDesc("")
    setTargetRoles(["admin", "pengurus", "aktivis", "umat"])
    setEditing(null)
    setShowModal(false)
  }

  function openCreate() {
    resetForm()
    setShowModal(true)
  }

  function openEdit(item: EventCategoryItem) {
    setName(item.name)
    setColorHex(item.colorHex || "#0284c7")
    setAutofillTitle(item.autofillTitle ?? `Vihara ${item.name} Activity`)
    setAutofillLocation(item.autofillLocation ?? "Vihara Sekkha")
    setAutofillDesc(item.autofillDesc ?? `${item.name} activity session with Vihara Sekkha community.`)
    setTargetRoles(item.target_roles && item.target_roles.length > 0 ? item.target_roles : ["admin", "pengurus", "aktivis", "umat"])
    setEditing(item)
    setShowModal(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !isAdmin) return

    const tagKey = editing ? editing.tag : name.toLowerCase().trim().replace(/\s+/g, "_")
    const newCat: EventCategoryItem = {
      id: editing ? editing.id : `cat-${Date.now()}`,
      tag: tagKey,
      name: name.trim(),
      colorHex: colorHex,
      bg: editing?.bg ?? "bg-sky-100/90",
      text: editing?.text ?? "text-sky-800",
      dot: editing?.dot ?? "bg-sky-500",
      points: editing?.points ?? 50,
      is_active: editing?.is_active ?? true,
      autofillTitle: autofillTitle.trim(),
      autofillLocation: autofillLocation.trim(),
      autofillDesc: autofillDesc.trim(),
      target_roles: targetRoles,
    }

    if (editing) {
      const updated = categories.map(c => (c.id === editing.id ? newCat : c))
      saveToStorage(updated)
    } else {
      saveToStorage([...categories, newCat])
    }
    resetForm()
  }

  function handleToggleActive(id: string) {
    if (!isAdmin) return
    const updated = categories.map(c =>
      c.id === id ? { ...c, is_active: !c.is_active } : c
    )
    saveToStorage(updated)
  }

  function handleDelete(id: string) {
    if (!isAdmin) return
    const updated = categories.filter(c => c.id !== id)
    saveToStorage(updated)
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 md:pb-12 font-sans text-left">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Master Data" }, { label: "Event Categories" }]} />
      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e5e5e5] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shrink-0 shadow-xs">
              <TagIcon className="size-5 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-[#0a0a0a]">Event Categories Master Data</h1>
              <p className="text-xs text-[#6a6a6a]">Manage event categories, color palettes, role access permissions, and form autofill presets</p>
            </div>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={openCreate}
              className="h-10 w-full sm:w-auto flex items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-white px-4 text-xs font-bold hover:bg-[#1f1f1f] transition-all cursor-pointer shadow-xs shrink-0"
            >
              <PlusIcon className="size-4" />
              <span>Add Event Category</span>
            </button>
          )}
        </div>

        {/* Table Container */}
        <div className="overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs">
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full text-left text-xs font-sans min-w-[700px]">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#faf5e8] text-[#6a6a6a] font-bold">
                  <th className="px-4 py-3">Category Name & Color Badge</th>
                  <th className="px-4 py-3">Allowed Roles Access</th>
                  <th className="px-4 py-3">Autofill Title Preset</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f0f0]">
                {categories.map(c => {
                  const activeHex = c.colorHex || "#0284c7"
                  const roles = c.target_roles && c.target_roles.length > 0 ? c.target_roles : ["admin", "pengurus", "aktivis", "umat"]
                  return (
                    <tr key={c.id} className="hover:bg-[#faf5e8]/70 transition-colors">
                      <td className="px-4 py-3 font-bold text-[#0a0a0a]">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize border shadow-2xs"
                          style={{
                            backgroundColor: `${activeHex}1a`,
                            color: activeHex,
                            borderColor: `${activeHex}40`,
                          }}
                        >
                          <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: activeHex }} />
                          {c.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          {ALL_USER_ROLES.map(role => {
                            const hasRole = roles.includes(role.id)
                            if (!hasRole) return null
                            return (
                              <span key={role.id} className="inline-flex items-center px-2 py-0.5 rounded-[6px] text-[10px] font-semibold bg-[#faf5e8] text-[#0a0a0a] border border-[#e5e5e5]">
                                {role.label}
                              </span>
                            )
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[#0a0a0a]">
                        <span className="flex items-center gap-1.5">
                          <Wand2Icon className="size-3.5 text-[#e8b94a] shrink-0" />
                          <span className="truncate max-w-xs">{c.autofillTitle || `Vihara ${c.name} Activity`}</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.is_active !== false ? (
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
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleToggleActive(c.id)}
                              className={`h-8 px-2.5 rounded-[8px] border text-xs font-bold transition-all cursor-pointer ${
                                c.is_active !== false
                                  ? "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                              }`}
                              title={c.is_active !== false ? "Deactivate" : "Activate"}
                            >
                              {c.is_active !== false ? "Deactivate" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(c)}
                              className="h-8 px-2.5 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-xs font-bold text-[#0a0a0a] transition-colors cursor-pointer flex items-center gap-1"
                              title="Edit Category, Color, & Permissions"
                            >
                              <PencilIcon className="size-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(c.id)}
                              className="size-8 flex items-center justify-center rounded-[8px] border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                              title="Delete Category"
                            >
                              <TrashIcon className="size-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {categories.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-xs text-[#6a6a6a]">No event categories saved yet.</p>
            </div>
          )}
        </div>

        {/* Responsive Form Modal */}
        <ResponsiveFormModal
          isOpen={showModal && isAdmin}
          onClose={resetForm}
          title={editing ? "Edit Category & Permissions" : "Add New Event Category"}
          description="Configure category badge color, allowed attendee roles, and event creation autofill presets."
        >
          <form onSubmit={handleSubmit} className="space-y-4 text-left font-sans">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">Category Name *</label>
              <input
                required
                value={name}
                onChange={e => {
                  const val = e.target.value
                  setName(val)
                  if (!editing) {
                    setAutofillTitle(`Vihara ${val} Activity`)
                    setAutofillDesc(`${val} activity session with Vihara Sekkha community.`)
                  }
                }}
                placeholder="e.g. Youth / Sunday School / Organizer Session"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
              />
            </div>

            {/* Color Wheel Picker Component */}
            <ColorWheelPicker
              color={colorHex}
              onChange={setColorHex}
              label="Category Badge Color"
            />

            {/* Many-to-Many Target Roles Access Permissions */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a] flex items-center gap-1.5">
                <ShieldCheckIcon className="size-4 text-[#b8a4ed]" />
                <span>Role Access Permissions</span>
              </label>
              <p className="text-xs text-[#6a6a6a]">Only selected roles can see and access this category in the event calendar.</p>
              <MultiSelectDropdown
                options={ALL_USER_ROLES.map(r => ({ value: r.id, label: r.label }))}
                value={targetRoles}
                onChange={v => setTargetRoles(v as UserRoleName[])}
                placeholder="Select allowed roles..."
                defaultValue={["admin", "pengurus", "aktivis", "umat"]}
                allowEmpty={false}
              />
            </div>

            {/* Autofill Template Configuration */}
            <div className="p-3.5 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] space-y-3">
              <p className="text-[11px] font-bold text-[#0a0a0a] uppercase tracking-wider flex items-center gap-1.5">
                <Wand2Icon className="size-3.5 text-[#e8b94a]" />
                <span>Create Event Form Autofill Template Settings:</span>
              </p>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">Event Title Preset:</label>
                <input
                  value={autofillTitle}
                  onChange={e => setAutofillTitle(e.target.value)}
                  placeholder="e.g. Vihara Sekkha Youth Service"
                  className="h-10 w-full rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 text-xs text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">Location Preset:</label>
                <input
                  value={autofillLocation}
                  onChange={e => setAutofillLocation(e.target.value)}
                  placeholder="e.g. Main Dhammasala Vihara Sekkha"
                  className="h-10 w-full rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 text-xs text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-[#0a0a0a]">Description Preset:</label>
                <input
                  value={autofillDesc}
                  onChange={e => setAutofillDesc(e.target.value)}
                  placeholder="e.g. Youth service session, chanting, and Dhamma talk."
                  className="h-10 w-full rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 text-xs text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
                />
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
                {editing ? "Save Changes" : "Create Category"}
              </button>
            </div>
          </form>
        </ResponsiveFormModal>

      </div>
    </main>
  )
}
