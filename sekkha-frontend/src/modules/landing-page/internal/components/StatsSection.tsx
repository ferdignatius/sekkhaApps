import { motion } from 'motion/react'

interface StatItem {
  value: string
  label: string
}

interface StatsSectionProps {
  stats: Array<StatItem>
}

export function StatsSection({ stats }: StatsSectionProps) {
  return (
    <section
      className="relative w-full py-[48px] overflow-hidden"
      aria-labelledby="stats-heading"
    >
      <h2 id="stats-heading" className="sr-only">
        Statistik Komunitas Umat Remaja
      </h2>

      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        <div className="rounded-[24px] p-8 md:p-12 shadow-xs relative overflow-hidden bg-sekkha-surface border border-sekkha-hairline">
          {/* Subtle warm backlight */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-[#e8b94a]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#1a3a3a]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 items-center justify-center divide-y lg:divide-y-0 lg:divide-x divide-sekkha-hairline">
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                className="flex flex-col items-center text-center pt-4 lg:pt-0"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: index * 0.1, ease: 'easeOut' }}
              >
                <span className="text-stat-display text-sekkha-ink font-medium tracking-[-1.5px] text-4xl sm:text-5xl md:text-6xl">
                  {stat.value}
                </span>
                <span className="text-body-md font-normal text-sekkha-slate mt-2 tracking-normal">
                  {stat.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
