import {
  CheckCircle2Icon,
  CheckIcon,
  CopyIcon,
  Share2Icon,
  ShieldCheckIcon,
} from "lucide-react"
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Select,
} from "@/components/base"
import type {
  MemberDetailDto,
  PeopleRole,
  ResetTemporaryPasswordResponse,
} from "../../api/peopleApi"
import { getRoleDescription } from "../../utils/memberFormatters"

const ROLE_OPTIONS: Array<{ value: PeopleRole; label: string }> = [
  { value: "member", label: "Member" },
  { value: "activist", label: "Activist" },
  { value: "organizer", label: "Organizer" },
  { value: "admin", label: "Admin" },
]

export interface MemberDetailModalsProps {
  member: MemberDetailDto
  isAdmin: boolean
  isSelf: boolean
  showRoleModal: boolean
  onRoleModalChange: (open: boolean) => void
  newRole: PeopleRole
  onNewRoleChange: (role: PeopleRole) => void
  savingRole: boolean
  onSubmitRole: (e: React.FormEvent) => void
  showDeleteModal: boolean
  onDeleteModalChange: (open: boolean) => void
  deleting: boolean
  onConfirmDelete: () => void
  resetCredentials: ResetTemporaryPasswordResponse | null
  onCloseResetCredentials: () => void
  copiedInvite: boolean
  onCopyText: (value: string, label?: string) => void
  onCopyWhatsAppInvitation: (message?: string) => void
}

/**
 * Coordinates the Change Role Dialog, Delete ConfirmDialog, and One-Time Credentials Dialog
 * using Sekkha base HIG primitives (keyboard escape, focus management, touch targets).
 */
