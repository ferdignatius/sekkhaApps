import { motion } from 'motion/react'
import { truncateDescription } from '../utils/truncateDescription'
import type { FeatureCardColor } from '../utils/getFeatureCardColor'

interface FeatureCardProps {
  title: string
  description: string
  colorVariant: FeatureCardColor
  index: number
}

const colorVariantMap: Record<FeatureCardColor, string> = {
  yellow: 'bg-sekkha-brand-yellow',
  coral: 'bg-sekkha-coral-light',
  teal: 'bg-sekkha-teal-light',
  rose: 'bg-sekkha-rose-light',
}

export function FeatureCard({ title, description, colorVariant, index }: FeatureCardProps) {
  const truncated = truncateDescription(description, 120)
  const bgClass = colorVariantMap[colorVariant]

  return (
    <motion.div
      className={`${bgClass} rounded-[28px] p-8`}
      data-index={index}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <h3 className="text-heading-3 text-sekkha-ink">{title}</h3>
      <p className="text-body-md text-sekkha-slate mt-3">{truncated}</p>
    </motion.div>
  )
}
