import { motion } from "motion/react"
import type { LeaderboardEntry } from "../data/landingContent"
import { TrophyIcon, StarIcon } from "lucide-react"

interface LeaderboardSectionProps {
  heading: string
  subheading: string
  entries: LeaderboardEntry[]
}

const rankCardStyles: Record<number, string> = {
  1: "bg-clay-ochre/20 border-clay-ochre/50",
  2: "bg-sekkha-canvas border-sekkha-hairline-strong",
  3: "bg-clay-peach/20 border-clay-peach/50",
}

export function LeaderboardSection({
  heading,
  subheading,
  entries,
}: LeaderboardSectionProps) {
  return (
    <section
      aria-labelledby="leaderboard-heading"
      id="leaderboard"
      className="relative overflow-hidden py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        {/* Heading */}
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <span className="text-caption-uppercase mb-4 inline-flex items-center gap-1.5 rounded-full border border-sekkha-hairline bg-sekkha-surface px-3.5 py-1 tracking-[1.5px] text-sekkha-ink shadow-xs">
            <TrophyIcon className="size-3.5 text-clay-ochre" /> Season
            Leaderboard
          </span>
          <h2
            id="leaderboard-heading"
            className="md:text-display-md text-3xl font-medium tracking-[-1px] text-sekkha-ink sm:text-4xl"
          >
            {heading}
          </h2>
          <p className="text-body-md mx-auto mt-3 max-w-[540px] text-sekkha-slate md:text-lg">
            {subheading}
          </p>
        </motion.div>

        {/* Leaderboard list container */}
        <div className="relative w-full rounded-[24px] border border-sekkha-hairline bg-sekkha-surface p-6 shadow-xs md:p-8">
          <ol
            className="flex flex-col gap-3"
            aria-label="Top active members list"
          >
            {entries.map((entry, i) => {
              const cardClass =
                rankCardStyles[entry.rank] ||
                "bg-white border-sekkha-hairline hover:border-sekkha-hairline-strong"

              return (
                <motion.li
                  key={entry.rank}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors sm:gap-4 sm:px-5 sm:py-3.5 ${cardClass}`}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{
                    duration: 0.45,
                    delay: i * 0.06,
                    ease: "easeOut",
                  }}
                >
                  <span
                    className="text-body-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sekkha-hairline bg-white font-bold text-sekkha-ink shadow-xs"
                    aria-label={`Rank ${entry.rank}`}
                  >
                    {entry.rank}
                  </span>

                  <span className="shrink-0 text-2xl" aria-hidden="true">
                    {entry.badge}
                  </span>

                  <div className="min-w-0 flex-1">
                    <span className="text-body-md block truncate font-semibold text-sekkha-ink">
                      {entry.name}
                    </span>
                    <span className="text-micro font-medium text-sekkha-slate">
                      {entry.subtitle || "Vihara Member"}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-sekkha-hairline bg-white px-3 py-1">
                    <StarIcon className="size-3.5 fill-clay-ochre text-clay-ochre" />
                    <span className="text-body-sm font-bold text-sekkha-ink tabular-nums">
                      {entry.points.toLocaleString("en-US")} pts
                    </span>
                  </div>
                </motion.li>
              )
            })}
          </ol>
        </div>

        {/* Auth-gated CTA directly to /leaderboard */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <a
            href="/leaderboard"
            className="text-body-sm inline-flex min-h-[44px] items-center gap-2 rounded-[12px] border border-sekkha-hairline bg-white px-6 py-3 font-semibold text-sekkha-ink transition-colors hover:bg-sekkha-surface"
          >
            View full community leaderboard →
          </a>
        </motion.div>
      </div>
    </section>
  )
}
