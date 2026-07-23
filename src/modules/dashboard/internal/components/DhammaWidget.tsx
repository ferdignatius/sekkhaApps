// feature/dashboard/components/DhammaWidget
// Daily dhamma reflection card — modern, inspirational & youth-friendly design.

import { SparklesIcon, Share2Icon, BookmarkIcon, QuoteIcon, CheckIcon } from "lucide-react"
import { useState } from "react"

// Hardcoded quotes for now; future: fetched from API
const DAILY_QUOTES = [
  {
    text: "Pikiran adalah pelopor dari segala perbuatan. Pikiran adalah pemimpin, pikiran adalah pembentuk.",
    source: "Dhammapada 1",
  },
  {
    text: "Ribuan lilin dapat dinyalakan dari satu lilin, dan umur lilin itu tidak akan berkurang. Kebahagiaan tidak akan berkurang karena dibagi.",
    source: "Dhammapada 273",
  },
  {
    text: "Lebih baik menaklukkan diri sendiri daripada memenangkan seribu pertempuran.",
    source: "Dhammapada 103",
  },
  {
    text: "Jangan menyia-nyiakan waktu, karena waktu adalah hidup. Setiap detik yang berlalu tidak akan kembali.",
    source: "Dhammapada 315",
  },
  {
    text: "Kebencian tidak akan pernah berakhir dengan kebencian. Hanya dengan cinta kasih, kebencian berakhir.",
    source: "Dhammapada 5",
  },
]

function getTodayQuote() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]!
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DhammaWidget() {
  const quote = getTodayQuote()
  const [copied, setCopied] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleShare = async () => {
    const shareText = `"${quote.text}" — ${quote.source} (via Sekkha App)`
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section
      aria-labelledby="dhamma-heading"
      className="relative overflow-hidden rounded-2xl border border-amber-300/60 bg-gradient-to-br from-amber-500/10 via-sekkha-surface-yellow to-amber-100/40 p-4 sm:p-5 shadow-xs transition-all hover:shadow-md"
    >
      {/* Decorative background watermark */}
      <QuoteIcon className="absolute -right-3 -bottom-3 size-24 text-amber-500/10 rotate-12 pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sekkha-brand-yellow text-sekkha-ink shadow-xs">
            <SparklesIcon className="size-4" />
          </span>
          <div>
            <h2 id="dhamma-heading" className="text-body-sm-medium font-bold text-sekkha-ink leading-tight">
              Renungan Dhamma Harian
            </h2>
            <p className="text-micro text-sekkha-slate">Inspirasi Pagi Ini</p>
          </div>
        </div>

        {/* Source Badge */}
        <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2.5 py-0.5 text-micro-bold text-amber-900 font-mono shrink-0">
          {quote.source}
        </span>
      </div>

      {/* Quote Body */}
      <blockquote className="relative my-2 rounded-xl bg-sekkha-canvas/70 backdrop-blur-xs p-3.5 border border-sekkha-hairline-soft">
        <p className="text-caption sm:text-body-sm italic font-medium text-sekkha-ink leading-relaxed">
          "{quote.text}"
        </p>
      </blockquote>

      {/* Action Footer */}
      <div className="mt-3 flex items-center justify-between pt-1 text-micro">
        <span className="text-sekkha-slate font-medium">Bagikan ke teman-temanmu ✨</span>
        
        <div className="flex items-center gap-1.5">
          {/* Bookmark Button */}
          <button
            type="button"
            onClick={() => setSaved(!saved)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-micro-bold transition-all ${
              saved
                ? "bg-amber-500 text-white"
                : "bg-sekkha-canvas border border-sekkha-hairline-strong text-sekkha-slate hover:text-sekkha-ink"
            }`}
            title="Simpan Renungan"
          >
            <BookmarkIcon className="size-3" />
            <span>{saved ? "Tersimpan" : "Simpan"}</span>
          </button>

          {/* Share/Copy Button */}
          <button
            type="button"
            onClick={handleShare}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-micro-bold transition-all ${
              copied
                ? "bg-emerald-600 text-white"
                : "bg-sekkha-brand-blue text-white shadow-xs hover:bg-blue-700"
            }`}
            title="Salin & Bagikan Renungan"
          >
            {copied ? <CheckIcon className="size-3" /> : <Share2Icon className="size-3" />}
            <span>{copied ? "Tersalin!" : "Bagikan"}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
