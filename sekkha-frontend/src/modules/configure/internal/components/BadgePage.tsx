// feature/configure/components/BadgePage
// Master Data: Badge management — CRUD badge (nama, icon, kondisi).
// Connected to backend: GET/POST/PUT/DELETE /api/configure/badges

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, AwardIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import {
  Button,
  Input,
  Select,
  Card,
  TableContainer,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge as BaseBadge,
} from "@/components/base"
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
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const { items: badges, create: apiCreate, update: apiUpdate, remove: apiRemove } = useConfigureCrud<BadgeDto>(badgesApi, INITIAL_BADGES)
  const [editing, setEditing] = useState<Badge | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [iconUrl, setIconUrl] = useState("")
  const [conditionType, setConditionType] = useState<Badge["condition_type"]>("attendance")
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
    if (!name.trim()) return

    const payload = {
      name,
      description,
      icon_url: iconUrl || "🏅",
      condition_type: conditionType as any,
      condition_value: Number(conditionValue) || 0,
      is_active: true,
    }

    if (editing) {
      void apiUpdate(editing.id, payload).catch(() => { })
    } else {
      void apiCreate(payload).catch(() => { })
    }
    resetForm()
  }

  function handleDelete(id: string) {
    void apiRemove(id).catch(() => { })
  }

  const conditionLabel: Record<Badge["condition_type"], string> = {
    attendance: "Total Attendance",
    streak: "Streak (weeks)",
    points: "Total Points",
    event_count: "Event Count",
    manual: "Manual",
  }

  return (
    <main className="min-h-screen bg-sekkha-surface pb-32 md:pb-12 font-sans">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Gamification" }, { label: "Achievement Badges" }]} />
      <div className="px-4 py-6 sm:px-6 md:px-8 max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sekkha-hairline-soft pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-sekkha-brand-blue border border-blue-200/60">
              <AwardIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-body-base sm:text-heading-5 font-black text-sekkha-ink">Member Achievement Badges</h1>
              <p className="text-micro text-sekkha-slate">Manage master badges and member gamification trigger conditions.</p>
            </div>
          </div>
          {isAdmin && (
            <Button
              type="button"
              onClick={openCreate}
              className="w-full sm:w-auto shrink-0"
            >
              <PlusIcon className="size-4 mr-1.5" />
              <span>Add Badge</span>
            </Button>
          )}
        </div>

        {/* Form Card */}
        {showForm && isAdmin && (
          <Card className="p-5 sm:p-6 space-y-4">
            <h2 className="text-body-sm font-bold text-sekkha-ink">
              {editing ? "Edit Badge" : "New Badge"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  id="badge-name"
                  label="Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Streak 5"
                />
                <Input
                  id="badge-icon"
                  label="Icon (emoji/URL)"
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  placeholder="🔥"
                />
              </div>
              <Input
                id="badge-desc"
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Attend 5 consecutive weeks"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Select
                  id="badge-cond-type"
                  label="Trigger Condition"
                  value={conditionType}
                  options={CONDITION_OPTIONS}
                  onChange={(val) => setConditionType(val as Badge["condition_type"])}
                />
                <Input
                  id="badge-cond-val"
                  label="Target Value"
                  type="number"
                  value={conditionValue}
                  onChange={(e) => setConditionValue(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div className="flex gap-2 pt-2 justify-end border-t border-sekkha-hairline-soft">
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editing ? "Save" : "Create Badge"}
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Table */}
        <TableContainer>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Icon</TableHead>
                <TableHead>Name & Description</TableHead>
                <TableHead className="hidden sm:table-cell">Condition</TableHead>
                <TableHead className="hidden sm:table-cell">Value</TableHead>
                {isAdmin && <TableHead className="w-24 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {badges.map((badge) => (
                <TableRow key={badge.id}>
                  <TableCell className="text-2xl">{badge.icon_url}</TableCell>
                  <TableCell>
                    <p className="font-bold text-sekkha-ink">{badge.name}</p>
                    <p className="text-caption text-sekkha-slate">{badge.description}</p>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <BaseBadge variant="slate">{conditionLabel[badge.condition_type]}</BaseBadge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-mono font-bold text-sekkha-ink">
                    {badge.condition_value}
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(badge)}
                          className="rounded-lg p-1.5 text-sekkha-slate hover:bg-slate-100 hover:text-sekkha-ink transition-colors"
                          aria-label="Edit"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(badge.id)}
                          className="rounded-lg p-1.5 text-sekkha-slate hover:bg-red-50 hover:text-red-500 transition-colors"
                          aria-label="Delete"
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
          {badges.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-body-sm text-sekkha-muted">No badges saved yet.</p>
            </div>
          )}
        </TableContainer>
      </div>
    </main>
  )
}
