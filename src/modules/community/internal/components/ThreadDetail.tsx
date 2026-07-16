// feature/community/components/ThreadDetail
// Private thread conversation view — message bubble list + reply box.

import { useState } from "react"
import { ArrowLeftIcon, LockIcon, SendIcon } from "lucide-react"
import type { PrivateThread, ThreadMessage, Author } from "../types"

interface ThreadDetailProps {
  thread: PrivateThread
  messages: ThreadMessage[]
  currentUser: Author
  onBack: () => void
  onSend: (threadId: string, body: string) => void
  onClose?: (threadId: string) => void  // pengurus can close thread
}

const STATUS_CONFIG = {
  open:        { label: "Terbuka",   bg: "bg-sekkha-teal-light",     text: "text-sekkha-brand-blue" },
  in_progress: { label: "Diproses", bg: "bg-sekkha-surface-yellow",  text: "text-yellow-700"         },
  closed:      { label: "Selesai",  bg: "bg-sekkha-surface",         text: "text-sekkha-slate"       },
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  })
}

export function ThreadDetail({
  thread,
  messages,
  currentUser,
  onBack,
  onSend,
  onClose,
}: ThreadDetailProps) {
  const [reply, setReply] = useState("")
  const cfg = STATUS_CONFIG[thread.status]
  const isClosed = thread.status === "closed"
  const isPengurus = currentUser.role === "pengurus" || currentUser.role === "admin"

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!reply.trim()) return
    onSend(thread.id, reply.trim())
    setReply("")
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 self-start text-caption text-sekkha-slate hover:text-sekkha-ink"
      >
        <ArrowLeftIcon className="size-3.5" />
        Semua pesan
      </button>

      {/* Header */}
      <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sekkha-surface">
            <LockIcon className="size-4 text-sekkha-slate" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="text-body-sm-medium text-sekkha-ink">{thread.subject}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-caption-bold ${cfg.bg} ${cfg.text}`}>
                {cfg.label}
              </span>
              {thread.assigned_to ? (
                <span className="text-caption text-sekkha-muted">
                  Ditangani: {thread.assigned_to.name}
                </span>
              ) : (
                <span className="text-caption text-sekkha-muted">Belum ada pengurus</span>
              )}
            </div>
          </div>
          {/* Pengurus can close the thread */}
          {isPengurus && !isClosed && onClose && (
            <button
              type="button"
              onClick={() => onClose(thread.id)}
              className="shrink-0 rounded-full border border-sekkha-hairline-strong px-3 py-1 text-caption text-sekkha-slate"
            >
              Selesaikan
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {messages.map(msg => {
          const isMe = msg.sender.id === currentUser.id
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              {/* Avatar */}
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-micro font-semibold ${
                msg.sender.role === "umat" ? "bg-sekkha-brand-yellow text-sekkha-ink" : "bg-sekkha-brand-blue text-white"
              }`}>
                {msg.sender.initials}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] ${isMe ? "items-end" : "items-start"} flex flex-col gap-0.5`}>
                {!isMe && (
                  <p className="text-caption text-sekkha-muted">{msg.sender.name}</p>
                )}
                <div className={`rounded-2xl px-4 py-2.5 text-body-sm ${
                  isMe
                    ? "rounded-tr-sm bg-sekkha-primary text-white"
                    : "rounded-tl-sm bg-sekkha-surface text-sekkha-ink"
                }`}>
                  {msg.body}
                </div>
                <p className="text-caption text-sekkha-muted">{timeLabel(msg.created_at)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Reply box */}
      {!isClosed ? (
        <form onSubmit={handleSend} className="flex items-end gap-2 rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3">
          <textarea
            rows={2}
            value={reply}
            onChange={e => setReply(e.target.value)}
            placeholder="Tulis pesan..."
            className="flex-1 resize-none bg-transparent text-body-sm text-sekkha-ink outline-none placeholder:text-sekkha-muted"
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
          />
          <button
            type="submit"
            disabled={!reply.trim()}
            aria-label="Kirim"
            className="rounded-full bg-sekkha-primary p-2.5 text-white disabled:opacity-40"
          >
            <SendIcon className="size-4" />
          </button>
        </form>
      ) : (
        <div className="rounded-xl bg-sekkha-surface px-4 py-3 text-center text-caption text-sekkha-muted">
          Thread ini sudah selesai
        </div>
      )}
    </div>
  )
}
