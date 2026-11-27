import { useEffect, useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import {
  GraduationCapIcon,
  UsersIcon,
  AlertTriangleIcon,
  Trash2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
  MoreVerticalIcon,
  PencilIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { schoolsApi } from "../api/configureApi"
import type { SchoolDto } from "../api/configureApi"
import { Button } from "@/components/base/Button"
import { Card } from "@/components/base/Card"
import { Badge } from "@/components/base/Badge"
import { Input } from "@/components/base/Input"
import { Select } from "@/components/base/Select"
import { toast } from "@/components/base"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/base/Dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const SCHOOL_TYPES = [
  { value: "SMP", label: "Junior High School (SMP)" },
  { value: "SMA/SMK", label: "Senior & Vocational High (SMA/SMK)" },
  { value: "Universitas", label: "University / College" },
  { value: "Umum", label: "General / Other Institution" },
]

export function SchoolDetailPage() {
  const { schoolId } = useParams({ strict: false }) as { schoolId?: string }
  const navigate = useNavigate()
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

  const [school, setSchool] = useState<SchoolDto | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit states
  const [name, setName] = useState("")
  const [type, setType] = useState("SMA/SMK")
  const [isActive, setIsActive] = useState(true)

  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Delete & Conflict states
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [conflictMessage, setConflictMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function loadSchool() {
      if (!schoolId) return
      try {
        setLoading(true)
        const item = await schoolsApi.get(schoolId).catch(async () => {
          const list = await schoolsApi.list()
          return list.find((s) => s.id === schoolId) || null
        })

        if (!cancelled && item) {
          setSchool(item)
          setName(item.name)
          setType(item.type || "Umum")
          setIsActive(item.is_active !== false)
        }
      } catch {
        if (!cancelled) {
          setFeedback({
            type: "error",
            message: "Failed to load institution details.",
          })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadSchool()
    return () => {
      cancelled = true
    }
  }, [schoolId])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolId || !isAdmin) return
    setFeedback(null)

    if (!name.trim()) {
      setFeedback({ type: "error", message: "Institution name is required." })
      return
    }

    try {
      setSaving(true)
      const updated = await schoolsApi.update(schoolId, {
        name: name.trim(),
        type,
        is_active: isActive,
      })

      setSchool((prev) => (prev ? { ...prev, ...updated } : updated))
      setIsEditing(false)
      const okMsg = "Institution details updated successfully."
      setFeedback({
        type: "success",
        message: okMsg,
      })
      toast.success(okMsg)
    } catch (err: any) {
      const errMsg = err?.message || "Failed to update institution details."
      setFeedback({
        type: "error",
        message: errMsg,
      })
      toast.error(errMsg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!schoolId || !isAdmin) return
    setDeleting(true)
    setFeedback(null)

    try {
      await schoolsApi.remove(schoolId)
      setShowDeleteModal(false)
      toast.success(`Institution "${name}" deleted.`)
      await navigate({ to: "/configure/master/school" })
    } catch (err: any) {
      setShowDeleteModal(false)
      const msg = err?.message || "Cannot delete this institution."
      setConflictMessage(msg)
      toast.error(msg)
    } finally {
      setDeleting(false)
    }
  }

  const handleDeactivateInstead = async () => {
    if (!schoolId) return
    try {
      setSaving(true)
      await schoolsApi.update(schoolId, { is_active: false })
      setIsActive(false)
      setConflictMessage(null)
      const okMsg = `"${name}" has been deactivated instead. It will no longer appear in onboarding searches.`
      setFeedback({
        type: "success",
        message: okMsg,
      })
      toast.success(`Institution "${name}" deactivated.`)
    } catch (err: any) {
      const errMsg = err?.message || "Failed to deactivate institution."
      setFeedback({
        type: "error",
        message: errMsg,
      })
      toast.error(errMsg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf0] p-6 text-left font-sans">
        <div className="mx-auto max-w-7xl animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-[12px] bg-[#e5e5e5]" />
          <div className="h-64 rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-6 shadow-2xs" />
        </div>
      </main>
    )
  }

  if (!school) {
    return (
      <main className="min-h-screen bg-[#fffaf0] p-6 text-left font-sans">
        <Card className="mx-auto max-w-md rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-8 text-center shadow-2xs">
          <GraduationCapIcon className="mx-auto size-12 text-[#6a6a6a]/40" />
          <h2 className="mt-4 text-base font-bold text-[#0a0a0a]">
            Institution Not Found
          </h2>
          <p className="mt-1 text-xs text-[#6a6a6a]">
            The requested school or university record could not be found.
          </p>
          <Button
            variant="outline"
            onClick={() => void navigate({ to: "/configure/master/school" })}
            className="mt-6 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#ebe6d6]"
          >
            Back to Directory
          </Button>
        </Card>
      </main>
    )
  }

  const memberCount = school.userCount ?? 0

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-28 text-left font-sans md:pb-16">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          {
            label: "Schools & Universities",
            href: "/configure/master/school",
          },
          { label: school.name },
        ]}
        onBack={() => void navigate({ to: "/configure/master/school" })}
      />

      <div className="mx-auto max-w-3xl space-y-4 px-3.5 py-2 sm:space-y-5 sm:px-6 sm:py-5 md:px-8">
        {/* Desktop Header (hidden on mobile where PageBreadcrumb already shows school name) */}
        <div className="hidden items-center justify-between gap-4 border-b border-[#e5dec9] pb-4 sm:flex">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[#e5dec9] bg-[#faf5e8] text-[#0a0a0a]">
              <GraduationCapIcon className="size-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-[#0a0a0a]">
                {school.name}
              </h1>
              <p className="truncate text-xs text-[#6a6a6a]">
                Manage educational institution profile and master data
              </p>
            </div>
          </div>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`flex items-center justify-between gap-3 rounded-[14px] border p-3.5 text-xs font-medium ${
              feedback.type === "success"
                ? "border-emerald-600/30 bg-emerald-50 text-emerald-800"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2Icon className="size-4 shrink-0" />
              ) : (
                <AlertCircleIcon className="size-4 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="rounded p-1 hover:bg-black/5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Unified Summary Strip + 3-Dot Actions */}
        <div className="flex items-center justify-between gap-3 rounded-[16px] border border-[#e5dec9] bg-[#faf5e8] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <UsersIcon className="size-4 text-[#6a6a6a]" aria-hidden="true" />
            <span className="text-xs font-medium text-[#6a6a6a]">
              <strong className="font-semibold tabular-nums text-[#0a0a0a]">
                {memberCount}
              </strong>{" "}
              Active Youth
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={isActive ? "secondary" : "outline"}
              className={
                isActive
                  ? "border border-emerald-600/25 bg-emerald-50 font-semibold text-emerald-700"
                  : "border border-[#e5dec9] bg-[#ebe6d6] text-[#6a6a6a]"
              }
            >
              {isActive ? "Active" : "Inactive"}
            </Badge>

            {isAdmin && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    aria-label="Institution actions"
                    title="Institution actions"
                    className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-[#e5dec9] bg-[#fffaf0] text-[#0a0a0a] transition-colors hover:bg-[#efe8d6]"
                  >
                    <MoreVerticalIcon className="size-4" aria-hidden="true" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-44 rounded-[16px] border border-[#e5dec9] bg-[#fffaf0] p-1.5 shadow-lg"
                >
                  <DropdownMenuItem
                    onClick={() => {
                      setFeedback(null)
                      setIsEditing(true)
                    }}
                    className="cursor-pointer gap-2 rounded-[10px] text-xs font-semibold text-[#0a0a0a]"
                  >
                    <PencilIcon className="size-3.5" aria-hidden="true" />
                    <span>Edit Institution</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-[#e5dec9]" />
                  <DropdownMenuItem
                    onClick={() => setShowDeleteModal(true)}
                    className="cursor-pointer gap-2 rounded-[10px] text-xs font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <Trash2Icon className="size-3.5" aria-hidden="true" />
                    <span>Delete Institution</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Read-Only Detail View vs Inline Edit Form */}
        {!isEditing ? (
          <div className="divide-y divide-[#e5dec9] overflow-hidden rounded-[20px] border border-[#e5dec9] bg-[#faf5e8]">
            <div className="px-4 py-3.5 sm:px-6 sm:py-4">
              <p className="text-[11px] font-medium text-[#6a6a6a]">
                Institution Name
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0a0a0a] sm:text-base">
                {school.name}
              </p>
            </div>
            <div className="px-4 py-3.5 sm:px-6 sm:py-4">
              <p className="text-[11px] font-medium text-[#6a6a6a]">
                Education Level
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0a0a0a]">
                {SCHOOL_TYPES.find((t) => t.value === (school.type || "Umum"))
                  ?.label ||
                  school.type ||
                  "General / Other Institution"}
              </p>
            </div>
            <div className="px-4 py-3.5 sm:px-6 sm:py-4">
              <p className="text-[11px] font-medium text-[#6a6a6a]">
                Active in Onboarding
              </p>
              <p className="mt-1 text-sm font-semibold text-[#0a0a0a]">
                {school.is_active !== false
                  ? "Visible during registration"
                  : "Hidden from registration"}
              </p>
            </div>
          </div>
        ) : (
          <form
            onSubmit={handleSave}
            className="space-y-4 rounded-[20px] border border-[#e5dec9] bg-[#faf5e8] p-4 sm:space-y-5 sm:p-6"
          >
            <Input
              label="Institution Name"
              required
              disabled={!isAdmin}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border-[#e5dec9] bg-[#fffaf0]"
              helperText="Official school, vocational, or university name."
            />

            <Select
              label="Institution Level / Category"
              disabled={!isAdmin}
              value={type}
              onValueChange={setType}
              options={SCHOOL_TYPES}
            />

            {/* Active Status Toggle for Admin */}
            {isAdmin && (
              <div className="flex items-center justify-between gap-4 rounded-[14px] border border-[#e5dec9] bg-[#fffaf0] p-3.5 sm:p-4">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#0a0a0a]">
                    Active in Onboarding
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-[#6a6a6a]">
                    Members can search and select this institution during
                    registration.
                  </p>
                </div>
                <label className="relative inline-flex shrink-0 cursor-pointer items-center">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="peer sr-only"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-[#e5e5e5] peer-checked:bg-[#0a0a0a] peer-focus:outline-none after:absolute after:top-[2px] after:left-[2px] after:size-5 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full" />
                </label>
              </div>
            )}

            {/* Edit Mode Action Buttons */}
            {isAdmin && (
              <div className="flex flex-col-reverse gap-2.5 border-t border-[#e5dec9] pt-4 sm:flex-row sm:items-center sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setName(school.name)
                    setType(school.type || "Umum")
                    setIsActive(school.is_active !== false)
                    setIsEditing(false)
                  }}
                  className="min-h-11 w-full rounded-full border border-[#e5dec9] bg-[#fffaf0] text-xs font-semibold text-[#0a0a0a] hover:bg-[#efe8d6] sm:w-auto sm:px-5"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={saving}
                  className="min-h-11 w-full rounded-full bg-[#0a0a0a] px-6 text-xs font-semibold text-white shadow-2xs hover:bg-[#262626] sm:w-auto"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-6 shadow-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-destructive">
              <AlertTriangleIcon className="size-5" />
              Delete Institution?
            </DialogTitle>
            <DialogDescription className="text-xs text-[#6a6a6a]">
              Are you sure you want to permanently remove{" "}
              <strong className="text-[#0a0a0a]">"{school.name}"</strong>? If
              any congregation members are currently associated with this
              school, deletion will be prevented to protect data integrity.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              className="rounded-[10px] border border-[#e5e5e5] bg-[#faf5e8] text-xs font-semibold text-[#0a0a0a] hover:bg-[#ebe6d6]"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="rounded-[10px] bg-destructive text-xs font-bold text-white hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 409 Conflict Dialog (School In Use) */}
      <Dialog
        open={Boolean(conflictMessage)}
        onOpenChange={(open) => !open && setConflictMessage(null)}
      >
        <DialogContent className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-6 shadow-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-clay-warning">
              <AlertTriangleIcon className="size-5" />
              Institution Currently Linked
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2 text-xs text-[#6a6a6a]">
              <p>{conflictMessage}</p>
              <div className="rounded-[12px] border border-clay-warning/30 bg-clay-warning/10 p-3 text-[#0a0a0a]">
                <strong className="text-clay-warning">Recommended action:</strong> Deactivate this institution
                instead. Deactivated institutions will no longer appear in new
                member registration, while existing members' historical records
                remain intact.
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConflictMessage(null)}
              className="rounded-[10px] border border-[#e5e5e5] bg-[#faf5e8] text-xs font-semibold text-[#0a0a0a] hover:bg-[#ebe6d6]"
            >
              Dismiss
            </Button>
            <Button
              onClick={() => void handleDeactivateInstead()}
              disabled={saving}
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
