import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  CheckIcon,
  CopyIcon,
  Share2Icon,
} from "lucide-react"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { Button } from "@/components/base/Button"
import {
  Select,
} from "@/components/base/Select"
import { usePaginatedDropdown } from "@/hooks/usePaginatedDropdown"
import { DROPDOWN_PAGE_SIZE } from "@/lib/pagination"
import { peopleApi } from "../api/peopleApi"
import type {
  CreateMemberPayload,
  CreateMemberResponse,
  VerifiedSchoolDto,
} from "../api/peopleApi"
import { useSimilarMembers } from "../hooks/useSimilarMembers"
import { SimilarMembersModal, SimilarMembersNotice } from "./SimilarMembersModal"

interface PreProvisionMemberModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName?: string
  canLoadSchools?: boolean
  submitLabel?: string
  onSuccess?: (created: CreateMemberResponse) => void | Promise<void>
  onToast?: (text: string, type?: "success" | "error") => void
}

/**
 * Shared Pre-Provision New Member flow + One-Time Temporary Credentials Modal.
 * Used in both `/people` directory and Attendance Manual Entry (`/events/scan`).
 */
export function PreProvisionMemberModal({
  open,
  onOpenChange,
  initialName = "",
  canLoadSchools = true,
  submitLabel = "Register Member",
  onSuccess,
  onToast,
}: PreProvisionMemberModalProps) {
  const [createForm, setCreateForm] = useState<CreateMemberPayload>({
    name: "",
    school_id: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdCredentials, setCreatedCredentials] =
    useState<CreateMemberResponse | null>(null)
  const [copiedInvite, setCopiedInvite] = useState(false)
  const [similarModalOpen, setSimilarModalOpen] = useState(false)

  // Async non-blocking fuzzy similarity check while typing Full Name
  const { similarMembers, totalMatches } = useSimilarMembers(createForm.name, {
    enabled: open,
  })

  // Sync initial state cleanly when modal opens
  useEffect(() => {
    if (!open) return
    setCreateError(null)
    setSimilarModalOpen(false)
    setCreateForm({
      name: initialName || "",
      school_id: "",
    })
  }, [open, initialName])

  const {
    items: verifiedSchools,
    hasMore: hasMoreSchools,
    loading: schoolsLoading,
    loadingMore: loadingMoreSchools,
    total: totalSchools,
    loadMore: loadMoreSchools,
  } = usePaginatedDropdown<VerifiedSchoolDto>({
    fetcher: (params) => peopleApi.getVerifiedSchools(params),
    getKey: (s) => s.id,
    pageSize: DROPDOWN_PAGE_SIZE,
    enabled: open && canLoadSchools,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!createForm.name.trim() || createForm.name.trim().length < 2) {
      setCreateError("Full name must be at least 2 characters.")
      return
    }

    try {
      setSubmitting(true)
      setCreateError(null)
      const created = await peopleApi.createMember({
        name: createForm.name.trim(),
        school_id: createForm.school_id || null,
      })

      setSimilarModalOpen(false)
      onOpenChange(false)
      setCreatedCredentials(created)
      setCreateForm({ name: "", school_id: "" })
      await onSuccess?.(created)
      onToast?.(`Member "${created.name}" registered successfully!`)
    } catch (err: any) {
      setCreateError(err?.message || "Failed to add member")
    } finally {
      setSubmitting(false)
    }
  }

  function handleCopy(text?: string | number | null, msg = "Copied!") {
    if (!text) return
    navigator.clipboard
      .writeText(String(text))
      .then(() => onToast?.(msg))
      .catch(() => onToast?.("Clipboard access denied.", "error"))
  }

  function handleCopyWhatsAppInvitation(message?: string) {
    if (!message) return
    navigator.clipboard
      .writeText(message)
      .then(() => {
        setCopiedInvite(true)
        onToast?.("WhatsApp invitation copied!")
        setTimeout(() => setCopiedInvite(false), 3000)
      })
      .catch(() => onToast?.("Clipboard access denied.", "error"))
  }

  const credentialsNode = createdCredentials && (
    <div className="fixed inset-0 z-[115] flex animate-in items-center justify-center bg-black/60 p-3.5 backdrop-blur-xs fade-in sm:p-4">
      <div className="relative max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 text-left shadow-2xl sm:p-6">
        <div className="flex items-center gap-3 border-b border-[#e5e5e5] pb-3">
          <div className="flex size-10 items-center justify-center rounded-[12px] bg-emerald-500 text-white shadow-xs">
            <CheckCircleIcon className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#0a0a0a] sm:text-lg">
              Member Pre-Provisioned!
            </h3>
            <p className="text-xs text-[#6a6a6a]">
              Share these temporary credentials with the member for initial
              login.
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-[16px] border border-[#e8b94a]/40 bg-[#faf5e8] p-4">
          <div>
            <span className="block text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
              Full Name
            </span>
            <span className="text-sm font-bold text-[#0a0a0a]">
              {createdCredentials.name}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 border-t border-[#e6decb]/80 pt-2.5">
            <div>
              <span className="block text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                Member ID
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-bold text-[#1a3a3a]">
                  {createdCredentials.user_number}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      createdCredentials.user_number,
                      "Member ID copied!"
                    )
                  }
                  className="cursor-pointer text-[#6a6a6a] hover:text-[#0a0a0a]"
                  title="Copy Member ID"
                >
                  <CopyIcon className="size-3" />
                </button>
              </div>
            </div>

            <div>
              <span className="block text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                Username
              </span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-bold text-[#1a3a3a]">
                  @{createdCredentials.username}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      createdCredentials.username,
                      "Username copied!"
                    )
                  }
                  className="cursor-pointer text-[#6a6a6a] hover:text-[#0a0a0a]"
                  title="Copy Username"
                >
                  <CopyIcon className="size-3" />
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-[#e6decb]/80 pt-2.5">
            <div className="flex items-center justify-between">
              <span className="block text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                Temporary Password
              </span>
              <span className="text-[10px] font-semibold text-rose-600">
                *Shown once only
              </span>
            </div>
            <div className="mt-1 flex items-center justify-between rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-3 py-2">
              <span className="font-mono text-xs font-extrabold text-[#0a0a0a] select-all sm:text-sm">
                {createdCredentials.temporary_password}
              </span>
              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    createdCredentials.temporary_password,
                    "Password copied!"
                  )
                }
                className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#0a0a0a] hover:underline"
              >
                <CopyIcon className="size-3" />
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button
            variant="filled"
            type="button"
            onClick={() =>
              handleCopyWhatsAppInvitation(
                createdCredentials.whatsapp_invite_message ||
                createdCredentials.copy_template
              )
            }
            className="w-full gap-2 rounded-[12px] bg-emerald-600 text-white hover:bg-emerald-700"
          >
            {copiedInvite ? (
              <CheckIcon className="size-4" />
            ) : (
              <Share2Icon className="size-4" />
            )}
            <span>
              {copiedInvite
                ? "Copied for WhatsApp!"
                : "Copy WhatsApp Invitation Message"}
            </span>
          </Button>

          <p className="text-center text-[11px] text-[#6a6a6a]">
            Member can activate their account and set permanent password at{" "}
            <strong>/login</strong>.
          </p>
        </div>

        <div className="flex justify-end border-t border-[#e5e5e5] pt-3">
          <Button
            variant="outlined"
            type="button"
            onClick={() => setCreatedCredentials(null)}
            className="rounded-[12px] px-6"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      <ResponsiveFormModal
        open={open}
        onOpenChange={onOpenChange}
        title="Pre-Provision New Member"
        description="Register a community member before they download the app. New accounts default to the Member role with a generated Member ID and temporary login credentials."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {createError && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[12px] border border-[#ef4444]/30 bg-[#ef4444]/5 p-3 text-xs font-semibold text-[#991b1b]"
            >
              <AlertTriangleIcon
                className="mt-0.5 size-4 shrink-0"
                aria-hidden="true"
              />
              <span>{createError}</span>
            </div>
          )}

          {/* Non-blocking Similar Existing Members Notice (hidden when empty) */}
          <SimilarMembersNotice
            members={similarMembers}
            totalCount={totalMatches}
            onSeeMore={() => setSimilarModalOpen(true)}
          />

          <div className="space-y-3.5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <label
                htmlFor="people-create-name"
                className="text-xs font-bold text-[#0a0a0a]"
              >
                Full Name <span className="text-[#ef4444]">*</span>
              </label>
              <input
                id="people-create-name"
                type="text"
                required
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                placeholder="e.g. Budi Santoso"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-sm text-[#0a0a0a] transition-colors outline-none focus:border-[#0a0a0a] focus:ring-2 focus:ring-[#0a0a0a]/15"
              />
            </div>

            {/* School / Institution (Master Data Schools — initial 5 + infinite scroll) */}
            <div className="space-y-1">
              <Select
                id="people-create-school"
                label={
                  schoolsLoading
                    ? "School / Institution (Loading...)"
                    : "School / Institution"
                }
                value={createForm.school_id || "__none__"}
                onValueChange={(val) =>
                  setCreateForm({
                    ...createForm,
                    school_id: val === "__none__" ? null : val,
                  })
                }
                disabled={schoolsLoading}
                hasMore={hasMoreSchools}
                isLoadingMore={loadingMoreSchools}
                totalCount={totalSchools}
                onLoadMore={loadMoreSchools}
                options={[
                  { value: "__none__", label: "None / Not set" },
                  ...verifiedSchools.map((sch) => ({
                    value: sch.id,
                    label: `${sch.name} (${sch.type})`,
                  })),
                ]}
              />
              <p className="text-[11px] text-[#6a6a6a]">
                {schoolsLoading
                  ? "Loading active schools from Master Data..."
                  : verifiedSchools.length > 0
                    ? `Connected to Master Data Schools (${totalSchools > verifiedSchools.length ? `${verifiedSchools.length} of ${totalSchools} loaded` : `${verifiedSchools.length} active`}).`
                    : "No active schools found in Master Data."}
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2.5 border-t border-[#e5e5e5] pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={submitting}
              onClick={() => onOpenChange(false)}
              className="min-h-11 flex-1 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-sm font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0] disabled:opacity-50 sm:flex-none"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] px-5 text-sm font-bold text-white transition-colors hover:bg-[#1f1f1f] disabled:cursor-wait disabled:opacity-50 sm:flex-none"
            >
              {submitting && (
                <span
                  className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
              )}
              {submitting ? "Registering..." : submitLabel}
            </button>
          </div>
        </form>
      </ResponsiveFormModal>

      <SimilarMembersModal
        open={similarModalOpen}
        onOpenChange={setSimilarModalOpen}
        searchTerm={createForm.name}
        members={similarMembers}
      />

      {typeof document !== "undefined" && credentialsNode
        ? createPortal(credentialsNode, document.body)
        : credentialsNode}
    </>
  )
}

