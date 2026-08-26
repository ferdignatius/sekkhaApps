// feature/profile/components/MemberQrCard
// Displays the member's unique QR Member ID card.
// Supports digital view for smartphone display and dedicated printable physical Vihara card mode.

import { useState } from "react"
import QRCode from "react-qr-code"
import { PrinterIcon, DownloadIcon, SparklesIcon, CheckIcon, XIcon } from "lucide-react"

interface MemberQrCardProps {
  memberName?: string
  memberId?: string
  role?: string
  school?: string | null
  viharaName?: string
}

export function MemberQrCard({
  memberName = "Pengguna Sekkha",
  memberId = "SKH-8821",
  role = "umat",
  school,
  viharaName = "Vihara Sekkha Jakarta",
}: MemberQrCardProps) {
  const [copied, setCopied] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)

  function handleTriggerPrint() {
    window.print()
  }

  function handleCopyCode() {
    if (!memberId) return
    navigator.clipboard.writeText(memberId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const roleLabel = role === "admin" ? "Admin Vihara" : role === "pengurus" ? "Pengurus" : role === "aktivis" ? "Aktivis" : "Umat"

  return (
    <>
      {/* ── Screen Card Component ── */}
      <div className="rounded-2xl border border-sekkha-hairline bg-gradient-to-br from-sekkha-canvas via-white to-blue-50/40 p-5 shadow-xs space-y-4 text-left font-sans">
        
        {/* Top Header Card */}
        <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sekkha-brand-blue text-white shadow-xs">
              <SparklesIcon className="size-4 text-amber-300" />
            </div>
            <div>
              <h3 className="text-caption-bold text-sekkha-ink">Kartu Anggota Digital</h3>
              <p className="text-micro font-medium text-sekkha-slate">{viharaName}</p>
            </div>
          </div>

          <span className="rounded-full bg-emerald-100/90 border border-emerald-300/80 px-2.5 py-0.5 text-micro-bold text-emerald-800 flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Akun Aktif</span>
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
              className="mt-2 text-micro-bold text-sekkha-brand-blue hover:underline flex items-center gap-1 cursor-pointer"
              title="Klik untuk menyalin nomor unik"
            >
              <span className="font-mono">{memberId}</span>
              {copied ? <CheckIcon className="size-3 text-emerald-600" /> : null}
            </button>
          </div>

          {/* Member Details & Instructions */}
          <div className="space-y-2 text-left min-w-0 flex-1">
            <div>
              <p className="text-micro font-bold uppercase tracking-wider text-sekkha-slate">Nama Anggota</p>
              <p className="text-body-base font-extrabold text-sekkha-ink truncate">{memberName}</p>
            </div>

            <div>
              <p className="text-micro font-bold uppercase tracking-wider text-sekkha-slate">Nomor Unik (ID Vihara)</p>
              <p className="text-caption-bold font-mono text-sekkha-brand-blue">{memberId}</p>
            </div>

            <div className="pt-1">
              <p className="text-micro text-sekkha-slate leading-relaxed">
                Tunjukkan QR code ini ke petugas atau pengurus saat presensi acara vihara, atau cetak kartu fisik seukuran KTP/Dompet di bawah.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-sekkha-hairline-soft">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sekkha-brand-blue py-2.5 px-3 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all active:scale-[0.99] cursor-pointer"
          >
            <PrinterIcon className="size-4" />
            <span>Cetak Kartu Fisik Vihara</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-sekkha-hairline bg-white py-2.5 px-3 text-caption-bold text-sekkha-ink hover:bg-sekkha-surface transition-all shadow-2xs active:scale-[0.99] cursor-pointer"
            title="Salin Nomor Unik"
          >
            {copied ? <CheckIcon className="size-4 text-emerald-600" /> : <DownloadIcon className="size-4 text-sekkha-brand-blue" />}
            <span className="hidden sm:inline">{copied ? "Tersalin!" : "Salin ID"}</span>
          </button>
        </div>

      </div>

      {/* ── Modal Preview Cetak Kartu Fisik ── */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-sekkha-hairline bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <div className="flex items-center gap-2">
                <PrinterIcon className="size-5 text-sekkha-brand-blue" />
                <h3 className="text-body-base sm:text-heading-6 font-extrabold text-sekkha-ink">Pratinjau Kartu Fisik</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="rounded-full p-1.5 text-sekkha-slate hover:bg-slate-100 cursor-pointer"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Realistic Physical Card Preview (CR-80 Standard Format) */}
            <div className="rounded-2xl border-2 border-sekkha-brand-blue/30 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 text-white p-5 shadow-lg space-y-3 aspect-[85.6/54] flex flex-col justify-between relative overflow-hidden">
              {/* Card background watermarks */}
              <div className="absolute -right-8 -bottom-8 size-36 rounded-full bg-blue-400/10 blur-xl pointer-events-none" />
              <div className="absolute right-0 top-0 size-24 bg-gradient-to-bl from-amber-400/20 to-transparent pointer-events-none" />

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-lg bg-white/20 text-white font-black">
                    <SparklesIcon className="size-4 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-[12px] font-black tracking-tight leading-none uppercase">{viharaName}</p>
                    <p className="text-[9px] text-blue-200 tracking-wider">KARTU TANDA ANGGOTA RESMI</p>
                  </div>
                </div>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wide">
                  {roleLabel}
                </span>
              </div>

              {/* Card Main Body: QR & Details */}
              <div className="flex items-center gap-3.5 py-1">
                {/* QR Code Container */}
                <div className="rounded-xl bg-white p-2 shrink-0 shadow-md">
                  <QRCode
                    value={memberId || "UNKNOWN"}
                    size={80}
                    style={{ height: "auto", maxWidth: "100%", width: "80px" }}
                    viewBox="0 0 256 256"
                  />
                </div>

                <div className="space-y-1 min-w-0 flex-1">
                  <div>
                    <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Nama Lengkap</p>
                    <p className="text-body-sm font-black truncate text-white leading-tight">{memberName}</p>
                  </div>

                  <div>
                    <p className="text-[9px] font-bold text-blue-200 uppercase tracking-wider">Nomor Unik (ID)</p>
                    <p className="font-mono text-caption-bold font-black text-amber-300">{memberId}</p>
                  </div>

                  {school && (
                    <div className="truncate">
                      <p className="text-[8px] text-blue-200 uppercase">Sekolah/Instansi</p>
                      <p className="text-[10px] font-semibold truncate text-white/90">{school}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between text-[8px] text-blue-200 pt-1.5 border-t border-white/20">
                <span>Sekkha Official Membership Card</span>
                <span>Berlaku Seumur Hidup</span>
              </div>
            </div>

            <p className="text-micro text-sekkha-slate text-center leading-relaxed">
              💡 Saat mencetak, browser hanya akan mencetak <strong>Kartu Fisik Vihara</strong> ini saja (halaman web lainnya otomatis disembunyikan).
            </p>

            {/* Modal Actions */}
            <div className="flex gap-2 pt-2 border-t border-sekkha-hairline-soft">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="flex-1 rounded-xl border border-sekkha-hairline-strong py-2.5 text-body-sm font-semibold text-sekkha-ink hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-sekkha-brand-blue py-2.5 text-body-sm font-bold text-white shadow-sm hover:bg-blue-700 transition-all cursor-pointer"
              >
                <PrinterIcon className="size-4" />
                <span>Cetak Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── ISOLATED PRINTABLE CARD (Only visible when window.print() is executed) ── */}
      <div
        id="printable-vihara-card"
        className="hidden print:flex flex-col justify-between rounded-xl border-2 border-blue-900 bg-white text-slate-900 p-4 box-border overflow-hidden"
        style={{ width: "85.6mm", height: "54mm", pageBreakInside: "avoid" }}
      >
        {/* Print Header */}
        <div className="flex items-center justify-between border-b-2 border-blue-900 pb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="flex size-6 items-center justify-center rounded bg-blue-900 text-white font-black text-xs">
              S
            </div>
            <div>
              <p className="text-[10px] font-black tracking-tight leading-none uppercase text-blue-900">{viharaName}</p>
              <p className="text-[7.5px] font-bold text-slate-600 tracking-wider">KARTU TANDA ANGGOTA RESMI</p>
            </div>
          </div>
          <span className="rounded border border-blue-900 px-1.5 py-0.5 text-[8px] font-black uppercase text-blue-900">
            {roleLabel}
          </span>
        </div>

        {/* Print Body */}
        <div className="flex items-center gap-3 py-1">
          <div className="rounded border border-slate-300 p-1 shrink-0 bg-white">
            <QRCode
              value={memberId || "UNKNOWN"}
              size={64}
              style={{ height: "64px", width: "64px" }}
              viewBox="0 0 256 256"
            />
          </div>

          <div className="space-y-1 min-w-0 flex-1 text-left">
            <div>
              <p className="text-[7.5px] font-bold text-slate-500 uppercase">Nama Lengkap</p>
              <p className="text-[11px] font-black truncate text-slate-900 leading-tight">{memberName}</p>
            </div>

            <div>
              <p className="text-[7.5px] font-bold text-slate-500 uppercase">Nomor Unik (ID)</p>
              <p className="font-mono text-[10px] font-black text-blue-900">{memberId}</p>
            </div>

            {school && (
              <div className="truncate">
                <p className="text-[7px] text-slate-500 uppercase">Sekolah/Instansi</p>
                <p className="text-[8.5px] font-bold truncate text-slate-800">{school}</p>
              </div>
            )}
          </div>
        </div>

        {/* Print Footer */}
        <div className="flex items-center justify-between text-[7px] font-semibold text-slate-500 pt-1 border-t border-slate-300">
          <span>Sekkha Official Membership</span>
          <span>Berlaku Seumur Hidup</span>
        </div>
      </div>
    </>
  )
}

