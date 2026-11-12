import { motion } from "motion/react"

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
      className="relative w-full overflow-hidden py-12 md:py-16"
      aria-labelledby="stats-heading"
    >
      <h2 id="stats-heading" className="sr-only">
        Youth Community Statistics
      </h2>

      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        <div className="relative overflow-hidden rounded-[24px] border border-sekkha-hairline bg-sekkha-surface p-8 shadow-xs md:p-12">
          <div className="grid grid-cols-2 items-center justify-center gap-8 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-sekkha-hairline">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                className={`flex flex-col items-center text-center ${
                  index >= 2
                    ? "border-t border-sekkha-hairline pt-8 lg:border-t-0 lg:pt-0"
                    : ""
                } ${index > 0 ? "lg:pl-8" : ""}`}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.45,
                  delay: index * 0.08,
                  ease: "easeOut",
                }}
              >
                <span className="md:text-stat-display text-4xl font-medium tracking-[-1.5px] text-sekkha-ink tabular-nums sm:text-5xl">
                  {stat.value}
                </span>
                <span className="text-body-md mt-2 font-normal tracking-normal text-sekkha-slate">
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
