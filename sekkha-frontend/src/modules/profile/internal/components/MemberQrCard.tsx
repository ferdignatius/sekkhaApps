// feature/profile/components/MemberQrCard
// Displays the member's unique QR Member ID card.
// Supports digital view for smartphone display and dedicated printable physical Vihara card mode.

import { useState } from "react"
import QRCode from "react-qr-code"
import { PrinterIcon, DownloadIcon, CheckIcon, XIcon } from "lucide-react"

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

  const roleLabel =
    role === "admin"
      ? "Admin Vihara"
      : role === "pengurus"
        ? "Pengurus"
        : role === "aktivis"
          ? "Aktivis"
          : "Umat"

  return (
    <>
      {/* ── Screen Card Component ── */}
      <div className="space-y-4 rounded-2xl border border-sekkha-hairline bg-gradient-to-br from-sekkha-canvas via-white to-blue-50/40 p-5 text-left font-sans shadow-xs">
        {/* Top Header Card */}
        <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
          <div className="flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center">
              <img
                src="/sekkha_logo.svg"
                alt="Sekkha"
                className="size-full object-contain"
              />
            </div>
            <div>
              <h3 className="text-caption-bold text-sekkha-ink">
                Kartu Anggota Digital
              </h3>
              <p className="text-micro font-medium text-sekkha-slate">
                {viharaName}
              </p>
            </div>
          </div>

          <span className="text-micro-bold flex items-center gap-1 rounded-full border border-emerald-300/80 bg-emerald-100/90 px-2.5 py-0.5 text-emerald-800">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-600" />
            <span>Akun Aktif</span>
          </span>
        </div>

        {/* QR Code & Member Info Body */}
        <div className="flex flex-col items-center gap-4 py-2 sm:flex-row">
          {/* Dynamic QR Visual */}
          <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl border-2 border-sekkha-brand-blue/30 bg-white p-3 shadow-2xs">
            <div className="flex h-32 w-32 items-center justify-center rounded-xl border border-slate-100 bg-white p-1.5 shadow-2xs">
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
              className="text-micro-bold mt-2 flex cursor-pointer items-center gap-1 text-sekkha-brand-blue hover:underline"
              title="Klik untuk menyalin nomor unik"
            >
              <span className="font-mono">{memberId}</span>
              {copied ? (
                <CheckIcon className="size-3 text-emerald-600" />
              ) : null}
            </button>
          </div>

          {/* Member Details & Instructions */}
          <div className="min-w-0 flex-1 space-y-2 text-left">
            <div>
              <p className="text-micro font-bold tracking-wider text-sekkha-slate uppercase">
                Nama Anggota
              </p>
              <p className="text-body-base truncate font-extrabold text-sekkha-ink">
                {memberName}
              </p>
            </div>

            <div>
              <p className="text-micro font-bold tracking-wider text-sekkha-slate uppercase">
                Nomor Unik (ID Vihara)
              </p>
              <p className="text-caption-bold font-mono text-sekkha-brand-blue">
                {memberId}
              </p>
            </div>

            <div className="pt-1">
              <p className="text-micro leading-relaxed text-sekkha-slate">
                Tunjukkan QR code ini ke petugas atau pengurus saat presensi
                acara vihara, atau cetak kartu fisik seukuran KTP/Dompet di
                bawah.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 border-t border-sekkha-hairline-soft pt-2">
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="text-caption-bold flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-sekkha-brand-blue px-3 py-2.5 text-white shadow-xs transition-all hover:bg-blue-700 active:scale-[0.99]"
          >
            <PrinterIcon className="size-4" />
            <span>Cetak Kartu Fisik Vihara</span>
          </button>

          <button
            type="button"
            onClick={handleCopyCode}
            className="text-caption-bold flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-sekkha-hairline bg-white px-3 py-2.5 text-sekkha-ink shadow-2xs transition-all hover:bg-sekkha-surface active:scale-[0.99]"
            title="Salin Nomor Unik"
          >
            {copied ? (
              <CheckIcon className="size-4 text-emerald-600" />
            ) : (
              <DownloadIcon className="size-4 text-sekkha-brand-blue" />
            )}
            <span className="hidden sm:inline">
              {copied ? "Tersalin!" : "Salin ID"}
            </span>
          </button>
        </div>
      </div>

      {/* ── Modal Preview Cetak Kartu Fisik ── */}
      {showPrintModal && (
        <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm fade-in">
          <div className="relative max-h-[90vh] w-full max-w-md space-y-5 overflow-y-auto rounded-3xl border border-sekkha-hairline bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <div className="flex items-center gap-2">
                <PrinterIcon className="size-5 text-sekkha-brand-blue" />
                <h3 className="text-body-base sm:text-heading-6 font-extrabold text-sekkha-ink">
                  Pratinjau Kartu Fisik
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="cursor-pointer rounded-full p-1.5 text-sekkha-slate hover:bg-slate-100"
              >
                <XIcon className="size-5" />
              </button>
            </div>

            {/* Realistic Physical Card Preview (CR-80 Standard Format) */}
            <div className="relative flex aspect-[85.6/54] flex-col justify-between space-y-3 overflow-hidden rounded-2xl border-2 border-sekkha-brand-blue/30 bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 p-5 text-white shadow-lg">
              {/* Card background watermarks */}
              <div className="pointer-events-none absolute -right-8 -bottom-8 size-36 rounded-full bg-blue-400/10 blur-xl" />
              <div className="pointer-events-none absolute top-0 right-0 size-24 bg-gradient-to-bl from-amber-400/20 to-transparent" />

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center">
                    <img
                      src="/sekkha_logo.svg"
                      alt="Sekkha"
                      className="size-full object-contain"
                    />
                  </div>
                  <div>
                    <p className="text-[12px] leading-none font-black tracking-tight uppercase">
                      {viharaName}
                    </p>
                    <p className="text-[9px] tracking-wider text-blue-200">
                      KARTU TANDA ANGGOTA RESMI
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-extrabold tracking-wide uppercase">
                  {roleLabel}
                </span>
              </div>

              {/* Card Main Body: QR & Details */}
              <div className="flex items-center gap-3.5 py-1">
                {/* QR Code Container */}
                <div className="shrink-0 rounded-xl bg-white p-2 shadow-md">
                  <QRCode
                    value={memberId || "UNKNOWN"}
                    size={80}
                    style={{ height: "auto", maxWidth: "100%", width: "80px" }}
                    viewBox="0 0 256 256"
                  />
                </div>

                <div className="min-w-0 flex-1 space-y-1">
                  <div>
                    <p className="text-[9px] font-bold tracking-wider text-blue-200 uppercase">
                      Nama Lengkap
                    </p>
                    <p className="text-body-sm truncate leading-tight font-black text-white">
                      {memberName}
                    </p>
                  </div>

                  <div>
                    <p className="text-[9px] font-bold tracking-wider text-blue-200 uppercase">
                      Nomor Unik (ID)
                    </p>
                    <p className="text-caption-bold font-mono font-black text-amber-300">
                      {memberId}
                    </p>
                  </div>

                  {school && (
                    <div className="truncate">
                      <p className="text-[8px] text-blue-200 uppercase">
                        Sekolah/Instansi
                      </p>
                      <p className="truncate text-[10px] font-semibold text-white/90">
                        {school}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer */}
              <div className="flex items-center justify-between border-t border-white/20 pt-1.5 text-[8px] text-blue-200">
                <span>Sekkha Official Membership Card</span>
                <span>Berlaku Seumur Hidup</span>
              </div>
            </div>

            <p className="text-micro text-center leading-relaxed text-sekkha-slate">
              💡 Saat mencetak, browser hanya akan mencetak{" "}
              <strong>Kartu Fisik Vihara</strong> ini saja (halaman web lainnya
              otomatis disembunyikan).
            </p>

            {/* Modal Actions */}
            <div className="flex gap-2 border-t border-sekkha-hairline-soft pt-2">
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="text-body-sm flex-1 cursor-pointer rounded-xl border border-sekkha-hairline-strong py-2.5 font-semibold text-sekkha-ink transition-colors hover:bg-slate-50"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handleTriggerPrint}
                className="text-body-sm flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-sekkha-brand-blue py-2.5 font-bold text-white shadow-sm transition-all hover:bg-blue-700"
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
        className="box-border hidden flex-col justify-between overflow-hidden rounded-xl border-2 border-blue-900 bg-white p-4 text-slate-900 print:flex"
        style={{ width: "85.6mm", height: "54mm", pageBreakInside: "avoid" }}
      >
        {/* Print Header */}
        <div className="flex items-center justify-between border-b-2 border-blue-900 pb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="flex size-6 items-center justify-center rounded bg-blue-900 text-xs font-black text-white">
              S
            </div>
            <div>
              <p className="text-[10px] leading-none font-black tracking-tight text-blue-900 uppercase">
                {viharaName}
              </p>
              <p className="text-[7.5px] font-bold tracking-wider text-slate-600">
                KARTU TANDA ANGGOTA RESMI
              </p>
            </div>
          </div>
          <span className="rounded border border-blue-900 px-1.5 py-0.5 text-[8px] font-black text-blue-900 uppercase">
            {roleLabel}
          </span>
        </div>

        {/* Print Body */}
        <div className="flex items-center gap-3 py-1">
          <div className="shrink-0 rounded border border-slate-300 bg-white p-1">
            <QRCode
              value={memberId || "UNKNOWN"}
              size={64}
              style={{ height: "64px", width: "64px" }}
              viewBox="0 0 256 256"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-1 text-left">
            <div>
              <p className="text-[7.5px] font-bold text-slate-500 uppercase">
                Nama Lengkap
              </p>
              <p className="truncate text-[11px] leading-tight font-black text-slate-900">
                {memberName}
              </p>
            </div>

            <div>
              <p className="text-[7.5px] font-bold text-slate-500 uppercase">
                Nomor Unik (ID)
              </p>
              <p className="font-mono text-[10px] font-black text-blue-900">
                {memberId}
              </p>
            </div>

            {school && (
              <div className="truncate">
                <p className="text-[7px] text-slate-500 uppercase">
                  Sekolah/Instansi
                </p>
                <p className="truncate text-[8.5px] font-bold text-slate-800">
                  {school}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Print Footer */}
        <div className="flex items-center justify-between border-t border-slate-300 pt-1 text-[7px] font-semibold text-slate-500">
          <span>Sekkha Official Membership</span>
          <span>Berlaku Seumur Hidup</span>
        </div>
      </div>
    </>
  )
}
