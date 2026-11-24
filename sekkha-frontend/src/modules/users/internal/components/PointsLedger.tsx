import { useState, useEffect, useCallback } from "react"
import {
  Bolt,
  CalendarIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  TrendingDownIcon,
} from "lucide-react"
import { Button, Card } from "@/components/base"
import { InfiniteScrollFooter } from "@/components/common/InfiniteScrollFooter"
import { useInfiniteScrollSentinel } from "@/hooks/useInfiniteScrollSentinel"
import { userApi } from "../api/userApi"
import type { PointTransactionDto } from "../api/userApi"

interface PointsLedgerProps {
  /** Retained for backwards compatibility; balance lives in the Hero & Pass cards. */
  totalPoints?: number
}

const PAGE_SIZE = 15

function formatTxDate(dateStr?: string) {
  if (!dateStr) return "-"
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return dateStr
  }
}

function getTxCategoryLabel(type?: string): string {
  const normalized = (type || "").toLowerCase()
  if (normalized.includes("attendance") || normalized.includes("checkin")) {
    return "Attendance"
  }
  if (normalized.includes("service") || normalized.includes("duty")) {
    return "Service"
  }
  if (normalized.includes("adjust") || normalized.includes("bonus")) {
    return "Bonus"
  }
  return "Activity"
}

export function PointsLedger(_props: PointsLedgerProps) {
  const [transactions, setTransactions] = useState<PointTransactionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = useCallback(
    async (options: { isManualRefresh?: boolean; cursor?: string | null } = {}) => {
      const { isManualRefresh = false, cursor } = options
      const isLoadMore = Boolean(cursor)
      if (isLoadMore) {
        setLoadingMore(true)
      } else if (isManualRefresh) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      try {
        const pageRes =
          typeof userApi.getPointsHistoryPage === "function"
            ? await userApi.getPointsHistoryPage({
                limit: PAGE_SIZE,
                cursor: cursor ?? undefined,
              })
            : undefined

        if (pageRes) {
          if (isLoadMore) {
            setTransactions((prev) => {
              const seen = new Set(prev.map((t) => t.id))
              const unique = pageRes.items.filter((t) => !seen.has(t.id))
              return [...prev, ...unique]
            })
          } else {
            setTransactions(pageRes.items)
          }
          setHasMore(pageRes.has_more)
          setNextCursor(pageRes.next_cursor)
        } else {
          const data = await userApi.getPointsHistory(PAGE_SIZE)
          setTransactions(data)
          setHasMore(false)
          setNextCursor(null)
        }
      } catch (err: any) {
        console.error("Failed to fetch points history:", err)
        if (!isLoadMore) {
          setError(err?.message || "Please check your connection and try again.")
        }
      } finally {
        setLoading(false)
        setLoadingMore(false)
        setRefreshing(false)
      }
    },
    []
  )

  useEffect(() => {
    void fetchHistory({ isManualRefresh: false })
  }, [fetchHistory])

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore || !nextCursor) return
    void fetchHistory({ cursor: nextCursor })
  }, [hasMore, loadingMore, nextCursor, fetchHistory])

  const sentinelRef = useInfiniteScrollSentinel({
    hasMore,
    loading: loading || refreshing,
    loadingMore,
    onLoadMore: handleLoadMore,
  })

  const visibleTransactions = transactions

  return (
    <div data-testid="points-ledger-section" className="space-y-3 sm:space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink sm:text-base">
            Karma Points History
          </h3>
          <p className="hidden text-xs text-text-muted sm:block">
            Track points earned from attendance, duties, and community events.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="icon"
          onClick={() => void fetchHistory({ isManualRefresh: true })}
          disabled={loading || refreshing}
          aria-label="Refresh points history"
          title="Refresh history"
          className="h-10 w-10 shrink-0 rounded-[12px]"
        >
          <RefreshCwIcon
            className={`size-4 text-text-muted ${refreshing ? "animate-spin text-ink" : ""}`}
          />
        </Button>
      </div>

      {loading ? (
        <div
          aria-busy="true"
          aria-label="Loading points history"
          className="space-y-2.5"
        >
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="flex items-center justify-between rounded-[16px] border border-hairline bg-canvas p-3.5"
            >
              <div className="flex items-center gap-3">
                <div className="size-9 animate-pulse rounded-[10px] bg-surface-soft" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 animate-pulse rounded bg-surface-soft" />
                  <div className="h-3 w-20 animate-pulse rounded bg-surface-soft" />
                </div>
              </div>
              <div className="h-6 w-14 animate-pulse rounded-full bg-surface-soft" />
            </div>
          ))}
        </div>
      ) : error ? (
        <Card className="border-rose-200 bg-rose-50/70 p-5 text-center shadow-none">
          <div className="mx-auto mb-2.5 flex size-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <AlertCircleIcon className="size-5" />
          </div>
          <p className="text-sm font-bold text-ink">
            Unable to load points history
          </p>
          <p className="mt-1 text-xs text-text-muted">{error}</p>
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => void fetchHistory({ isManualRefresh: true })}
              className="h-10 rounded-[12px] px-4 text-xs font-bold"
            >
              Try Again
            </Button>
          </div>
        </Card>
      ) : transactions.length === 0 ? (
        <div className="rounded-[20px] border border-dashed border-hairline bg-surface-soft/70 p-8 text-center">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-[14px] border border-hairline bg-canvas text-text-muted">
            <Bolt className="size-5" />
          </div>
          <p className="text-sm font-bold text-ink">No point history yet</p>
          <p className="mt-1 text-xs text-text-muted">
            Attend weekly activities or scan event QR codes to start collecting
            Karma Points!
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          <Card className="overflow-hidden border-hairline bg-canvas p-0 shadow-none">
            <ul className="divide-y divide-hairline">
              {visibleTransactions.map((tx) => {
                const delta = tx.points_delta ?? tx.points ?? 0
                const isPositive = delta >= 0

                return (
                  <li
                    key={tx.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-soft/50"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] border ${
                          isPositive
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-rose-200 bg-rose-50 text-rose-700"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUpIcon className="size-4" />
                        ) : (
                          <TrendingDownIcon className="size-4" />
                        )}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <p className="truncate text-xs font-bold text-ink sm:text-sm">
                          {tx.description || getTxCategoryLabel(tx.type)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium text-text-muted">
                          <span className="inline-flex items-center gap-1 tabular-nums">
                            <CalendarIcon className="size-3" />
                            {formatTxDate(tx.created_at)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{getTxCategoryLabel(tx.type)}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${
                        isPositive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {isPositive ? `+${delta}` : delta} pts
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>

          <InfiniteScrollFooter
            hasMore={hasMore}
            isLoadingMore={loadingMore}
            loadedCount={visibleTransactions.length}
            sentinelRef={sentinelRef}
            onLoadMore={handleLoadMore}
            itemLabel="transactions"
          />
        </div>
      )}
    </div>
  )
}
