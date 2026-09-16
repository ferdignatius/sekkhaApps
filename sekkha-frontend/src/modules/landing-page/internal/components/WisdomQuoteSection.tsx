import { motion } from "motion/react"
import { QuoteIcon, HeartIcon } from "lucide-react"

export function WisdomQuoteSection() {
  return (
    <section className="relative overflow-hidden py-[80px]">
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        <motion.div
          className="glass-panel relative w-full overflow-hidden rounded-[36px] border border-white bg-gradient-to-br from-white/90 via-amber-50/50 to-teal-50/50 p-8 shadow-2xl md:p-14"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* Background ambient decorative shapes */}
          <div className="pointer-events-none absolute -top-16 -left-16 h-48 w-48 rounded-full bg-amber-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -right-16 -bottom-16 h-48 w-48 rounded-full bg-teal-200/30 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center justify-center rounded-full border border-amber-200/60 bg-amber-100/80 p-3 shadow-sm">
              <QuoteIcon className="size-6 text-amber-700" />
            </div>

            <blockquote className="max-w-[760px] text-xl leading-relaxed font-medium tracking-tight text-sekkha-ink md:text-2xl">
              &ldquo;The virtues planted by youth today are the sanctuary of
              peace for our shared tomorrow.&rdquo;
            </blockquote>

            <div className="mt-6 flex items-center gap-3">
              <div className="text-body-sm flex h-10 w-10 items-center justify-center rounded-full bg-sekkha-primary font-bold text-white shadow-md">
                TM
              </div>
              <div className="text-left">
                <p className="text-body-md font-semibold text-sekkha-ink">
                  Youth Spiritual Mentors
                </p>
                <p className="text-micro text-sekkha-slate">
                  Vihara Tri Maha Dharma
                </p>
              </div>
            </div>

            <div className="text-micro mt-8 flex items-center gap-2 rounded-full border border-amber-200/50 bg-amber-100/60 px-4 py-1.5 font-medium text-amber-800">
              <HeartIcon className="size-3.5 fill-amber-500 text-amber-600" />
              <span>Cultivating Mindfulness & Compassion in Youth</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
