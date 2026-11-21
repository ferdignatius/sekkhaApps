import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { Card } from "@/components/base"
import { cn } from "@/lib/utils"

export interface CollapsibleBottomSheetProps {
  /** Upper content on mobile covered when the sheet slides up (always visible on lg+). */
  topContent: ReactNode
  /** Optional desktop-only right aside column (lg+). */
  sideContent?: ReactNode
  /** Pinned header rendered inside the sheet below the mobile grab handle. */
  header: ReactNode
  /** Optional sub-header/banner rendered between the sheet header and scrollable body. */
  subHeader?: ReactNode
  /** Scrollable body content inside the sheet. */
  children: ReactNode
  /** Controlled expanded state. Omit for uncontrolled internal state. */
  expanded?: boolean
  /** Callback when expanded state changes. */
  onExpandedChange?: (expanded: boolean) => void
  /** Accessible label for the grab handle when collapsed. */
  expandLabel?: string
  /** Accessible label for the grab handle when expanded. */
  collapseLabel?: string
  /** Optional data-testid for the sheet Card. */
  drawerTestId?: string
  /** Optional data-testid for the scrollable content wrapper. */
  scrollTestId?: string
  /** Additional classes for the outer container. */
  className?: string
  /** Additional classes for the sheet Card. */
  drawerClassName?: string
}

/**
 * Apple Maps-style persistent overlay bottom sheet on mobile (`< lg`) with
 * free 1:1 GPU `translate3d` dragging over `topContent`, snapping between
 * peek (below `topContent`) and full-height expanded states.
 * Renders as a standard 1- or 2-column layout on desktop (`>= lg`).
 */
