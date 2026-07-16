// feature/community/types.ts
// Types for Forum (public) + Private Channel (curhat).

// ─── Shared ───────────────────────────────────────────────────────────────────

export type UserRole = "umat" | "aktivis" | "pengurus" | "admin"

export interface Author {
  id: string
  name: string
  role: UserRole
  initials: string
}

// ─── Forum ────────────────────────────────────────────────────────────────────

export type ForumCategory =
  | "diskusi"
  | "pertanyaan"
  | "pengumuman"
  | "berbagi"
  | "lainnya"

export const FORUM_CATEGORY_LABELS: Record<ForumCategory, string> = {
  diskusi:      "Diskusi",
  pertanyaan:   "Pertanyaan",
  pengumuman:   "Pengumuman",
  berbagi:      "Berbagi",
  lainnya:      "Lainnya",
}

export const FORUM_CATEGORY_COLORS: Record<ForumCategory, { bg: string; text: string }> = {
  diskusi:    { bg: "bg-sekkha-teal-light",      text: "text-sekkha-brand-blue"  },
  pertanyaan: { bg: "bg-purple-50",              text: "text-purple-700"          },
  pengumuman: { bg: "bg-sekkha-surface-yellow",  text: "text-yellow-700"          },
  berbagi:    { bg: "bg-emerald-50",             text: "text-emerald-700"         },
  lainnya:    { bg: "bg-sekkha-surface",         text: "text-sekkha-slate"        },
}

export interface ForumPost {
  id: string
  title: string
  body: string
  category: ForumCategory
  author: Author
  created_at: string       // ISO 8601
  comment_count: number
  upvote_count: number
  is_pinned?: boolean
  /** Whether the current user has upvoted */
  my_upvote?: boolean
}

export interface ForumComment {
  id: string
  post_id: string
  body: string
  author: Author
  created_at: string
  upvote_count: number
  my_upvote?: boolean
}

// ─── Private Channel (Curhat) ─────────────────────────────────────────────────

export type ThreadStatus = "open" | "in_progress" | "closed"

export interface PrivateThread {
  id: string
  subject: string
  status: ThreadStatus
  author: Author
  assigned_to: Author | null
  created_at: string
  last_message_at: string
  last_message_preview: string
  unread_count: number
}

export interface ThreadMessage {
  id: string
  thread_id: string
  body: string
  sender: Author
  created_at: string
}