export function MemberDetailModals({
  member,
  isAdmin,
  isSelf,
  showRoleModal,
  onRoleModalChange,
  newRole,
  onNewRoleChange,
  savingRole,
  onSubmitRole,
  showDeleteModal,
  onDeleteModalChange,
  deleting,
  onConfirmDelete,
  resetCredentials,
  onCloseResetCredentials,
  copiedInvite,
  onCopyText,
  onCopyWhatsAppInvitation,
}: MemberDetailModalsProps) {
  return (
    <>
      {/* ── MODAL: CHANGE ROLE (Admin only, never self) ── */}
      {isAdmin && !isSelf && (
        <Dialog open={showRoleModal} onOpenChange={onRoleModalChange}>
          <DialogContent className="border-hairline bg-canvas sm:max-w-md">
            <DialogHeader className="border-b border-hairline pb-3 text-left">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-ink">
                <ShieldCheckIcon
                  className="size-5 text-clay-teal"
                  aria-hidden="true"
                />
                <span>Change Member Role</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-text-muted">
                Adjust community governance privileges for{" "}
                <strong className="text-ink">{member.name}</strong>.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmitRole} className="space-y-4 pt-1">
              <Select
                id="member-role-select"
                label="Select New Role"
                value={newRole}
                onValueChange={(val) => onNewRoleChange(val as PeopleRole)}
                options={ROLE_OPTIONS}
              />

              {/* Live Permission Scope Preview */}
              <div className="rounded-md border border-hairline bg-surface-soft p-3 text-xs">
                <p className="font-bold text-ink">Access Scope Preview</p>
                <p className="mt-1 leading-relaxed text-text-muted">
                  {getRoleDescription(newRole)}
                </p>
              </div>

              <div className="flex gap-2.5 border-t border-hairline pt-3">
                <Button
                  type="button"
                  variant="outlined"
                  onClick={() => onRoleModalChange(false)}
                  className="flex-1 rounded-md"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="filled"
                  disabled={savingRole}
                  className="flex-1 rounded-md"
                >
                  {savingRole ? "Saving..." : "Save Role"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── DIALOG: DELETE MEMBER CONFIRMATION (Admin only, never self) ── */}
      {isAdmin && !isSelf && (
        <ConfirmDialog
          open={showDeleteModal}
          onOpenChange={onDeleteModalChange}
          variant="destructive"
          title="Delete Member?"
          description={
            <span>
              Are you sure you want to permanently remove{" "}
              <strong className="text-ink">{member.name}</strong>? All profile
              data and access credentials will be deleted and cannot be undone.
            </span>
          }
          cancelLabel="Cancel"
          confirmLabel={deleting ? "Deleting..." : "Delete Member"}
          isLoading={deleting}
          onConfirm={onConfirmDelete}
        />
      )}

      {/* ── MODAL: CREDENTIALS POPUP AFTER TEMPORARY PASSWORD RESET ── */}
      <Dialog
        open={Boolean(resetCredentials)}
        onOpenChange={(open) => {
          if (!open) onCloseResetCredentials()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-hairline bg-canvas sm:max-w-lg">
          {resetCredentials && (
            <div className="space-y-4 text-left">
              <div className="flex items-start gap-3 border-b border-hairline pb-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-emerald-600 text-white shadow-xs">
                  <CheckCircle2Icon className="size-5" aria-hidden="true" />
                </div>
                <DialogHeader className="text-left">
                  <DialogTitle className="text-base font-bold text-ink sm:text-lg">
                    Temporary Password Regenerated!
                  </DialogTitle>
                  <DialogDescription className="text-xs text-text-muted">
                    Share these one-time credentials with the member so they can
                    sign in.
                  </DialogDescription>
                </DialogHeader>
              </div>

              {/* High-Contrast Credentials Summary Card */}
              <div className="space-y-3 rounded-lg border border-clay-ochre/40 bg-surface-soft p-4">
                <div>
                  <span className="block text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    Full Name
                  </span>
                  <span className="text-sm font-bold text-ink">
                    {resetCredentials.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 border-t border-hairline pt-2.5">
                  <div>
                    <span className="block text-[10px] font-bold tracking-wider text-text-muted uppercase">
                      Member ID
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-bold text-clay-teal">
                        {resetCredentials.user_number}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onCopyText(
                            String(resetCredentials.user_number),
                            "Member ID"
                          )
                        }
                        aria-label="Copy reset Member ID"
                        className="cursor-pointer rounded-xs p-1 text-text-muted hover:text-ink"
                      >
                        <CopyIcon className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] font-bold tracking-wider text-text-muted uppercase">
                      Username
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm font-bold text-clay-teal">
                        @{resetCredentials.username}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          onCopyText(resetCredentials.username, "Username")
                        }
                        aria-label="Copy reset username"
                        className="cursor-pointer rounded-xs p-1 text-text-muted hover:text-ink"
                      >
                        <CopyIcon className="size-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-hairline pt-2.5">
                  <div className="flex items-center justify-between">
                    <span className="block text-[10px] font-bold tracking-wider text-text-muted uppercase">
                      New Temporary Password
                    </span>
                    <span className="text-[10px] font-semibold text-rose-600">
                      *Shown once only
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between rounded-sm border border-hairline bg-canvas px-3 py-2">
                    <span className="font-mono text-xs font-extrabold text-ink select-all sm:text-sm">
                      {resetCredentials.temporary_password}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        onCopyText(
                          resetCredentials.temporary_password,
                          "Temporary password"
                        )
                      }
                      aria-label="Copy temporary password"
                      className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-ink hover:underline"
                    >
                      <CopyIcon className="size-3.5" aria-hidden="true" />
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
                    onCopyWhatsAppInvitation(
                      resetCredentials.whatsapp_invite_message ||
                        resetCredentials.copy_template
                    )
                  }
                  className="w-full gap-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {copiedInvite ? (
                    <CheckIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <Share2Icon className="size-4" aria-hidden="true" />
                  )}
                  <span>
                    {copiedInvite
                      ? "Copied for WhatsApp!"
                      : "Copy WhatsApp Invitation Message"}
                  </span>
                </Button>

                <p className="text-center text-[11px] text-text-muted">
                  Member can claim their account and set a permanent password at{" "}
                  <strong>/login</strong>.
                </p>
              </div>

              <div className="flex justify-end border-t border-hairline pt-3">
                <Button
                  variant="outlined"
                  type="button"
                  onClick={onCloseResetCredentials}
                  className="rounded-md px-6"
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

