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
    <section aria-labelledby="features-heading" className="py-[96px]">
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        <motion.h2
          id="features-heading"
          className="text-heading-2 text-sekkha-ink text-center mb-4"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          Apa yang Bisa Kamu Lakukan?
        </motion.h2>
        <motion.p
          className="text-subtitle text-sekkha-slate text-center max-w-[560px] mx-auto mb-12"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
        >
          Semua yang kamu butuhkan untuk tetap terhubung dengan komunitas vihara.
        </motion.p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
