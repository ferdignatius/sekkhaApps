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
          className="mb-12 text-center md:mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <h2
            id="features-heading"
            className="md:text-display-lg text-center text-3xl leading-tight font-extrabold tracking-tight text-sekkha-ink sm:text-4xl"
          >
            What We Offer
          </h2>
          <p className="text-body-md mx-auto mt-3.5 max-w-[600px] text-center text-sekkha-slate md:text-lg">
            Every feature is designed to turn temple attendance, Seva service,
            and weekly fellowship into a meaningful habit.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
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
