import type { LeaderboardEntry } from "../types"
import { formatDisplayHandle } from "./LeaderboardPodium"

export function getCompetitionHint(
  entry: LeaderboardEntry,
  allEntries: LeaderboardEntry[],
  metricUnit: string
): string | null {
  if (!entry || !allEntries || allEntries.length === 0) return null
  const idx = allEntries.findIndex((e) => e && e.user_id === entry.user_id)
  if (idx <= 0) return null
  const above = allEntries[idx - 1]
  if (
    !above ||
    typeof above.value !== "number" ||
    typeof entry.value !== "number"
  ) {
    return null
  }
  const diff = above.value - entry.value
  if (diff <= 0) return null
  const aboveUser = above.username
    ? `@${above.username}`
    : above.name
      ? formatDisplayHandle(null, above.name)
      : "the rank above"
  return `${diff.toLocaleString("en-US")} more ${metricUnit} to overtake ${aboveUser}`
}

function formatLeaderboardRoleLabel(role?: string | null): string {
  if (!role) return "Member"
  const r = role.toLowerCase()
  if (r === "admin") return "Admin"
  if (r === "pengurus" || r === "organizer") return "Organizer"
  if (r === "aktivis" || r === "activist") return "Activist"
  return "Member"
}

function LeaderboardRow({
  entry,
  isMe,
  metricUnit,
  allEntries,
}: {
  entry: LeaderboardEntry
  isMe: boolean
  metricUnit: string
  allEntries: LeaderboardEntry[]
}) {
  const hint = isMe ? getCompetitionHint(entry, allEntries, metricUnit) : null
  const displayName = formatDisplayHandle(entry.username, entry.name)
  const roleCaption = formatLeaderboardRoleLabel(entry.role)

  return (
    <li
      id={isMe ? "leaderboard-my-row" : undefined}
      className={`flex min-h-[60px] items-center gap-3 rounded-lg border px-3.5 py-3 transition-colors sm:px-4 ${
        isMe
          ? "border-clay-ochre bg-surface-soft ring-1 ring-clay-ochre/25"
          : "border-hairline bg-canvas hover:bg-surface-soft/70"
      }`}
    >
      <span
        className={`w-8 shrink-0 text-center text-xs font-extrabold ${
          isMe ? "text-ink" : "text-text-muted"
        }`}
      >
        #{entry.rank}
      </span>

      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-sm text-xs font-bold uppercase sm:size-10 ${
          isMe
            ? "bg-ink text-clay-ochre"
            : "border border-hairline bg-surface-soft text-ink"
        }`}
        aria-hidden="true"
      >
        {entry.initials}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="truncate text-xs font-bold text-ink sm:text-sm">
            {displayName}
          </p>
          {isMe && (
            <span
              data-testid="self-you-badge"
              className="shrink-0 rounded-full bg-clay-ochre px-2 py-0.5 text-[9px] font-extrabold text-ink uppercase"
            >
              You
            </span>
          )}
        </div>

        <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[11px] leading-tight">
          <span className="font-medium text-text-muted">{roleCaption}</span>
          {hint && (
            <span className="truncate font-semibold text-clay-teal">
              · {hint}
            </span>
          )}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <span className="text-xs font-extrabold text-ink sm:text-sm">
          {entry.value.toLocaleString("en-US")}
        </span>
        <span className="block text-[10px] font-medium text-text-muted capitalize">
          {metricUnit}
        </span>
      </div>
    </li>
  )
}

export interface LeaderboardListProps {
  rest: LeaderboardEntry[]
  allEntries: LeaderboardEntry[]
  outsideTop10Entry: LeaderboardEntry | null
  myId?: string
  metricUnit: string
  roleGroupLabel: string
}

/**
 * Displays strictly Ranks 4–10. When the logged-in user ranks beyond Top 10 (> 10),
 * shows a dotted divider below Rank #10 followed by the user's own highlighted card.
 * Roles are shown as subtle muted text so the gold `YOU` badge has zero visual ambiguity.
 */
export function LeaderboardList({
  rest,
  allEntries,
  outsideTop10Entry,
  myId,
  metricUnit,
  roleGroupLabel,
}: LeaderboardListProps) {
  const cappedRows = (rest || []).slice(0, 7)
  if (cappedRows.length === 0 && !outsideTop10Entry) return null

  return (
    <div className="space-y-3">
      {cappedRows.length > 0 && (
        <>
          <div className="flex items-center justify-between px-1">
            <p className="text-[11px] font-bold tracking-wider text-text-muted uppercase">
              Rankings: {roleGroupLabel} (4–{Math.min(10, allEntries.length)})
            </p>
          </div>

          <ul role="list" className="space-y-2.5">
            {cappedRows.map((entry) => (
              <LeaderboardRow
                key={entry.user_id}
                entry={entry}
                isMe={entry.user_id === myId}
                metricUnit={metricUnit}
                allEntries={allEntries}
              />
            ))}
          </ul>
        </>
      )}

      {outsideTop10Entry && (
        <div
          role="region"
          aria-label="Your ranking outside Top 10"
          className="space-y-2.5 pt-1"
        >
          <div
            className="flex items-center justify-center py-0.5 select-none"
            aria-hidden="true"
          >
            <div className="flex items-center gap-1.5 rounded-full border border-hairline bg-surface-soft px-3 py-1">
              <span className="size-1 rounded-full bg-text-muted" />
              <span className="size-1 rounded-full bg-text-muted" />
              <span className="size-1 rounded-full bg-text-muted" />
            </div>
          </div>

          <ul role="list">
            <LeaderboardRow
              key={`outside-${outsideTop10Entry.user_id}`}
              entry={outsideTop10Entry}
              isMe={true}
              metricUnit={metricUnit}
              allEntries={allEntries}
            />
          </ul>
        </div>
      )}
    </div>
  )
}
