import {
  CheckCircle2Icon,
  CopyIcon,
  GraduationCapIcon,
  MailIcon,
  MessageCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
} from "lucide-react"
import { Badge, Card } from "@/components/base"
import type { MemberDetailDto } from "../../api/peopleApi"
import {
  formatRoleLabel,
  getRoleDescription,
} from "../../utils/memberFormatters"

export interface MemberProfileTabProps {
  member: MemberDetailDto
  onCopyValue: (value: string, label: string) => void
}

/**
 * Categorized member profile tab grouped into Direct Communication,
 * Academic & Community, and Personal & Account Timeline cards.
 */
export function MemberProfileTab({
  member,
  onCopyValue,
}: MemberProfileTabProps) {
  const memberSinceFormatted = member.created_at
    ? new Date(member.created_at).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null

  return (
    <div className="space-y-4">
      {/* ── 1. DIRECT COMMUNICATION ── */}
      <Card
        variant="outlined"
        className="overflow-hidden rounded-xl border-hairline bg-canvas shadow-xs"
      >
        <div className="border-b border-hairline bg-surface-soft px-4 py-3 sm:px-5">
          <h3 className="text-title-sm flex items-center gap-2 text-sm font-bold text-ink">
            <MessageCircleIcon
              className="size-4 text-clay-teal"
              aria-hidden="true"
            />
            <span>Direct Communication</span>
          </h3>
        </div>

        <div className="divide-y divide-hairline-soft">
          {/* Email Row */}
          <div className="flex flex-col justify-between gap-3 p-4 sm:flex-row sm:items-center sm:px-5">
            <div className="flex items-center gap-2.5 text-xs text-text-muted">
              <MailIcon className="size-4 shrink-0 text-ink" aria-hidden="true" />
              <span className="font-semibold">Email Address</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {member.email ? (
                <>
                  <a
                    href={`mailto:${member.email}`}
                    className="text-sm font-semibold text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink"
                  >
                    {member.email}
                  </a>
                  <button
                    type="button"
                    onClick={() => onCopyValue(member.email!, "Email address")}
                    aria-label="Copy email address"
                    className="inline-flex min-h-[36px] cursor-pointer items-center gap-1 rounded-sm border border-hairline bg-surface-soft px-2.5 py-1 text-xs font-semibold text-ink transition-colors hover:bg-surface-card focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
                  >
                    <CopyIcon className="size-3.5" aria-hidden="true" />
                    <span>Copy</span>
                  </button>
                </>
              ) : (
                <span className="text-xs font-medium text-text-muted">
                  Not provided
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* ── 2. ACADEMIC & COMMUNITY ── */}
      <Card
        variant="outlined"
        className="overflow-hidden rounded-xl border-hairline bg-canvas shadow-xs"
      >
        <div className="border-b border-hairline bg-surface-soft px-4 py-3 sm:px-5">
          <h3 className="text-title-sm flex items-center gap-2 text-sm font-bold text-ink">
            <GraduationCapIcon
              className="size-4 text-clay-teal"
              aria-hidden="true"
            />
            <span>Academic & Community</span>
          </h3>
        </div>

        <div className="divide-y divide-hairline-soft">
          {/* School / Institution */}
          <div className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-center sm:px-5">
            <div className="flex items-center gap-2.5 text-xs text-text-muted">
              <GraduationCapIcon
                className="size-4 shrink-0 text-ink"
                aria-hidden="true"
              />
              <span className="font-semibold">School / College</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-ink">
                {member.school || "Not assigned"}
              </span>
              {member.school && member.school_status === "verified" && (
                <Badge
                  variant="mint"
                  size="sm"
                  icon={<CheckCircle2Icon className="size-3" aria-hidden="true" />}
                >
                  Verified
                </Badge>
              )}
            </div>
          </div>

          {/* Assigned Role & Scope */}
          <div className="flex flex-col justify-between gap-2 p-4 sm:flex-row sm:items-start sm:px-5">
            <div className="flex items-center gap-2.5 text-xs text-text-muted">
              <ShieldCheckIcon
                className="size-4 shrink-0 text-ink"
                aria-hidden="true"
              />
              <span className="font-semibold">Community Role</span>
            </div>

            <div className="space-y-1 sm:max-w-sm sm:text-right">
              <p className="text-sm font-bold text-ink">
                {formatRoleLabel(member.role)}
              </p>
              <p className="text-xs leading-relaxed text-text-muted">
                {getRoleDescription(member.role)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* ── 3. PERSONAL & ACCOUNT TIMELINE ── */}
      <Card
        variant="outlined"
        className="overflow-hidden rounded-xl border-hairline bg-canvas shadow-xs"
      >
        <div className="border-b border-hairline bg-surface-soft px-4 py-3 sm:px-5">
          <h3 className="text-title-sm flex items-center gap-2 text-sm font-bold text-ink">
            <SparklesIcon
              className="size-4 text-clay-ochre"
              aria-hidden="true"
            />
            <span>Personal & Account Timeline</span>
          </h3>
        </div>

        <div className="divide-y divide-hairline-soft">
          <div className="flex items-center justify-between gap-3 p-4 sm:px-5">
            <div className="flex items-center gap-2.5 text-xs text-text-muted">
              <SparklesIcon
                className="size-4 shrink-0 text-ink"
                aria-hidden="true"
              />
              <span className="font-semibold">Member Since</span>
            </div>
            <span className="text-sm font-semibold text-ink">
              {memberSinceFormatted || "—"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

