// components/common/ResponsiveFormModal
// Responsive Form Container:
//   Mobile (<768px): Native Bottom Drawer (vaul drawer with fixed drag handle & scroll body)
//   Desktop (≥768px): Centered Glassmorphic Modal overlay (h-fit compact)

import * as React from "react"
import { useEffect, useState } from "react"
import { XIcon } from "lucide-react"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer"

// ─── Hook: detect desktop vs mobile ─────────────────────────────────────────

function useIsDesktop(breakpoint = 768) {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= breakpoint : false
  )

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    function handler(e: MediaQueryListEvent) {
      setIsDesktop(e.matches)
    }
    setIsDesktop(mq.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
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
    // Desktop (≥768px): Centered Glassmorphic Modal with zero empty bottom space
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop Overlay */}
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity animate-in fade-in-0"
          onClick={handleClose}
        />
        {/* Centered Compact Card Container */}
        <div className="relative z-50 w-full max-w-3xl max-h-[92vh] flex flex-col rounded-3xl border border-sekkha-hairline bg-sekkha-canvas p-5 sm:p-6 shadow-2xl transition-all animate-in zoom-in-95">
          <div className="flex items-center justify-between pb-3 border-b border-sekkha-hairline-soft shrink-0">
            <div>
              <h3 className="text-body-base font-bold text-sekkha-ink">{title}</h3>
              {description && (
                <p className="text-caption font-medium text-sekkha-slate mt-0.5">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg p-1.5 text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink transition-colors cursor-pointer"
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
  }

  // Mobile (<768px): Native Bottom Drawer Sheet with Sticky Blurred Drag Handle & Scroll Body
  return (
    <Drawer open={isModalOpen} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[88vh] flex flex-col p-0 overflow-hidden">
        {/* Sticky Drag Handle Header with Blur Background */}
        <div className="sticky top-0 z-20 flex items-center justify-center py-3 bg-sekkha-canvas/80 backdrop-blur-md border-b border-sekkha-hairline-soft/40 shrink-0">
          <div className="h-1.5 w-12 rounded-full bg-sekkha-slate/40" />
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-8">
          <DrawerHeader className="px-0 pb-3 pt-0 text-left border-b border-sekkha-hairline-soft mb-3">
            <DrawerTitle className="text-body-sm font-bold text-sekkha-ink">{title}</DrawerTitle>
            {description && (
              <DrawerDescription className="text-caption font-medium text-sekkha-slate mt-0.5">
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
