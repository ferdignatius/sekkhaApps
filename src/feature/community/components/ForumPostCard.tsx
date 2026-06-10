// feature/community/components/ForumPostCard
// Single post card in the forum list — shows title, snippet, category, author, stats.

import { ArrowUpIcon, MessageSquareIcon, PinIcon } from "lucide-react"
import { FORUM_CATEGORY_COLORS, FORUM_CATEGORY_LABELS } from "../types"
import type { ForumPost } from "../types"

interface ForumPostCardProps {
  post: ForumPost
  onClick: () => void
  onUpvote: (postId: string) => void
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  return `${Math.floor(diff / 86400)} hari lalu`
}

export function ForumPostCard({ post, onClick, onUpvote }: ForumPostCardProps) {
  const catColor = FORUM_CATEGORY_COLORS[post.category]

  return (
    <article className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4 transition-shadow hover:shadow-sm">
      {/* Pin badge */}
      {post.is_pinned && (
        <div className="mb-2 flex items-center gap-1 text-caption text-sekkha-brand-blue">
          <PinIcon className="size-3" aria-hidden="true" />
          <span>Disematkan</span>
        </div>
      )}

      {/* Category + time */}
      <div className="mb-2 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-caption-bold ${catColor.bg} ${catColor.text}`}>
          {FORUM_CATEGORY_LABELS[post.category]}
        </span>
        <span className="text-caption text-sekkha-muted">{timeAgo(post.created_at)}</span>
      </div>

      {/* Title — clickable */}
      <button
        type="button"
        onClick={onClick}
        className="mb-1 w-full text-left text-body-md-medium text-sekkha-ink hover:text-sekkha-brand-blue"
      >
        {post.title}
      </button>

      {/* Body preview */}
      <p className="mb-3 line-clamp-2 text-body-sm text-sekkha-slate">{post.body}</p>

      {/* Footer: author + stats */}
      <div className="flex items-center justify-between gap-3">
        {/* Author */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sekkha-brand-yellow text-micro font-semibold text-sekkha-ink">
            {post.author.initials}
          </div>
          <span className="text-caption text-sekkha-slate">{post.author.name}</span>
          {post.author.role !== "umat" && (
            <span className="rounded-full bg-sekkha-surface px-1.5 py-0.5 text-caption text-sekkha-brand-blue capitalize">
              {post.author.role}
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUpvote(post.id) }}
            className={`flex items-center gap-1 text-caption transition-colors ${
              post.my_upvote ? "text-sekkha-brand-blue" : "text-sekkha-muted hover:text-sekkha-slate"
            }`}
            aria-label={`${post.upvote_count} upvote`}
          >
            <ArrowUpIcon className="size-3.5" />
            <span>{post.upvote_count}</span>
          </button>
          <button
            type="button"
            onClick={onClick}
            className="flex items-center gap-1 text-caption text-sekkha-muted hover:text-sekkha-slate"
            aria-label={`${post.comment_count} komentar`}
          >
            <MessageSquareIcon className="size-3.5" />
            <span>{post.comment_count}</span>
          </button>
        </div>
      </div>
    </article>
  )
}
