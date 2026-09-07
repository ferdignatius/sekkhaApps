import { motion } from 'motion/react'
import type { LeaderboardEntry } from '../data/landingContent'
import { TrophyIcon, StarIcon } from 'lucide-react'

interface LeaderboardSectionProps {
  heading: string
  subheading: string
  entries: LeaderboardEntry[]
}

const rankCardStyles: Record<number, string> = {
  1: 'bg-[#fef3c7]/90 border-[#e8b94a]/50 shadow-xs',
  2: 'bg-[#f1f5f9]/90 border-[#cbd5e1] shadow-xs',
  3: 'bg-[#ffedd5]/90 border-[#ffb084]/50 shadow-xs',
}

export function LeaderboardSection({ heading, subheading, entries }: LeaderboardSectionProps) {
  return (
    <section aria-labelledby="leaderboard-heading" id="leaderboard" className="relative py-16 md:py-24 overflow-hidden">
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">

        {/* Heading */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-sekkha-hairline px-3.5 py-1 text-caption-uppercase text-sekkha-ink tracking-[1.5px] mb-4 shadow-xs">
            <TrophyIcon className="size-3.5 text-[#e8b94a]" /> Attendance & Merit Points
          </span>
          <h2 id="leaderboard-heading" className="text-3xl sm:text-4xl md:text-display-md text-sekkha-ink font-medium tracking-[-1px]">
            {heading}
          </h2>
          <p className="text-body-md md:text-lg text-sekkha-slate mt-3 max-w-[520px] mx-auto">
            {subheading}
          </p>
        </motion.div>

        {/* Leaderboard list container */}
        <div className="rounded-lg p-6 md:p-8 shadow-xs border border-sekkha-hairline bg-sekkha-surface relative max-w-[860px] mx-auto">
          <ol className="flex flex-col gap-3" aria-label="Top active members list">
            {entries.map((entry, i) => {
              const cardClass = rankCardStyles[entry.rank] || 'bg-white border-sekkha-hairline hover:border-black/20'

              return (
                <motion.li
                  key={entry.rank}
                  className={`flex items-center gap-3 sm:gap-4 rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 border transition-all ${cardClass}`}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                  whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                >
                  {/* Rank badge */}
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white font-bold text-body-sm text-sekkha-ink shadow-xs border border-sekkha-hairline"
                    aria-label={`Rank ${entry.rank}`}
                  >
                    {entry.rank}
                  </span>

                  {/* Badge emoji */}
                  <span className="text-2xl shrink-0" aria-hidden="true">{entry.badge}</span>

                  {/* Name & Title */}
                  <div className="flex-1 min-w-0">
                    <span className="block text-body-md font-semibold text-sekkha-ink truncate">
                      {entry.name}
                    </span>
                    <span className="text-micro text-sekkha-slate font-medium">
                      Buddhist Youth • Level {6 - entry.rank}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-white px-3 py-1 rounded-full border border-sekkha-hairline">
                    <StarIcon className="size-3.5 text-[#e8b94a] fill-[#e8b94a]" />
                    <span className="text-body-sm font-bold text-sekkha-ink tabular-nums">
                      {entry.points.toLocaleString('en-US')} pts
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[12px] bg-white text-body-sm font-semibold text-sekkha-ink hover:bg-sekkha-surface hover:shadow-xs transition-all border border-sekkha-hairline"
          >
            View full community leaderboard →
          </a>
        </motion.div>
      </div>
    </section>
  )
}
