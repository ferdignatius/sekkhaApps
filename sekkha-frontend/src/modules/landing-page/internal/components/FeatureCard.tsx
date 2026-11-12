import { motion } from "motion/react"
import { truncateDescription } from "../utils/truncateDescription"
import type { FeatureCardColor } from "../utils/getFeatureCardColor"
import {
  QrCodeIcon,
  IdCardIcon,
  FlameIcon,
  TrophyIcon,
  CalendarIcon,
  ShieldCheckIcon,
} from "lucide-react"

interface FeatureCardProps {
  title: string
  description: string
  tag?: string
  colorVariant: FeatureCardColor
  index: number
}

const iconsMap = [
  <QrCodeIcon className="size-6" key="qr" />,
  <IdCardIcon className="size-6" key="id" />,
  <FlameIcon className="size-6" key="streak" />,
  <TrophyIcon className="size-6" key="season" />,
  <CalendarIcon className="size-6" key="events" />,
  <ShieldCheckIcon className="size-6" key="security" />,
]

const defaultTagLabels = [
  "Attendance",
  "Member ID",
  "Consistency",
  "Season",
  "Events",
  "Security",
]

const colorGradientMap: Record<
  FeatureCardColor,
  {
    bg: string
    badgeBg: string
    titleText: string
    bodyText: string
    iconColor: string
    border?: string
  }
> = {
  pink: {
    bg: "bg-clay-pink",
    badgeBg: "bg-white/15 border-white/25",
    titleText: "text-white",
    bodyText: "text-white/95",
    iconColor: "text-white",
  },
  teal: {
    bg: "bg-clay-teal",
    badgeBg: "bg-white/15 border-white/25",
    titleText: "text-white",
    bodyText: "text-white/90",
    iconColor: "text-white",
  },
  lavender: {
    bg: "bg-clay-lavender",
    badgeBg: "bg-black/10 border-black/10",
    titleText: "text-sekkha-ink",
    bodyText: "text-sekkha-body",
    iconColor: "text-sekkha-ink",
  },
  peach: {
    bg: "bg-clay-peach",
    badgeBg: "bg-black/10 border-black/10",
    titleText: "text-sekkha-ink",
    bodyText: "text-sekkha-body",
    iconColor: "text-sekkha-ink",
  },
  ochre: {
    bg: "bg-clay-ochre",
    badgeBg: "bg-black/10 border-black/10",
    titleText: "text-sekkha-ink",
    bodyText: "text-sekkha-body",
    iconColor: "text-sekkha-ink",
  },
  cream: {
    bg: "bg-surface-card",
    badgeBg: "bg-white/75 border-sekkha-hairline",
    titleText: "text-sekkha-ink",
    bodyText: "text-sekkha-body",
    iconColor: "text-sekkha-ink",
    border: "border border-sekkha-hairline",
  },
  yellow: {
    bg: "bg-clay-ochre",
    badgeBg: "bg-black/10 border-black/10",
    titleText: "text-sekkha-ink",
    bodyText: "text-sekkha-body",
    iconColor: "text-sekkha-ink",
  },
  coral: {
    bg: "bg-clay-peach",
    badgeBg: "bg-black/10 border-black/10",
    titleText: "text-sekkha-ink",
    bodyText: "text-sekkha-body",
    iconColor: "text-sekkha-ink",
  },
  rose: {
    bg: "bg-clay-pink",
    badgeBg: "bg-white/15 border-white/25",
    titleText: "text-white",
    bodyText: "text-white/95",
    iconColor: "text-white",
  },
}

export function FeatureCard({
  title,
  description,
  tag,
  colorVariant,
  index,
}: FeatureCardProps) {
  const truncated = truncateDescription(description, 130)
  const variant = colorGradientMap[colorVariant] || colorGradientMap.ochre
  const icon = iconsMap[index % iconsMap.length]
  const badgeLabel = tag || defaultTagLabels[index % defaultTagLabels.length]

  return (
    <motion.div
      className={`relative overflow-hidden rounded-[24px] p-6 sm:p-8 ${variant.bg} ${variant.border ?? ""} group flex flex-col justify-between shadow-xs transition-transform`}
      data-index={index}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: "easeOut" }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      <div>
        <div
          className={`mb-5 inline-flex items-center justify-center rounded-xl border p-2.5 sm:p-3 ${variant.badgeBg} ${variant.iconColor}`}
        >
          {icon}
        </div>

        <h3
          className={`text-title-md ${variant.titleText} font-semibold tracking-tight`}
        >
          {title}
        </h3>
        <p className={`text-body-md ${variant.bodyText} mt-3 leading-relaxed`}>
          {truncated}
        </p>
      </div>

      <div className="text-micro mt-6 flex items-center justify-between border-t border-black/10 pt-4 font-medium opacity-90">
        <span className={variant.bodyText}>Sekkha Community</span>
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${variant.badgeBg} ${variant.titleText}`}
        >
          {badgeLabel}
        </span>
      </div>
    </motion.div>
  )
}
