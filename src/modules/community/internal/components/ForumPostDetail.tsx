// feature/community/components/ForumPostDetail
// Full post view with comment thread.

import { useState } from "react"
import { ArrowLeftIcon, ArrowUpIcon, SendIcon } from "lucide-react"
import { FORUM_CATEGORY_COLORS, FORUM_CATEGORY_LABELS } from "../types"
import type { ForumPost, ForumComment, Author } from "../types"

interface ForumPostDetailProps {
  post: ForumPost
  comments: ForumComment[]
  currentUser: Author
  onBack: () => void
  onUpvotePost: (postId: string) => void
  onUpvoteComment: (commentId: string) => void
  onAddComment: (postId: string, body: string) => void
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`
  return `${Math.floor(diff / 86400)} hari lalu`
}

function Avatar({ author }: { author: Author }) {
  const colors: Record<string, string> = {
    umat: "bg-sekkha-brand-yellow text-sekkha-ink",
    pengurus: "bg-sekkha-brand-blue text-white",
    admin: "bg-sekkha-primary text-white",
  }
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-micro font-semibold ${colors[author.role]}`}>
      {author.initials}
    </div>
  )
}

export function ForumPostDetail({
  post,
  comments,
  currentUser,
  onBack,
  onUpvotePost,
  onUpvoteComment,
  onAddComment,
}: ForumPostDetailProps) {
  const [commentText, setCommentText] = useState("")
  const catColor = FORUM_CATEGORY_COLORS[post.category]

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim()) return
    onAddComment(post.id, commentText.trim())
    setCommentText("")
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 self-start text-caption text-sekkha-slate hover:text-sekkha-ink"
      >
        <ArrowLeftIcon className="size-3.5" />
        Kembali
      </button>

      {/* Post body */}
      <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
        <div className="mb-2 flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-caption-bold ${catColor.bg} ${catColor.text}`}>
            {FORUM_CATEGORY_LABELS[post.category]}
          </span>
          <span className="text-caption text-sekkha-muted">{timeAgo(post.created_at)}</span>
        </div>

        <h2 className="mb-1 text-heading-5 text-sekkha-ink">{post.title}</h2>

        {/* Author */}
        <div className="mb-4 flex items-center gap-2">
          <Avatar author={post.author} />
          <span className="text-caption text-sekkha-slate">{post.author.name}</span>
          {post.author.role !== "umat" && (
            <span className="rounded-full bg-sekkha-surface px-1.5 text-caption text-sekkha-brand-blue capitalize">
              {post.author.role}
            </span>
          )}
        </div>

        <p className="whitespace-pre-line text-body-sm text-sekkha-slate">{post.body}</p>

        {/* Upvote */}
        <div className="mt-4 flex items-center gap-3 border-t border-sekkha-hairline-soft pt-3">
          <button
            type="button"
            onClick={() => onUpvotePost(post.id)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-body-sm-medium transition-colors ${
              post.my_upvote
                ? "border-sekkha-brand-blue bg-sekkha-teal-light text-sekkha-brand-blue"
                : "border-sekkha-hairline-strong text-sekkha-slate"
            }`}
          >
            <ArrowUpIcon className="size-3.5" />
            {post.upvote_count}
          </button>
        </div>
      </div>

      {/* Comments */}
      <div>
        <h3 className="mb-3 text-body-sm-medium text-sekkha-ink">
          {comments.length} Komentar
        </h3>

        {/* Add comment */}
        <form onSubmit={handleSubmit} className="mb-4 flex items-start gap-2">
          <Avatar author={currentUser} />
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-sekkha-hairline-strong bg-sekkha-canvas px-3 py-2 focus-within:border-sekkha-brand-blue">
            <input
              type="text"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              placeholder="Tulis komentar..."
              className="flex-1 bg-transparent text-body-sm text-sekkha-ink outline-none placeholder:text-sekkha-muted"
            />
            <button
              type="submit"
              disabled={!commentText.trim()}
              aria-label="Kirim komentar"
              className="text-sekkha-brand-blue disabled:text-sekkha-muted"
            >
              <SendIcon className="size-4" />
            </button>
          </div>
        </form>

        {/* Comment list */}
        {comments.length === 0 ? (
          <p className="py-4 text-center text-caption text-sekkha-muted">Belum ada komentar. Jadilah yang pertama!</p>
        ) : (
          <ul className="space-y-3" role="list">
            {comments.map(c => (
              <li key={c.id} className="flex gap-2">
                <Avatar author={c.author} />
                <div className="flex-1 rounded-xl bg-sekkha-surface p-3">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="text-caption-bold text-sekkha-ink">{c.author.name}</span>
                    {c.author.role !== "umat" && (
                      <span className="text-caption text-sekkha-brand-blue capitalize">{c.author.role}</span>
                    )}
                    <span className="ml-auto text-caption text-sekkha-muted">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-body-sm text-sekkha-slate">{c.body}</p>
                  <button
                    type="button"
                    onClick={() => onUpvoteComment(c.id)}
                    className={`mt-2 flex items-center gap-1 text-caption ${
                      c.my_upvote ? "text-sekkha-brand-blue" : "text-sekkha-muted"
                    }`}
                  >
                    <ArrowUpIcon className="size-3" />
                    {c.upvote_count}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
