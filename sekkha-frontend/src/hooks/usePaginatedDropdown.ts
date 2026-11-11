import { useCallback, useEffect, useRef, useState } from "react"
import {
  DROPDOWN_PAGE_SIZE,
  isNearScrollBottom,
  mergeUniqueByKey,
  normalizePaginatedResult,
} from "@/lib/pagination"
import type { PaginatedResult } from "@/lib/pagination"

export interface UsePaginatedDropdownOptions<T> {
  fetcher: (params: {
    page: number
    limit: number
    search?: string
  }) => Promise<PaginatedResult<T> | T[]>
  getKey: (item: T) => string
  pageSize?: number
  search?: string
  enabled?: boolean
  initialItems?: T[]
}

export function usePaginatedDropdown<T>({
  fetcher,
  getKey,
  pageSize = DROPDOWN_PAGE_SIZE,
  search = "",
  enabled = true,
  initialItems,
}: UsePaginatedDropdownOptions<T>) {
  const [items, setItems] = useState<T[]>(() => initialItems ?? [])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const getKeyRef = useRef(getKey)
  getKeyRef.current = getKey

  const requestSeqRef = useRef(0)
  const loadingMoreRef = useRef(false)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  const loadPage = useCallback(
    async (targetPage: number, mode: "replace" | "append", searchStr = search) => {
      if (mode === "append" && loadingMoreRef.current) return

      const seq = ++requestSeqRef.current
      if (mode === "replace") {
        loadingMoreRef.current = false
        setLoading(true)
        setError(null)
      } else {
        loadingMoreRef.current = true
        setLoadingMore(true)
      }

      try {
        const raw = await fetcherRef.current({
          page: targetPage,
          limit: pageSize,
          search: searchStr || undefined,
        })

        if (!mountedRef.current || seq !== requestSeqRef.current) return

        const normalized = normalizePaginatedResult<T>(raw, targetPage, pageSize)
        setItems((prev) =>
          mode === "replace"
            ? normalized.items
            : mergeUniqueByKey(prev, normalized.items, getKeyRef.current)
        )
        setPage(normalized.page)
        setTotal(normalized.total)
        setHasMore(normalized.has_more)
      } catch (err) {
        if (!mountedRef.current || seq !== requestSeqRef.current) return
        setError(err instanceof Error ? err.message : "Failed to load options")
      } finally {
        if (mountedRef.current) {
          if (mode === "replace") setLoading(false)
          loadingMoreRef.current = false
          setLoadingMore(false)
        }
      }
    },
    [pageSize, search]
  )

  useEffect(() => {
    if (!enabled) return
    void loadPage(1, "replace", search)
  }, [enabled, search, loadPage])

  const loadMore = useCallback(() => {
    if (!enabled || loading || loadingMoreRef.current || !hasMore) return
    void loadPage(page + 1, "append", search)
  }, [enabled, loading, hasMore, page, search, loadPage])

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLElement>) => {
      if (isNearScrollBottom(e.currentTarget)) {
        loadMore()
      }
    },
    [loadMore]
  )

  const reset = useCallback(() => {
    requestSeqRef.current++
    loadingMoreRef.current = false
    setItems([])
    setPage(1)
    setTotal(0)
    setHasMore(false)
    setLoading(false)
    setLoadingMore(false)
    setError(null)
  }, [])

  return {
    items,
    setItems,
    page,
    total,
    hasMore,
    loading,
    loadingMore,
    error,
    loadMore,
    handleScroll,
    reload: () => loadPage(1, "replace", search),
    reset,
  }
}
