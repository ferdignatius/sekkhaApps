import { motion } from "motion/react"
import { Button } from "@/components/base/Button"
import { DashboardMockup } from "./DashboardMockup"

interface HeroSectionProps {
  headline: string
  subheadline: string
}

// cubic-bezier as a string — motion accepts this format and TypeScript is happy
const EASE = "easeOut"

export function HeroSection({ headline, subheadline }: HeroSectionProps) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative w-full overflow-hidden py-16 md:py-24"
    >
      {/* Background ambient mesh gradient — cream canvas per DESIGN.md */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-sekkha-surface/70 via-sekkha-canvas to-sekkha-canvas" />

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 md:px-8">
        {/* Badge */}
        <motion.div
          className="mb-6 flex justify-center"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0 }}
        >
          <span className="text-body-sm inline-flex items-center gap-2 rounded-full border border-sekkha-hairline bg-white px-4 py-1.5 font-medium text-sekkha-ink shadow-xs">
            ✨ Youth Digital Platform • Vihara Tri Maha Dharma
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          id="hero-heading"
          className="md:text-display-xl mx-auto max-w-[860px] text-center text-4xl leading-[1.05] font-medium tracking-[-1.5px] text-sekkha-ink sm:text-5xl sm:tracking-[-2px] md:tracking-[-2.5px]"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        >
          {headline}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-body-md mx-auto mt-6 max-w-[640px] text-center leading-relaxed font-normal text-sekkha-slate md:text-lg"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        >
          {subheadline}
        </motion.p>

        {/* CTA Group */}
        <motion.div
          className="mt-8 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
        >
          <Button
            variant="primary"
            className="h-[44px] w-full rounded-[12px] bg-sekkha-primary px-6 font-semibold text-white shadow-xs hover:bg-[#1f1f1f] sm:w-auto"
            asChild
          >
            <a
              href="/sign-up"
              role="button"
              className="font-semibold !text-white"
            >
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

        {/* Whiteboard Interactive Dashboard Mockup */}
        <DashboardMockup />

        {/* Glowing background ambient orbs */}
        <motion.div
          className="animate-pulse-slow pointer-events-none absolute top-[15%] left-[10%] -z-10 h-40 w-40 rounded-full bg-sekkha-brand-yellow/20 blur-3xl sm:h-96 sm:w-96"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.2, ease: "easeOut" }}
          aria-hidden="true"
        />
        <motion.div
          className="animate-float pointer-events-none absolute top-[25%] right-[10%] -z-10 h-32 w-32 rounded-full bg-sekkha-teal-light/40 blur-3xl sm:h-80 sm:w-80"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.4, ease: "easeOut" }}
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
