// feature/community/components/ForumNewPostForm
// Form to create a new forum post.

import { useState } from "react"
import { FORUM_CATEGORY_LABELS } from "../types"
import type { ForumCategory } from "../types"

interface ForumNewPostFormProps {
  onSubmit: (title: string, body: string, category: ForumCategory) => void
  onCancel: () => void
}

const CATEGORIES = Object.keys(FORUM_CATEGORY_LABELS) as ForumCategory[]

export function ForumNewPostForm({ onSubmit, onCancel }: ForumNewPostFormProps) {
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [category, setCategory] = useState<ForumCategory>("diskusi")
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({})

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const err: typeof errors = {}
    if (!title.trim()) err.title = "Judul wajib diisi"
    if (!body.trim()) err.body = "Isi tulisan wajib diisi"
    if (Object.keys(err).length > 0) { setErrors(err); return }
    onSubmit(title.trim(), body.trim(), category)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category */}
      <div className="flex flex-col gap-1.5">
        <label className="text-caption text-sekkha-slate">Kategori</label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`rounded-full px-3 py-1 text-caption-bold transition-colors ${
                category === c
                  ? "bg-sekkha-primary text-white"
                  : "border border-sekkha-hairline-strong text-sekkha-slate"
              }`}
            >
              {FORUM_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="post-title" className="text-caption text-sekkha-slate">
          Judul <span className="text-red-500">*</span>
        </label>
        <input
          id="post-title"
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); setErrors(p => ({ ...p, title: undefined })) }}
          placeholder="Tulis judul yang jelas..."
          className="rounded-lg border border-sekkha-hairline-strong px-3 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
        />
        {errors.title && <p className="text-caption text-red-500">{errors.title}</p>}
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="post-body" className="text-caption text-sekkha-slate">
          Isi <span className="text-red-500">*</span>
        </label>
        <textarea
          id="post-body"
          rows={5}
          value={body}
          onChange={e => { setBody(e.target.value); setErrors(p => ({ ...p, body: undefined })) }}
          placeholder="Ceritakan lebih detail..."
          className="resize-none rounded-lg border border-sekkha-hairline-strong px-3 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
        />
        {errors.body && <p className="text-caption text-red-500">{errors.body}</p>}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel} className="flex-1 rounded-full border border-sekkha-hairline-strong py-2.5 text-body-sm-medium text-sekkha-ink">
          Batal
        </button>
        <button type="submit" className="flex-1 rounded-full bg-sekkha-primary py-2.5 text-body-sm-medium text-white">
          Posting
        </button>
      </div>
    </form>
  )
}
