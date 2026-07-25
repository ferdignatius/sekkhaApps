import { motion } from 'motion/react'
import { QuoteIcon, HeartIcon } from 'lucide-react'

export function WisdomQuoteSection() {
  return (
    <section className="relative py-[80px] overflow-hidden">
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        <motion.div
          className="glass-panel rounded-[36px] p-8 md:p-14 relative shadow-2xl overflow-hidden bg-gradient-to-br from-white/90 via-amber-50/50 to-teal-50/50 border border-white w-full"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
        >
          {/* Background ambient decorative shapes */}
          <div className="absolute -top-16 -left-16 w-48 h-48 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-amber-100/80 border border-amber-200/60 mb-6 shadow-sm">
              <QuoteIcon className="size-6 text-amber-700" />
            </div>

            <blockquote className="text-xl md:text-2xl font-medium text-sekkha-ink leading-relaxed max-w-[760px] tracking-tight">
              &ldquo;Kebajikan yang ditanam oleh generasi muda hari ini adalah naungan kedamaian bagi masa depan kita bersama.&rdquo;
            </blockquote>

            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sekkha-primary text-white font-bold text-body-sm shadow-md">
                TM
              </div>
              <div className="text-left">
                <p className="text-body-md font-semibold text-sekkha-ink">Pesan Pembimbing Youth</p>
                <p className="text-micro text-sekkha-slate">Vihara Tri Maha Dharma</p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-2 text-micro font-medium text-amber-800 bg-amber-100/60 px-4 py-1.5 rounded-full border border-amber-200/50">
              <HeartIcon className="size-3.5 fill-amber-500 text-amber-600" />
              <span>Bersama Membangun Karakter & Kebajikan Remaja Buddhis</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
