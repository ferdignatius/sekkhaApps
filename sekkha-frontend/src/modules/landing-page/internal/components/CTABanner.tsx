import { motion } from "motion/react"
import { Button } from "@/components/base/Button"
import { QuoteIcon, HeartIcon } from "lucide-react"

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
      className="relative mx-auto w-full max-w-[1280px] px-4 py-16 md:px-8 md:py-24"
    >
      <motion.div
        className="relative flex flex-col items-center overflow-hidden rounded-[24px] border border-sekkha-hairline bg-sekkha-surface p-8 text-center shadow-xs md:p-16"
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.65, ease: "easeOut" }}
      >
        {/* Background subtle warm glow */}
        <span
          className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-[#e8b94a]/15 blur-3xl"
          aria-hidden="true"
        />
        <span
          className="pointer-events-none absolute -right-24 -bottom-24 h-80 w-80 rounded-full bg-[#1a3a3a]/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative z-10 flex w-full max-w-[800px] flex-col items-center">
          {/* Quote Icon Badge */}
          <div className="mb-5 inline-flex items-center justify-center rounded-full border border-sekkha-hairline bg-white p-3 shadow-xs">
            <QuoteIcon className="size-5 text-[#e8b94a]" />
          </div>

          {/* Dhamma Quote */}
          <blockquote className="mb-4 text-lg leading-relaxed font-medium tracking-tight text-sekkha-ink md:text-xl">
            &ldquo;The virtues planted by youth today are the sanctuary of peace
            for our shared tomorrow.&rdquo;
          </blockquote>

          {/* Author info */}
          <div className="mb-6 flex items-center gap-2.5">
            <div className="text-micro flex h-8 w-8 items-center justify-center rounded-full bg-sekkha-primary font-bold text-white shadow-xs">
              TM
            </div>
            <p className="text-body-sm font-semibold text-sekkha-ink">
              Youth Mentors & Sangha •{" "}
              <span className="font-normal text-sekkha-slate">
                Vihara Tri Maha Dharma
              </span>
            </p>
          </div>

          {/* Separator line */}
          <div
            className="mb-8 h-px w-24 bg-sekkha-hairline"
            aria-hidden="true"
          />

          {/* Heading */}
          <motion.h2
            id="cta-heading"
            className="md:text-display-md mb-8 text-2xl font-medium tracking-[-1px] text-sekkha-ink sm:text-3xl"
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
              className="h-[44px] rounded-[12px] bg-sekkha-primary px-8 font-semibold text-white shadow-xs transition-all hover:scale-[1.02] hover:bg-[#1f1f1f]"
            >
              Join for Free
            </Button>
          </motion.div>

          {/* Sub-badge */}
          <div className="text-micro mt-6 flex items-center gap-2 rounded-full border border-sekkha-hairline bg-white px-4 py-1.5 font-medium text-sekkha-slate">
            <HeartIcon className="size-3.5 fill-[#ff4d8b] text-[#ff4d8b]" />
            <span>Cultivating Mindfulness, Wisdom & Fellowship</span>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
