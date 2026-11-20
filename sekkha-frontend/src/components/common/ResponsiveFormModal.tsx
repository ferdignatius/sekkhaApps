import * as React from "react"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { XIcon } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

// ─── Hook: detect desktop vs mobile ─────────────────────────────────────────

function useIsDesktop(breakpoint = 768) {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= breakpoint : false
  )

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return
    }
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    function handler(e: MediaQueryListEvent) {
      setIsDesktop(e.matches)
    }
    setIsDesktop(mq.matches)
    mq.addEventListener?.("change", handler)
    return () => mq.removeEventListener?.("change", handler)
  }, [breakpoint])

  return isDesktop
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ResponsiveFormModalProps {
  open?: boolean
  isOpen?: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  title: string
  description?: string
  maxWidth?: string
  children: React.ReactNode
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ResponsiveFormModal({
  open,
  isOpen,
  onOpenChange,
  onClose,
  title,
  description,
  maxWidth = "max-w-3xl",
  children,
}: ResponsiveFormModalProps) {
  const isDesktop = useIsDesktop()
  const isModalOpen = open ?? isOpen ?? false
  const [isExpanded, setIsExpanded] = useState(false)
  const prevOpenRef = React.useRef(isModalOpen)

  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = isModalOpen

    // Reset immediately on open so reopened drawers always start at 88dvh
    if (!wasOpen && isModalOpen) {
      setIsExpanded(false)
      return
    }
    // Wait for Vaul's slide-down close animation before resetting expanded height
    if (!isModalOpen) {
      const timer = setTimeout(() => setIsExpanded(false), 500)
      return () => clearTimeout(timer)
    }
  }, [isModalOpen])

  const handleClose = () => {
    onClose?.()
    onOpenChange?.(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleClose()
    } else {
      onOpenChange?.(true)
    }
  }

  if (isDesktop) {
    if (!isModalOpen) return null
    // Desktop (≥768px): Centered Modal with DESIGN.md tokens, rendered via portal to prevent stacking context clipping
    const desktopModal = (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
        {/* Backdrop Overlay */}
        <div
          className="absolute inset-0 animate-in cursor-pointer bg-black/40 backdrop-blur-md transition-opacity fade-in-0"
          onClick={handleClose}
        />
        {/* Centered Compact Card Container - Apple HIG Material Regular */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative z-10 flex max-h-[92vh] w-full animate-in flex-col rounded-[28px] border border-[#e5e5e5] bg-[#faf5e8] p-5 text-[#0a0a0a] shadow-2xl ring-1 ring-black/[0.05] backdrop-blur-[30px] transition-all zoom-in-95 sm:p-6",
            maxWidth
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#e5e5e5] pb-3">
            <div>
              <h3 className="text-base font-bold text-[#0a0a0a]">{title}</h3>
              {description && (
                <p className="mt-0.5 text-xs font-medium text-[#6a6a6a]">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-[#6a6a6a] transition-colors hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <div className="scrollbar-none flex-1 overflow-y-auto px-1 pt-3">{children}</div>
        </div>
      </div>
    )

    return typeof document !== "undefined"
      ? createPortal(desktopModal, document.body)
      : desktopModal
  }

  // Mobile (<768px): Native Bottom Drawer Sheet - Apple HIG Material Thick
  // Disable Vaul's repositionInputs (which breaks on iOS PWA keyboards and hides lower fields)
  // and scroll the focused field smoothly into view instead.
  return (
    <Drawer
      open={isModalOpen}
      onOpenChange={handleOpenChange}
      repositionInputs={false}
    >
      <DrawerContent
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement | null
          if (target?.closest?.('[data-slot="select-content"]')) {
            e.preventDefault()
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement | null
          if (target?.closest?.('[data-slot="select-content"]')) {
            e.preventDefault()
          }
        }}
        data-expanded={isExpanded ? "true" : "false"}
        className={cn(
          "z-[100] flex flex-col overflow-hidden rounded-t-[28px] border-t border-[#e5e5e5] bg-[#faf5e8] p-0 font-sans backdrop-blur-[40px] transition-[transform,max-height,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isExpanded ? "max-h-[100dvh] shadow-2xl" : "max-h-[88dvh]"
        )}
      >
        {/* Sticky Drag Handle Header with Blur Background */}
        <div
          className={cn(
            "sticky top-0 z-20 flex shrink-0 items-center justify-center border-b border-[#e5e5e5] bg-[#faf5e8] py-3 backdrop-blur-[30px] transition-shadow duration-300",
            isExpanded && "shadow-2xs"
          )}
        >
          <div
            className={cn(
              "h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
              isExpanded ? "w-14 bg-[#6a6a6a]/45" : "w-12 bg-[#6a6a6a]/30"
            )}
          />
        </div>

        {/* Scrollable Container */}
        <div
          data-testid="drawer-scroll-container"
          onScroll={(e) => {
            if (!isExpanded && e.currentTarget.scrollTop > 0) {
              setIsExpanded(true)
            }
          }}
          onFocusCapture={(e) => {
            const target = e.target as HTMLElement | null
            if (
              target &&
              (target.tagName === "INPUT" ||
                target.tagName === "TEXTAREA" ||
                target.tagName === "SELECT")
            ) {
              setIsExpanded(true)
              setTimeout(() => {
                target.scrollIntoView?.({
                  block: "center",
                  behavior: "smooth",
                })
              }, 160)
            }
          }}
          className="scrollbar-none flex-1 overscroll-contain overflow-y-auto px-5 pt-3 pb-10"
        >
          <DrawerHeader className="mb-3 border-b border-white/30 px-0 pt-0 pb-3 text-left">
            <DrawerTitle className="text-sm font-bold text-[#0a0a0a]">
              {title}
            </DrawerTitle>
            {description && (
              <DrawerDescription className="mt-0.5 text-xs font-medium text-[#6a6a6a]">
                {description}
              </DrawerDescription>
            )}
          </DrawerHeader>
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
