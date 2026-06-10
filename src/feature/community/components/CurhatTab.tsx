// feature/community/components/CurhatTab
// Private Channel section: thread list + thread detail + new thread form.

import { useState } from "react"
import { PlusIcon, LockIcon } from "lucide-react"
import { ThreadCard } from "./ThreadCard"
import { ThreadDetail } from "./ThreadDetail"
import { DUMMY_THREADS, DUMMY_MESSAGES } from "../data/threadDummy"
import type { PrivateThread, ThreadMessage, Author } from "../types"

interface CurhatTabProps {
  currentUser: Author
}

type View = "list" | "detail" | "new"

export function CurhatTab({ currentUser }: CurhatTabProps) {
  const [threads, setThreads] = useState<PrivateThread[]>(DUMMY_THREADS)
  const [messages, setMessages] = useState<Record<string, ThreadMessage[]>>(DUMMY_MESSAGES)
  const [view, setView] = useState<View>("list")
  const [selectedThread, setSelectedThread] = useState<PrivateThread | null>(null)

  // New thread form state
  const [newSubject, setNewSubject] = useState("")
  const [newBody, setNewBody] = useState("")
  const [formError, setFormError] = useState("")

  function handleSend(threadId: string, body: string) {
    const msg: ThreadMessage = {
      id: `m-${Date.now()}`,
      thread_id: threadId,
      body,
      sender: currentUser,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => ({ ...prev, [threadId]: [...(prev[threadId] ?? []), msg] }))
    setThreads(prev => prev.map(t =>
      t.id === threadId
        ? { ...t, last_message_preview: body.slice(0, 60), last_message_at: msg.created_at, unread_count: 0, status: t.status === "open" ? "in_progress" : t.status }
        : t,
    ))
    if (selectedThread?.id === threadId) {
      setSelectedThread(prev => prev ? { ...prev, last_message_preview: body.slice(0, 60), status: prev.status === "open" ? "in_progress" : prev.status } : prev)
    }
  }

  function handleClose(threadId: string) {
    setThreads(prev => prev.map(t => t.id === threadId ? { ...t, status: "closed" } : t))
    setSelectedThread(prev => prev?.id === threadId ? { ...prev, status: "closed" } : prev)
  }

  function handleCreateThread(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubject.trim()) { setFormError("Subjek wajib diisi"); return }
    if (!newBody.trim()) { setFormError("Isi pesan wajib diisi"); return }

    const newId = `th-${Date.now()}`
    const now = new Date().toISOString()
    const newThread: PrivateThread = {
      id: newId,
      subject: newSubject.trim(),
      status: "open",
      author: currentUser,
      assigned_to: null,
      created_at: now,
      last_message_at: now,
      last_message_preview: newBody.trim().slice(0, 60),
      unread_count: 0,
    }
    const firstMsg: ThreadMessage = {
      id: `m-${Date.now()}`,
      thread_id: newId,
      body: newBody.trim(),
      sender: currentUser,
      created_at: now,
    }
    setThreads(prev => [newThread, ...prev])
    setMessages(prev => ({ ...prev, [newId]: [firstMsg] }))
    setNewSubject("")
    setNewBody("")
    setFormError("")
    setSelectedThread(newThread)
    setView("detail")
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (view === "new") {
    return (
      <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
        <h2 className="mb-1 text-body-sm-medium text-sekkha-ink">Kirim Pesan Pribadi</h2>
        <p className="mb-4 text-caption text-sekkha-muted">
          Hanya pengurus yang akan membaca pesanmu. Ceritakan apa yang ingin kamu tanyakan atau sampaikan.
        </p>
        <form onSubmit={handleCreateThread} className="space-y-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="th-subj" className="text-caption text-sekkha-slate">Subjek</label>
            <input
              id="th-subj"
              type="text"
              value={newSubject}
              onChange={e => { setNewSubject(e.target.value); setFormError("") }}
              placeholder="Pertanyaan tentang..."
              className="rounded-lg border border-sekkha-hairline-strong px-3 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="th-body" className="text-caption text-sekkha-slate">Pesan</label>
            <textarea
              id="th-body"
              rows={4}
              value={newBody}
              onChange={e => { setNewBody(e.target.value); setFormError("") }}
              placeholder="Ceritakan apa yang kamu rasakan atau ingin tanyakan..."
              className="resize-none rounded-lg border border-sekkha-hairline-strong px-3 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
            />
          </div>
          {formError && <p className="text-caption text-red-500">{formError}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setView("list")} className="flex-1 rounded-full border border-sekkha-hairline-strong py-2.5 text-body-sm-medium text-sekkha-ink">
              Batal
            </button>
            <button type="submit" className="flex-1 rounded-full bg-sekkha-primary py-2.5 text-body-sm-medium text-white">
              Kirim
            </button>
          </div>
        </form>
      </div>
    )
  }

  if (view === "detail" && selectedThread) {
    return (
      <ThreadDetail
        thread={selectedThread}
        messages={messages[selectedThread.id] ?? []}
        currentUser={currentUser}
        onBack={() => { setSelectedThread(null); setView("list") }}
        onSend={handleSend}
        onClose={handleClose}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-heading-5 text-sekkha-ink">Curhat</h1>
          <p className="text-caption text-sekkha-muted">Percakapan privat dengan pengurus</p>
        </div>
        <button
          type="button"
          onClick={() => setView("new")}
          className="flex items-center gap-1.5 rounded-full bg-sekkha-primary px-4 py-2 text-body-sm-medium text-white"
        >
          <PlusIcon className="size-4" />
          Pesan Baru
        </button>
      </div>

      {/* Privacy note */}
      <div className="flex items-start gap-2 rounded-xl bg-sekkha-surface px-4 py-3">
        <LockIcon className="mt-0.5 size-4 shrink-0 text-sekkha-brand-blue" aria-hidden="true" />
        <p className="text-caption text-sekkha-slate">
          Semua percakapan di sini bersifat pribadi. Hanya kamu dan pengurus yang bertugas yang dapat membaca pesanmu.
        </p>
      </div>

      {/* Thread list */}
      {threads.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-body-sm text-sekkha-muted">Belum ada pesan. Mulai curhat dengan pengurus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {threads.map(th => (
            <ThreadCard
              key={th.id}
              thread={th}
              onClick={() => { setSelectedThread(th); setView("detail") }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
