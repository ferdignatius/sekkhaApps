import { motion } from "motion/react"
import { Button, Card } from "@/components/base"
import { DashboardMockup } from "./DashboardMockup"

interface HeroSectionProps {
  headline: string
  subheadline: string
}

const EASE = "easeOut"

export function HeroSection({ headline, subheadline }: HeroSectionProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative w-full overflow-hidden py-14 md:py-20"
    >
      {/* Subtle warm Clay canvas backdrop per DESIGN.md */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-sekkha-surface/60 via-sekkha-canvas to-sekkha-canvas" />

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 md:px-8">
        {/* Badge */}
        <motion.div
          className="mb-6 flex justify-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0 }}
        >
          <span className="text-body-sm inline-flex items-center gap-2 rounded-full border border-sekkha-hairline bg-sekkha-surface px-4 py-1.5 font-medium text-sekkha-ink shadow-xs">
            ✨ Youth Digital Platform • Vihara Tri Maha Dharma
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          id="hero-heading"
          className="md:text-display-xl mx-auto max-w-[860px] text-center text-4xl leading-[1.05] font-medium tracking-[-1.5px] text-sekkha-ink sm:text-5xl sm:tracking-[-2px] md:tracking-[-2.5px]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.08 }}
        >
          {headline}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-body-md mx-auto mt-6 max-w-[660px] text-center leading-relaxed font-normal text-sekkha-slate md:text-lg"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.16 }}
        >
          {subheadline}
        </motion.p>

        {/* CTA Group */}
        <motion.div
          className="mt-8 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: EASE, delay: 0.24 }}
        >
          <Button
            variant="primary"
            className="h-[44px] w-full rounded-[12px] bg-sekkha-primary px-6 font-semibold text-white shadow-xs hover:bg-clay-primary-active sm:w-auto"
            asChild
          >
            <a href="/sign-up" role="button" className="font-semibold !text-white">
              Join for Free
            </a>
          </Button>
          <Button
            variant="secondary"
            className="h-[44px] w-full rounded-[12px] border border-sekkha-hairline bg-sekkha-canvas px-6 font-semibold text-sekkha-ink shadow-xs hover:bg-sekkha-surface sm:w-auto"
            asChild
          >
            <a
              href="#events"
              role="button"
              className="font-semibold !text-sekkha-ink"
            >
              Explore Events
            </a>
          </Button>
        </motion.div>

        {/* Interactive Sekkha v2.x Workspace Preview */}
        <Card
          variant="soft"
          className="mt-10 rounded-[24px] border border-sekkha-hairline bg-sekkha-surface/70 p-4 shadow-xs sm:p-6"
        >
          <DashboardMockup />
        </Card>
      </div>
    </section>
  )
}
