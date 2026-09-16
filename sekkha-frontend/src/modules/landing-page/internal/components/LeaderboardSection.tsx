import { motion } from "motion/react"
import type { LeaderboardEntry } from "../data/landingContent"
import { TrophyIcon, StarIcon } from "lucide-react"

interface LeaderboardSectionProps {
  heading: string
  subheading: string
  entries: LeaderboardEntry[]
}

const rankCardStyles: Record<number, string> = {
  1: "bg-[#fef3c7]/90 border-[#e8b94a]/50 shadow-xs",
  2: "bg-[#f1f5f9]/90 border-[#cbd5e1] shadow-xs",
  3: "bg-[#ffedd5]/90 border-[#ffb084]/50 shadow-xs",
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
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="text-caption-uppercase mb-4 inline-flex items-center gap-1.5 rounded-full border border-sekkha-hairline bg-white px-3.5 py-1 tracking-[1.5px] text-sekkha-ink shadow-xs">
            <TrophyIcon className="size-3.5 text-[#e8b94a]" /> Attendance &
            Merit Points
          </span>
          <h2
            id="leaderboard-heading"
            className="md:text-display-md text-3xl font-medium tracking-[-1px] text-sekkha-ink sm:text-4xl"
          >
            {heading}
          </h2>
          <p className="text-body-md mx-auto mt-3 max-w-[520px] text-sekkha-slate md:text-lg">
            {subheading}
          </p>
        </motion.div>

        {/* Leaderboard list container */}
        <div className="relative mx-auto max-w-[860px] rounded-lg border border-sekkha-hairline bg-sekkha-surface p-6 shadow-xs md:p-8">
          <ol
            className="flex flex-col gap-3"
            aria-label="Top active members list"
          >
            {entries.map((entry, i) => {
              const cardClass =
                rankCardStyles[entry.rank] ||
                "bg-white border-sekkha-hairline hover:border-black/20"

              return (
                <motion.li
                  key={entry.rank}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all sm:gap-4 sm:px-5 sm:py-3.5 ${cardClass}`}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{
                    duration: 0.5,
                    delay: i * 0.08,
                    ease: "easeOut",
                  }}
                  whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                >
                  {/* Rank badge */}
                  <span
                    className="text-body-sm flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sekkha-hairline bg-white font-bold text-sekkha-ink shadow-xs"
                    aria-label={`Rank ${entry.rank}`}
                  >
                    {entry.rank}
                  </span>

                  {/* Badge emoji */}
                  <span className="shrink-0 text-2xl" aria-hidden="true">
                    {entry.badge}
                  </span>

                  {/* Name & Title */}
                  <div className="min-w-0 flex-1">
                    <span className="text-body-md block truncate font-semibold text-sekkha-ink">
                      {entry.name}
                    </span>
                    <span className="text-micro font-medium text-sekkha-slate">
                      Buddhist Youth • Level {6 - entry.rank}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-sekkha-hairline bg-white px-3 py-1">
                    <StarIcon className="size-3.5 fill-[#e8b94a] text-[#e8b94a]" />
                    <span className="text-body-sm font-bold text-sekkha-ink tabular-nums">
                      {entry.points.toLocaleString("en-US")} pts
                    </span>
                  </div>
                </motion.li>
              )
            })}
          </ol>
        </div>

        {/* CTA */}
        <motion.div
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <a
            href="/leaderboard"
            className="text-body-sm inline-flex items-center gap-2 rounded-[12px] border border-sekkha-hairline bg-white px-6 py-3 font-semibold text-sekkha-ink transition-all hover:bg-sekkha-surface hover:shadow-xs"
          >
            View full community leaderboard →
          </a>
        </motion.div>
      </div>
    </section>
  )
}
