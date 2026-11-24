import { motion } from "motion/react"
import {
  Bolt,
  CalendarIcon,
  CheckCircle2Icon,
  ChevronRightIcon,
  HeartHandshakeIcon,
  ScanLineIcon,
  SparklesIcon,
  TrophyIcon,
} from "lucide-react"
import { StreakFlame } from "@/components/common/StreakFlame"
import { truncateDescription } from "../utils/truncateDescription"
import type { FeatureCardColor } from "../utils/getFeatureCardColor"

interface FeatureCardProps {
  title: string
  description: string
  tag?: string
  colorVariant?: FeatureCardColor
  index: number
}

/** Mini QR matrix vector for the Digital Member QR illustration */
function MiniQrIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-full w-full items-center justify-center px-4 pt-2 pb-4"
    >
      {/* Soft warm glow */}
      <div className="pointer-events-none absolute h-32 w-48 rounded-full bg-[#FFE0C2]/55 blur-2xl" />

      {/* Elevated Digital Member QR Card */}
      <div className="relative z-10 flex w-full max-w-[350px] items-center gap-4 rounded-2xl border border-[#e5dec9] bg-white p-4 shadow-[0_12px_30px_-10px_rgba(68,51,28,0.16)] transition-transform duration-300 group-hover:-translate-y-1">
        {/* Crisp SVG QR Code Tile with Scan Accent */}
        <div className="relative flex size-20 shrink-0 items-center justify-center rounded-xl border border-[#e5dec9] bg-[#fffaf0] p-2">
          <svg
            viewBox="0 0 36 36"
            className="size-full text-[#1c1917]"
            fill="currentColor"
          >
            {/* Top-left finder */}
            <path d="M2 2h10v10H2V2zm2 2v6h6V4H4zm2 2h2v2H6V6z" />
            {/* Top-right finder */}
            <path d="M24 2h10v10H24V2zm2 2v6h6V4h-6zm2 2h2v2h-2V6z" />
            {/* Bottom-left finder */}
            <path d="M2 24h10v10H2V24zm2 2v6h6v-6H4zm2 2h2v2H6v-2z" />
            {/* Data modules */}
            <rect x="15" y="3" width="3" height="3" rx="0.5" />
            <rect x="19" y="6" width="3" height="3" rx="0.5" />
            <rect x="15" y="10" width="3" height="3" rx="0.5" />
            <rect x="4" y="15" width="3" height="3" rx="0.5" />
            <rect x="10" y="15" width="4" height="3" rx="0.5" />
            <rect x="16" y="15" width="4" height="4" rx="0.5" />
            <rect x="23" y="15" width="3" height="3" rx="0.5" />
            <rect x="29" y="15" width="4" height="4" rx="0.5" />
            <rect x="15" y="21" width="3" height="4" rx="0.5" />
            <rect x="20" y="22" width="4" height="3" rx="0.5" />
            <rect x="27" y="22" width="3" height="3" rx="0.5" />
            <rect x="15" y="28" width="4" height="4" rx="0.5" />
            <rect x="22" y="27" width="4" height="3" rx="0.5" />
            <rect x="29" y="28" width="4" height="4" rx="0.5" />
          </svg>
          <span className="absolute inset-x-1 top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-clay-teal/75 shadow-[0_0_8px_rgba(26,115,103,0.65)]" />
        </div>

        {/* Member Identity Summary */}
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-clay-teal uppercase">
            <ScanLineIcon className="size-3" />
            <span>Member Pass</span>
          </div>
          <p className="mt-0.5 truncate text-sm font-extrabold text-sekkha-ink">
            Sekkha Youth
          </p>
          <p className="text-[11px] font-medium text-sekkha-slate tabular-nums">
            ID #2026111201
          </p>
          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-clay-mint/35 px-2 py-0.5 text-[10px] font-bold text-clay-teal">
            <CheckCircle2Icon className="size-3" />
            <span>Checked In</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Zoomed UI confirmation screen echoing StreakFlame + Karma Points feedback */
function MiniStreakKarmaIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-full w-full items-end justify-center px-6 pt-3"
    >
      <div className="w-full max-w-[310px] rounded-t-[26px] border-x-[5px] border-t-[5px] border-[#1c1917] bg-[#fffaf0] px-4 pt-4 pb-4 shadow-[0_12px_30px_-10px_rgba(68,51,28,0.18)] transition-transform duration-300 group-hover:-translate-y-1">
        {/* Streak Header */}
        <div className="mb-2.5 flex items-center justify-between rounded-xl border border-[#e5dec9] bg-white px-2.5 py-1.5">
          <div className="flex items-center gap-2">
            <StreakFlame count={5} status="active" className="h-8 w-6 shrink-0" />
            <div className="text-left">
              <p className="text-xs leading-tight font-extrabold text-sekkha-ink">
                5 Weeks
              </p>
              <p className="text-[9px] font-medium text-sekkha-slate">
                Active Streak
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#FAF0DF] px-2 py-0.5 text-[10px] font-bold text-[#9a6b0d] tabular-nums">
            <Bolt className="size-2.5" />
            180 pts
          </span>
        </div>

        {/* Karma Earned Toast Card */}
        <div className="rounded-2xl border border-[#e5dec9] bg-white p-3 text-left shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-sekkha-ink">
              Sunday Puja!
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-extrabold text-clay-teal tabular-nums">
              <Bolt className="size-3 text-[#c28e20]" />
              +50 Pts
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-sekkha-slate">
            Attendance &amp; weekly streak updated.
          </p>
          <div className="mt-2.5 flex h-7 w-full items-center justify-center rounded-full bg-clay-teal text-[11px] font-semibold text-white">
            Recorded
          </div>
        </div>
      </div>
    </div>
  )
}

