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
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
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
          className="absolute inset-0 bg-[#0a0a0a]/50 backdrop-blur-sm transition-opacity animate-in fade-in-0 cursor-pointer"
          onClick={handleClose}
        />
        {/* Centered Compact Card Container */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "relative z-10 w-full max-h-[92vh] flex flex-col rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-2xl transition-all animate-in zoom-in-95 text-[#0a0a0a]",
            maxWidth
          )}
        >
          <div className="flex items-center justify-between pb-3 border-b border-[#e5e5e5] shrink-0">
            <div>
              <h3 className="text-base font-bold text-[#0a0a0a]">{title}</h3>
              {description && (
                <p className="text-xs font-medium text-[#6a6a6a] mt-0.5">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-[8px] p-1.5 text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a] transition-colors cursor-pointer"
            >
              <XIcon className="size-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pt-3 px-1">
            {children}
          </div>
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
      <DrawerContent className="max-h-[88vh] flex flex-col p-0 overflow-hidden bg-[#fffaf0] border-t border-[#e5e5e5] rounded-t-[24px] font-sans z-[100]">
        {/* Sticky Drag Handle Header with Blur Background */}
        <div className="sticky top-0 z-20 flex items-center justify-center py-3 bg-[#fffaf0]/90 backdrop-blur-md border-b border-[#e5e5e5]/60 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-[#6a6a6a]/30" />
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-8">
          <DrawerHeader className="px-0 pb-3 pt-0 text-left border-b border-[#e5e5e5] mb-3">
            <DrawerTitle className="text-sm font-bold text-[#0a0a0a]">{title}</DrawerTitle>
            {description && (
              <DrawerDescription className="text-xs font-medium text-[#6a6a6a] mt-0.5">
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
