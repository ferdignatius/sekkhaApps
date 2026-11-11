import type { RefObject } from "react"
import { Loader2Icon } from "lucide-react"
import { cn } from "@/lib/utils"

interface InfiniteScrollFooterProps {
  hasMore: boolean
  isLoadingMore?: boolean
  loadedCount: number
  totalCount?: number
  sentinelRef?: RefObject<HTMLDivElement | null>
  onLoadMore?: () => void
  tone?: "light" | "dark"
  itemLabel?: string
}

export function InfiniteScrollFooter({
  hasMore,
  isLoadingMore = false,
  loadedCount,
  totalCount,
  sentinelRef,
  onLoadMore,
  tone = "light",
  itemLabel = "options",
}: InfiniteScrollFooterProps) {
  if (!hasMore && !isLoadingMore && loadedCount === 0) {
    return null
  }

  const mutedText = tone === "dark" ? "text-white/60" : "text-[#6a6a6a]"
  const buttonText =
    tone === "dark"
      ? "text-white/80 hover:bg-white/10 hover:text-white"
      : "text-[#6a6a6a] hover:bg-[#f5f0e0] hover:text-[#0a0a0a]"

  return (
    <div ref={sentinelRef} className="px-2 py-1.5 text-center">
      {isLoadingMore ? (
        <div
          role="status"
          className={cn(
            "inline-flex items-center justify-center gap-1.5 text-[11px] font-medium",
            mutedText
          )}
        >
          <Loader2Icon className="size-3 animate-spin" aria-hidden="true" />
          <span>Loading more...</span>
        </div>
      ) : hasMore ? (
        onLoadMore ? (
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              onLoadMore()
            }}
            className={cn(
              "w-full cursor-pointer rounded-[8px] px-2 py-1 text-[11px] font-medium transition-colors",
              buttonText
            )}
          >
            Scroll to load more
            {typeof totalCount === "number" && totalCount > loadedCount
              ? ` (${loadedCount} of ${totalCount})`
              : ""}
          </button>
        ) : (
          <p className={cn("text-[11px] font-medium", mutedText)}>
            Scroll to load more
          </p>
        )
      ) : loadedCount > 5 ? (
        <p className={cn("text-[10px] font-medium opacity-75", mutedText)}>
          All {loadedCount} {itemLabel} loaded
        </p>
      ) : null}
    </div>
  )
}

