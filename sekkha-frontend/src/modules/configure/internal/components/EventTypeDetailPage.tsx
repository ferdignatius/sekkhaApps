import { useEffect, useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import {
  TagIcon,
  ArrowLeftIcon,
  CoinsIcon,
  LockIcon,
  AlertTriangleIcon,
  Trash2Icon,
  CheckCircle2Icon,
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

export function EventTypeDetailPage() {
  const { categoryId } = useParams({ strict: false }) as { categoryId?: string }
  const navigate = useNavigate()
  const { authState } = useAuth()
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const [item, setItem] = useState<EventTypeDto | null>(null)
  const [loading, setLoading] = useState(true)

  // Form states
  const [label, setLabel] = useState("")
  const [color, setColor] = useState("#4262FF")
  const [defaultPointReward, setDefaultPointReward] = useState(50)
  const [isActive, setIsActive] = useState(true)
  const [description, setDescription] = useState("")

  const [saving, setSaving] = useState(false)
  const [successNotice, setSuccessNotice] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Delete & Conflict states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadItem() {
      if (!categoryId) return
      try {
        setLoading(true)
        const allTypes = await eventTypesApi.list()
        const found = allTypes.find((t) => t.id === categoryId)
        if (cancelled) return
        if (found) {
          setItem(found)
          setLabel(found.label)
          setColor(found.color)
          setDefaultPointReward(found.default_point_reward)
          setIsActive(found.is_active)
          setDescription(found.description || "")
        } else {
          setErrorMessage("Event type not found.")
        }
      } catch (err: any) {
        if (!cancelled) setErrorMessage(err?.message || "Failed to load event type details.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void loadItem()
    return () => {
      cancelled = true
    }
  }, [categoryId])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item) return
    setErrorMessage(null)
    setSuccessNotice(false)

    if (!label.trim() || !color.trim()) {
      setErrorMessage("Label name and theme color are required.")
      return
    }

    const hexRegex = /^#[0-9A-Fa-f]{6}$/
    if (!hexRegex.test(color.trim())) {
      setErrorMessage("Color must be a valid 6-digit hex code (e.g. #4262FF).")
      return
    }

    setSaving(true)
    try {
      await eventTypesApi.update(item.id, {
        label: label.trim(),
        color: color.trim().toUpperCase(),
        description: description.trim() || null,
        default_point_reward: Number(defaultPointReward) || 0,
        is_active: isActive,
      })
      setSuccessNotice(true)
      setTimeout(() => setSuccessNotice(false), 3000)
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to update event type.")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!item) return
    setDeleting(true)
    try {
      await eventTypesApi.remove(item.id)
      setShowDeleteModal(false)
      await navigate({ to: "/configure/master/event-type" })
    } catch (err: any) {
      const msg = err?.message || ""
      if (err?.status === 409 || msg.includes("currently in use") || msg.includes("relasi")) {
        setConflictMessage(
          msg ||
            "This event type is already associated with existing events in the system and cannot be permanently deleted. You can deactivate it instead so it no longer appears when creating new events."
        )
        setShowDeleteModal(false)
      } else {
        setErrorMessage(msg || "Failed to delete event type.")
      }
    } finally {
      setDeleting(false)
    }
  }

  const handleDeactivateInstead = async () => {
    if (!item) return
    try {
      await eventTypesApi.update(item.id, { is_active: false })
      setIsActive(false)
      setConflictMessage(null)
      setSuccessNotice(true)
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to deactivate event type.")
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf0] p-6 text-left font-sans">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className="h-8 w-40 animate-pulse rounded bg-[#e5e5e5]" />
          <div className="h-64 animate-pulse rounded-[20px] bg-white border border-[#e5e5e5]" />
        </div>
      </main>
    )
  }

  if (!item) {
    return (
      <main className="min-h-screen bg-[#fffaf0] p-6 text-center font-sans">
        <div className="mx-auto max-w-md rounded-[16px] border border-[#e5e5e5] bg-white p-8">
          <AlertTriangleIcon className="mx-auto size-12 text-[#ef4444]" />
          <h2 className="mt-4 text-base font-bold text-[#0a0a0a]">Data Not Found</h2>
          <p className="mt-1 text-xs text-[#6a6a6a]">Event type with this ID is not available in the system.</p>
          <Button
            onClick={() => void navigate({ to: "/configure/master/event-type" })}
            className="mt-6 rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white"
          >
            Back to List
          </Button>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-24 text-left font-sans">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          { label: "Event Types" },
          { label: item.label },
        ]}
      />

      <div className="mx-auto max-w-3xl space-y-6 px-3.5 py-4 sm:px-6 md:px-8">
        <button
          type="button"
          onClick={() => void navigate({ to: "/configure/master/event-type" })}
          className="inline-flex items-center gap-2 text-xs font-bold text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
        >
          <ArrowLeftIcon className="size-4" />
          Back to Event Types
        </button>

        <Card className="rounded-[20px] border border-[#e5e5e5] bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-4 border-b border-[#f0ece1] pb-5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div
                className="flex size-11 items-center justify-center rounded-[14px] text-white shadow-2xs"
                style={{ backgroundColor: color }}
              >
                <TagIcon className="size-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#0a0a0a]">
                  Edit Event Type
                </h1>
                <p className="text-xs text-[#6a6a6a]">
                  Configure visual identity, attendance point rewards, and active status.
                </p>
              </div>
            </div>

            {isAdmin && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteModal(true)}
                className="h-9 gap-1.5 rounded-[12px] border-[#ef4444]/30 text-xs font-bold text-[#ef4444] hover:bg-[#ef4444]/10"
              >
                <Trash2Icon className="size-3.5" />
                Delete
              </Button>
            )}
          </div>

          {successNotice && (
            <div className="mt-5 flex items-center gap-2 rounded-[12px] border border-[#0d9488]/20 bg-[#0d9488]/10 p-3 text-xs font-bold text-[#0d9488]">
              <CheckCircle2Icon className="size-4 shrink-0" />
              <span>Event type changes saved successfully.</span>
            </div>
          )}

          {errorMessage && (
            <div className="mt-5 flex items-center gap-2 rounded-[12px] border border-[#ef4444]/20 bg-[#ef4444]/10 p-3 text-xs text-[#ef4444]">
              <AlertTriangleIcon className="size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleUpdate} className="mt-6 space-y-5">
            {/* Immutable Code Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#0a0a0a]">System Code</label>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#8a7a5a]">
                  <LockIcon className="size-3" /> Permanently Locked
                </span>
              </div>
              <Input
                disabled
                readOnly
                value={item.code}
                className="bg-[#faf5e8] font-mono text-xs font-bold text-[#6a6a6a] cursor-not-allowed opacity-90"
                helperText="This semantic code is permanently locked to preserve relational data integrity and attendance streak consistency."
                startIcon={<LockIcon className="size-4 text-[#8a7a5a]" />}
              />
            </div>

            {/* Label Field */}
            <div className="space-y-1.5">
              <Input
                label="Event Type Name (Display Label)"
                required
                disabled={!isAdmin}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                helperText="Display name shown on the activity calendar and dropdown options."
              />
            </div>

            {/* Color Swatch & Preset */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#0a0a0a]">
                Theme Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  disabled={!isAdmin}
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="size-11 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] p-1 shadow-2xs disabled:cursor-not-allowed"
                />
                <Input
                  disabled={!isAdmin}
                  className="font-mono uppercase bg-white"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#4262FF"
                />
              </div>
            </div>

            {/* Default Point Reward */}
            <div className="space-y-1.5">
              <Input
                label="Default Points Reward"
                type="number"
                min={0}
                max={10000}
                required
                disabled={!isAdmin}
                value={defaultPointReward}
                onChange={(e) => setDefaultPointReward(Math.max(0, parseInt(e.target.value) || 0))}
                startIcon={<CoinsIcon className="size-4 text-[#e8b94a]" />}
                helperText="Default reward points for events of this type (0 - 10,000)."
              />
            </div>

            {/* Description Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#0a0a0a]">
                Description (Optional)
              </label>
              <textarea
                rows={3}
                maxLength={500}
                disabled={!isAdmin}
                placeholder="Brief description about this event type..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] p-3 text-xs text-[#0a0a0a] shadow-2xs outline-none transition-colors placeholder:text-[#767676] hover:border-[#bfbfbf] focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/15 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <p className="text-[11px] text-[#8a8a8a] text-right">
                {description.length}/500 characters
              </p>
            </div>

            {/* Status Active Toggle */}
            <div className="flex items-center justify-between rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] p-4">
              <div>
                <p className="text-xs font-bold text-[#0a0a0a]">Active Status</p>
                <p className="text-[11px] text-[#6a6a6a]">
                  Inactive event types are hidden from new event creation forms.
                </p>
              </div>
              <input
                type="checkbox"
                disabled={!isAdmin}
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-5 cursor-pointer accent-[#0a0a0a] disabled:cursor-not-allowed"
              />
            </div>

            {/* Action Buttons */}
            {isAdmin && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#f0ece1]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void navigate({ to: "/configure/master/event-type" })}
                  className="rounded-[12px] text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="gap-2 rounded-[12px] bg-[#0a0a0a] px-6 text-xs font-bold text-white shadow-xs hover:bg-[#222]"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            )}
          </form>
        </Card>
      </div>

      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md rounded-[20px] bg-white p-6">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-[#ef4444]/10 text-[#ef4444]">
              <AlertTriangleIcon className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold text-[#0a0a0a]">
              Delete Event Type "{item.label}"?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6a6a6a]">
              This action is permanent. If this event type is already used by at least one
              event, the database will reject deletion.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="rounded-[12px] text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="rounded-[12px] bg-[#ef4444] text-xs font-bold text-white hover:bg-[#dc2626]"
            >
              {deleting ? "Deleting..." : "Yes, Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 409 Conflict Dialog */}
      <Dialog open={Boolean(conflictMessage)} onOpenChange={(open) => !open && setConflictMessage(null)}>
        <DialogContent className="max-w-md rounded-[20px] bg-white p-6">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-[#f59e0b]/10 text-[#f59e0b]">
              <AlertTriangleIcon className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold text-[#0a0a0a]">
              Event Type Currently in Use
            </DialogTitle>
            <DialogDescription className="text-xs text-[#4a4a4a]">
              {conflictMessage}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 rounded-[12px] bg-[#faf5e8] p-3 text-xs text-[#8a7a5a]">
            💡 <strong>Recommendation:</strong> Deactivate this event type instead. Past events will remain intact
            and this type will no longer appear on new event forms.
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConflictMessage(null)}
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
