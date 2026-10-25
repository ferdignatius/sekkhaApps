import { useState, useEffect } from "react"
import {
  CoinsIcon,
  CalendarIcon,
  SparklesIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  RefreshCwIcon,
} from "lucide-react"
import { userApi } from "../api/userApi"
import type { PointTransactionDto } from "../api/userApi"

interface PointsLedgerProps {
  totalPoints?: number
}

export function PointsLedger({ totalPoints = 0 }: PointsLedgerProps) {
  const [transactions, setTransactions] = useState<PointTransactionDto[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchHistory()
  }, [])

  async function fetchHistory() {
    try {
      const data = await userApi.getPointsHistory(50)
      setTransactions(data)
    } catch (err) {
      console.error("Failed to fetch points history:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  function handleRefresh() {
    setRefreshing(true)
    fetchHistory()
  }

  return (
    <div className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e5e5] pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-[10px] bg-[#0a0a0a] text-white shadow-xs">
            <CoinsIcon className="size-4.5 text-[#e8b94a]" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
              Points Ledger & History
            </h3>
            <p className="text-xs text-[#6a6a6a]">
              Transparent record of attendance points and service duty rewards
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-[10px] border border-[#e5e5e5] bg-[#faf5e8] px-3 py-1 text-right">
            <span className="block text-[9px] font-bold tracking-wider text-[#6a6a6a] uppercase">
              Current Balance
            </span>
            <span className="font-mono text-sm font-black text-[#0a0a0a]">
              {totalPoints.toLocaleString("en-US")} Pts
            </span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex size-8 cursor-pointer items-center justify-center rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a] disabled:opacity-50"
            title="Refresh Ledger"
          >
            <RefreshCwIcon
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Ledger Content */}
      {loading ? (
        <div className="space-y-2.5 py-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-[12px] bg-[#faf5e8]"
            />
          ))}
        </div>
      ) : transactions.length > 0 ? (
        <div className="divide-y divide-[#f0f0f0] overflow-hidden rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8]">
          {transactions.map((tx) => {
            const delta = tx.points_delta ?? tx.points
            const isPositive = delta >= 0

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between gap-3 p-3.5 transition-colors hover:bg-[#fffaf0]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex size-8 shrink-0 items-center justify-center rounded-[8px] border ${
                      isPositive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-rose-200 bg-rose-50 text-rose-700"
                    }`}
                  >
                    {isPositive ? (
                      <ArrowUpRightIcon className="size-4" />
                    ) : (
                      <ArrowDownLeftIcon className="size-4" />
                    )}
                  </div>

                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-xs font-bold text-[#0a0a0a] sm:text-sm">
                      {tx.description || "Point Transaction"}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#6a6a6a]">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="size-3" />
                        <span>
                          {new Date(tx.created_at).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>

                      <span className="py-0.2 rounded-full bg-[#f0f0f0] px-2 text-[10px] font-semibold text-[#0a0a0a] uppercase">
                        {tx.type || "system"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <span
                    className={`inline-block font-mono text-xs font-bold sm:text-sm ${
                      isPositive ? "text-emerald-700" : "text-rose-700"
                    }`}
                  >
                    {isPositive ? `+${delta}` : delta} Pts
                  </span>
                  {tx.running_balance !== undefined && (
                    <p className="font-mono text-[10px] text-[#6a6a6a]">
                      Bal: {tx.running_balance} Pts
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-2 py-8 text-center text-[#6a6a6a]">
          <SparklesIcon className="mx-auto size-8 text-[#6a6a6a]/40" />
          <p className="text-xs font-bold text-[#0a0a0a]">
            No Point Transactions Yet
          </p>
          <p className="text-xs">
            Attend temple fellowship events or volunteer for service duties to
            earn karma points.
          </p>
        </div>
      )}
    </div>
  )
}
