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
    <section aria-labelledby="hero-heading" className="relative w-full py-[120px] overflow-hidden">
      {/* Background ambient mesh gradient */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-amber-50/40 via-teal-50/20 to-white pointer-events-none" />

      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8 relative z-10">

        {/* Badge */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full glass-pill px-4 py-1.5 text-body-sm text-sekkha-ink font-medium shadow-sm">
            ✨ Platform Digital Remaja • Vihara Tri Maha Dharma
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          id="hero-heading"
          className="text-hero-display text-sekkha-ink max-w-[840px] mx-auto text-center font-bold tracking-tight text-4xl sm:text-5xl md:text-7xl leading-tight"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        >
          {headline}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-subtitle text-sekkha-slate max-w-[640px] mx-auto text-center mt-6 text-base md:text-lg leading-relaxed font-normal"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.2 }}
        >
          {subheadline}
        </motion.p>

        {/* CTA Group */}
        <motion.div
          className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mt-10 w-full md:w-auto"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.35 }}
        >
          <Button variant="primary" className="w-full md:w-auto shadow-md hover:shadow-lg transition-all" asChild>
            <a href="/sign-up" role="button" className="!text-white font-semibold">Bergabung Sekarang</a>
          </Button>
          <Button variant="secondary" className="w-full md:w-auto shadow-sm hover:shadow transition-all" asChild>
            <a href="#events" role="button" className="!text-sekkha-ink font-semibold">Lihat Kegiatan</a>
          </Button>
        </motion.div>

        {/* Whiteboard Interactive Dashboard Mockup */}
        <DashboardMockup />

        {/* Glowing background ambient orbs */}
        <motion.div
          className="pointer-events-none absolute left-[10%] top-[15%] -z-10 h-96 w-96 rounded-full bg-sekkha-brand-yellow/20 blur-3xl animate-pulse-slow"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.2, ease: 'easeOut' }}
          aria-hidden="true"
        />
        <motion.div
          className="pointer-events-none absolute right-[10%] top-[25%] -z-10 h-80 w-80 rounded-full bg-sekkha-teal-light/40 blur-3xl animate-float"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.4, ease: 'easeOut' }}
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
