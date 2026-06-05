import { motion } from 'motion/react'
import { Button } from '@/components/base/Button'

interface HeroSectionProps {
  headline: string
  subheadline: string
}

// cubic-bezier as a string — motion accepts this format and TypeScript is happy
const EASE = "easeOut"

export function HeroSection({ headline, subheadline }: HeroSectionProps) {
  return (
    <section aria-labelledby="hero-heading" className="w-full bg-sekkha-canvas py-[120px]">
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">

        {/* Badge */}
        <motion.div
          className="flex justify-center mb-6"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0 }}
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-sekkha-hairline bg-sekkha-surface px-4 py-1.5 text-body-sm text-sekkha-slate">
            🙏 Komunitas Remaja Buddhist
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          id="hero-heading"
          className="text-heading-1 md:text-hero-display text-sekkha-ink max-w-[800px] mx-auto text-center"
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
        >
          {headline}
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          className="text-subtitle text-sekkha-slate max-w-[600px] mx-auto text-center mt-6"
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
          <Button variant="primary" className="w-full md:w-auto">
            Bergabung Sekarang
          </Button>
          <Button variant="secondary" className="w-full md:w-auto">
            Lihat Kegiatan
          </Button>
        </motion.div>

        {/* Decorative background orbs — relative to viewport, not section */}
        <motion.div
          className="pointer-events-none fixed left-[15%] top-[20%] -z-10 h-72 w-72 rounded-full bg-sekkha-brand-yellow/15 blur-3xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.2, ease: 'easeOut' }}
          aria-hidden="true"
        />
        <motion.div
          className="pointer-events-none fixed right-[15%] top-[30%] -z-10 h-64 w-64 rounded-full bg-sekkha-teal-light/25 blur-3xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4, delay: 0.4, ease: 'easeOut' }}
          aria-hidden="true"
        />
      </div>
    </section>
  )
}
