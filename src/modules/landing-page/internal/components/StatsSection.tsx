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
      className="w-full bg-sekkha-surface"
      aria-labelledby="stats-heading"
    >
      <h2 id="stats-heading" className="sr-only">
        Statistik Komunitas
      </h2>

      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8 py-[64px]">
        <div className="flex flex-col md:flex-row gap-8 items-center justify-center md:justify-around">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              className="flex flex-col items-center text-center"
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
            >
              <span className="text-stat-display text-sekkha-ink">
                {stat.value}
              </span>
              <span className="text-body-md text-sekkha-slate mt-2">
                {stat.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
