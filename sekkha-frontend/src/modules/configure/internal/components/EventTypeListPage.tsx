import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  TagIcon,
  PlusIcon,
  SearchIcon,
  PencilIcon,
  Trash2Icon,
  CheckCircle2Icon,
  XCircleIcon,
  AlertTriangleIcon,
  CoinsIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { eventTypesApi } from "../api/configureApi"
import type { EventTypeDto } from "../api/configureApi"
import { Button } from "@/components/base/Button"
import { Card } from "@/components/base/Card"
import { Input } from "@/components/base/Input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/base/Dialog"

export function EventTypePage() {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const [eventTypes, setEventTypes] = useState<EventTypeDto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all")
  const [actionError, setActionError] = useState<string | null>(null)

  // Dialog states
  const [itemToDelete, setItemToDelete] = useState<EventTypeDto | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [conflictItem, setConflictItem] = useState<{ item: EventTypeDto; message: string } | null>(null)

  const fetchEventTypes = async () => {
    try {
      setLoading(true)
      const data = await eventTypesApi.list()
      setEventTypes(data)
    } catch (err: any) {
      setActionError(err?.message || "Failed to load event types")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchEventTypes()
  }, [])

  const filteredTypes = useMemo(() => {
    const q = search.toLowerCase().trim()
    return eventTypes.filter((t) => {
      const matchQuery =
        !q ||
        t.label.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && t.is_active) ||
        (statusFilter === "inactive" && !t.is_active)

      return matchQuery && matchStatus
    })
  }, [eventTypes, search, statusFilter])

  const stats = useMemo(() => {
    const total = eventTypes.length
    const active = eventTypes.filter((t) => t.is_active).length
    const inactive = total - active
    const avgPoints =
      total > 0
        ? Math.round(eventTypes.reduce((acc, t) => acc + (t.default_point_reward || 0), 0) / total)
        : 0
    return { total, active, inactive, avgPoints }
  }, [eventTypes])

  const handleToggleStatus = async (item: EventTypeDto) => {
    if (!isAdmin) return
    try {
      await eventTypesApi.update(item.id, { is_active: !item.is_active })
      setEventTypes((prev) =>
        prev.map((t) => (t.id === item.id ? { ...t, is_active: !t.is_active } : t))
      )
    } catch (err: any) {
      setActionError(err?.message || "Failed to update event type status")
    }
  }

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    try {
      await eventTypesApi.remove(itemToDelete.id)
      setEventTypes((prev) => prev.filter((t) => t.id !== itemToDelete.id))
      setItemToDelete(null)
    } catch (err: any) {
      const msg = err?.message || ""
      if (err?.status === 409 || msg.includes("currently in use") || msg.includes("relasi")) {
        setConflictItem({
          item: itemToDelete,
          message:
            msg ||
            "This event type is already associated with existing events in the system and cannot be permanently deleted. You can deactivate it instead so it no longer appears when creating new events.",
        })
        setItemToDelete(null)
      } else {
        setActionError(msg || "Failed to delete event type")
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleDeactivateInstead = async () => {
    if (!conflictItem) return
    try {
      await eventTypesApi.update(conflictItem.item.id, { is_active: false })
      setEventTypes((prev) =>
        prev.map((t) => (t.id === conflictItem.item.id ? { ...t, is_active: false } : t))
      )
      setConflictItem(null)
    } catch (err: any) {
      setActionError(err?.message || "Failed to deactivate event type")
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-24 text-left font-sans">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          { label: "Event Types" },
        ]}
      />

      <div className="mx-auto max-w-7xl space-y-6 px-3.5 py-4 sm:px-6 md:px-8">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 border-b border-[#e5e5e5] pb-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-[14px] bg-[#0a0a0a] text-white shadow-2xs">
              <TagIcon className="size-6 text-[#e8b94a]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#0a0a0a]">
                Event Types Master Data
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Classify event categories, visual theme colors, and default point rewards.
              </p>
            </div>
          </div>
          {isAdmin && (
            <Button
              onClick={() => void navigate({ to: "/configure/master/event-type/new" })}
              className="h-10 gap-2 rounded-[12px] bg-[#0a0a0a] px-4 text-xs font-bold text-white shadow-xs hover:bg-[#222]"
            >
              <PlusIcon className="size-4" />
              Add Event Type
            </Button>
          )}
        </div>

        {/* Global Error Banner */}
        {actionError && (
          <div className="flex items-center justify-between rounded-[12px] border border-[#ef4444]/20 bg-[#ef4444]/10 p-3 text-xs text-[#ef4444]">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="size-4 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="font-bold underline hover:no-underline"
            >
              Close
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="rounded-[16px] border border-[#e5e5e5] bg-white p-4 shadow-2xs">
            <p className="text-xs text-[#6a6a6a]">Total Event Types</p>
            <p className="mt-1 text-2xl font-black text-[#0a0a0a]">{stats.total}</p>
          </Card>
          <Card className="rounded-[16px] border border-[#e5e5e5] bg-white p-4 shadow-2xs">
            <p className="text-xs text-[#6a6a6a]">Active Types</p>
            <p className="mt-1 text-2xl font-black text-[#0d9488]">{stats.active}</p>
          </Card>
          <Card className="rounded-[16px] border border-[#e5e5e5] bg-white p-4 shadow-2xs">
            <p className="text-xs text-[#6a6a6a]">Inactive Types</p>
            <p className="mt-1 text-2xl font-black text-[#6a6a6a]">{stats.inactive}</p>
          </Card>
          <Card className="rounded-[16px] border border-[#e5e5e5] bg-white p-4 shadow-2xs">
            <p className="flex items-center gap-1 text-xs text-[#6a6a6a]">
              <CoinsIcon className="size-3 text-[#e8b94a]" /> Average Points
            </p>
            <p className="mt-1 text-2xl font-black text-[#0a0a0a]">
              {stats.avgPoints} <span className="text-xs font-normal text-[#6a6a6a]">pts</span>
            </p>
          </Card>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <Input
              className="bg-white"
              placeholder="Search by code, label, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              startIcon={<SearchIcon className="size-4" />}
            />
          </div>
          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            {(["all", "active", "inactive"] as const).map((key) => {
              const active = statusFilter === key
              const labels = { all: "All", active: "Active", inactive: "Inactive" }
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#0a0a0a] text-white shadow-2xs"
                      : "border border-[#e5e5e5] bg-white text-[#6a6a6a] hover:bg-[#faf5e8]"
                  }`}
                >
                  {labels[key]}
                </button>
              )
            })}
          </div>
        </div>

        {/* Responsive Card Grid View (Replaces rigid table) */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-[20px] border border-[#e5e5e5] bg-white p-5 shadow-2xs"
              />
            ))}
          </div>
        ) : filteredTypes.length === 0 ? (
          <div className="rounded-[20px] border border-[#e5e5e5] bg-white py-16 text-center shadow-2xs">
            <TagIcon className="mx-auto size-10 text-[#6a6a6a]/40" />
            <p className="mt-3 text-sm font-semibold text-[#0a0a0a]">No event types found</p>
            <p className="mt-1 text-xs text-[#6a6a6a]">Try adjusting your search keyword or status filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredTypes.map((type) => (
              <Card
                key={type.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-white p-5 shadow-2xs transition-all hover:border-[#0a0a0a]/30 hover:shadow-xs"
              >
                {/* Visual Top Accent Strip */}
                <div
                  className="absolute top-0 left-0 h-1.5 w-full"
                  style={{ backgroundColor: type.color }}
                />

                <div className="space-y-3">
                  {/* Card Title & Status Badge */}
                  <div className="flex items-start justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-3.5 shrink-0 rounded-full border border-black/10 shadow-2xs"
                        style={{ backgroundColor: type.color }}
                      />
                      <h3 className="text-base font-bold tracking-tight text-[#0a0a0a]">
                        {type.label}
                      </h3>
                    </div>
                    {type.is_active ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#0d9488]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#0d9488]">
                        <CheckCircle2Icon className="size-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#6a6a6a]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#6a6a6a]">
                        <XCircleIcon className="size-3" />
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Badges: Code & Point Reward */}
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="rounded-[6px] border border-[#e5e5e5] bg-[#faf5e8] px-2 py-0.5 font-mono text-[11px] font-bold text-[#0a0a0a]">
                      {type.code}
                    </code>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#faf5e8] px-2.5 py-0.5 text-[11px] font-bold text-[#8a7a5a]">
                      <CoinsIcon className="size-3 text-[#e8b94a]" />
                      {type.default_point_reward} Pts
                    </span>
                    <span className="font-mono text-[10px] uppercase text-[#8a8a8a]">
                      {type.color}
                    </span>
                  </div>

                  {/* Description */}
                  <p className="line-clamp-2 text-xs leading-relaxed text-[#6a6a6a]">
                    {type.description || "No additional description."}
                  </p>
                </div>

                {/* Footer Action Buttons */}
                <div className="mt-4 flex items-center justify-between border-t border-[#f0ece1] pt-3">
                  {isAdmin ? (
                    <button
                      type="button"
                      onClick={() => void handleToggleStatus(type)}
                      className="text-xs font-semibold text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
                    >
                      {type.is_active ? "Deactivate" : "Activate"}
                    </button>
                  ) : (
                    <div />
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        void navigate({
                          to: "/configure/master/event-type/$categoryId",
                          params: { categoryId: type.id },
                        })
                      }
                      className="flex items-center gap-1 rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 py-1.5 text-xs font-bold text-[#0a0a0a] transition-colors hover:border-[#0a0a0a] hover:bg-white"
                    >
                      <PencilIcon className="size-3.5" />
                      Edit
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setItemToDelete(type)}
                        className="rounded-[10px] border border-[#e5e5e5] bg-white p-1.5 text-[#ef4444] transition-colors hover:border-[#ef4444] hover:bg-[#ef4444]/10"
                        title="Delete"
                      >
                        <Trash2Icon className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={Boolean(itemToDelete)} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <DialogContent className="max-w-md rounded-[20px] bg-white p-6">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]">
              <AlertTriangleIcon className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold text-[#0a0a0a]">
              Delete Event Type "{itemToDelete?.label}"?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6a6a6a]">
              This operation will permanently delete <strong>{itemToDelete?.code}</strong>. If this
              event type is linked to existing events or activities, deletion will be blocked to
              maintain data integrity.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setItemToDelete(null)}
              className="rounded-[12px] text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={() => void handleDeleteConfirm()}
              className="rounded-[12px] bg-[#ef4444] text-xs font-bold text-white hover:bg-[#dc2626]"
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 409 Conflict In-Use Modal */}
      <Dialog open={Boolean(conflictItem)} onOpenChange={(open) => !open && setConflictItem(null)}>
        <DialogContent className="max-w-md rounded-[20px] bg-white p-6">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">
              <AlertTriangleIcon className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold text-[#0a0a0a]">
              Event Type Currently in Use
            </DialogTitle>
            <DialogDescription className="text-xs text-[#4a4a4a]">
              {conflictItem?.message}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 rounded-[12px] bg-[#faf5e8] p-3 text-xs text-[#8a7a5a]">
            💡 <strong>Recommendation:</strong> Deactivate this event type instead. Existing events will
            remain intact, and this type will no longer appear when creating new events.
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConflictItem(null)}
              className="rounded-[12px] text-xs font-bold"
            >
              Close
            </Button>
            <Button
              type="button"
              onClick={() => void handleDeactivateInstead()}
              className="rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white hover:bg-[#222]"
            >
              Deactivate Instead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
