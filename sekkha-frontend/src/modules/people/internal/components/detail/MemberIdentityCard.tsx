import { Link } from "@tanstack/react-router"
import {
  CheckCircle2Icon,
  CheckIcon,
  ClockIcon,
  CopyIcon,
  CalendarCheckIcon,
  ShieldCheckIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "lucide-react"
import { Alert, Badge, Card } from "@/components/base"
import type { MemberDetailDto } from "../../api/peopleApi"
import {
  formatMemberInitials,
  formatRoleLabel,
  getRoleAvatarClass,
  getRoleBadgeVariant,
} from "../../utils/memberFormatters"

export interface MemberIdentityCardProps {
  member: MemberDetailDto
  isSelf: boolean
  isPrivilegedTargetForOrganizer: boolean
  copiedId: boolean
  onCopyMemberId: (id?: string | number | null) => void
}

/**
 * Primary identity hero card rendered in the sticky left summary column on desktop
 * and at the top of the member detail stack on mobile.
 */
export function MemberIdentityCard({
  member,
  isSelf,
  isPrivilegedTargetForOrganizer,
  copiedId,
  onCopyMemberId,
}: MemberIdentityCardProps) {
  const memberNumberStr = member.user_number ? String(member.user_number) : ""
  const initials = formatMemberInitials(member.name)
  const totalAttendances =
    member.total_attendances ?? member.attendances?.length ?? 0

  return (
    <Card
      variant="soft"
      className="space-y-4 rounded-xl border-hairline bg-surface-soft p-5 shadow-xs sm:p-6"
    >
      {/* Top Row: Avatar + Name + Identity Cluster */}
      <div className="flex items-start gap-4">
        <div
          className={`flex size-16 shrink-0 items-center justify-center rounded-lg border text-lg font-bold tracking-wider uppercase shadow-xs sm:size-20 sm:text-xl ${getRoleAvatarClass(member.role)}`}
          aria-hidden="true"
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          <h1 className="text-title-lg leading-tight font-bold break-words text-ink">
            {member.name}
          </h1>

          {member.username && (
            <p className="font-mono text-xs font-semibold text-clay-teal">
              @{member.username}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            <Badge
              variant={getRoleBadgeVariant(member.role)}
              size="sm"
              icon={<ShieldCheckIcon className="size-3" aria-hidden="true" />}
            >
              {formatRoleLabel(member.role)}
            </Badge>

            {isSelf && (
              <Badge variant="primary" size="sm">
                You
              </Badge>
            )}

            <Badge
              variant={member.is_claimed ? "mint" : "ochre"}
              size="sm"
              icon={
                member.is_claimed ? (
                  <CheckCircle2Icon className="size-3" aria-hidden="true" />
                ) : (
                  <ClockIcon className="size-3" aria-hidden="true" />
                )
              }
            >
              {member.is_claimed ? "Claimed Account" : "Unclaimed"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Member ID One-Tap Copy Strip */}
      {memberNumberStr && (
        <button
          type="button"
          onClick={() => onCopyMemberId(memberNumberStr)}
          aria-label={`Copy Member ID ${memberNumberStr}`}
          className="flex min-h-[44px] w-full cursor-pointer items-center justify-between rounded-md border border-hairline bg-canvas px-3.5 py-2 text-left transition-colors hover:bg-surface-card focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
        >
          <div>
            <span className="block text-[10px] font-bold tracking-wider text-text-muted uppercase">
              Member ID
            </span>
            <span className="font-mono text-sm font-bold tracking-wider text-ink">
              {memberNumberStr}
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted">
            {copiedId ? (
              <>
                <CheckIcon
                  className="size-4 text-emerald-600"
                  aria-hidden="true"
                />
                <span className="text-emerald-700">Copied</span>
              </>
            ) : (
              <>
                <CopyIcon className="size-4" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </span>
        </button>
      )}

      {/* Quick Engagement Counters */}
      <div className="grid grid-cols-2 gap-2.5 border-t border-hairline pt-3">
        <div className="rounded-md border border-hairline bg-canvas p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-text-muted uppercase">
            <CalendarCheckIcon className="size-3.5 text-ink" aria-hidden="true" />
            <span>Attendance</span>
          </div>
          <p className="mt-1 text-base font-bold text-ink">
            {totalAttendances}{" "}
            {totalAttendances === 1 ? "Event" : "Events"}
          </p>
        </div>

        <div className="rounded-md border border-hairline bg-canvas p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-wider text-text-muted uppercase">
            <SparklesIcon className="size-3.5 text-clay-ochre" aria-hidden="true" />
            <span>Karma Points</span>
          </div>
          <p className="mt-1 text-base font-bold text-ink">
            {(member.points ?? 0).toLocaleString("en-US")} Pts
          </p>
        </div>
      </div>

      {/* Contextual Self-Protection or Staff Read-Only Notice */}
      {isSelf && (
        <Alert
          variant="info"
          title="Viewing Your Own Account"
          description={
            <div className="space-y-2">
              <p>
                Editing personal details, changing roles, resetting temporary
                passwords, and self-deletion are disabled here for governance.
              </p>
              <Link
                to="/profile"
                className="inline-flex items-center gap-1 font-semibold text-ink underline underline-offset-4 hover:opacity-80"
              >
                <span>Open Profile Settings</span>
                <ArrowRightIcon className="size-3.5" aria-hidden="true" />
              </Link>
            </div>
          }
        />
      )}

      {!isSelf && isPrivilegedTargetForOrganizer && (
        <Alert
          variant="warning"
          title="Read-Only Staff Profile"
          description="Organizers have read-only access to Organizer and Admin accounts. Contact an Admin to adjust staff roles or credentials."
        />
      )}
    </Card>
  )
}

