import { useEffect, useRef } from "react"

export interface UseInfiniteScrollSentinelOptions {
  hasMore: boolean
  loading?: boolean
  loadingMore?: boolean
  onLoadMore: () => void
  rootMargin?: string
}

/**
 * Observes a bottom sentinel element via IntersectionObserver and triggers
 * incremental loading before the user reaches the end of a list.
 */
export function useInfiniteScrollSentinel({
  hasMore,
  loading = false,
  loadingMore = false,
  onLoadMore,
  rootMargin = "200px",
}: UseInfiniteScrollSentinelOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null)
  const onLoadMoreRef = useRef(onLoadMore)
  onLoadMoreRef.current = onLoadMore

  useEffect(() => {
    if (
      !hasMore ||
      loading ||
      loadingMore ||
      typeof IntersectionObserver === "undefined"
    ) {
      return
    }
    const el = sentinelRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMoreRef.current()
        }
      },
      { rootMargin }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadingMore, rootMargin])

  return sentinelRef
}
