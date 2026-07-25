import { motion } from 'motion/react'
import type { LeaderboardEntry } from '../data/landingContent'
import { TrophyIcon, StarIcon } from 'lucide-react'

interface LeaderboardSectionProps {
  heading: string
  subheading: string
  entries: LeaderboardEntry[]
}

const rankGlassStyles: Record<number, string> = {
  1: 'bg-gradient-to-r from-amber-100/90 via-yellow-50/90 to-amber-100/70 border-amber-300/80 shadow-md ring-1 ring-amber-400/30',
  2: 'bg-gradient-to-r from-slate-100/90 via-gray-50/90 to-slate-100/70 border-slate-300/80 shadow-sm',
  3: 'bg-gradient-to-r from-rose-100/90 via-orange-50/90 to-rose-100/70 border-rose-300/80 shadow-sm',
}

export function LeaderboardSection({ heading, subheading, entries }: LeaderboardSectionProps) {
  return (
    <section aria-labelledby="leaderboard-heading" id="leaderboard" className="relative py-[96px] overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-amber-100/20 blur-3xl pointer-events-none -z-10 rounded-full" />

      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">

        {/* Heading */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3.5 py-1 text-micro font-semibold text-sekkha-ink uppercase tracking-wider mb-3">
            <TrophyIcon className="size-3.5 text-amber-500" /> Presensi & Partisipasi Umat
          </span>
          <h2 id="leaderboard-heading" className="text-heading-2 text-sekkha-ink font-bold tracking-tight text-3xl sm:text-4xl">
            {heading}
          </h2>
          <p className="text-subtitle text-sekkha-slate mt-3 max-w-[520px] mx-auto text-base md:text-lg">
            {subheading}
          </p>
        </motion.div>

        {/* Leaderboard list container */}
        <div className="glass-panel rounded-[32px] p-6 md:p-8 shadow-xl border border-white relative">
          <ol className="flex flex-col gap-3.5" aria-label="Daftar umat paling aktif">
            {entries.map((entry, i) => {
              const glassClass = rankGlassStyles[entry.rank] || 'bg-white/60 border-white/60 hover:bg-white'

              return (
                <motion.li
                  key={entry.rank}
                  className={`flex items-center gap-4 rounded-2xl px-6 py-4 border backdrop-blur-md transition-all ${glassClass}`}
                  initial={{ opacity: 0, x: -24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.5, delay: i * 0.08, ease: "easeOut" }}
                  whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                >
                  {/* Rank badge */}
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/80 font-bold text-body-md text-sekkha-ink shadow-sm ring-1 ring-black/5"
                    aria-label={`Peringkat ${entry.rank}`}
                  >
                    {entry.rank}
                  </span>

                  {/* Badge emoji */}
                  <span className="text-2xl shrink-0" aria-hidden="true">{entry.badge}</span>

                  {/* Name & Title */}
                  <div className="flex-1 min-w-0">
                    <span className="block text-body-md-medium font-semibold text-sekkha-ink truncate">
                      {entry.name}
                    </span>
                    <span className="text-micro text-sekkha-slate font-medium">
                      Umat Remaja • Lv.{6 - entry.rank}
                    </span>
                  </div>

                  {/* Points */}
                  <div className="flex items-center gap-1.5 shrink-0 bg-white/70 px-3 py-1.5 rounded-full border border-black/5">
                    <StarIcon className="size-4 text-amber-500 fill-amber-400" />
                    <span className="text-body-sm-medium font-bold text-sekkha-ink tabular-nums">
                      {entry.points.toLocaleString('id-ID')} pts
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass-pill text-body-sm-medium text-sekkha-ink hover:bg-white hover:shadow-md transition-all border border-white/80"
          >
            Lihat leaderboard lengkap komunitas →
          </a>
        </motion.div>
      </div>
    </section>
  )
}
