import { motion } from 'motion/react'
import { Button } from '@/components/base/Button'

interface CTABannerProps {
  heading: string
  onSignUpNavigate: () => void
}

/**
 * CTABanner — full-width dark call-to-action banner for the landing page.
 * @requirements 6.1–6.8
 */
export function CTABanner({ heading, onSignUpNavigate }: CTABannerProps) {
  return (
    <section
      aria-labelledby="cta-heading"
      className="mx-auto w-full max-w-[1280px] px-4 md:px-8 py-[64px]"
    >
      <motion.div
        className="relative overflow-hidden bg-sekkha-primary text-sekkha-on-primary rounded-[32px] p-[64px] flex flex-col items-center gap-8"
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      >
        {/* Decorative background orbs */}
        <span
          className="pointer-events-none absolute -top-24 -left-24 h-72 w-72 rounded-full bg-sekkha-brand-yellow/10 blur-3xl"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-sekkha-teal-light/10 blur-3xl"
          aria-hidden="true"
        />

        <motion.h2
          id="cta-heading"
          className="relative text-heading-1 text-sekkha-on-primary text-center max-w-[640px]"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.15, ease: "easeOut" }}
        >
          {heading}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.28, ease: "easeOut" }}
        >
          <Button variant="on-dark" onClick={onSignUpNavigate}>
            Bergabung Sekarang — Gratis
          </Button>
        </motion.div>
      </motion.div>
    </section>
  )
}
