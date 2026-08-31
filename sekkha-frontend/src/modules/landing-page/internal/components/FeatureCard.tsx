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

const colorGradientMap: Record<FeatureCardColor, { bg: string; badgeBg: string; titleText: string; bodyText: string; iconColor: string }> = {
  yellow: {
    bg: 'bg-[#e8b94a]',
    badgeBg: 'bg-black/10 border-black/10',
    titleText: 'text-[#0a0a0a]',
    bodyText: 'text-[#2a2a2a]',
    iconColor: 'text-[#0a0a0a]',
  },
  coral: {
    bg: 'bg-[#ffb084]',
    badgeBg: 'bg-black/10 border-black/10',
    titleText: 'text-[#0a0a0a]',
    bodyText: 'text-[#2a2a2a]',
    iconColor: 'text-[#0a0a0a]',
  },
  teal: {
    bg: 'bg-[#1a3a3a]',
    badgeBg: 'bg-white/10 border-white/10',
    titleText: 'text-white',
    bodyText: 'text-white/80',
    iconColor: 'text-white',
  },
  rose: {
    bg: 'bg-[#ff4d8b]',
    badgeBg: 'bg-white/10 border-white/10',
    titleText: 'text-white',
    bodyText: 'text-white/90',
    iconColor: 'text-white',
  },
}

export function FeatureCard({ title, description, colorVariant, index }: FeatureCardProps) {
  const truncated = truncateDescription(description, 130)
  const variant = colorGradientMap[colorVariant]
  const icon = iconsMap[index % iconsMap.length]

  return (
    <motion.div
      className={`rounded-3xl p-8 relative overflow-hidden ${variant.bg} shadow-sm group transition-all`}
      data-index={index}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: "easeOut" }}
      whileHover={{ y: -4, scale: 1.015, boxShadow: '0 20px 40px -15px rgba(10,10,10,0.15)', transition: { duration: 0.25 } }}
    >
      {/* Decorative subtle corner glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/20 blur-2xl pointer-events-none group-hover:scale-150 transition-all duration-500" />

      {/* Icon Badge */}
      <div className={`inline-flex items-center justify-center p-3 rounded-2xl border backdrop-blur-md mb-5 shadow-xs ${variant.badgeBg} ${variant.iconColor}`}>
        {icon}
      </div>

      <h3 className={`text-title-md ${variant.titleText} font-semibold tracking-tight`}>{title}</h3>
      <p className={`text-body-md ${variant.bodyText} mt-3 leading-relaxed`}>{truncated}</p>
    </motion.div>
  )
}

