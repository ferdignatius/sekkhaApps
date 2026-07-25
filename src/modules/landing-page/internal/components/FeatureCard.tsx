import { motion } from 'motion/react'
import { truncateDescription } from '../utils/truncateDescription'
import type { FeatureCardColor } from '../utils/getFeatureCardColor'
import { QrCodeIcon, AwardIcon, CalendarIcon, HeartHandshakeIcon, BookOpenIcon, BellIcon } from 'lucide-react'

interface FeatureCardProps {
  title: string
  description: string
  colorVariant: FeatureCardColor
  index: number
}

const iconsMap = [
  <QrCodeIcon className="size-6 text-[#746019]" key="1" />,
  <AwardIcon className="size-6 text-[#600000]" key="2" />,
  <CalendarIcon className="size-6 text-[#187574]" key="3" />,
  <HeartHandshakeIcon className="size-6 text-[#600000]" key="4" />,
  <BookOpenIcon className="size-6 text-[#187574]" key="5" />,
  <BellIcon className="size-6 text-[#746019]" key="6" />,
]

const colorGradientMap: Record<FeatureCardColor, { bg: string; badgeBg: string }> = {
  yellow: { bg: 'from-amber-100/60 to-yellow-50/80', badgeBg: 'bg-amber-300/40 text-amber-900 border-amber-300/50' },
  coral: { bg: 'from-rose-100/60 to-orange-50/80', badgeBg: 'bg-rose-300/40 text-rose-900 border-rose-300/50' },
  teal: { bg: 'from-teal-100/60 to-emerald-50/80', badgeBg: 'bg-teal-300/40 text-teal-900 border-teal-300/50' },
  rose: { bg: 'from-fuchsia-100/60 to-pink-50/80', badgeBg: 'bg-pink-300/40 text-pink-900 border-pink-300/50' },
}

export function FeatureCard({ title, description, colorVariant, index }: FeatureCardProps) {
  const truncated = truncateDescription(description, 130)
  const variant = colorGradientMap[colorVariant]
  const icon = iconsMap[index % iconsMap.length]

  return (
    <motion.div
      className={`glass-panel rounded-[28px] p-8 relative overflow-hidden bg-gradient-to-br ${variant.bg} border border-white/80 shadow-md group transition-all`}
      data-index={index}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.015, boxShadow: '0 20px 40px -15px rgba(5,0,56,0.12)', transition: { duration: 0.25 } }}
    >
      {/* Decorative glass glow corner */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/40 blur-2xl pointer-events-none group-hover:scale-150 transition-all duration-500" />

      {/* Icon Badge */}
      <div className={`inline-flex items-center justify-center p-3 rounded-2xl border backdrop-blur-md mb-5 shadow-sm ${variant.badgeBg}`}>
        {icon}
      </div>

      <h3 className="text-heading-3 text-sekkha-ink font-semibold tracking-tight">{title}</h3>
      <p className="text-body-md text-sekkha-slate mt-3 leading-relaxed">{truncated}</p>
    </motion.div>
  )
}

