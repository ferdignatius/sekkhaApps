// feature/profile/components/MemberQrCard
// Displays the member's unique QR Member ID card.
// Supports digital view for smartphone display and printable physical Vihara card mode.

import { useState } from "react"
import QRCode from "react-qr-code"
import { PrinterIcon, DownloadIcon, SparklesIcon, CheckIcon } from "lucide-react"

interface MemberQrCardProps {
  memberName?: string
  memberId?: string
  viharaName?: string
}

export function MemberQrCard({
  memberName = "Dewi Lestari",
  memberId = "SKH-8821",
  viharaName = "Vihara Sekkha Jakarta",
}: MemberQrCardProps) {
  const [copied, setCopied] = useState(false)

  function handlePrint() {
    window.print()
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(memberId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-2xl border border-sekkha-hairline bg-gradient-to-br from-sekkha-canvas via-white to-blue-50/40 p-5 shadow-xs space-y-4 text-left font-sans">
      
      {/* Top Header Card */}
      <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sekkha-brand-blue text-white shadow-xs">
            <SparklesIcon className="size-4" />
          </div>
          <div>
            <h3 className="text-caption-bold text-sekkha-ink">Kartu Anggota Sekkha</h3>
            <p className="text-micro font-medium text-sekkha-slate">{viharaName}</p>
          </div>
        </div>

        <span className="rounded-full bg-emerald-100/90 border border-emerald-300/80 px-2.5 py-0.5 text-micro-bold text-emerald-800">
          Umat Aktif
        </span>
      </div>

      {/* QR Code & Member Info Body */}
      <div className="flex flex-col sm:flex-row items-center gap-4 py-2">
        {/* Dynamic QR Visual */}
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-sekkha-brand-blue/30 bg-white p-3 shadow-2xs shrink-0">
          <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-white p-1.5 border border-slate-100 shadow-2xs">
            <QRCode
              value={memberId || "UNKNOWN"}
              size={112}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
              viewBox="0 0 256 256"
            />
          </div>
          <button
            type="button"
            onClick={handleCopyCode}
            className="mt-2 text-micro-bold text-sekkha-brand-blue hover:underline flex items-center gap-1"
          >
            <span>{memberId}</span>
            {copied ? <CheckIcon className="size-3 text-emerald-600" /> : null}
          </button>
        </div>

        {/* Member Details & Instructions */}
        <div className="space-y-2 text-left min-w-0 flex-1">
          <div>
            <p className="text-micro font-bold uppercase tracking-wider text-sekkha-slate">Nama Anggota</p>
            <p className="text-body-base font-extrabold text-sekkha-ink">{memberName}</p>
          </div>

          <div>
            <p className="text-micro font-bold uppercase tracking-wider text-sekkha-slate">ID Anggota Vihara</p>
            <p className="text-caption-bold font-mono text-sekkha-brand-blue">{memberId}</p>
          </div>

          <div className="pt-1">
            <p className="text-micro text-sekkha-slate leading-relaxed">
              Tunjukkan QR ini ke Pengurus Vihara saat presensi, atau <strong>Cetak Kartu Fisik</strong> di bawah untuk dimasukkan ke dompet/id card.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons for Printing / Downloading Physical Card */}
      <div className="flex items-center gap-2 pt-2 border-t border-sekkha-hairline-soft">
        <button
          type="button"
          onClick={handlePrint}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sekkha-brand-blue py-2.5 px-3 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-[0.99]"
        >
          <PrinterIcon className="size-4" />
          <span>Cetak Kartu Fisik Vihara</span>
        </button>

        <button
          type="button"
          onClick={handleCopyCode}
          className="flex items-center justify-center gap-1.5 rounded-xl border border-sekkha-hairline bg-white py-2.5 px-3 text-caption-bold text-sekkha-ink hover:bg-sekkha-surface transition-all shadow-2xs active:scale-[0.99]"
          title="Simpan / Download QR"
        >
          <DownloadIcon className="size-4 text-sekkha-brand-blue" />
          <span className="hidden sm:inline">Simpan QR</span>
        </button>
      </div>

    </div>
  )
}
