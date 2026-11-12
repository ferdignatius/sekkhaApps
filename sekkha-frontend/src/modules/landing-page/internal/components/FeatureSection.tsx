import { motion } from "motion/react"
import { FeatureCard } from "./FeatureCard"
import { getFeatureCardColor } from "../utils/getFeatureCardColor"

interface Feature {
  title: string
  description: string
  tag?: string
}

interface FeatureSectionProps {
  features: Feature[]
}

export function FeatureSection({ features }: FeatureSectionProps) {
  return (
    <section
      aria-labelledby="features-heading"
      id="features"
      className="relative overflow-hidden py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        <motion.div
          className="mb-14 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <span className="text-caption-uppercase mb-4 inline-flex items-center gap-1.5 rounded-full border border-sekkha-hairline bg-sekkha-surface px-3.5 py-1 tracking-[1.5px] text-sekkha-ink shadow-xs">
            ⭐ Youth Programs &amp; Features
          </span>
          <h2
            id="features-heading"
            className="md:text-display-lg text-center text-3xl leading-tight font-medium tracking-[-1px] text-sekkha-ink sm:text-4xl sm:tracking-[-1.5px] md:tracking-[-2px]"
          >
            What Can You Experience?
          </h2>
          <p className="text-body-md mx-auto mt-4 max-w-[600px] text-center text-sekkha-slate md:text-lg">
            Built for Vihara Tri Maha Dharma youth to connect, serve, and keep
            consistent weekly mindfulness habits together.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              title={feature.title}
              description={feature.description}
              tag={feature.tag}
              colorVariant={getFeatureCardColor(index)}
              index={index}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
