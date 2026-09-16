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

  if (!isModalOpen) return null

  if (isDesktop) {
    // Desktop (≥768px): Centered Modal with DESIGN.md tokens, rendered via portal to prevent stacking context clipping
    const desktopModal = (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans">
        {/* Backdrop Overlay */}
        <div
          className="absolute inset-0 animate-in cursor-pointer bg-[#0a0a0a]/50 backdrop-blur-sm transition-opacity fade-in-0"
          onClick={handleClose}
        />
        {/* Centered Compact Card Container */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative z-10 flex max-h-[92vh] w-full animate-in flex-col rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 text-[#0a0a0a] shadow-2xl transition-all zoom-in-95 sm:p-6",
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
              className="cursor-pointer rounded-[8px] p-1.5 text-[#6a6a6a] transition-colors hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-1 pt-3">{children}</div>
        </div>
      </div>
    )

    return typeof document !== "undefined"
      ? createPortal(desktopModal, document.body)
      : desktopModal
  }

  // Mobile (<768px): Native Bottom Drawer Sheet
  return (
    <Drawer open={isModalOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="z-[100] flex max-h-[88vh] flex-col overflow-hidden rounded-t-[24px] border-t border-[#e5e5e5] bg-[#fffaf0] p-0 font-sans">
        {/* Sticky Drag Handle Header with Blur Background */}
        <div className="sticky top-0 z-20 flex shrink-0 items-center justify-center border-b border-[#e5e5e5]/60 bg-[#fffaf0]/90 py-3 backdrop-blur-md">
          <div className="h-1.5 w-12 rounded-full bg-[#6a6a6a]/30" />
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-8">
          <DrawerHeader className="mb-3 border-b border-[#e5e5e5] px-0 pt-0 pb-3 text-left">
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
