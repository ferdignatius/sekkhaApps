import { motion } from "motion/react"
import { FeatureCard } from "./FeatureCard"
import { getFeatureCardColor } from "../utils/getFeatureCardColor"

interface Feature {
  title: string
  description: string
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
      {/* Background ambient lighting — cream-toned per DESIGN.md */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[500px] w-[1000px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-sekkha-surface via-white to-sekkha-surface blur-3xl" />

      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        <motion.div
          className="mb-16 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="text-caption-uppercase mb-4 inline-flex items-center gap-1.5 rounded-full border border-sekkha-hairline bg-white px-3.5 py-1 tracking-[1.5px] text-sekkha-ink shadow-xs">
            ⭐ Youth Programs & Features
          </span>
          <h2
            id="features-heading"
            className="md:text-display-lg text-center text-3xl leading-tight font-medium tracking-[-1px] text-sekkha-ink sm:text-4xl sm:tracking-[-1.5px] md:tracking-[-2px]"
          >
            What Can You Experience?
          </h2>
          <p className="text-body-md mx-auto mt-4 max-w-[600px] text-center text-sekkha-slate md:text-lg">
            An integrated digital platform crafted to support your spiritual
            practice, personal development, and Dhamma fellowship.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
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