/** Dual mini-cards illustrating Season Leaderboard & Seva Service Duties */
function MiniSeasonSevaIllustration() {
  return (
    <div
      aria-hidden="true"
      className="relative flex h-full w-full items-end justify-center gap-3 px-4 pt-3"
    >
      {/* Left tilted card: Season Top 3 */}
      <div className="w-[172px] sm:w-[190px] -rotate-3 rounded-t-2xl border border-[#e5dec9] bg-white p-3.5 text-left shadow-md transition-transform duration-300 group-hover:-translate-y-1 group-hover:-rotate-2">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold text-sekkha-ink">
          <TrophyIcon className="size-3 text-[#c28e20]" />
          <span>Vassa Season</span>
        </div>
        <div className="space-y-1.5">
          {[
            { rank: "1", name: "@sari_dewi", pts: 980 },
            { rank: "2", name: "@budi_s", pts: 870 },
            { rank: "3", name: "@mei_ling", pts: 820 },
          ].map((row) => (
            <div
              key={row.rank}
              className="flex items-center justify-between rounded-lg bg-[#fffaf0] px-2 py-1 text-[10px]"
            >
              <span className="truncate font-semibold text-sekkha-ink">
                #{row.rank} {row.name}
              </span>
              <span className="ml-1 font-bold text-[#9a6b0d] tabular-nums">
                {row.pts}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Right tilted card: Seva Service Duties */}
      <div className="w-[176px] sm:w-[196px] rotate-3 rounded-t-2xl border border-[#e5dec9] bg-[#fffaf0] p-3.5 text-left shadow-md transition-transform duration-300 group-hover:-translate-y-1.5 group-hover:rotate-2">
        <div className="mb-2 flex items-center gap-1.5 text-[10px] font-extrabold text-clay-teal">
          <CheckCircle2Icon className="size-3" />
          <span>Seva Duties</span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between rounded-lg border border-clay-mint bg-clay-mint/25 px-2 py-1.5 text-[10px]">
            <span className="truncate font-semibold text-sekkha-ink">
              MC / Host
            </span>
            <span className="font-bold text-clay-teal">+30</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[#e5dec9] bg-white px-2 py-1.5 text-[10px]">
            <span className="truncate font-semibold text-sekkha-ink">
              Usher Duty
            </span>
            <span className="font-bold text-[#9a6b0d]">+30</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[#e5dec9] bg-white px-2 py-1.5 text-[10px]">
            <span className="truncate font-semibold text-sekkha-ink">
              Media Crew
            </span>
            <span className="font-bold text-[#9a6b0d]">+30</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/** Stacked category cards echoing Sekkha's 4 Event Categories */
function MiniEventStackIllustration() {
  const stackCards = [
    {
      label: "Special Celebrations",
      bg: "bg-clay-lavender text-sekkha-ink border-black/10",
      icon: SparklesIcon,
      offset: "translate-y-0 scale-[0.91] opacity-90",
    },
    {
      label: "Social Action & Charity",
      bg: "bg-clay-ochre text-sekkha-ink border-black/10",
      icon: HeartHandshakeIcon,
      offset: "-mt-4 scale-[0.95]",
    },
    {
      label: "Retreat & Dhamma Camp",
      bg: "bg-clay-teal text-white border-white/15",
      icon: CalendarIcon,
      offset: "-mt-4 scale-[0.98]",
    },
    {
      label: "Sunday Youth Fellowship",
      bg: "bg-clay-pink text-white border-white/20",
      icon: CalendarIcon,
      offset: "-mt-4 scale-100 shadow-lg",
    },
  ]

  return (
    <div
      aria-hidden="true"
      className="relative flex h-full w-full flex-col items-center justify-end px-6 pt-2 pb-4"
    >
      <div className="flex w-full max-w-[330px] flex-col items-center transition-transform duration-300 group-hover:-translate-y-1">
        {stackCards.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.label}
              className={`flex w-full items-center justify-between rounded-2xl border px-3.5 py-2.5 shadow-sm ${item.bg} ${item.offset}`}
            >
              <div className="flex items-center gap-2">
                <Icon className="size-3.5 shrink-0 opacity-90" />
                <span className="truncate text-xs font-bold tracking-tight">
                  {item.label}
                </span>
              </div>
              <ChevronRightIcon className="size-3.5 shrink-0 opacity-75" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

const illustrations = [
  MiniQrIllustration,
  MiniStreakKarmaIllustration,
  MiniSeasonSevaIllustration,
  MiniEventStackIllustration,
]

export function FeatureCard({
  title,
  description,
  index,
}: FeatureCardProps) {
  const truncated = truncateDescription(description, 130)
  const Illustration = illustrations[index % illustrations.length]

  return (
    <motion.div
      className="group relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[28px] border border-[#e5dec9] bg-gradient-to-b from-[#FAF5EA] via-[#FCF9F2] to-[#fffaf0] shadow-xs transition-all hover:border-sekkha-hairline-strong hover:shadow-md"
      data-index={index}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: "easeOut" }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
    >
      {/* Top Text Area (Centered like Reference) */}
      <div className="px-6 pt-8 pb-4 text-center sm:px-8">
        <h3 className="text-xl font-extrabold tracking-tight text-sekkha-ink sm:text-2xl">
          {title}
        </h3>
        <p className="text-body-sm mx-auto mt-2.5 max-w-[440px] leading-relaxed text-sekkha-slate">
          {truncated}
        </p>
      </div>

      {/* Bottom Visual Illustration Area */}
      <div className="relative flex min-h-[185px] w-full flex-1 items-end justify-center overflow-hidden">
        <Illustration />
      </div>
    </motion.div>
  )
}
