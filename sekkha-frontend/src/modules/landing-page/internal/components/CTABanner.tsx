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
      className="relative mx-auto w-full max-w-[1280px] px-4 md:px-8 py-[64px]"
    >
      <motion.div
        className="glass-panel relative overflow-hidden rounded-[36px] p-8 md:p-14 flex flex-col items-center text-center shadow-2xl border border-white/80 bg-gradient-to-br from-white/95 via-amber-50/60 to-teal-50/60"
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      >
        {/* Background ambient decorative shapes */}
        <span
          className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-amber-200/40 blur-3xl animate-pulse-slow"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-teal-200/40 blur-3xl animate-float"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-col items-center max-w-[800px] w-full">
          {/* Quote Icon Badge */}
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-100/90 border border-amber-200/70 mb-5 shadow-sm">
            <QuoteIcon className="size-5 text-amber-800" />
          </div>

          {/* Dhamma Quote */}
          <blockquote className="text-lg md:text-xl font-medium text-sekkha-ink leading-relaxed tracking-tight mb-4">
            &ldquo;Kebajikan yang ditanam oleh generasi muda hari ini adalah naungan kedamaian bagi masa depan kita bersama.&rdquo;
          </blockquote>

          {/* Author info */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sekkha-primary text-white font-bold text-micro shadow-sm">
              TM
            </div>
            <p className="text-body-sm font-semibold text-sekkha-ink">
              Pesan Pembimbing Youth • <span className="text-sekkha-slate font-normal">Vihara Tri Maha Dharma</span>
            </p>
          </div>

          {/* Separator line */}
          <div className="w-24 h-px bg-sekkha-hairline-strong/40 mb-6" aria-hidden="true" />

          {/* Heading */}
          <motion.h2
            id="cta-heading"
            className="text-heading-2 text-sekkha-ink font-bold tracking-tight text-2xl sm:text-3xl md:text-4xl mb-6"
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
              className="shadow-xl hover:scale-105 transition-all text-body-md font-semibold px-8 py-4"
            >
              Bergabung Sekarang — Gratis
            </Button>
          </motion.div>

          {/* Sub-badge */}
          <div className="mt-6 flex items-center gap-1.5 text-micro font-medium text-amber-900 bg-amber-100/70 px-3.5 py-1.5 rounded-full border border-amber-200/60">
            <HeartIcon className="size-3.5 fill-amber-500 text-amber-600" />
            <span>Bersama Membangun Karakter & Kebajikan Remaja Buddhis</span>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
