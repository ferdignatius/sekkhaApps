import { useEffect, useState } from "react"
import { useNavigate, useParams } from "@tanstack/react-router"
import {
  GraduationCapIcon,
  ArrowLeftIcon,
  UsersIcon,
  AlertTriangleIcon,
  Trash2Icon,
  CheckCircle2Icon,
  AlertCircleIcon,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/base/Dialog"

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
      setFeedback({
        type: "success",
        message: "Institution details updated successfully.",
      })
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to update institution details.",
      })
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
      await navigate({ to: "/configure/master/school" })
    } catch (err: any) {
      setShowDeleteModal(false)
      const msg = err?.message || "Cannot delete this institution."
      setConflictMessage(msg)
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
      setFeedback({
        type: "success",
        message: `"${name}" has been deactivated instead. It will no longer appear in onboarding searches.`,
      })
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err?.message || "Failed to deactivate institution.",
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#fffaf0] p-6 text-left font-sans">
        <div className="mx-auto max-w-2xl animate-pulse space-y-4">
          <div className="h-8 w-48 rounded-[12px] bg-[#e5e5e5]" />
          <div className="h-64 rounded-[20px] bg-white p-6 shadow-2xs" />
        </div>
      </main>
    )
  }

  if (!school) {
    return (
      <main className="min-h-screen bg-[#fffaf0] p-6 text-left font-sans">
        <Card className="mx-auto max-w-md rounded-[20px] border border-[#e5e5e5] bg-white p-8 text-center shadow-2xs">
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
            className="mt-6 rounded-[12px]"
          >
            Back to Directory
          </Button>
        </Card>
      </main>
    )
  }

  const memberCount = school.userCount ?? 0

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-24 text-left font-sans">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Master Data" },
          { label: "Schools & Universities" },
          { label: school.name },
        ]}
      />

      <div className="mx-auto max-w-3xl space-y-6 px-3.5 py-4 sm:px-6 md:px-8">
        {/* Top Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void navigate({ to: "/configure/master/school" })}
            className="gap-2 rounded-[12px] border-[#e5e5e5] bg-white text-xs font-semibold hover:bg-[#faf5e8]"
          >
            <ArrowLeftIcon className="size-4" />
            Back to Directory
          </Button>

          <Badge
            variant={isActive ? "secondary" : "outline"}
            className={
              isActive
                ? "bg-[#22c55e]/15 font-semibold text-[#15803d]"
                : "text-[#8a8a8a]"
            }
          >
            {isActive ? "Active Institution" : "Inactive / Archived"}
          </Badge>
        </div>

        {/* Feedback Message */}
        {feedback && (
          <div
            className={`flex items-center justify-between gap-3 rounded-[14px] border p-4 text-xs font-medium shadow-2xs ${
              feedback.type === "success"
                ? "border-[#22c55e]/30 bg-[#22c55e]/10 text-[#15803d]"
                : "border-[#ef4444]/30 bg-[#ef4444]/10 text-[#b91c1c]"
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === "success" ? (
                <CheckCircle2Icon className="size-4 shrink-0 text-[#22c55e]" />
              ) : (
                <AlertCircleIcon className="size-4 shrink-0 text-[#ef4444]" />
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

        {/* Main Details Card */}
        <Card className="rounded-[24px] border border-[#e5e5e5] bg-white p-6 shadow-2xs sm:p-8">
          <div className="mb-6 flex items-start justify-between border-b border-[#f0ece1] pb-5">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-[16px] bg-[#0a0a0a] text-white shadow-2xs">
                <GraduationCapIcon className="size-6 text-[#e8b94a]" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-[#0a0a0a]">
                  {school.name}
                </h1>
                <p className="text-xs text-[#6a6a6a]">
                  Manage educational institution profile and master data
                  records.
                </p>
              </div>
            </div>
          </div>

          {/* Social Proof Meta Pill */}
          <div className="mb-6 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4">
            <div className="flex items-center gap-2.5">
              <UsersIcon className="size-5 text-[#e8b94a]" />
              <div>
                <p className="text-xs text-[#6a6a6a]">Connected Congregation</p>
                <p className="text-base font-bold text-[#0a0a0a]">
                  {memberCount} Active Youth
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-5">
            <Input
              label="Institution Name"
              required
              disabled={!isAdmin}
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              <div className="flex items-center justify-between rounded-[14px] border border-[#e5e5e5] bg-[#fffaf0] p-4">
                <div>
                  <p className="text-xs font-bold text-[#0a0a0a]">
                    Active in Onboarding
                  </p>
                  <p className="text-[11px] text-[#6a6a6a]">
                    When active, members can search and select this institution
                    during registration.
                  </p>
                </div>
                <label className="relative inline-flex cursor-pointer items-center">
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

            {/* Admin Action Buttons */}
            {isAdmin && (
              <div className="flex items-center justify-between border-t border-[#f0ece1] pt-5">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteModal(true)}
                  className="gap-2 rounded-[12px] text-xs font-semibold"
                >
                  <Trash2Icon className="size-4" />
                  Delete Institution
                </Button>

                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-[12px] bg-[#0a0a0a] px-6 text-xs font-bold text-white shadow-xs hover:bg-[#222]"
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </Button>
              </div>
            )}
          </form>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="rounded-[20px] bg-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#ef4444]">
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
              className="rounded-[10px] text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
              className="rounded-[10px] text-xs font-bold"
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
        <DialogContent className="rounded-[20px] bg-white p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#f59e0b]">
              <AlertTriangleIcon className="size-5" />
              Institution Currently Linked
            </DialogTitle>
            <DialogDescription className="space-y-3 pt-2 text-xs text-[#6a6a6a]">
              <p>{conflictMessage}</p>
              <div className="rounded-[12px] border border-[#f59e0b]/30 bg-[#fef3c7]/40 p-3 text-[#92400e]">
                <strong>Recommended action:</strong> Deactivate this institution
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
              className="rounded-[10px] text-xs font-semibold"
            >
              Dismiss
            </Button>
            <Button
              onClick={() => void handleDeactivateInstead()}
              disabled={saving}
              className="rounded-[10px] bg-[#0a0a0a] text-xs font-bold text-white hover:bg-[#222]"
            >
              Deactivate Instead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  )
}
