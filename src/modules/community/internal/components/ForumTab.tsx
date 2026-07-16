// feature/community/components/ForumTab
// Forum section: post list + post detail + new post form.

import { useState } from "react"
import { PlusIcon } from "lucide-react"
import { ForumPostCard } from "./ForumPostCard"
import { ForumPostDetail } from "./ForumPostDetail"
import { ForumNewPostForm } from "./ForumNewPostForm"
import { DUMMY_POSTS, DUMMY_COMMENTS } from "../data/forumDummy"
import { FORUM_CATEGORY_LABELS } from "../types"
import type { ForumPost, ForumComment, ForumCategory, Author } from "../types"

interface ForumTabProps {
  currentUser: Author
}

type View = "list" | "detail" | "new"

export function ForumTab({ currentUser }: ForumTabProps) {
  const [posts, setPosts] = useState<ForumPost[]>(DUMMY_POSTS)
  const [comments, setComments] = useState<Record<string, ForumComment[]>>(DUMMY_COMMENTS)
  const [view, setView] = useState<View>("list")
  const [selectedPost, setSelectedPost] = useState<ForumPost | null>(null)
  const [activeCategory, setActiveCategory] = useState<ForumCategory | "all">("all")

  // ── Handlers ────────────────────────────────────────────────────────────────

  function handleUpvotePost(postId: string) {
    setPosts(prev => prev.map(p =>
      p.id === postId
        ? { ...p, my_upvote: !p.my_upvote, upvote_count: p.my_upvote ? p.upvote_count - 1 : p.upvote_count + 1 }
        : p,
    ))
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => prev
        ? { ...prev, my_upvote: !prev.my_upvote, upvote_count: prev.my_upvote ? prev.upvote_count - 1 : prev.upvote_count + 1 }
        : prev,
      )
    }
  }

  function handleUpvoteComment(commentId: string) {
    if (!selectedPost) return
    setComments(prev => ({
      ...prev,
      [selectedPost.id]: (prev[selectedPost.id] ?? []).map(c =>
        c.id === commentId
          ? { ...c, my_upvote: !c.my_upvote, upvote_count: c.my_upvote ? c.upvote_count - 1 : c.upvote_count + 1 }
          : c,
      ),
    }))
  }

  function handleAddComment(postId: string, body: string) {
    const newComment: ForumComment = {
      id: `c-${Date.now()}`,
      post_id: postId,
      body,
      author: currentUser,
      created_at: new Date().toISOString(),
      upvote_count: 0,
      my_upvote: false,
    }
    setComments(prev => ({ ...prev, [postId]: [...(prev[postId] ?? []), newComment] }))
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p,
    ))
  }

  function handleNewPost(title: string, body: string, category: ForumCategory) {
    const newPost: ForumPost = {
      id: `post-${Date.now()}`,
      title,
      body,
      category,
      author: currentUser,
      created_at: new Date().toISOString(),
      comment_count: 0,
      upvote_count: 0,
      my_upvote: false,
    }
    setPosts(prev => [newPost, ...prev])
    setComments(prev => ({ ...prev, [newPost.id]: [] }))
    setView("list")
  }

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = posts
    .filter(p => activeCategory === "all" || p.category === activeCategory)
    .sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1
      if (!a.is_pinned && b.is_pinned) return 1
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

  // ── Render ───────────────────────────────────────────────────────────────────

  if (view === "new") {
    return (
      <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
        <h2 className="mb-4 text-body-sm-medium text-sekkha-ink">Buat Postingan Baru</h2>
        <ForumNewPostForm onSubmit={handleNewPost} onCancel={() => setView("list")} />
      </div>
    )
  }

  if (view === "detail" && selectedPost) {
    return (
      <ForumPostDetail
        post={selectedPost}
        comments={comments[selectedPost.id] ?? []}
        currentUser={currentUser}
        onBack={() => { setSelectedPost(null); setView("list") }}
        onUpvotePost={handleUpvotePost}
        onUpvoteComment={handleUpvoteComment}
        onAddComment={handleAddComment}
      />
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-heading-5 text-sekkha-ink">Forum Komunitas</h1>
        <button
          type="button"
          onClick={() => setView("new")}
          className="flex items-center gap-1.5 rounded-full bg-sekkha-primary px-4 py-2 text-body-sm-medium text-white"
        >
          <PlusIcon className="size-4" />
          Tulis
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(["all", ...Object.keys(FORUM_CATEGORY_LABELS)] as ("all" | ForumCategory)[]).map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 rounded-full px-3 py-1 text-caption-bold transition-colors ${
              activeCategory === cat
                ? "bg-sekkha-primary text-white"
                : "border border-sekkha-hairline-strong text-sekkha-slate"
            }`}
          >
            {cat === "all" ? "Semua" : FORUM_CATEGORY_LABELS[cat as ForumCategory]}
          </button>
        ))}
      </div>

      {/* Post list */}
      {filtered.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-body-sm text-sekkha-muted">Belum ada postingan di kategori ini.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(post => (
            <ForumPostCard
              key={post.id}
              post={post}
              onClick={() => { setSelectedPost(post); setView("detail") }}
              onUpvote={handleUpvotePost}
            />
          ))}
        </div>
      )}
    </div>
  )
}
