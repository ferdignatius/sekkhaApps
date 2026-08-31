// feature/configure/components/LevelPage
// Master Data: Level management — threshold tiap level & label.
// Connected to backend: GET/POST/PUT/DELETE /api/configure/levels

import { useState } from "react"
import { PlusIcon, PencilIcon, TrashIcon, ZapIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import {
  Button,
  Input,
  Card,
  TableContainer,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  Badge,
} from "@/components/base"
import { levelsApi } from "../api/configureApi"
import { useConfigureCrud } from "../hooks/useConfigureCrud"
import type { LevelDto } from "../api/configureApi"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Level {
  id: string
  level: number
  label: string
  min_points: number
}

// ─── Dummy data ──────────────────────────────────────────────────────────────

const INITIAL_LEVELS: Level[] = [
  { id: "lvl-1", level: 1, label: "New Member", min_points: 0 },
  { id: "lvl-2", level: 2, label: "Active Member", min_points: 50 },
  { id: "lvl-3", level: 3, label: "Devoted Member", min_points: 200 },
  { id: "lvl-4", level: 4, label: "Exemplary Member", min_points: 500 },
  { id: "lvl-5", level: 5, label: "Inspiring Member", min_points: 1000 },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function LevelPage() {
  const { authState } = useAuth()
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const { items: levels, create: apiCreate, update: apiUpdate, remove: apiRemove } = useConfigureCrud<LevelDto>(levelsApi, INITIAL_LEVELS as any)
  const [editing, setEditing] = useState<Level | null>(null)
  const [showForm, setShowForm] = useState(false)

  const [levelNum, setLevelNum] = useState("")
  const [label, setLabel] = useState("")
  const [minPoints, setMinPoints] = useState("")

  function resetForm() {
    setLevelNum("")
    setLabel("")
    setMinPoints("")
    setEditing(null)
    setShowForm(false)
  }

  function openCreate() {
    resetForm()
    setLevelNum(String(levels.length + 1))
    setShowForm(true)
  }

  function openEdit(lvl: Level) {
    setLevelNum(String(lvl.level))
    setLabel(lvl.label)
    setMinPoints(String(lvl.min_points))
    setEditing(lvl)
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim()) return

    const payload = { level: Number(levelNum), label, min_points: Number(minPoints) || 0 }

    if (editing) {
      void apiUpdate(editing.id, payload).catch(() => { })
    } else {
      void apiCreate(payload as any).catch(() => { })
    }
    resetForm()
  }

  function handleDelete(id: string) {
    void apiRemove(id).catch(() => { })
  }

  return (
    <main className="min-h-screen bg-sekkha-surface pb-32 md:pb-12 font-sans">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Gamification" }, { label: "Member Levels" }]} />
      <div className="px-4 py-6 sm:px-6 md:px-8 max-w-6xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sekkha-hairline-soft pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
              <ZapIcon className="size-5" />
            </div>
            <div>
              <h1 className="text-body-base sm:text-heading-5 font-black text-sekkha-ink">Member Levels</h1>
              <p className="text-micro text-sekkha-slate">Manage progression tiers and minimum required points per level.</p>
            </div>
          </div>
          {isAdmin && (
            <Button
              type="button"
              onClick={openCreate}
              className="w-full sm:w-auto shrink-0"
            >
              <PlusIcon className="size-4 mr-1.5" />
              <span>Add Level</span>
            </Button>
          )}
        </div>

        {/* Form Card */}
        {showForm && isAdmin && (
          <Card className="p-5 sm:p-6 space-y-4">
            <h2 className="text-body-sm font-bold text-sekkha-ink">
              {editing ? "Edit Level" : "New Level"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  id="level-num"
                  label="Level (Number)"
                  type="number"
                  required
                  value={levelNum}
                  onChange={(e) => setLevelNum(e.target.value)}
                  placeholder="1"
                />
                <Input
                  id="level-label"
                  label="Level Label"
                  required
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Active Member"
                />
                <Input
                  id="level-min-pts"
                  label="Min. Points"
                  type="number"
                  required
                  value={minPoints}
                  onChange={(e) => setMinPoints(e.target.value)}
                  placeholder="50"
                />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t border-sekkha-hairline-soft">
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editing ? "Save" : "Create Level"}
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
                <TableHead className="w-24">Level</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Min. Points</TableHead>
                {isAdmin && <TableHead className="w-24 text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {levels.map((lvl) => (
                <TableRow key={lvl.id}>
                  <TableCell>
                    <Badge variant="blue">Level {lvl.level}</Badge>
                  </TableCell>
                  <TableCell className="font-bold text-sekkha-ink">{lvl.label}</TableCell>
                  <TableCell className="font-mono text-sekkha-slate">{lvl.min_points} Pts</TableCell>
                  {isAdmin && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(lvl)}
                          className="rounded-lg p-1.5 text-sekkha-slate hover:bg-slate-100 hover:text-sekkha-ink transition-colors"
                          aria-label="Edit"
                        >
                          <PencilIcon className="size-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(lvl.id)}
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
          {levels.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-body-sm text-sekkha-muted">No levels defined yet.</p>
            </div>
          )}
        </TableContainer>
      </div>
    </main>
  )
}
