import { CrownIcon, ZapIcon } from "lucide-react"
import type { LeaderboardEntry } from "../types"

const PODIUM_CONFIG: Record<
  1 | 2 | 3,
  {
    height: string
    barBg: string
    border: string
    avatarStyle: string
    rankText: string
  }
> = {
  1: {
    height: "h-20 sm:h-36",
    barBg: "bg-gradient-to-b from-[#e8b94a] to-[#d49e28]",
    border: "border-t border-x border-[#c28e20]",
    avatarStyle: "bg-[#e8b94a] text-[#0a0a0a] ring-3 ring-[#e8b94a]/30 shadow-sm font-black",
    rankText: "text-[#0a0a0a]/75 font-black",
  },
  2: {
    height: "h-14 sm:h-26",
    barBg: "bg-gradient-to-b from-[#e5e5e5] to-[#d0d0d0]",
    border: "border-t border-x border-[#bfbfbf]",
    avatarStyle: "bg-[#e5e5e5] text-[#0a0a0a] ring-2 ring-[#d4d4d4] font-bold",
    rankText: "text-[#0a0a0a]/70 font-extrabold",
  },
  3: {
    height: "h-10 sm:h-20",
    barBg: "bg-gradient-to-b from-[#d9a07a] to-[#c2845c]",
    border: "border-t border-x border-[#a86e49]",
    avatarStyle: "bg-[#d9a07a] text-white ring-2 ring-[#d9a07a]/40 font-bold",
    rankText: "text-[#0a0a0a]/70 font-bold",
  },
}

export function formatDisplayHandle(
  username?: string | null,
  fallbackName?: string | null
): string {
  if (username && username.trim().length > 0) {
    const clean = username.trim()
    return clean.startsWith("@") ? clean : `@${clean}`
  }
  if (fallbackName && fallbackName.trim().length > 0) {
    const clean = fallbackName.trim()
    if (clean.toLowerCase() === "you") return "You"
    return clean.startsWith("@")
      ? clean
      : `@${clean.toLowerCase().replace(/\s+/g, "_")}`
  }
  return "Member"
}

function PodiumColumn({
  entry,
  position,
  myId,
}: {
  entry?: LeaderboardEntry
  position: 1 | 2 | 3
  myId?: string
}) {
  if (!entry) return null
  const isFirst = position === 1
  const isMe = entry.user_id === myId
  const cfg = PODIUM_CONFIG[position]
  const displayName = formatDisplayHandle(entry.username, entry.name)
  const avatarSize = isFirst
    ? "size-12 sm:size-16 text-sm sm:text-base"
    : "size-10 sm:size-13 text-xs sm:text-sm"

  return (
    <div
      role="listitem"
      aria-label={`Rank ${position}, ${displayName}, score ${entry.value.toLocaleString("en-US")}`}
      className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
    >
      {/* Crown for #1; clean aligned height spacer for #2 and #3 to avoid triple rank labels */}
      <div className="flex h-5 items-center justify-center sm:h-6">
        {isFirst && (
          <CrownIcon
            className="size-5 fill-clay-ochre text-clay-ochre sm:size-6"
            aria-hidden="true"
          />
        )}
      </div>

      {/* Unclipped Avatar */}
      <div
        className={`flex shrink-0 items-center justify-center rounded-md uppercase ${avatarSize} ${
          isMe
            ? "bg-ink font-black text-clay-ochre ring-2 ring-clay-ochre shadow-sm"
            : cfg.avatarStyle
        }`}
      >
        {entry.initials}
      </div>

      {/* Handle & Score */}
      <div className="w-full min-w-0 px-0.5 text-center">
        <div className="flex items-center justify-center gap-1">
          <p
            title={displayName}
            className="truncate text-[11px] font-bold text-ink sm:text-sm"
          >
            {displayName}
          </p>
          {isMe && (
            <span
              data-testid="self-you-badge"
              className="shrink-0 rounded-full bg-clay-ochre px-1.5 py-0.5 text-[9px] font-extrabold text-ink uppercase"
            >
              You
            </span>
          )}
        </div>
        <p className="mt-0.5 flex items-center justify-center gap-0.5 text-[11px] font-extrabold text-ink sm:text-xs">
          <ZapIcon
            className="size-3 shrink-0 fill-clay-ochre text-clay-ochre"
            aria-hidden="true"
          />
          <span className="truncate">
            {entry.value.toLocaleString("en-US")}
          </span>
        </p>
      </div>

      {/* Clay Podium Pillar */}
      <div
        className={`${cfg.height} flex w-full items-center justify-center rounded-t-md sm:rounded-t-lg ${cfg.border} ${cfg.barBg} shadow-xs`}
      >
        <span
          className={`text-xl select-none sm:text-3xl ${cfg.rankText}`}
        >
          {position}
        </span>
      </div>
    </div>
  )
}

export interface LeaderboardPodiumProps {
  podium: LeaderboardEntry[]
  myId?: string
}

/**
 * Clean visual Top 3 Podium without redundant rank badges overlapping avatars.
 */
export function LeaderboardPodium({ podium, myId }: LeaderboardPodiumProps) {
  if (!podium || podium.length === 0) return null

  return (
    <div className="rounded-lg border border-hairline bg-surface-soft px-3 pt-3 pb-1 shadow-2xs sm:px-5 sm:pt-4">
      <div
        role="list"
        aria-label="Top three leaderboard positions"
        className={`mx-auto flex items-end justify-center gap-2.5 sm:gap-5 ${
          podium.length === 1
            ? "max-w-[160px]"
            : podium.length === 2
              ? "max-w-xs"
              : "max-w-md"
        }`}
      >
        {podium.length >= 2 && (
          <PodiumColumn entry={podium[1]} position={2} myId={myId} />
        )}
        <PodiumColumn entry={podium[0]} position={1} myId={myId} />
        {podium.length >= 3 && (
          <PodiumColumn entry={podium[2]} position={3} myId={myId} />
        )}
      </div>
    </div>
  )
}

