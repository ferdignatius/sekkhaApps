import { useEffect } from "react"
import { createPortal } from "react-dom"
import QRCode from "react-qr-code"
import { XIcon } from "lucide-react"
import { Button } from "@/components/base"

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

  const modalContent = (
    <div
      className="fixed inset-0 z-[100] flex animate-in items-center justify-center bg-black/70 p-4 font-sans backdrop-blur-xs fade-in"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-qr-modal-title"
        className="relative w-full max-w-sm space-y-4 rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-6 text-center shadow-2xl zoom-in-95"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3 text-left">
          <div>
            <h3
              id="member-qr-modal-title"
              className="text-base font-bold text-[#0a0a0a]"
            >
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs text-[#6a6a6a]">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-[#6a6a6a] transition-colors hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* High-Contrast QR Container */}
        <div className="flex flex-col items-center justify-center py-2 sm:py-3">
          <div className="rounded-[18px] border-2 border-[#0a0a0a] bg-white p-4 shadow-lg">
            {memberIdStr ? (
              <QRCode
                value={memberIdStr}
                size={200}
                style={{
                  height: "auto",
                  maxWidth: "100%",
                  width: "200px",
                }}
                viewBox="0 0 256 256"
              />
            ) : (
              <div className="flex size-[200px] items-center justify-center text-xs font-semibold text-[#6a6a6a]">
                QR Code unavailable
              </div>
            )}
          </div>
          <p className="mt-3 font-mono text-base font-black tracking-widest text-[#0a0a0a]">
            {memberIdStr || "—"}
          </p>
          {name && (
            <p className="mt-0.5 text-xs font-medium text-[#6a6a6a]">{name}</p>
          )}
        </div>

        {/* Footer Action */}
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
  )

  return typeof document !== "undefined"
    ? createPortal(modalContent, document.body)
    : modalContent
}
