import { motion } from 'motion/react'
import { Button } from '@/components/base/Button'
import { DashboardMockup } from './DashboardMockup'

interface HeroSectionProps {
  headline: string
  subheadline: string
}

// cubic-bezier as a string — motion accepts this format and TypeScript is happy
const EASE = "easeOut"

export function HeroSection({ headline, subheadline }: HeroSectionProps) {
  return (
    <section aria-labelledby="hero-heading" className="relative w-full py-16 md:py-24 overflow-hidden">
      {/* Background ambient mesh gradient — cream canvas per DESIGN.md */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-sekkha-surface/70 via-sekkha-canvas to-sekkha-canvas pointer-events-none" />

      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8 relative z-10">

        {/* Badge */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white border border-sekkha-hairline px-4 py-1.5 text-body-sm text-sekkha-ink font-medium shadow-xs">
            ✨ Youth Digital Platform • Vihara Tri Maha Dharma
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          id="hero-heading"
          className="text-4xl sm:text-5xl md:text-display-xl text-sekkha-ink max-w-[860px] mx-auto text-center font-medium tracking-[-1.5px] sm:tracking-[-2px] md:tracking-[-2.5px] leading-[1.05]"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        >
          {headline}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-body-md md:text-lg text-sekkha-slate max-w-[640px] mx-auto text-center mt-6 leading-relaxed font-normal"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        >
          {subheadline}
        </motion.p>

        {/* CTA Group */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8 w-full sm:w-auto"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
        >
          <Button
            variant="primary"
            className="w-full sm:w-auto h-[44px] px-6 rounded-[12px] bg-sekkha-primary hover:bg-[#1f1f1f] text-white font-semibold shadow-xs"
            asChild
          >
            <a href="/sign-up" role="button" className="!text-white font-semibold">
              Join for Free
            </a>
          </Button>
          <Button
            variant="secondary"
            className="w-full sm:w-auto h-[44px] px-6 rounded-[12px] bg-sekkha-canvas border border-sekkha-hairline hover:bg-sekkha-surface text-sekkha-ink font-semibold shadow-xs"
            asChild
          >
            <a href="#events" role="button" className="!text-sekkha-ink font-semibold">
              Explore Events
            </a>
          </Button>
        </motion.div>

        {/* Whiteboard Interactive Dashboard Mockup */}
        <DashboardMockup />

        {/* Glowing background ambient orbs */}
        <motion.div
          className="pointer-events-none absolute left-[10%] top-[15%] -z-10 h-40 w-40 sm:h-96 sm:w-96 rounded-full bg-sekkha-brand-yellow/20 blur-3xl animate-pulse-slow"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.2, ease: 'easeOut' }}
          aria-hidden="true"
        />
        <motion.div
          className="pointer-events-none absolute right-[10%] top-[25%] -z-10 h-32 w-32 sm:h-80 sm:w-80 rounded-full bg-sekkha-teal-light/40 blur-3xl animate-float"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.4, ease: 'easeOut' }}
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
