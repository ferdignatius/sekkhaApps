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
    <section aria-labelledby="features-heading" id="features" className="relative py-16 md:py-24 overflow-hidden">
      {/* Background ambient lighting — cream-toned per DESIGN.md */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[500px] bg-gradient-to-tr from-sekkha-surface via-white to-sekkha-surface blur-3xl pointer-events-none -z-10 rounded-full" />

      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-sekkha-hairline px-3.5 py-1 text-caption-uppercase text-sekkha-ink tracking-[1.5px] mb-4 shadow-xs">
            ⭐ Youth Programs & Features
          </span>
          <h2
            id="features-heading"
            className="text-3xl sm:text-4xl md:text-display-lg text-sekkha-ink text-center font-medium tracking-[-1px] sm:tracking-[-1.5px] md:tracking-[-2px] leading-tight"
          >
            What Can You Experience?
          </h2>
          <p className="text-body-md md:text-lg text-sekkha-slate text-center max-w-[600px] mx-auto mt-4">
            An integrated digital platform crafted to support your spiritual practice, personal development, and Dhamma fellowship.
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
