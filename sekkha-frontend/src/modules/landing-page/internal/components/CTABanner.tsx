import { motion } from 'motion/react'
import { Button } from '@/components/base/Button'
import { QuoteIcon, HeartIcon } from 'lucide-react'

interface CTABannerProps {
  heading: string
  onSignUpNavigate: () => void
}

/**
 * CTABanner — unified glass call-to-action banner with Dhamma wisdom quote.
 * @requirements 6.1–6.8
 */
export function CTABanner({ heading, onSignUpNavigate }: CTABannerProps) {
  return (
    <section
      aria-labelledby="cta-heading"
      className="relative mx-auto w-full max-w-[1280px] px-4 md:px-8 py-16 md:py-24"
    >
      <motion.div
        className="relative overflow-hidden rounded-[24px] p-8 md:p-16 flex flex-col items-center text-center bg-sekkha-surface border border-sekkha-hairline shadow-xs"
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      >
        {/* Background subtle warm glow */}
        <span
          className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#e8b94a]/15 blur-3xl"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#1a3a3a]/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center max-w-[800px] w-full">
          {/* Quote Icon Badge */}
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-white border border-sekkha-hairline mb-5 shadow-xs">
            <QuoteIcon className="size-5 text-[#e8b94a]" />
          </div>

          {/* Dhamma Quote */}
          <blockquote className="text-lg md:text-xl font-medium text-sekkha-ink leading-relaxed tracking-tight mb-4">
            &ldquo;The virtues planted by youth today are the sanctuary of peace for our shared tomorrow.&rdquo;
          </blockquote>

          {/* Author info */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sekkha-primary text-white font-bold text-micro shadow-xs">
              TM
            </div>
            <p className="text-body-sm font-semibold text-sekkha-ink">
              Youth Mentors & Sangha • <span className="text-sekkha-slate font-normal">Vihara Tri Maha Dharma</span>
            </p>
          </div>

          {/* Separator line */}
          <div className="w-24 h-px bg-sekkha-hairline mb-8" aria-hidden="true" />

          {/* Heading */}
          <motion.h2
            id="cta-heading"
            className="text-2xl sm:text-3xl md:text-display-md text-sekkha-ink font-medium tracking-[-1px] mb-8"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.55, delay: 0.15, ease: "easeOut" }}
          >
            {heading}
          </motion.h2>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.28, ease: "easeOut" }}
          >
            <Button
              variant="primary"
              onClick={onSignUpNavigate}
              className="h-[44px] px-8 rounded-[12px] bg-sekkha-primary hover:bg-[#1f1f1f] text-white font-semibold shadow-xs hover:scale-[1.02] transition-all"
            >
              Join for Free
            </Button>
          </motion.div>

          {/* Sub-badge */}
          <div className="mt-6 flex items-center gap-2 text-micro font-medium text-sekkha-slate bg-white px-4 py-1.5 rounded-full border border-sekkha-hairline">
            <HeartIcon className="size-3.5 fill-[#ff4d8b] text-[#ff4d8b]" />
            <span>Cultivating Mindfulness, Wisdom & Fellowship</span>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
