// feature/configure/components/EventTypePage
// Master Data: Event Category & Type management — with Base components, Color Wheel Picker, Role Access Permissions, & Custom Autofill Templates.

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, TagIcon, SparklesIcon, CheckIcon, Wand2Icon, ShieldCheckIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { getMasterCategories, ALL_USER_ROLES } from "@/modules/events/internal/masterdata"
import type { EventCategoryItem, UserRoleName } from "@/modules/events/internal/masterdata"
import { ColorWheelPicker } from "@/components/ui/ColorWheelPicker"
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown"
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

export function EventTypePage() {
  const { authState } = useAuth()
  const isPengurusOrAdmin = authState.status === "authenticated" && (authState.role === "admin" || authState.role === "pengurus")

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
    if (!name.trim()) return

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
    const updated = categories.map(c =>
      c.id === id ? { ...c, is_active: !c.is_active } : c
    )
    saveToStorage(updated)
  }

  function handleDelete(id: string) {
    const updated = categories.filter(c => c.id !== id)
    saveToStorage(updated)
  }

  return (
    <main className="min-h-screen bg-sekkha-surface pb-32 md:pb-12 font-sans text-left">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Event Categories" }]} />
      <div className="px-4 py-6 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sekkha-hairline-soft pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-sekkha-brand-blue border border-blue-200/60 shrink-0">
              <TagIcon className="size-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-body-base sm:text-heading-5 font-black text-sekkha-ink">Event Categories Master Data</h1>
              <p className="text-micro text-sekkha-slate">Manage event categories, color palettes, role access permissions, and form autofill presets</p>
            </div>
          </div>

          {isPengurusOrAdmin && (
            <Button
              type="button"
              onClick={openCreate}
              className="w-full sm:w-auto shrink-0"
            >
              <PlusIcon className="size-4 mr-1.5" />
              <span>Add Event Category</span>
            </Button>
          )}
        </div>

        {/* Table Container */}
        <TableContainer>
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow>
                <TableHead>Category Name & Color Badge</TableHead>
                <TableHead>Allowed Roles Access</TableHead>
                <TableHead>Autofill Title Preset</TableHead>
                <TableHead className="text-center">Status</TableHead>
                {isPengurusOrAdmin && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.map(c => {
                const activeHex = c.colorHex || "#0284c7"
                const roles = c.target_roles && c.target_roles.length > 0 ? c.target_roles : ["admin", "pengurus", "aktivis", "umat"]
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-bold text-sekkha-ink">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-micro font-bold capitalize border shadow-2xs"
                        style={{
                          backgroundColor: `${activeHex}1a`,
                          color: activeHex,
                          borderColor: `${activeHex}40`,
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: activeHex }} />
                        {c.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-1">
                        {ALL_USER_ROLES.map(role => {
                          const hasRole = roles.includes(role.id)
                          if (!hasRole) return null
                          return (
                            <span key={role.id} className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${role.bg} ${role.text}`}>
                              {role.label}
                            </span>
                          )
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-sekkha-ink font-medium">
                      <span className="flex items-center gap-1">
                        <Wand2Icon className="size-3 text-sekkha-brand-blue shrink-0" />
                        <span className="truncate max-w-xs">{c.autofillTitle || `Vihara ${c.name} Activity`}</span>
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {c.is_active !== false ? (
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
                            onClick={() => handleToggleActive(c.id)}
                            className={`rounded-lg border px-2.5 py-1 text-micro font-bold transition-all ${c.is_active !== false
                                ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            title={c.is_active !== false ? "Deactivate" : "Activate"}
                          >
                            {c.is_active !== false ? "Deactivate" : "Activate"}
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            className="rounded-lg border border-sekkha-hairline bg-sekkha-canvas p-1.5 text-sekkha-ink hover:bg-blue-50 hover:text-sekkha-brand-blue transition-colors"
                            title="Edit Category, Color, & Permissions"
                          >
                            <PencilIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-600 hover:bg-rose-100 transition-colors"
                            title="Delete Category"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Form Pop-Up Modal Sub-Dialog */}
        {showModal && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-md p-0 sm:p-4 animate-in fade-in-0">
            <div className="w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] rounded-t-[28px] sm:rounded-3xl border border-sekkha-hairline bg-white p-5 sm:p-6 shadow-2xl space-y-4 text-left font-sans overflow-y-auto animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">

              {/* Mobile Drag Handle */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto -mt-2 mb-1 sm:hidden shrink-0" />

              <div className="flex items-center justify-between pb-3 border-b border-sekkha-hairline-soft">
                <div className="flex items-center gap-2">
                  <SparklesIcon className="size-5 text-sekkha-brand-blue" />
                  <h3 className="text-body-base font-extrabold text-sekkha-ink">
                    {editing ? "Edit Category & Permissions" : "Add New Event Category"}
                  </h3>
                </div>
                <button type="button" onClick={resetForm} className="text-sekkha-slate hover:text-sekkha-ink cursor-pointer p-1">✕</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3.5">
                <Input
                  label="Category Name *"
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
                />

                {/* Color Wheel Picker Component */}
                <ColorWheelPicker
                  color={colorHex}
                  onChange={setColorHex}
                  label="Category Badge Color"
                />

                {/* Many-to-Many Target Roles Access Permissions */}
                <div className="space-y-1.5">
                  <label className="text-caption font-bold text-sekkha-ink flex items-center gap-1.5">
                    <ShieldCheckIcon className="size-4 text-purple-600" />
                    <span>Role Access Permissions</span>
                  </label>
                  <p className="text-micro text-sekkha-slate">Only selected roles can see and access this category in the event calendar.</p>
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
                <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-2.5">
                  <p className="text-micro font-bold text-sekkha-brand-blue uppercase tracking-wider flex items-center gap-1.5">
                    <Wand2Icon className="size-3.5" />
                    <span>Create Event Form Autofill Template Settings:</span>
                  </p>

                  <Input
                    label="Event Title Preset:"
                    value={autofillTitle}
                    onChange={e => setAutofillTitle(e.target.value)}
                    placeholder="e.g. Vihara Sekkha Youth Service"
                  />

                  <Input
                    label="Location Preset:"
                    value={autofillLocation}
                    onChange={e => setAutofillLocation(e.target.value)}
                    placeholder="e.g. Main Dhammasala Vihara Sekkha"
                  />

                  <Input
                    label="Description Preset:"
                    value={autofillDesc}
                    onChange={e => setAutofillDesc(e.target.value)}
                    placeholder="e.g. Youth service session, chanting, and Dhamma talk."
                  />
                </div>

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
                    {editing ? "Save Changes" : "Create Category"}
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
