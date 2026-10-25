import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  AwardIcon,
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
import { badgeActivitiesApi } from "../api/configureApi"
import type { BadgeActivityDto } from "../api/configureApi"
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

export function BadgeActivityListPage() {
  const navigate = useNavigate()
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

  const [badgeActivities, setBadgeActivities] = useState<BadgeActivityDto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all")
  const [actionError, setActionError] = useState<string | null>(null)

  // Dialog states
  const [itemToDelete, setItemToDelete] = useState<BadgeActivityDto | null>(
    null
  )
  const [deleting, setDeleting] = useState(false)
  const [conflictItem, setConflictItem] = useState<{
    item: BadgeActivityDto
    message: string
  } | null>(null)

  const fetchBadgeActivities = async () => {
    try {
      setLoading(true)
      const data = await badgeActivitiesApi.list()
      setBadgeActivities(data)
    } catch (err: any) {
      setActionError(err?.message || "Failed to load badge activities")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchBadgeActivities()
  }, [])

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim()
    return badgeActivities.filter((b) => {
      const matchQuery =
        !q ||
        b.label.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q))

      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && b.is_active) ||
        (statusFilter === "inactive" && !b.is_active)

      return matchQuery && matchStatus
    })
  }, [badgeActivities, search, statusFilter])

  const stats = useMemo(() => {
    const total = badgeActivities.length
    const active = badgeActivities.filter((b) => b.is_active).length
    const inactive = total - active
    const avgPoints =
      total > 0
        ? Math.round(
            badgeActivities.reduce((acc, b) => acc + (b.bonus_points || 0), 0) /
              total
          )
        : 30
    return { total, active, inactive, avgPoints }
  }, [badgeActivities])

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return
    setDeleting(true)
    try {
      await badgeActivitiesApi.remove(itemToDelete.id)
      setItemToDelete(null)
      await fetchBadgeActivities()
    } catch (err: any) {
      setItemToDelete(null)
      if (err?.status === 409 || err?.code === "BADGE_ACTIVITY_IN_USE") {
        setConflictItem({
          item: itemToDelete,
          message:
            err?.message ||
            "Badge activity cannot be deleted because it is already linked to attendance records. Deactivate it instead.",
        })
      } else {
        setActionError(err?.message || "Failed to delete badge activity.")
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleDeactivateFromConflict = async () => {
    if (!conflictItem) return
    try {
      await badgeActivitiesApi.update(conflictItem.item.id, {
        is_active: false,
      })
      setConflictItem(null)
      await fetchBadgeActivities()
    } catch (err: any) {
      setActionError(err?.message || "Failed to deactivate badge activity.")
    }
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] p-4 font-sans text-[#0a0a0a] sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Breadcrumb Navigation */}
        <PageBreadcrumb
          items={[
            { label: "Configure", href: "/configure/master/badge-activity" },
            { label: "Master Data", href: "/configure/master/badge-activity" },
            { label: "Badge Activity" },
          ]}
        />

        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-[#fbbf24]/20 text-[#d97706]">
                <AwardIcon className="size-5" />
              </span>
              <h1 className="text-xl font-black tracking-tight text-[#0a0a0a] sm:text-2xl">
                Badge Activity
              </h1>
            </div>
            <p className="mt-1 text-xs text-[#6a6a6a] sm:text-sm">
              Standardize youth service roles (MC, Puja Leader, Musician) and
              duty point rewards (+30 Pts).
            </p>
          </div>

          {isAdmin && (
            <Button
              onClick={() =>
                void navigate({ to: "/configure/master/badge-activity/new" })
              }
              className="inline-flex items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#262626]"
            >
              <PlusIcon className="size-4" />
              <span>New Badge Activity</span>
            </Button>
          )}
        </div>

        {/* Global Action Error Banner */}
        {actionError && (
          <div className="flex items-center justify-between rounded-[12px] border border-[#ef4444]/30 bg-[#fef2f2] p-3 text-xs text-[#b91c1c]">
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="size-4 text-[#ef4444]" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="font-bold underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Metric Cards Banner */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Card className="rounded-[16px] border border-[#e5e5e5] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold tracking-wider text-[#6a6a6a] uppercase">
              Total Roles
            </p>
            <p className="mt-1 text-2xl font-black text-[#0a0a0a] sm:text-3xl">
              {stats.total}
            </p>
          </Card>
          <Card className="rounded-[16px] border border-[#e5e5e5] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold tracking-wider text-[#16a34a] uppercase">
              Active
            </p>
            <p className="mt-1 text-2xl font-black text-[#16a34a] sm:text-3xl">
              {stats.active}
            </p>
          </Card>
          <Card className="rounded-[16px] border border-[#e5e5e5] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold tracking-wider text-[#6a6a6a] uppercase">
              Inactive
            </p>
            <p className="mt-1 text-2xl font-black text-[#6a6a6a] sm:text-3xl">
              {stats.inactive}
            </p>
          </Card>
          <Card className="rounded-[16px] border border-[#e5e5e5] bg-white p-4 shadow-sm">
            <p className="text-[11px] font-bold tracking-wider text-[#d97706] uppercase">
              Avg Reward
            </p>
            <p className="mt-1 flex items-baseline gap-1 text-2xl font-black text-[#d97706] sm:text-3xl">
              +{stats.avgPoints}
              <span className="text-xs font-bold text-[#6a6a6a]">Pts</span>
            </p>
          </Card>
        </div>

        {/* Filters and Search Bar */}
        <div className="flex flex-col gap-3 rounded-[16px] border border-[#e5e5e5] bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
          <div className="relative flex-1">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[#6a6a6a]" />
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by role name, code, or description..."
              className="h-10 w-full rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0]/60 pr-3 pl-9 text-xs font-medium text-[#0a0a0a] placeholder:text-[#999999] focus:border-[#0a0a0a] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto">
            <button
              onClick={() => setStatusFilter("all")}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === "all"
                  ? "bg-[#0a0a0a] text-white"
                  : "bg-transparent text-[#6a6a6a] hover:bg-[#f5f5f5]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === "active"
                  ? "bg-[#16a34a] text-white"
                  : "bg-transparent text-[#6a6a6a] hover:bg-[#f5f5f5]"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("inactive")}
              className={`rounded-[8px] px-3 py-1.5 text-xs font-bold transition ${
                statusFilter === "inactive"
                  ? "bg-[#6a6a6a] text-white"
                  : "bg-transparent text-[#6a6a6a] hover:bg-[#f5f5f5]"
              }`}
            >
              Inactive
            </button>
          </div>
        </div>

        {/* Clay Card Grid View */}
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-44 animate-pulse rounded-[16px] border border-[#e5e5e5] bg-white p-5"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-[16px] border border-dashed border-[#e5e5e5] bg-white p-12 text-center">
            <AwardIcon className="mx-auto size-12 text-[#d4d4d4]" />
            <h3 className="mt-3 text-sm font-bold text-[#0a0a0a]">
              No Badge Activities Found
            </h3>
            <p className="mt-1 text-xs text-[#6a6a6a]">
              {search || statusFilter !== "all"
                ? "Try adjusting your search criteria or status filter."
                : "No service duty roles configured yet."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="flex size-7 items-center justify-center rounded-[8px] bg-[#fbbf24]/20 text-[#d97706]">
                          <AwardIcon className="size-4" />
                        </span>
                        <h3 className="text-sm font-black text-[#0a0a0a] transition group-hover:text-[#d97706]">
                          {item.label}
                        </h3>
                      </div>
                      <p className="font-mono text-[11px] text-[#8c8c8c]">
                        {item.code}
                      </p>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        item.is_active
                          ? "bg-[#dcfce7] text-[#16a34a]"
                          : "bg-[#f5f5f5] text-[#8c8c8c]"
                      }`}
                    >
                      {item.is_active ? (
                        <>
                          <CheckCircle2Icon className="size-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircleIcon className="size-3" />
                          <span>Inactive</span>
                        </>
                      )}
                    </span>
                  </div>

                  <p className="mt-3 line-clamp-2 text-xs text-[#525252]">
                    {item.description || "No operational description provided."}
                  </p>
                </div>

                <div className="mt-5 border-t border-[#f5f5f5] pt-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 rounded-[8px] bg-[#fffaf0] px-2.5 py-1 text-xs font-bold text-[#b45309]">
                      <CoinsIcon className="size-3.5 text-[#d97706]" />
                      <span>+{item.bonus_points} Pts</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void navigate({
                            to: "/configure/master/badge-activity/$badgeActivityId",
                            params: { badgeActivityId: item.id },
                          })
                        }
                        className="h-8 gap-1 rounded-[8px] border-[#e5e5e5] px-2.5 text-xs font-bold text-[#0a0a0a] hover:bg-[#fafafa]"
                      >
                        <PencilIcon className="size-3" />
                        <span>{isAdmin ? "Edit" : "Details"}</span>
                      </Button>

                      {isAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setItemToDelete(item)}
                          className="h-8 rounded-[8px] px-2 text-[#ef4444] hover:bg-[#fef2f2]"
                          aria-label="Delete badge activity"
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog
        open={Boolean(itemToDelete)}
        onOpenChange={(open) => !open && setItemToDelete(null)}
      >
        <DialogContent className="max-w-md rounded-[16px] bg-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-[#0a0a0a]">
              <AlertTriangleIcon className="size-5 text-[#ef4444]" />
              <span>Delete Badge Activity</span>
            </DialogTitle>
            <DialogDescription className="mt-2 text-xs text-[#6a6a6a]">
              Are you sure you want to permanently delete{" "}
              <strong className="text-[#0a0a0a]">{itemToDelete?.label}</strong>{" "}
              (<code>{itemToDelete?.code}</code>)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => setItemToDelete(null)}
              className="rounded-[10px] border-[#e5e5e5] text-xs font-bold text-[#0a0a0a]"
            >
              Cancel
            </Button>
            <Button
              disabled={deleting}
              onClick={() => void handleDeleteConfirm()}
              className="rounded-[10px] bg-[#ef4444] text-xs font-bold text-white hover:bg-[#dc2626]"
            >
              {deleting ? "Deleting..." : "Delete Permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 409 In-Use Conflict Mitigation Modal */}
      <Dialog
        open={Boolean(conflictItem)}
        onOpenChange={(open) => !open && setConflictItem(null)}
      >
        <DialogContent className="max-w-md rounded-[16px] bg-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black text-[#d97706]">
              <AlertTriangleIcon className="size-5 text-[#d97706]" />
              <span>Cannot Delete In-Use Badge Activity</span>
            </DialogTitle>
            <DialogDescription className="mt-2 text-xs leading-relaxed text-[#6a6a6a]">
              {conflictItem?.message}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-[12px] bg-[#fffaf0] p-3.5 text-xs text-[#92400e]">
            <p className="font-bold">Recommended Pastoral Care Action:</p>
            <p className="mt-0.5">
              Instead of deleting, deactivate this role so it will no longer
              appear in future event attendance dropdowns while keeping past
              audit records safe.
            </p>
          </div>

          <DialogFooter className="mt-6 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setConflictItem(null)}
              className="rounded-[10px] border-[#e5e5e5] text-xs font-bold text-[#0a0a0a]"
            >
              Close
            </Button>
            <Button
              onClick={() => void handleDeactivateFromConflict()}
              className="rounded-[10px] bg-[#0a0a0a] text-xs font-bold text-white hover:bg-[#262626]"
            >
              Deactivate Instead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
