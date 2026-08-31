// feature/dashboard/components/DhammaWidget
// Daily Dhamma reflection card — modern, inspirational & youth-friendly design.

import { SparklesIcon, Share2Icon, BookmarkIcon, QuoteIcon, CheckIcon } from "lucide-react"
import { useState } from "react"

const DAILY_QUOTES = [
  {
    text: "Mind is the forerunner of all actions. Mind is chief, mind-made are they.",
    source: "Dhammapada 1",
  },
  {
    text: "Thousands of candles can be lighted from a single candle, and the life of the candle will not be shortened. Happiness never decreases by being shared.",
    source: "Dhammapada 273",
  },
  {
    text: "It is better to conquer oneself than to win a thousand battles.",
    source: "Dhammapada 103",
  },
  {
    text: "Do not waste time, for time is life itself. Every moment that passes never returns.",
    source: "Dhammapada 315",
  },
  {
    text: "Hatred does not cease by hatred at any time; hatred ceases by love alone.",
    source: "Dhammapada 5",
  },
]

function getTodayQuote() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  )
  return DAILY_QUOTES[dayOfYear % DAILY_QUOTES.length]!
}

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
      className="relative overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-5 shadow-xs transition-all font-sans text-left"
    >
      {/* Decorative background watermark */}
      <QuoteIcon className="absolute -right-3 -bottom-3 size-24 text-[#e8b94a]/10 rotate-12 pointer-events-none" />

      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#e8b94a]/20 border border-[#e8b94a]/40 text-[#0a0a0a] shadow-xs">
            <SparklesIcon className="size-4 text-[#e8b94a]" />
          </span>
          <div>
            <h2 id="dhamma-heading" className="text-sm font-bold text-[#0a0a0a] leading-tight">
              Daily Dhamma Reflection
            </h2>
            <p className="text-[11px] text-[#6a6a6a]">Today's Inspiration</p>
          </div>
        </div>

        {/* Source Badge */}
        <span className="rounded-full bg-[#f5f0e0] border border-[#e5e5e5] px-2.5 py-0.5 text-[11px] font-bold text-[#0a0a0a] font-mono shrink-0">
          {quote.source}
        </span>
      </div>

      {/* Quote Body */}
      <blockquote className="relative my-2 rounded-[12px] bg-[#faf5e8] p-3.5 border border-[#e5e5e5]">
        <p className="text-xs sm:text-sm italic font-medium text-[#0a0a0a] leading-relaxed">
          "{quote.text}"
        </p>
      </blockquote>

      {/* Action Footer */}
      <div className="mt-3 flex items-center justify-between pt-1 text-xs">
        <span className="text-[#6a6a6a] font-medium text-[11px]">Share with friends ✨</span>
        
        <div className="flex items-center gap-1.5">
          {/* Bookmark Button */}
          <button
            type="button"
            onClick={() => setSaved(!saved)}
            className={`flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              saved
                ? "bg-[#0a0a0a] text-white"
                : "bg-[#fffaf0] border border-[#e5e5e5] text-[#6a6a6a] hover:text-[#0a0a0a] hover:bg-[#faf5e8]"
            }`}
            title="Save Reflection"
          >
            <BookmarkIcon className="size-3" />
            <span>{saved ? "Saved" : "Save"}</span>
          </button>

          {/* Share/Copy Button */}
          <button
            type="button"
            onClick={handleShare}
            className={`flex items-center gap-1 rounded-[8px] px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
              copied
                ? "bg-emerald-600 text-white"
                : "bg-[#0a0a0a] text-white shadow-xs hover:bg-[#1f1f1f]"
            }`}
            title="Copy & Share Reflection"
          >
            {copied ? <CheckIcon className="size-3" /> : <Share2Icon className="size-3" />}
            <span>{copied ? "Copied!" : "Share"}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
