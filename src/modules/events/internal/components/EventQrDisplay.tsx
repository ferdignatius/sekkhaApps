// feature/events/components/EventQrDisplay
// Renders the QR code for an event — visible to pengurus/admin only.
// Uses react-qr-code to generate a real scannable SVG QR.

import QRCode from "react-qr-code"
import { QrCodeIcon, RefreshCwIcon } from "lucide-react"
import type { QrCode } from "../types"

interface EventQrDisplayProps {
  eventTitle: string
  qrCode: QrCode
  onRegenerate: () => void
}

function formatExpiry(iso: string | null): string {
  if (!iso) return "Tidak kedaluwarsa"
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  })
}

export function EventQrDisplay({ eventTitle, qrCode, onRegenerate }: EventQrDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      {/* Header */}
      <div className="flex w-full items-center gap-2">
        <QrCodeIcon className="size-4 text-sekkha-brand-blue" aria-hidden="true" />
        <h3 className="text-body-sm-medium text-sekkha-ink">QR Absensi</h3>
      </div>

      {/* QR image */}
      <div className="flex flex-col items-center gap-3 rounded-xl bg-sekkha-surface p-5">
        <div className="rounded-lg bg-white p-3 shadow-sm">
          <QRCode
            value={qrCode.code}
            size={180}
            aria-label={`QR code untuk ${eventTitle}`}
          />
        </div>

        {/* Code text */}
        <p className="font-mono text-body-sm-medium text-sekkha-ink tracking-widest">
          {qrCode.code}
        </p>
        <p className="text-caption text-sekkha-muted">
          Kedaluwarsa: {formatExpiry(qrCode.expires_at)}
        </p>
      </div>

      {/* Regenerate */}
      <button
        type="button"
        onClick={onRegenerate}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-sekkha-hairline-strong py-2.5 text-body-sm-medium text-sekkha-ink transition-colors hover:bg-sekkha-surface"
      >
        <RefreshCwIcon className="size-3.5" aria-hidden="true" />
        Generate ulang QR
      </button>
    </div>
  )
}
