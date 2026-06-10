// feature/community/components/ThreadCard
// Single private thread item in the list.

import { LockIcon } from "lucide-react"
import type { PrivateThread } from "../types"

interface ThreadCardProps {
  thread: PrivateThread
  onClick: () => void
}

const STATUS_CONFIG = {
  open:        { label: "Terbuka",      bg: "bg-sekkha-teal-light",     text: "text-sekkha-brand-blue" },
  in_progress: { label: "Diproses",    bg: "bg-sekkha-surface-yellow",  text: "text-yellow-700"         },
  closed:      { label: "Selesai",     bg: "bg-sekkha-surface",         text: "text-sekkha-slate"       },
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  return `${Math.floor(diff / 86400)} hari lalu`
}

export function ThreadCard({ thread, onClick }: ThreadCardProps) {
  const cfg = STATUS_CONFIG[thread.status]

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4 text-left transition-shadow hover:shadow-sm"
    >
      <div className="flex items-start gap-3">
        {/* Lock icon */}
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sekkha-surface">
          <LockIcon className="size-4 text-sekkha-slate" aria-hidden="true" />
        </div>

        <div className="min-w-0 flex-1">
          {/* Subject + unread */}
          <div className="flex items-center gap-2">
            <p className={`flex-1 truncate text-body-sm-medium ${thread.unread_count > 0 ? "text-sekkha-ink" : "text-sekkha-slate"}`}>
              {thread.subject}
            </p>
            {thread.unread_count > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sekkha-brand-blue px-1.5 text-micro text-white">
                {thread.unread_count}
              </span>
            )}
          </div>

          {/* Preview + meta */}
          <p className="mt-0.5 truncate text-caption text-sekkha-muted">
            {thread.last_message_preview}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-caption-bold ${cfg.bg} ${cfg.text}`}>
              {cfg.label}
            </span>
            {thread.assigned_to && (
              <span className="text-caption text-sekkha-muted">
                → {thread.assigned_to.name}
              </span>
            )}
            <span className="ml-auto text-caption text-sekkha-muted">
              {timeAgo(thread.last_message_at)}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
