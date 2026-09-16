// feature/dashboard/components/DhammaWidget
// Daily Dhamma reflection card with canonical Dhammapada from public/dhammapada.json
// Supports randomizing/refreshing verses, displays chapter title, verse number, and footnotes.

import { useState, useEffect, useCallback } from "react"
import {
  SparklesIcon,
  Share2Icon,
  QuoteIcon,
  CheckIcon,
  RotateCwIcon,
  BookOpenIcon,
  InfoIcon,
} from "lucide-react"

export interface DhammapadaVerse {
  chapterTitle: string
  no: string
  verse: string
  footnote?: string
}

interface DhammapadaChapter {
  title: string
  verses: Array<{
    no: string
    verse: string
    footnote?: string
  }>
}

interface DhammapadaFile {
  title: string
  chapters: DhammapadaChapter[]
}

// Fallback initial quote while json loads (prevents layout shift)
const FALLBACK_QUOTE: DhammapadaVerse = {
  chapterTitle: "Syair Berpasangan (Yamaka Vagga)",
  no: "1",
  verse:
    "Pikiran adalah pelopor dari segala sesuatu, pikiran adalah pemimpin, pikiran adalah pembentuk. Bila seseorang berbicara atau berbuat dengan pikiran jahat, maka penderitaan akan mengikutinya, bagaikan roda pedati mengikuti langkah kaki lembu yang menariknya.",
}

// Module-level in-memory cache to prevent refetching
let cachedVerses: DhammapadaVerse[] | null = null

