import * as React from "react"
import { useState, useEffect, useRef, useId, useMemo } from "react"
import {
  ChevronDownIcon,
  SearchIcon,
  CheckIcon,
  XIcon,
  Loader2Icon,
} from "lucide-react"
import { InfiniteScrollFooter } from "@/components/common/InfiniteScrollFooter"
import { isNearScrollBottom } from "@/lib/pagination"
import { cn } from "@/lib/utils"

export interface ManyToOneSelectOption {
  value: string
  label: string
  disabled?: boolean
  description?: string
  [key: string]: any
}

export interface ManyToOneSelectProps {
  id?: string
  name?: string
  label?: string
  placeholder?: string
  searchPlaceholder?: string
  value?: string
  defaultValue?: string
  options?: ManyToOneSelectOption[]
  onChange?: (value: string, option?: ManyToOneSelectOption) => void
  onValueChange?: (value: string, option?: ManyToOneSelectOption) => void
  disabled?: boolean
  error?: string | null
  className?: string
  triggerClassName?: string
  menuClassName?: string
  hasMore?: boolean
  isLoadingMore?: boolean
  totalCount?: number
  onLoadMore?: () => void
  search?: string
  onSearchChange?: (search: string) => void
  clientFilter?: boolean
  emptyText?: string
  itemLabel?: string
  clearable?: boolean
  loading?: boolean
}

export type M2OSelectProps = ManyToOneSelectProps

/**
 * Sekkha ManyToOneSelect (M2OSelect) — Searchable dropdown with infinite scroll.
 * Follows DESIGN.md tokens (warm cream canvas #fffaf0, rounded border, dark text, subtle hover).
 */
