import { motion } from 'motion/react'
import { FeatureCard } from './FeatureCard'
import { getFeatureCardColor } from '../utils/getFeatureCardColor'

interface Feature {
  title: string
  description: string
}

interface FeatureSectionProps {
  features: Feature[]
}

export function FeatureSection({ features }: FeatureSectionProps) {
  return (
    <section aria-labelledby="features-heading" id="features" className="relative py-[96px] overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-amber-100/30 via-teal-100/20 to-pink-100/30 blur-3xl pointer-events-none -z-10 rounded-full" />

      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3.5 py-1 text-micro font-semibold text-sekkha-ink uppercase tracking-wider mb-3">
            ⭐ Dedicated Youth Features
          </span>
          <h2
            id="features-heading"
            className="text-heading-2 text-sekkha-ink text-center tracking-tight font-bold text-3xl sm:text-4xl md:text-5xl"
          >
            What Can You Experience?
          </h2>
          <p className="text-subtitle text-sekkha-slate text-center max-w-[600px] mx-auto mt-4 text-base md:text-lg">
            All-in-one digital tools crafted for youth to stay connected, active, and spiritually inspired together.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              title={feature.title}
              description={feature.description}
              colorVariant={getFeatureCardColor(index)}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