export function DhammaWidget() {
  const [verses, setVerses] = useState<DhammapadaVerse[]>(
    cachedVerses || [FALLBACK_QUOTE]
  )
  const [currentQuote, setCurrentQuote] = useState<DhammapadaVerse>(
    cachedVerses ? cachedVerses[0] : FALLBACK_QUOTE
  )
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showFootnote, setShowFootnote] = useState(false)

  // Fetch full Dhammapada on mount
  useEffect(() => {
    let isMounted = true

    if (cachedVerses && cachedVerses.length > 0) {
      setVerses(cachedVerses)
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
          86400000
      )
      setCurrentQuote(
        cachedVerses[dayOfYear % cachedVerses.length] || cachedVerses[0]
      )
      return
    }

    fetch("/dhammapada.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json() as Promise<DhammapadaFile>
      })
      .then((data) => {
        if (!isMounted || !data?.chapters) return
        const flattened: DhammapadaVerse[] = []
        data.chapters.forEach((chapter) => {
          chapter.verses.forEach((v) => {
            flattened.push({
              chapterTitle: chapter.title,
              no: v.no,
              verse: v.verse,
              footnote: v.footnote,
            })
          })
        })

        if (flattened.length > 0) {
          cachedVerses = flattened
          setVerses(flattened)
          const dayOfYear = Math.floor(
            (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
              86400000
          )
          setCurrentQuote(
            flattened[dayOfYear % flattened.length] || flattened[0]
          )
        }
      })
      .catch((err) => {
        console.error("Failed to load dhammapada.json:", err)
      })

    return () => {
      isMounted = false
    }
  }, [])

  // Action: Refresh/Ganti to another random verse
  const handleRefresh = useCallback(() => {
    if (!verses || verses.length === 0) return
    setIsRefreshing(true)
    setShowFootnote(false)

    // Pick a different random verse
    let nextIdx: number
    do {
      nextIdx = Math.floor(Math.random() * verses.length)
    } while (verses.length > 1 && verses[nextIdx].no === currentQuote.no)

    setCurrentQuote(verses[nextIdx])
    setTimeout(() => {
      setIsRefreshing(false)
    }, 400)
  }, [verses, currentQuote.no])

  // Action: Copy quote to clipboard
  const handleShare = async () => {
    const shareText = `"${currentQuote.verse}"\n— Dhammapada Verse ${currentQuote.no} (${currentQuote.chapterTitle})\n(via Sekkha App)`
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <section
      aria-labelledby="dhamma-heading"
      className="relative flex h-full flex-col justify-between overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-4 text-left font-sans shadow-xs transition-all sm:rounded-[24px] sm:p-5"
    >
      {/* Decorative background watermark */}
      <QuoteIcon className="pointer-events-none absolute -right-3 -bottom-3 size-24 rotate-12 text-[#e8b94a]/10" />

      <div>
        {/* Top Header Row */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] border border-[#e8b94a]/40 bg-[#e8b94a]/20 text-[#0a0a0a] shadow-xs">
              <SparklesIcon className="size-4 text-[#e8b94a]" />
            </span>
            <div className="min-w-0">
              <h2
                id="dhamma-heading"
                className="truncate text-sm leading-tight font-bold text-[#0a0a0a]"
              >
                Daily Dhamma Reflection
              </h2>
              <p className="text-[11px] text-[#6a6a6a]">
                Dhammapada Inspiration
              </p>
            </div>
          </div>

          {/* Top Verse Number Badge */}
          <span className="shrink-0 rounded-full border border-[#e5e5e5] bg-[#f5f0e0] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#0a0a0a] shadow-2xs">
            Verse {currentQuote.no}
          </span>
        </div>

        {/* Chapter Title Badge */}
        <div className="mb-2 flex items-center gap-1.5 px-0.5 text-xs font-semibold text-[#1a3a3a]">
          <BookOpenIcon className="size-3.5 shrink-0 text-[#e8b94a]" />
          <span className="truncate">{currentQuote.chapterTitle}</span>
        </div>

        {/* Quote Card Body */}
        <blockquote className="relative my-1.5 rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 shadow-2xs transition-all">
          <p className="text-xs leading-relaxed font-medium text-[#0a0a0a] italic sm:text-sm">
            &ldquo;{currentQuote.verse}&rdquo;
          </p>

          {/* Footnote (if available) */}
          {currentQuote.footnote && (
            <div className="mt-2.5 border-t border-[#e5e5e5]/80 pt-2">
              <button
                type="button"
                onClick={() => setShowFootnote(!showFootnote)}
                className="flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[#6a6a6a] transition-colors hover:text-[#0a0a0a]"
              >
                <InfoIcon className="size-3 text-[#e8b94a]" />
                <span>{showFootnote ? "Hide footnote" : "View footnote"}</span>
              </button>
              {showFootnote && (
                <p className="mt-1.5 animate-in rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] p-2 text-[11px] leading-relaxed text-[#6a6a6a] duration-200 fade-in">
                  {currentQuote.footnote}
                </p>
              )}
            </div>
          )}
        </blockquote>
      </div>

      {/* Action Footer */}
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="xs:inline hidden text-[11px] font-medium text-[#6a6a6a]">
          Share this wisdom ✨
        </span>

        <div className="xs:w-auto flex w-full items-center justify-end gap-1.5">
          {/* Refresh / Shuffle Button */}
          <button
            type="button"
            onClick={handleRefresh}
            className="flex cursor-pointer items-center gap-1 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 py-1 text-xs font-semibold text-[#0a0a0a] shadow-2xs transition-all hover:border-[#0a0a0a]/30 hover:bg-[#faf5e8] active:scale-95"
            title="Shuffle another verse"
          >
            <RotateCwIcon
              className={`size-3 text-[#0a0a0a] transition-transform duration-300 ${isRefreshing ? "rotate-180 text-[#e8b94a]" : ""}`}
            />
            <span>Shuffle</span>
          </button>

          {/* Share / Copy Button */}
          <button
            type="button"
            onClick={handleShare}
            className={`flex cursor-pointer items-center gap-1 rounded-[8px] px-2.5 py-1 text-xs font-semibold shadow-2xs transition-all active:scale-95 ${
              copied
                ? "bg-emerald-600 text-white"
                : "bg-[#0a0a0a] text-white shadow-xs hover:bg-[#1f1f1f]"
            }`}
            title="Copy and share reflection"
          >
            {copied ? (
              <CheckIcon className="size-3" />
            ) : (
              <Share2Icon className="size-3" />
            )}
            <span>{copied ? "Copied!" : "Share"}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
