import { motion } from "motion/react"
import { Button } from "@/components/base/Button"
import { QuoteIcon, HeartIcon } from "lucide-react"

interface CTABannerProps {
  heading: string
  onSignUpNavigate: () => void
}

/**
 * CTABanner — unified warm Clay call-to-action banner with Dhamma wisdom quote.
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
        transition={{ duration: 0.55, ease: "easeOut" }}
      >
        <div className="relative z-10 flex w-full max-w-[800px] flex-col items-center">
          <div className="mb-5 inline-flex items-center justify-center rounded-full border border-sekkha-hairline bg-white p-3 shadow-xs">
            <QuoteIcon className="size-5 text-clay-ochre" />
          </div>

          <blockquote className="mb-4 text-lg leading-relaxed font-medium tracking-tight text-sekkha-ink md:text-xl">
            &ldquo;The virtues planted by youth today are the sanctuary of peace
            for our shared tomorrow.&rdquo;
          </blockquote>

          <div className="mb-6 flex items-center gap-2.5">
            <div className="text-micro flex h-8 w-8 items-center justify-center rounded-full bg-sekkha-primary font-bold text-white shadow-xs">
              TM
            </div>
            <p className="text-body-sm font-semibold text-sekkha-ink">
              Youth Mentors &amp; Sangha •{" "}
              <span className="font-normal text-sekkha-slate">
                Vihara Tri Maha Dharma
              </span>
            </p>
          </div>

          <div
            className="mb-8 h-px w-24 bg-sekkha-hairline"
            aria-hidden="true"
          />

          <motion.h2
            id="cta-heading"
            className="md:text-display-md mb-8 text-2xl font-medium tracking-[-1px] text-sekkha-ink sm:text-3xl"
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
          >
            {heading}
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.18, ease: "easeOut" }}
          >
            <Button
              variant="primary"
              onClick={onSignUpNavigate}
              className="h-[44px] rounded-[12px] bg-sekkha-primary px-8 font-semibold text-white shadow-xs transition-colors hover:bg-clay-primary-active"
            >
              Join for Free
            </Button>
          </motion.div>

          <div className="text-micro mt-6 flex items-center gap-2 rounded-full border border-sekkha-hairline bg-white px-4 py-1.5 font-medium text-sekkha-slate">
            <HeartIcon className="size-3.5 fill-clay-pink text-clay-pink" />
            <span>Cultivating Mindfulness, Wisdom &amp; Fellowship</span>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
