import * as React from "react"
import {
  Select as ShadcnSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { InfiniteScrollFooter } from "@/components/common/InfiniteScrollFooter"
import { isNearScrollBottom } from "@/lib/pagination"
import { cn } from "@/lib/utils"

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SimpleSelectProps {
  id?: string
  label?: string
  placeholder?: string
  value?: string
  defaultValue?: string
  options?: SelectOption[]
  onChange?: (value: string) => void
  onValueChange?: (value: string) => void
  disabled?: boolean
  error?: string | null
  className?: string
  children?: React.ReactNode
  hasMore?: boolean
  isLoadingMore?: boolean
  totalCount?: number
  onLoadMore?: () => void
  emptyText?: string
}

/**
 * Sekkha base Select — aligned strictly with DESIGN.md specifications.
 * Supports optional infinite scrolling when `hasMore` / `onLoadMore` are provided.
 */
export function Select({
  id,
  label,
  placeholder = "Select an option...",
  value,
  defaultValue,
  options,
  onChange,
  onValueChange,
  disabled,
  error,
  className,
  children,
  hasMore,
  isLoadingMore = false,
  totalCount,
  onLoadMore,
  emptyText,
}: SimpleSelectProps) {
  const generatedId = React.useId()
  const selectId = id || generatedId
  const hasError = Boolean(error)
  const handleValueChange = onValueChange || onChange
  const isInfinite = hasMore !== undefined || Boolean(onLoadMore)
  const [menuOpen, setMenuOpen] = React.useState(false)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const sentinelRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!isInfinite || !menuOpen || !hasMore || isLoadingMore || !onLoadMore) {
      return
    }
    if (typeof IntersectionObserver === "undefined") return
    const root = scrollContainerRef.current
    const target = sentinelRef.current
    if (!root || !target) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMore()
        }
      },
      { root, rootMargin: "24px", threshold: 0.1 }
    )
    observer.observe(target)
    return () => observer.disconnect()
  }, [isInfinite, menuOpen, hasMore, isLoadingMore, onLoadMore, options?.length])

  const handleListScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || isLoadingMore || !onLoadMore) return
    if (isNearScrollBottom(e.currentTarget)) {
      onLoadMore()
    }
  }

  // If children provided, render as primitive wrapper
  if (children && !options) {
    return (
      <div className="flex w-full flex-col gap-1.5 text-left font-sans">
        {label && (
          <label
            htmlFor={selectId}
            className="text-xs font-semibold tracking-tight text-[#0a0a0a]"
          >
            {label}
          </label>
        )}
        <ShadcnSelect
          value={value}
          defaultValue={defaultValue}
          onValueChange={handleValueChange}
          disabled={disabled}
        >
          {children}
        </ShadcnSelect>
        {hasError && (
          <p className="animate-in text-xs font-medium text-[#ef4444] fade-in">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-1.5 text-left font-sans">
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold tracking-tight text-[#0a0a0a]"
        >
          {label}
        </label>
      )}
      <ShadcnSelect
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        onOpenChange={setMenuOpen}
        disabled={disabled}
      >
        <SelectTrigger
          id={selectId}
          className={cn(
            "h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 py-2.5 text-sm text-[#0a0a0a] shadow-2xs outline-none hover:bg-[#faf5e8] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]",
            hasError && "border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444]",
            className
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="z-[115] rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] p-1 text-[#0a0a0a] shadow-lg">
          {isInfinite ? (
            <div
              data-slot="select-infinite-list"
              ref={scrollContainerRef}
              onScroll={handleListScroll}
              className="max-h-[168px] overflow-y-auto overscroll-contain pr-0.5"
            >
              <SelectGroup>
                {options && options.length > 0 ? (
                  options.map((opt) => (
                    <SelectItem
                      key={opt.value}
                      value={opt.value}
                      disabled={opt.disabled}
                      className="rounded-[8px] px-3 py-2 text-sm text-[#0a0a0a] hover:bg-[#f5f0e0] focus:bg-[#f5f0e0]"
                    >
                      {opt.label}
                    </SelectItem>
                  ))
                ) : emptyText ? (
                  <p className="px-3 py-2.5 text-xs text-[#6a6a6a]">
                    {emptyText}
                  </p>
                ) : null}
              </SelectGroup>
              <InfiniteScrollFooter
                hasMore={Boolean(hasMore)}
                isLoadingMore={isLoadingMore}
                loadedCount={options?.length ?? 0}
                totalCount={totalCount}
                sentinelRef={sentinelRef}
                onLoadMore={onLoadMore}
              />
            </div>
          ) : (
            <SelectGroup>
              {options?.map((opt) => (
                <SelectItem
                  key={opt.value}
                  value={opt.value}
                  disabled={opt.disabled}
                  className="rounded-[8px] px-3 py-2 text-sm text-[#0a0a0a] hover:bg-[#f5f0e0] focus:bg-[#f5f0e0]"
                >
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          )}
        </SelectContent>
      </ShadcnSelect>
      {hasError && (
        <p className="animate-in text-xs font-medium text-[#ef4444] fade-in">
          {error}
        </p>
      )}
    </div>
  )
}

export {
  ShadcnSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
}
