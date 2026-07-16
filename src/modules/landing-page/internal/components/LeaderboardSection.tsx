import { motion } from 'motion/react'
import type { LeaderboardEntry } from '../data/landingContent'

interface LeaderboardSectionProps {
  heading: string
  subheading: string
  entries: LeaderboardEntry[]
}

const rankBg: Record<number, string> = {
  1: 'bg-sekkha-brand-yellow',
  2: 'bg-sekkha-hairline',
  3: 'bg-sekkha-coral-light',
}

export function LeaderboardSection({ heading, subheading, entries }: LeaderboardSectionProps) {
  return (
    <section aria-labelledby="leaderboard-heading" id="leaderboard" className="py-[96px] bg-sekkha-canvas">
      <div className="mx-auto w-full max-w-[760px] px-4 md:px-8">

        {/* Heading */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 id="leaderboard-heading" className="text-heading-2 text-sekkha-ink">
            {heading}
          </h2>
          <p className="text-subtitle text-sekkha-slate mt-3 max-w-[480px] mx-auto">
            {subheading}
          </p>
        </motion.div>

        {/* Leaderboard list */}
        <ol className="flex flex-col gap-3" aria-label="Daftar umat paling aktif">
          {entries.map((entry, i) => (
            <motion.li
              key={entry.rank}
              className={`flex items-center gap-4 rounded-2xl px-6 py-4 ${rankBg[entry.rank] ?? 'bg-sekkha-surface'}`}
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
            >
              {/* Rank badge */}
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/60 text-body-md-medium text-sekkha-ink shadow-sm"
                aria-label={`Peringkat ${entry.rank}`}
              >
                {entry.rank}
              </span>

              {/* Badge emoji */}
              <span className="text-2xl" aria-hidden="true">{entry.badge}</span>

              {/* Name */}
              <span className="flex-1 text-body-md-medium text-sekkha-ink">
                {entry.name}
              </span>

              {/* Points */}
              <span className="text-body-md-medium text-sekkha-slate tabular-nums">
                {entry.points.toLocaleString('id-ID')} poin
              </span>
            </motion.li>
          ))}
        </ol>

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
            className="text-body-sm-medium text-sekkha-slate underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sekkha-primary rounded-sm"
          >
            Lihat leaderboard lengkap →
          </a>
        </motion.div>
      </div>
    </section>
  )
}
