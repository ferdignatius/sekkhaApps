// feature/dashboard/components/DhammaWidget
// Daily dhamma reflection card — displays a rotating inspirational quote.

import { BookOpenIcon } from "lucide-react"

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

  return (
    <section
      aria-labelledby="dhamma-heading"
      className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface-yellow p-5"
    >
      {/* Header */}
      <div className="mb-3 flex items-center gap-2">
        <BookOpenIcon className="size-4 text-sekkha-brand-yellow-deep" aria-hidden="true" />
        <h2
          id="dhamma-heading"
          className="text-body-sm-medium text-sekkha-ink"
        >
          Renungan Harian
        </h2>
      </div>

      {/* Quote */}
      <blockquote className="border-l-2 border-sekkha-brand-yellow pl-3">
        <p className="text-body-sm italic text-sekkha-charcoal leading-relaxed">
          "{quote.text}"
        </p>
        <footer className="mt-2">
          <cite className="text-caption text-sekkha-slate not-italic">
            — {quote.source}
          </cite>
        </footer>
      </blockquote>
    </section>
  )
}
