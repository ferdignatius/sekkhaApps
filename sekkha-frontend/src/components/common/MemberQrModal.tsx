import { useEffect, useRef, useState } from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import QRCode from "react-qr-code"
import { XIcon } from "lucide-react"
import {
  Button,
  Drawer,
  DrawerDescription,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
} from "@/components/base"
import { cn } from "@/lib/utils"

export interface MemberQrModalProps {
  open: boolean
  onClose: () => void
  userNumber?: string | number | null
  name?: string | null
  title?: string
  description?: string
}

export function MemberQrModal({
  open,
  onClose,
  userNumber,
  name,
  title = "Check-in QR Code",
  description = "Show this code to organizers at the entrance",
}: MemberQrModalProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const dragStartYRef = useRef<number | null>(null)

  useEffect(() => {
    if (open) {
      setIsExpanded(false)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const memberIdStr = userNumber ? String(userNumber) : ""

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
      repositionInputs={false}
    >
      <DrawerPortal data-slot="drawer-portal">
        <DrawerOverlay
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose()
          }}
        />
        <DrawerPrimitive.Content
          data-slot="drawer-content"
          data-expanded={isExpanded ? "true" : "false"}
          aria-labelledby="member-qr-modal-title"
          onPointerDown={(e) => {
            dragStartYRef.current = e.clientY
          }}
          onPointerMove={(e) => {
            if (dragStartYRef.current === null) return
            const deltaY = e.clientY - dragStartYRef.current
            if (!isExpanded && deltaY < -16) {
              setIsExpanded(true)
              dragStartYRef.current = null
            }
          }}
          onPointerUp={() => {
            dragStartYRef.current = null
          }}
          className={cn(
            "fixed inset-x-0 bottom-0 z-[100] flex flex-col overflow-hidden rounded-t-[28px] border-t border-[#e5dec9] bg-[#fffaf0] p-0 font-sans text-sm text-[#0a0a0a] shadow-[0_-10px_28px_-4px_rgba(10,10,10,0.12)] backdrop-blur-none transition-[height,max-height,box-shadow] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] outline-none",
            isExpanded ? "h-[96dvh] max-h-[96dvh]" : "h-[88dvh] max-h-[88dvh]"
          )}
        >
          {/* Sticky Drag Handle Header (Tap or Drag Up to Expand Full Screen) */}
          <div
            onClick={() => setIsExpanded((prev) => !prev)}
            className="sticky top-0 z-20 flex shrink-0 cursor-pointer items-center justify-center bg-[#fffaf0] py-3"
          >
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                isExpanded ? "w-14 bg-[#6a6a6a]/45" : "w-12 bg-[#6a6a6a]/30"
              )}
            />
          </div>

          {/* Scrollable Container matching ResponsiveFormModal */}
          <div
            onScroll={(e) => {
              if (!isExpanded && e.currentTarget.scrollTop > 0) {
                setIsExpanded(true)
              }
            }}
            className="scrollbar-none flex flex-1 flex-col overscroll-contain overflow-y-auto px-5 pt-2 pb-6"
          >
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-3 border-b border-[#e5e5e5] pb-3 text-left">
              <DrawerHeader className="p-0 text-left">
                <DrawerTitle
                  id="member-qr-modal-title"
                  className="text-sm font-bold text-[#0a0a0a] sm:text-base"
                >
                  {title}
                </DrawerTitle>
                {description && (
                  <DrawerDescription className="mt-0.5 text-xs font-medium text-[#6a6a6a]">
                    {description}
                  </DrawerDescription>
                )}
              </DrawerHeader>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-soft text-text-muted transition-colors hover:bg-surface-card hover:text-ink"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* High-Contrast QR Container centered in standard tall drawer */}
            <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center rounded-[24px] border border-hairline bg-surface-soft p-6 text-center shadow-2xs">
              <div className="rounded-[20px] border-2 border-ink bg-white p-5 shadow-md">
                {memberIdStr ? (
                  <QRCode
                    value={memberIdStr}
                    size={220}
                    style={{
                      height: "auto",
                      maxWidth: "100%",
                      width: "220px",
                    }}
                    viewBox="0 0 256 256"
                  />
                ) : (
                  <div className="flex size-[220px] items-center justify-center text-xs font-semibold text-text-muted">
                    QR Code unavailable
                  </div>
                )}
              </div>
              <p className="mt-4 font-mono text-lg font-black tracking-widest text-ink">
                {memberIdStr || "—"}
              </p>
              {name && (
                <p className="mt-1 text-xs font-semibold text-text-muted sm:text-sm">
                  {name}
                </p>
              )}
            </div>
          </div>

          {/* Sticky Footer Action matching ResponsiveFormModal */}
          <div className="shrink-0 border-t border-[#e5e5e5]/70 bg-[#fffaf0] px-5 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="mx-auto w-full max-w-md">
              <Button
                variant="filled"
                type="button"
                onClick={onClose}
                className="min-h-[44px] w-full rounded-[14px] text-sm font-semibold active:scale-[0.98]"
              >
                Done
              </Button>
            </div>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPortal>
    </Drawer>
  )
}