export function ManyToOneSelect({
  id,
  label,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  value,
  defaultValue = "",
  options = [],
  onChange,
  onValueChange,
  disabled = false,
  error = null,
  className,
  triggerClassName,
  menuClassName,
  hasMore,
  isLoadingMore = false,
  totalCount,
  onLoadMore,
  search: controlledSearch,
  onSearchChange,
  clientFilter = true,
  emptyText = "No options found",
  itemLabel = "options",
  clearable = false,
  loading = false,
}: ManyToOneSelectProps) {
  const generatedId = useId()
  const selectId = id || generatedId
  const listboxId = `${selectId}-listbox`
  const hasError = Boolean(error)

  const [isOpen, setIsOpen] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [internalSearch, setInternalSearch] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const currentValue = value !== undefined ? value : internalValue
  const currentSearch =
    controlledSearch !== undefined ? controlledSearch : internalSearch

  const isInfinite = hasMore !== undefined || Boolean(onLoadMore)

  // Find currently selected option
  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === currentValue),
    [options, currentValue]
  )

  // Filter options client-side if enabled
  const displayedOptions = useMemo(() => {
    if (!clientFilter || !currentSearch.trim()) {
      return options
    }
    const query = currentSearch.trim().toLowerCase()
    return options.filter((opt) => opt.label.toLowerCase().includes(query))
  }, [options, clientFilter, currentSearch])

  // Reset highlighted index on options or search query change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [displayedOptions.length, currentSearch])

  // Scroll active item into view
  useEffect(() => {
    if (!isOpen || !listRef.current) return
    const target = listRef.current.querySelector(
      `[data-index="${highlightedIndex}"]`
    ) as HTMLElement | null
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, isOpen])

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 20)
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Infinite scroll sentinel observer
  useEffect(() => {
    if (!isOpen || !hasMore || isLoadingMore || !onLoadMore) return
    if (typeof IntersectionObserver === "undefined") return
    const root = listRef.current
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
  }, [isOpen, hasMore, isLoadingMore, onLoadMore, displayedOptions.length])

  const handleListScroll = (e: React.UIEvent<HTMLUListElement>) => {
    if (!hasMore || isLoadingMore || !onLoadMore) return
    if (isNearScrollBottom(e.currentTarget)) {
      onLoadMore()
    }
  }

  const handleSelect = (opt: ManyToOneSelectOption) => {
    if (opt.disabled) return
    if (value === undefined) {
      setInternalValue(opt.value)
    }
    onValueChange?.(opt.value, opt)
    onChange?.(opt.value, opt)
    setIsOpen(false)
    if (controlledSearch === undefined) {
      setInternalSearch("")
    }
    onSearchChange?.("")
    triggerRef.current?.focus()
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (value === undefined) {
      setInternalValue("")
    }
    onValueChange?.("", undefined)
    onChange?.("", undefined)
    if (controlledSearch === undefined) {
      setInternalSearch("")
    }
    onSearchChange?.("")
  }

  const handleSearchChange = (newVal: string) => {
    if (controlledSearch === undefined) {
      setInternalSearch(newVal)
    }
    onSearchChange?.(newVal)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return

    if (!isOpen) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        (e.key === " " && e.target === triggerRef.current)
      ) {
        e.preventDefault()
        setIsOpen(true)
        setHighlightedIndex(0)
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (displayedOptions.length > 0) {
        setHighlightedIndex((prev) =>
          prev < displayedOptions.length - 1 ? prev + 1 : 0
        )
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      if (displayedOptions.length > 0) {
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : displayedOptions.length - 1
        )
      }
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (displayedOptions[highlightedIndex]) {
        handleSelect(displayedOptions[highlightedIndex])
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setIsOpen(false)
      triggerRef.current?.focus()
    }
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-1.5 text-left font-sans",
        className
      )}
    >
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold tracking-tight text-[#0a0a0a]"
        >
          {label}
        </label>
      )}

      <div ref={containerRef} className="relative w-full">
        {/* Trigger Button */}
        <button
          ref={triggerRef}
          id={selectId}
          type="button"
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          disabled={disabled}
          onClick={() => {
            if (disabled) return
            setIsOpen((prev) => !prev)
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 py-2.5 text-left text-sm text-[#0a0a0a] shadow-2xs transition-all outline-none",
            "hover:bg-[#faf5e8] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]",
            hasError &&
              "border-[#ef4444] bg-[#ef4444]/5 text-[#ef4444] focus:border-[#ef4444] focus:ring-[#ef4444]",
            disabled && "cursor-not-allowed opacity-50",
            isOpen && "border-[#0a0a0a] ring-1 ring-[#0a0a0a]",
            triggerClassName
          )}
        >
          <span className={cn("truncate", !selectedOption && "text-[#6a6a6a]")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            {clearable && selectedOption && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation()
                    e.preventDefault()
                    handleClear(e as any)
                  }
                }}
                className="cursor-pointer rounded-full p-0.5 text-[#6a6a6a] transition-colors hover:bg-[#e5e5e5]/50 hover:text-[#0a0a0a]"
              >
                <XIcon className="size-3.5" aria-hidden="true" />
              </span>
            )}
            <ChevronDownIcon
              className={cn(
                "size-4 shrink-0 text-[#6a6a6a] transition-transform duration-200",
                isOpen && "rotate-180"
              )}
              aria-hidden="true"
            />
          </div>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            className={cn(
              "absolute top-[calc(100%+4px)] left-0 z-50 w-full animate-in overflow-hidden rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-lg fade-in-0 zoom-in-95",
              menuClassName
            )}
          >
            {/* Pinned Search Input */}
            <div className="border-b border-[#e5e5e5] bg-[#fffaf0] p-2">
              <div className="relative flex items-center">
                <SearchIcon
                  className="pointer-events-none absolute left-3 size-4 text-[#6a6a6a]"
                  aria-hidden="true"
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={currentSearch}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  className="h-9 w-full rounded-[8px] border border-[#e5e5e5] bg-[#ffffff] pr-8 pl-9 text-xs font-medium text-[#0a0a0a] transition-all outline-none placeholder:text-[#767676] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
                />
                {currentSearch ? (
                  <button
                    type="button"
                    aria-label="Clear search"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleSearchChange("")
                      searchInputRef.current?.focus()
                    }}
                    className="absolute right-2.5 rounded-full p-1 text-[#6a6a6a] transition-colors hover:bg-[#e5e5e5]/50 hover:text-[#0a0a0a]"
                  >
                    <XIcon className="size-3.5" aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Options List */}
            <ul
              ref={listRef}
              id={listboxId}
              role="listbox"
              data-slot="select-infinite-list"
              onScroll={handleListScroll}
              className="max-h-60 overflow-y-auto overscroll-contain p-1.5 focus:outline-none"
            >
              {loading ? (
                <li className="flex items-center justify-center gap-1.5 py-6 text-center text-xs text-[#6a6a6a]">
                  <Loader2Icon
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                  <span>Loading...</span>
                </li>
              ) : displayedOptions.length === 0 ? (
                <li className="px-3 py-6 text-center text-xs text-[#6a6a6a]">
                  {emptyText}
                </li>
              ) : (
                displayedOptions.map((opt, idx) => {
                  const isSelected = opt.value === currentValue
                  const isHighlighted = idx === highlightedIndex

                  return (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={opt.disabled}
                      data-index={idx}
                      data-value={opt.value}
                      onClick={() => handleSelect(opt)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-sm text-[#0a0a0a] transition-colors",
                        isHighlighted && "bg-[#faf5e8]",
                        isSelected && "bg-[#f5f0e0] font-semibold",
                        opt.disabled && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <span className="truncate">{opt.label}</span>
                      {isSelected && (
                        <CheckIcon
                          className="size-4 shrink-0 text-[#0a0a0a]"
                          aria-hidden="true"
                        />
                      )}
                    </li>
                  )
                })
              )}

              {!loading && isInfinite && (
                <li aria-hidden="true" className="list-none">
                  <InfiniteScrollFooter
                    hasMore={Boolean(hasMore)}
                    isLoadingMore={isLoadingMore}
                    loadedCount={options.length}
                    totalCount={totalCount}
                    sentinelRef={sentinelRef}
                    onLoadMore={onLoadMore}
                    itemLabel={itemLabel}
                  />
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {hasError && (
        <p className="animate-in text-xs font-medium text-[#ef4444] fade-in">
          {error}
        </p>
      )}
    </div>
  )
}

export const M2OSelect = ManyToOneSelect
