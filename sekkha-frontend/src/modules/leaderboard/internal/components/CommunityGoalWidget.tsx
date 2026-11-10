import { ChevronDownIcon, SparklesIcon, UsersIcon } from "lucide-react"

export interface CommunityGoalWidgetProps {
  current: number
  target: number
  label: string
  seasonTargetOverride?: number
}

/**
 * Preserves collapsible summary on mobile (< md) and full Clay card on desktop sidebar.
 */
export function CommunityGoalWidget({
  current,
  target,
  label,
  seasonTargetOverride,
}: CommunityGoalWidgetProps) {
  const effectiveTarget = target || 500
  const pct = Math.min(100, Math.round(((current || 0) / effectiveTarget) * 100))
  const displayTitle =
    label && label.toLowerCase().includes("absensi")
      ? "Vihara Community Attendance Target"
      : label || "Vihara Community Attendance Target"

  return (
    <aside className="space-y-4 md:col-span-4">
      {/* Mobile: Collapsible Details Widget */}
      <details className="group rounded-xl border border-hairline bg-canvas shadow-2xs md:hidden">
        <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-2.5 px-3.5 py-2.5 focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-surface-soft text-ink">
            <UsersIcon className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-ink">
              Community goal
            </span>
            <span className="block text-[11px] text-text-muted">
              {current} of {effectiveTarget} check-ins
            </span>
          </span>
          <span className="rounded-xs bg-surface-soft px-2 py-1 text-xs font-extrabold text-ink">
            {pct}%
          </span>
          <ChevronDownIcon
            className="size-4 shrink-0 text-text-muted transition-transform group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="space-y-3 border-t border-hairline px-3.5 py-3">
          <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted">
            <span>Achieved: {current}</span>
            <span>Target: {effectiveTarget}</span>
          </div>
          <div
            role="progressbar"
            aria-label="Community attendance progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="h-2.5 w-full overflow-hidden rounded-full border border-hairline bg-surface-card"
          >
            <div
              className="h-full rounded-full bg-ink transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="flex items-start gap-2 text-xs leading-relaxed text-text-muted">
            <SparklesIcon
              className="mt-0.5 size-4 shrink-0 text-clay-ochre"
              aria-hidden="true"
            />
            <span>
              Work together to achieve our community attendance target this
              season.
            </span>
          </p>
        </div>
      </details>

      {/* Desktop / Tablet: Full Sidebar Card */}
      <div className="hidden space-y-3 rounded-xl border border-hairline bg-canvas p-4 shadow-2xs sm:p-5 md:block">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-sm border border-hairline bg-surface-soft text-ink">
              <UsersIcon className="size-4" aria-hidden="true" />
            </div>
            <h3 className="text-xs font-bold text-ink">{displayTitle}</h3>
          </div>
          <span className="rounded-xs border border-hairline bg-surface-soft px-2 py-0.5 text-xs font-extrabold text-ink">
            {pct}%
          </span>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-semibold text-text-muted">
            <span>Achieved: {current}</span>
            <span>Target: {effectiveTarget} Check-Ins</span>
          </div>
          <div
            role="progressbar"
            aria-label="Community attendance progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="h-2.5 w-full overflow-hidden rounded-full border border-hairline bg-surface-card"
          >
            <div
              className="h-full rounded-full bg-ink shadow-xs transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-hairline bg-surface-soft p-3 text-xs font-medium text-text-muted">
          <SparklesIcon
            className="mt-0.5 size-4 shrink-0 text-clay-ochre"
            aria-hidden="true"
          />
          <span>
            Together as a community, let&apos;s achieve the target of{" "}
            <strong className="text-ink">
              {seasonTargetOverride ?? effectiveTarget} check-ins
            </strong>{" "}
            this season!
          </span>
        </div>
      </div>
    </aside>
  )
}

