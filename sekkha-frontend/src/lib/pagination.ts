import { api } from "@/lib/api"

export const DROPDOWN_PAGE_SIZE = 5

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  total_pages: number
  has_more: boolean
}

export interface PaginatedFetchParams {
  page?: number
  limit?: number
  search?: string
}

export interface FetchSchoolsPageParams extends PaginatedFetchParams {
  isActive?: boolean
  includePending?: boolean
  fallbackToPublic?: boolean
  noCache?: boolean
}

/**
 * Shared paginated school fetcher for infinite-scroll school dropdowns (limit=5 by default).
 */
export async function fetchSchoolsPaginated<T>(
  params?: FetchSchoolsPageParams
): Promise<PaginatedResult<T>> {
  const page = Math.max(1, Math.floor(params?.page ?? 1))
  const limit = Math.max(1, Math.floor(params?.limit ?? DROPDOWN_PAGE_SIZE))

  const q = new URLSearchParams()
  if (params?.isActive !== undefined) {
    q.set("is_active", String(params.isActive))
  }
  if (params?.includePending) {
    q.set("include_pending", "true")
  }
  q.set("page", String(page))
  q.set("limit", String(limit))
  q.set("paginated", "true")
  if (params?.search?.trim()) {
    q.set("search", params.search.trim())
  }

  const query = q.toString()
  const requestOptions = params?.noCache ? { noCache: true } : undefined

  try {
    const res = await api.get<unknown>(
      `/configure/schools?${query}`,
      requestOptions
    )
    return normalizePaginatedResult<T>(res, page, limit)
  } catch (err) {
    if (!params?.fallbackToPublic) throw err
    const fallback = await api.get<unknown>(`/schools?${query}`, requestOptions)
    return normalizePaginatedResult<T>(fallback, page, limit)
  }
}

/**
 * Normalizes paginated API envelopes ({ items, total, page, limit, has_more }),
 * legacy array payloads, or wrapped responses into a strict PaginatedResult.
 */
export function normalizePaginatedResult<T>(
  raw: unknown,
  page = 1,
  limit = DROPDOWN_PAGE_SIZE
): PaginatedResult<T> {
  const safePage = Math.max(1, Math.floor(page))
  const safeLimit = Math.max(1, Math.floor(limit))

  if (Array.isArray(raw)) {
    const allItems = raw as T[]
    const shouldClientSlice = allItems.length > safeLimit || safePage > 1
    const start = shouldClientSlice ? (safePage - 1) * safeLimit : 0
    const items = shouldClientSlice
      ? allItems.slice(start, start + safeLimit)
      : allItems
    const total = allItems.length
    return {
      items,
      total,
      page: safePage,
      limit: safeLimit,
      total_pages: Math.max(1, Math.ceil(total / safeLimit)),
      has_more: start + items.length < total,
    }
  }

  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    const inner =
      obj.data && typeof obj.data === "object" && !Array.isArray(obj.data)
        ? (obj.data as Record<string, unknown>)
        : obj

    const list =
      (Array.isArray(inner.items) ? inner.items : null) ??
      (Array.isArray(inner.schools) ? inner.schools : null) ??
      (Array.isArray(inner.data) ? inner.data : null) ??
      (Array.isArray(obj.items) ? obj.items : null) ??
      (Array.isArray(obj.schools) ? obj.schools : null) ??
      (Array.isArray(obj.data) ? obj.data : null)

    if (list) {
      const pagination =
        (inner.pagination as Record<string, unknown> | undefined) ??
        (obj.pagination as Record<string, unknown> | undefined) ??
        inner

      const rawTotal =
        typeof pagination.total === "number"
          ? pagination.total
          : typeof obj.total === "number"
            ? obj.total
            : list.length

      const resolvedPage =
        typeof pagination.page === "number" ? pagination.page : safePage
      const resolvedLimit =
        typeof pagination.limit === "number" ? pagination.limit : safeLimit

      const explicitHasMore =
        typeof pagination.has_more === "boolean"
          ? pagination.has_more
          : undefined

      const isExplicitPaginated =
        explicitHasMore !== undefined || typeof pagination.page === "number"

      if (!isExplicitPaginated && list.length > resolvedLimit) {
        const start = (resolvedPage - 1) * resolvedLimit
        const sliced = (list as T[]).slice(start, start + resolvedLimit)
        return {
          items: sliced,
          total: list.length,
          page: resolvedPage,
          limit: resolvedLimit,
          total_pages: Math.max(1, Math.ceil(list.length / resolvedLimit)),
          has_more: start + sliced.length < list.length,
        }
      }

      const items = list as T[]
      const hasMore =
        explicitHasMore ??
        (resolvedPage - 1) * resolvedLimit + items.length < rawTotal

      return {
        items,
        total: rawTotal,
        page: resolvedPage,
        limit: resolvedLimit,
        total_pages:
          typeof pagination.total_pages === "number"
            ? pagination.total_pages
            : Math.max(1, Math.ceil(rawTotal / resolvedLimit)),
        has_more: hasMore,
      }
    }
  }

  return {
    items: [],
    total: 0,
    page: safePage,
    limit: safeLimit,
    total_pages: 1,
    has_more: false,
  }
}

/**
 * Merges incoming options into an existing array in O(N), deduplicating by a key.
 */
export function mergeUniqueByKey<T>(
  existing: T[],
  incoming: T[],
  getKey: (item: T) => string
): T[] {
  if (incoming.length === 0) return existing
  const seen = new Set(existing.map(getKey))
  const appended: T[] = []
  for (const item of incoming) {
    const key = getKey(item)
    if (!seen.has(key)) {
      seen.add(key)
      appended.push(item)
    }
  }
  return appended.length > 0 ? [...existing, ...appended] : existing
}

/**
 * Returns true when a scrollable container is scrolled within `thresholdPx` of the bottom.
 */
export function isNearScrollBottom(
  el: Pick<HTMLElement, "scrollTop" | "scrollHeight" | "clientHeight">,
  thresholdPx = 28
): boolean {
  if (!el || el.scrollHeight <= 0) return false
  return el.scrollHeight - el.scrollTop - el.clientHeight <= thresholdPx
}
