import {
  InfoIcon,
  KeyIcon,
  ShieldCheckIcon,
  Trash2Icon,
} from "lucide-react"
import { Button, Card } from "@/components/base"
import type { MemberDetailDto } from "../../api/peopleApi"

export interface MemberGovernanceCardProps {
  member: MemberDetailDto
  isAdmin: boolean
  isSelf: boolean
  isPrivilegedTargetForOrganizer: boolean
  resettingPassword: boolean
  onResetPassword: () => void
  onOpenRoleModal: () => void
  onOpenDeleteModal: () => void
}

/**
 * High-priority governance and credential actions card.
 * Positioned in the primary column so organizers/admins can act without scrolling past tab lists.
 */
export function MemberGovernanceCard({
  member,
  isAdmin,
  isSelf,
  isPrivilegedTargetForOrganizer,
  resettingPassword,
  onResetPassword,
  onOpenRoleModal,
  onOpenDeleteModal,
}: MemberGovernanceCardProps) {
  const isResetDisabled =
    isSelf ||
    member.is_claimed ||
    isPrivilegedTargetForOrganizer ||
    resettingPassword

  const resetTooltip = isSelf
    ? "You cannot reset the temporary password for your own account."
    : isPrivilegedTargetForOrganizer
      ? "Only Admins can manage credentials for Organizer or Admin accounts."
      : member.is_claimed
        ? "Account has been claimed by the member. Members must use self-service Forgot Password."
        : "Regenerate Temporary Password (sekkha#####puggala)"

  return (
    <Card
      variant="outlined"
      className="space-y-3 rounded-xl border-hairline bg-canvas p-4 shadow-xs sm:p-5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold tracking-wider text-text-muted uppercase">
          Administrative Actions
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="tonal"
          disabled={isResetDisabled}
          onClick={onResetPassword}
          title={resetTooltip}
          className={
            isResetDisabled
              ? "w-full justify-start gap-2.5 rounded-md border border-hairline px-3.5 text-xs font-bold opacity-65"
              : "w-full justify-start gap-2.5 rounded-md border border-clay-ochre/40 bg-clay-ochre/15 px-3.5 text-xs font-bold text-ink hover:bg-clay-ochre/25"
          }
        >
          <KeyIcon className="size-4 shrink-0" aria-hidden="true" />
          <span>
            {resettingPassword ? "Resetting..." : "Reset Password"}
          </span>
        </Button>

        {isAdmin && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outlined"
              disabled={isSelf}
              onClick={onOpenRoleModal}
              title={
                isSelf
                  ? "You cannot change your own role or account data."
                  : "Change Account Role (Admin only)"
              }
              className="w-full gap-1.5 rounded-md px-3 text-xs font-bold"
            >
              <ShieldCheckIcon className="size-4 shrink-0" aria-hidden="true" />
              <span>Change Role</span>
            </Button>

            <Button
              type="button"
              variant={isSelf ? "outlined" : "danger"}
              disabled={isSelf}
              onClick={onOpenDeleteModal}
              title={
                isSelf
                  ? "You cannot delete your own account."
                  : "Delete Member (Admin only)"
              }
              className={
                isSelf
                  ? "w-full gap-1.5 rounded-md px-3 text-xs font-bold"
                  : "w-full gap-1.5 rounded-md border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 hover:text-rose-800"
              }
            >
              <Trash2Icon className="size-4 shrink-0" aria-hidden="true" />
              <span>Delete</span>
            </Button>
          </div>
        )}
      </div>

      {!isSelf && !isPrivilegedTargetForOrganizer && member.is_claimed && (
        <p className="flex items-start gap-1.5 text-[11px] leading-relaxed text-text-muted">
          <InfoIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Account has been claimed by the member. Temporary password reset is
            disabled for member privacy.
          </span>
        </p>
      )}
    </Card>
  )
}