export function CollapsibleBottomSheet({
  topContent,
  sideContent,
  header,
  subHeader,
  children,
  expanded: controlledExpanded,
  onExpandedChange,
  expandLabel = "Expand list",
  collapseLabel = "Show top section",
  drawerTestId = "collapsible-sheet-drawer",
  scrollTestId = "collapsible-sheet-scroll",
  className,
  drawerClassName,
}: CollapsibleBottomSheetProps) {
  const [internalExpanded, setInternalExpanded] = useState(false)
  const isControlled = controlledExpanded !== undefined
  const expanded = isControlled ? controlledExpanded : internalExpanded

  const setExpanded = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === "function" ? next(expanded) : next
    if (!isControlled) {
      setInternalExpanded(resolved)
    }
    onExpandedChange?.(resolved)
  }

  const topContentRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const sheetTransformRef = useRef<HTMLDivElement | null>(null)

  const [topHeight, setTopHeight] = useState(0)
  const dragStartYRef = useRef<number | null>(null)
  const dragStartTranslateRef = useRef(0)
  const currentTranslateRef = useRef(0)
  const rafIdRef = useRef<number | null>(null)
  const didDragRef = useRef(false)

  // Measure `topContent` height so collapsed sheet rests right below it
  useEffect(() => {
    const el = topContentRef.current
    if (!el) return

    const updateHeight = () => {
      const h = el.getBoundingClientRect().height
      if (h > 0) {
        setTopHeight(Math.round(h))
      }
    }

    updateHeight()
    if (typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(updateHeight)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const peekY = topHeight
  const targetY = expanded ? 0 : peekY

  // Keep DOM transform synced with snap state when not actively dragging
  useEffect(() => {
    if (dragStartYRef.current !== null) return
    currentTranslateRef.current = targetY
    const el = sheetTransformRef.current
    if (el) {
      el.style.transform = targetY > 0 ? `translate3d(0, ${targetY}px, 0)` : ""
    }
  }, [targetY])

  const scheduleTransform = (y: number) => {
    currentTranslateRef.current = y
    if (rafIdRef.current !== null) return
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null
      const el = sheetTransformRef.current
      if (!el) return
      el.style.transform = `translate3d(0, ${currentTranslateRef.current}px, 0)`
    })
  }

  const beginDrag = (clientY: number) => {
    dragStartYRef.current = clientY
    dragStartTranslateRef.current = expanded ? 0 : peekY
    didDragRef.current = false
    const el = sheetTransformRef.current
    if (el) {
      el.style.transition = "none"
      el.style.willChange = "transform"
    }
  }

  const moveDrag = (clientY: number) => {
    if (dragStartYRef.current === null) return
    const deltaY = clientY - dragStartYRef.current
    if (Math.abs(deltaY) > 4) {
      didDragRef.current = true
    }

    const scrollTop = scrollRef.current?.scrollTop ?? 0
    // When expanded and scrolled down inside the list, let native inner scroll handle downward swipe
    if (expanded && deltaY > 0 && scrollTop > 2) {
      return
    }

    const rawY = dragStartTranslateRef.current + deltaY
    const maxY = peekY > 0 ? peekY : 360

    // Free 1:1 movement between 0 (top) and maxY (peek), subtle rubber-band outside bounds
    let clampedY = rawY
    if (rawY < 0) {
      clampedY = rawY * 0.25
    } else if (rawY > maxY) {
      clampedY = maxY + (rawY - maxY) * 0.25
    }

    scheduleTransform(clampedY)
  }

  const endDrag = (clientY: number | null) => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }

    const el = sheetTransformRef.current
    if (el) {
      el.style.transition = ""
      el.style.willChange = ""
    }

    if (dragStartYRef.current === null) return
    const deltaY = clientY !== null ? clientY - dragStartYRef.current : 0
    const maxY = peekY > 0 ? peekY : 360
    const finalY = currentTranslateRef.current
    dragStartYRef.current = null

    const scrollTop = scrollRef.current?.scrollTop ?? 0
    if (expanded && deltaY > 0 && scrollTop > 2) {
      el && (el.style.transform = "")
      return
    }

    // Snap based on swipe velocity/distance or halfway position
    let nextExpanded = expanded
    if (!expanded && (deltaY < -36 || finalY < maxY * 0.65)) {
      nextExpanded = true
    } else if (expanded && (deltaY > 44 || finalY > maxY * 0.35)) {
      nextExpanded = false
    }

    if (nextExpanded !== expanded) {
      setExpanded(nextExpanded)
    } else if (el) {
      const snapY = nextExpanded ? 0 : peekY
      currentTranslateRef.current = snapY
      el.style.transform = snapY > 0 ? `translate3d(0, ${snapY}px, 0)` : ""
    }
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const y = e.touches[0]?.clientY
    if (typeof y === "number") beginDrag(y)
  }

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const y = e.touches[0]?.clientY
    if (typeof y === "number") moveDrag(y)
  }

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const y = e.changedTouches[0]?.clientY ?? null
    endDrag(y)
  }

  const handleHandlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Touch is already handled by touch events on the sheet wrapper
    if (e.pointerType === "touch") return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    beginDrag(e.clientY)
  }

  const handleHandlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "touch") return
    moveDrag(e.clientY)
  }

  const handleHandlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === "touch") return
    endDrag(e.clientY)
  }

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const scrollTop = scrollRef.current?.scrollTop ?? 0
    if (!expanded && e.deltaY > 12) {
      setExpanded(true)
    } else if (expanded && e.deltaY < -18 && scrollTop <= 2) {
      setExpanded(false)
    }
  }

  return (
    <div
      className={cn(
        "relative flex flex-1 flex-col overflow-hidden lg:block lg:overflow-visible lg:px-8 lg:py-6 xl:px-12",
        className
      )}
    >
      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col lg:block lg:space-y-5">
        {/* Upper Section: sits behind the overlay sheet on mobile; always visible on lg+ */}
        <div
          ref={topContentRef}
          className={cn(
            "relative z-0 origin-top transition-[opacity,transform] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:static lg:z-30 lg:opacity-100 lg:transform-none",
            expanded
              ? "pointer-events-none scale-[0.96] opacity-40 lg:pointer-events-auto lg:scale-100 lg:opacity-100"
              : "scale-100 opacity-100"
          )}
        >
          {topContent}
        </div>

        {/* Overlay Sheet (Mobile < lg) | Standard 1- or 2-Column Layout (Desktop >= lg) */}
        <div className="flex flex-1 flex-col lg:flex-row lg:items-start lg:gap-5">
          <div
            ref={sheetTransformRef}
            className="absolute inset-x-0 top-0 bottom-0 z-10 flex w-full flex-col transition-transform duration-[420ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:static lg:z-auto lg:min-w-0 lg:flex-1 lg:transform-none!"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={() => endDrag(null)}
            onWheel={handleWheel}
          >
            <Card
              variant="soft"
              glass
              data-testid={drawerTestId}
              data-expanded={expanded ? "true" : "false"}
              className={cn(
                "relative flex flex-1 flex-col rounded-t-[28px] rounded-b-none border-x-0 border-t border-b-0 border-[#e5dec9] bg-[#fffaf0] px-4 pt-2.5 pb-28 shadow-[0_-10px_28px_-4px_rgba(10,10,10,0.09),0_-2px_8px_rgba(10,10,10,0.04)] backdrop-blur-none sm:px-6 lg:flex-none lg:rounded-[28px] lg:border lg:border-[#e6decb]/80 lg:bg-[#faf5e8]/80 lg:p-6 lg:shadow-xs lg:ring-1 lg:ring-black/[0.04] lg:backdrop-blur-xl",
                drawerClassName
              )}
            >
              {/* Mobile Sheet Grab Handle (drag freely with touch or mouse, or tap to toggle) */}
              <div className="mb-2 flex justify-center lg:hidden">
                <button
                  type="button"
                  onPointerDown={handleHandlePointerDown}
                  onPointerMove={handleHandlePointerMove}
                  onPointerUp={handleHandlePointerUp}
                  onPointerCancel={() => endDrag(null)}
                  onClick={() => {
                    if (didDragRef.current) {
                      didDragRef.current = false
                      return
                    }
                    setExpanded((prev) => !prev)
                  }}
                  aria-expanded={expanded}
                  aria-label={expanded ? collapseLabel : expandLabel}
                  className="flex touch-none cursor-grab flex-col items-center gap-1 rounded-full px-6 py-1.5 text-[10px] font-semibold text-[#6a6a6a] transition-colors select-none hover:bg-black/[0.04] active:cursor-grabbing active:scale-95"
                >
                  <span
                    className={cn(
                      "h-1 rounded-full bg-black/[0.18] transition-all duration-300",
                      expanded ? "w-12 bg-black/[0.28]" : "w-10"
                    )}
                  />
                </button>
              </div>

              {header}
              {subHeader}

              <div
                ref={scrollRef}
                data-testid={scrollTestId}
                onScroll={(e) => {
                  if (!expanded && e.currentTarget.scrollTop > 8) {
                    setExpanded(true)
                  }
                }}
                className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-contain lg:flex-none lg:overflow-visible"
              >
                {children}
              </div>
            </Card>
          </div>

          {sideContent}
        </div>
      </div>
    </div>
  )
}
