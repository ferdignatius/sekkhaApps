import { useEffect } from "react"
import { Drawer as DrawerPrimitive } from "vaul"
import QRCode from "react-qr-code"
import { XIcon } from "lucide-react"
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Drawer,
  DrawerDescription,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
} from "@/components/base"
import { useIsDesktop } from "@/hooks/useIsDesktop"
import { useAttendanceCheckInListener } from "@/hooks/useAttendanceCheckInListener"
import { QrCheckInSuccessOverlay } from "@/components/common/QrCheckInSuccessOverlay"

export interface MemberQrModalProps {
  open: boolean
  onClose: () => void
  userNumber?: string | number | null
  name?: string | null
  title?: string
  description?: string
  listenForCheckIn?: boolean
}

export function MemberQrModal({
  open,
  onClose,
  userNumber,
  name,
  title = "Check-in QR Code",
  description = "Show this code to organizers at the entrance",
  listenForCheckIn = true,
}: MemberQrModalProps) {
  const isDesktop = useIsDesktop(640)
  const memberIdStr = userNumber ? String(userNumber) : ""
  const { checkInSuccess, dismiss } = useAttendanceCheckInListener(
    open && listenForCheckIn && Boolean(memberIdStr)
  )

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  const qrCard = (
    <div className="relative mx-auto flex w-full flex-col items-center justify-center overflow-hidden rounded-[24px] border border-hairline bg-surface-soft p-5 text-center shadow-2xs sm:p-6">
      <QrCheckInSuccessOverlay
        notification={checkInSuccess}
        onDismiss={dismiss}
      />
      <div className="rounded-[20px] border-2 border-ink bg-white p-4 shadow-md sm:p-5">
        {memberIdStr ? (
          <QRCode
            value={memberIdStr}
            size={208}
            style={{
              height: "auto",
              maxWidth: "100%",
              width: "208px",
            }}
            viewBox="0 0 256 256"
          />
        ) : (
          <div className="flex size-[208px] items-center justify-center text-xs font-semibold text-text-muted">
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
  )

  if (isDesktop) {
    return (
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onClose()
        }}
      >
        <DialogContent
          aria-labelledby="member-qr-modal-title"
          showCloseButton={false}
          className="rounded-[24px] border border-hairline bg-[#fffaf0] p-6 font-sans text-sm text-[#0a0a0a] shadow-lg sm:max-w-md"
        >
          <div className="mb-3 flex items-start justify-between gap-3 border-b border-[#e5e5e5] pb-3 text-left">
            <DialogHeader className="p-0 text-left">
              <DialogTitle
                id="member-qr-modal-title"
                className="text-base font-bold text-[#0a0a0a]"
              >
                {title}
              </DialogTitle>
              {description && (
                <DialogDescription className="mt-0.5 text-xs font-medium text-[#6a6a6a]">
                  {description}
                </DialogDescription>
              )}
            </DialogHeader>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-surface-soft text-text-muted transition-colors hover:bg-surface-card hover:text-ink"
            >
              <XIcon className="size-4" />
            </button>
          </div>

          {qrCard}

          <div className="mt-4">
            <Button
              variant="filled"
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full rounded-[14px] text-sm font-semibold active:scale-[0.98]"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

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
          aria-labelledby="member-qr-modal-title"
          className="fixed inset-x-0 bottom-0 z-[100] flex h-auto max-h-[85dvh] flex-col overflow-hidden rounded-t-[28px] border-t border-[#e5dec9] bg-[#fffaf0] p-0 font-sans text-sm text-[#0a0a0a] shadow-[0_-10px_28px_-4px_rgba(10,10,10,0.12)] backdrop-blur-none outline-none"
        >
          {/* Compact Drag Handle */}
          <div className="flex shrink-0 items-center justify-center bg-[#fffaf0] py-3">
            <div className="h-1.5 w-12 rounded-full bg-[#6a6a6a]/30" />
          </div>

          {/* Fit-Content Body */}
          <div className="scrollbar-none flex flex-col overscroll-contain overflow-y-auto px-5 pt-1 pb-4">
            <div className="mb-3 flex items-start justify-between gap-3 border-b border-[#e5e5e5] pb-3 text-left">
              <DrawerHeader className="p-0 text-left">
                <DrawerTitle
                  id="member-qr-modal-title"
                  className="text-sm font-bold text-[#0a0a0a]"
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

            {qrCard}
          </div>

          {/* Footer Action */}
          <div className="shrink-0 border-t border-[#e5e5e5]/70 bg-[#fffaf0] px-5 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              variant="filled"
              type="button"
              onClick={onClose}
              className="min-h-[44px] w-full rounded-[14px] text-sm font-semibold active:scale-[0.98]"
            >
              Done
            </Button>
          </div>
        </DrawerPrimitive.Content>
      </DrawerPortal>
    </Drawer>
  )
}
