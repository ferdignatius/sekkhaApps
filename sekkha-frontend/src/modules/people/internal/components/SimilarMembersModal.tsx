import { useEffect } from "react"
import type { ReactNode } from "react"
import { createPortal } from "react-dom"
import { InfoIcon, UsersIcon, XIcon } from "lucide-react"
import { Badge } from "@/components/base/Badge"
import {
  formatMemberInitials,
  formatRoleLabel,
  getRoleAvatarClass,
  getRoleBadgeVariant,
} from "../utils/memberFormatters"
import type { SimilarMemberDto } from "../api/peopleApi"

interface SimilarMembersNoticeProps {
  members: SimilarMemberDto[]
  totalCount: number
  onSeeMore: () => void
  variant?: "light" | "dark"
  title?: string
}

/**
 * Non-blocking informational banner above similar/creation views.
 * Renders null when empty (`members.length === 0`) so no empty UI clutters the form.
 */
export function SimilarMembersNotice({
  members,
  totalCount,
  onSeeMore,
  variant = "light",
  title,
}: SimilarMembersNoticeProps) {
  const visibleMembers = members.slice(0, 5)
  if (visibleMembers.length === 0) return null

  const displayCount = Math.min(
    Math.max(totalCount, visibleMembers.length),
    5
  )
  const preview = visibleMembers.slice(0, 2)
  const isDark = variant === "dark"

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        isDark
          ? "space-y-2 rounded-2xl border border-amber-400/35 bg-amber-400/10 p-3 text-left"
          : "space-y-2 rounded-[14px] border border-[#e8b94a]/50 bg-[#faf5e8] p-3 text-left"
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2">
          <InfoIcon
            className={
              isDark
                ? "mt-0.5 size-4 shrink-0 text-amber-300"
                : "mt-0.5 size-4 shrink-0 text-[#b47b00]"
            }
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p
              className={
                isDark
                  ? "text-xs font-bold text-amber-200"
                  : "text-xs font-bold text-[#0a0a0a]"
              }
            >
              {title ||
                `Similar existing ${displayCount === 1 ? "member" : "members"} found (${displayCount})`}
            </p>
            <p
              className={
                isDark
                  ? "text-[11px] text-white/75"
                  : "text-[11px] text-[#6a6a6a]"
              }
            >
              Informational only — you can still register a new member.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onSeeMore}
          className={
            isDark
              ? "shrink-0 cursor-pointer rounded-full border border-amber-300/40 bg-amber-400/20 px-2.5 py-1 text-[11px] font-bold text-amber-200 transition-colors hover:bg-amber-400/30"
              : "shrink-0 cursor-pointer rounded-full border border-[#ded5c0] bg-[#fffaf0] px-2.5 py-1 text-[11px] font-bold text-[#0a0a0a] shadow-2xs transition-colors hover:bg-[#f0e8d5]"
          }
        >
          See More
        </button>
      </div>

      <div className="space-y-1">
        {preview.map((m) => (
          <div
            key={m.id}
            className={
              isDark
                ? "flex items-center justify-between gap-2 rounded-xl bg-white/5 px-2.5 py-1.5"
                : "flex items-center justify-between gap-2 rounded-[10px] border border-[#e6decb] bg-[#fffaf0] px-2.5 py-1.5"
            }
          >
            <div className="min-w-0 flex-1">
              <p
                className={
                  isDark
                    ? "truncate text-xs font-semibold text-white"
                    : "truncate text-xs font-semibold text-[#0a0a0a]"
                }
              >
                {m.name}
              </p>
              <p
                className={
                  isDark
                    ? "truncate text-[10px] text-white/65"
                    : "truncate text-[10px] text-[#6a6a6a]"
                }
              >
                {m.user_number || "No ID"}
                {m.username ? ` · @${m.username}` : ""}
                {m.school ? ` · ${m.school}` : ""}
              </p>
            </div>
            <Badge variant={getRoleBadgeVariant(m.role)} size="sm">
              {formatRoleLabel(m.role)}
            </Badge>
          </div>
        ))}
      </div>
    </div>
  )
}

interface SimilarMembersModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  searchTerm: string
  members: SimilarMemberDto[]
  renderItemAction?: (member: SimilarMemberDto) => ReactNode
}

/**
 * Stacked z-[120] modal listing all similar existing members.
 * Preserves the underlying Pre-Provision / Manual Entry form state cleanly.
 */
export function SimilarMembersModal({
  open,
  onOpenChange,
  searchTerm,
  members,
  renderItemAction,
}: SimilarMembersModalProps) {
  useEffect(() => {
    if (!open || typeof window === "undefined") return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation()
        onOpenChange(false)
      }
    }
    window.addEventListener("keydown", onKeyDown, true)
    return () => window.removeEventListener("keydown", onKeyDown, true)
  }, [open, onOpenChange])

  if (!open) return null

  const visibleMembers = members.slice(0, 5)

  const modalNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="similar-members-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3.5 font-sans sm:p-4"
    >
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-xs"
        onClick={() => onOpenChange(false)}
      />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex max-h-[85vh] w-full max-w-lg animate-in flex-col overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] text-left shadow-2xl zoom-in-95 fade-in"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#e5e5e5] bg-[#faf5e8] px-5 py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-[#e8b94a] shadow-2xs">
              <UsersIcon className="size-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3
                id="similar-members-modal-title"
                className="truncate text-sm font-bold text-[#0a0a0a] sm:text-base"
              >
                Similar Existing Members
              </h3>
              <p className="truncate text-xs text-[#6a6a6a]">
                Matches for &ldquo;{searchTerm.trim()}&rdquo; (
                {visibleMembers.length})
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close similar members"
            onClick={() => onOpenChange(false)}
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#6a6a6a] transition-colors hover:bg-[#e6decb]/60 hover:text-[#0a0a0a]"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {visibleMembers.length === 0 ? (
            <div className="py-10 text-center">
              <UsersIcon
                className="mx-auto mb-2 size-8 text-[#6a6a6a]/40"
                aria-hidden="true"
              />
              <p className="text-xs font-medium text-[#6a6a6a]">
                No existing members with similar names.
              </p>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {visibleMembers.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8]/80 p-3"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div
                      className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] border text-xs font-bold uppercase ${getRoleAvatarClass(m.role)}`}
                      aria-hidden="true"
                    >
                      {formatMemberInitials(m.name)}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-xs font-bold text-[#0a0a0a] sm:text-sm">
                          {m.name}
                        </p>
                        <Badge variant={getRoleBadgeVariant(m.role)} size="sm">
                          {formatRoleLabel(m.role)}
                        </Badge>
                        <Badge
                          variant={m.is_claimed ? "emerald" : "ochre"}
                          size="sm"
                        >
                          {m.is_claimed ? "Claimed" : "Unclaimed"}
                        </Badge>
                      </div>
                      <p className="truncate font-mono text-[11px] text-[#6a6a6a]">
                        {m.user_number || "No ID"}
                        {m.username ? ` · @${m.username}` : ""}
                        {m.school ? ` · ${m.school}` : ""}
                      </p>
                    </div>
                  </div>

                  {renderItemAction && (
                    <div className="shrink-0">{renderItemAction(m)}</div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-[#e5e5e5] bg-[#faf5e8] px-5 py-3">
          <span className="text-[11px] text-[#6a6a6a]">
            Informational preview only
          </span>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer rounded-[10px] border border-[#ded5c0] bg-[#fffaf0] px-4 py-1.5 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#f0e8d5]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== "undefined"
    ? createPortal(modalNode, document.body)
    : modalNode
}

