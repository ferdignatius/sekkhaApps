import { cn } from "@/lib/utils"

/**
 * Base Clay Skeleton placeholder with smooth warm shimmer pulse
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-2xl bg-[#ebe6d6]/60 dark:bg-muted", className)}
      {...props}
    />
  )
}

/**
 * Skeleton placeholder for directory tables (Desktop)
 */
function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-sekkha-hairline">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3.5">
          <Skeleton
            className={cn(
              "h-4",
              i === 0 ? "h-10 w-44 rounded-xl" : i === 1 ? "w-28" : i === 2 ? "w-20" : "w-16"
            )}
          />
        </td>
      ))}
    </tr>
  )
}

/**
 * Skeleton placeholder for directory cards (Mobile)
 */
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-sekkha-hairline bg-white/80 p-4 space-y-3 shadow-2xs",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-xl" />
        <div className="space-y-1.5 flex-1">
          <Skeleton className="h-4 w-32 rounded-md" />
          <Skeleton className="h-3 w-20 rounded-md" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="pt-2 border-t border-sekkha-hairline flex items-center justify-between">
        <Skeleton className="h-3.5 w-24 rounded-md" />
        <Skeleton className="h-3.5 w-16 rounded-md" />
      </div>
    </div>
  )
}

/**
 * Skeleton placeholder for Top Metric KPI Stat Card
 */
function SkeletonMetricCard() {
  return (
    <div className="rounded-2xl border border-sekkha-hairline bg-white p-3.5 space-y-2 shadow-2xs">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3.5 w-20 rounded-md" />
        <Skeleton className="size-6 rounded-lg" />
      </div>
      <div className="flex items-baseline justify-between pt-1">
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-3 w-12 rounded-md" />
      </div>
    </div>
  )
}

export { Skeleton, SkeletonTableRow, SkeletonCard, SkeletonMetricCard }
