import { useState } from 'react'
import { motion } from 'motion/react'
import type { EventItem } from '../data/landingContent'
import { CalendarIcon, MapPinIcon, SparklesIcon } from 'lucide-react'

interface EventsSectionProps {
  heading: string
  subheading: string
  items: EventItem[]
}

const categoryStyles: Record<EventItem['category'], { bg: string; label: string }> = {
  kebaktian: { bg: 'bg-teal-100/80 text-teal-900 border-teal-200/60', label: 'Kebaktian' },
  retreat: { bg: 'bg-amber-100/80 text-amber-900 border-amber-200/60', label: 'Retreat' },
  'bakti-sosial': { bg: 'bg-rose-100/80 text-rose-900 border-rose-200/60', label: 'Bakti Sosial' },
  event: { bg: 'bg-fuchsia-100/80 text-fuchsia-900 border-fuchsia-200/60', label: 'Event Special' },
}

export function EventsSection({ heading, subheading, items }: EventsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>('semua')

  const filteredItems = activeCategory === 'semua' 
    ? items 
    : items.filter(item => item.category === activeCategory)

  return (
    <section aria-labelledby="events-heading" id="events" className="relative py-[96px]">
      {/* Ambient background glow */}
      <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-teal-100/30 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">

        {/* Heading */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full glass-pill px-3.5 py-1 text-micro font-semibold text-sekkha-ink uppercase tracking-wider mb-3">
            <SparklesIcon className="size-3.5 text-amber-500" /> Agenda Umat Remaja
          </span>
          <h2 id="events-heading" className="text-heading-2 text-sekkha-ink font-bold tracking-tight text-3xl sm:text-4xl md:text-5xl">
            {heading}
          </h2>
          <p className="text-subtitle text-sekkha-slate mt-3 max-w-[540px] mx-auto text-base md:text-lg">
            {subheading}
          </p>

          {/* Interactive Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {[
              { id: 'semua', label: 'Semua Kegiatan' },
              { id: 'kebaktian', label: 'Kebaktian' },
              { id: 'retreat', label: 'Retreat & Kamp' },
              { id: 'bakti-sosial', label: 'Bakti Sosial' },
              { id: 'event', label: 'Event Special' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-body-sm font-medium transition-all ${
                  activeCategory === cat.id
                    ? 'bg-sekkha-primary text-white shadow-md scale-105'
                    : 'glass-pill text-sekkha-slate hover:text-sekkha-ink hover:bg-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Event cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((event, i) => {
            const cat = categoryStyles[event.category]
            return (
              <motion.article
                key={i}
                className="flex flex-col gap-4 rounded-[28px] glass-panel p-6 border border-white/80 shadow-md relative overflow-hidden group"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: "easeOut" }}
                whileHover={{ y: -6, boxShadow: '0 20px 40px -10px rgba(5,0,56,0.1)', transition: { duration: 0.25 } }}
              >
                {/* Category badge */}
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-full px-3 py-1 text-micro font-bold border backdrop-blur-md ${cat.bg}`}
                  >
                    {cat.label}
                  </span>
                  <span className="text-micro font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/50">
                    Sisa 15 Kursi
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-heading-5 text-sekkha-ink font-semibold leading-snug group-hover:text-sekkha-brand-blue transition-colors">
                  {event.title}
                </h3>

                {/* Meta */}
                <div className="mt-auto pt-4 border-t border-sekkha-hairline-soft/60 flex flex-col gap-2">
                  <p className="text-body-sm text-sekkha-slate flex items-center gap-2">
                    <CalendarIcon className="size-4 text-sekkha-brand-blue shrink-0" />
                    <span>{event.date}</span>
                  </p>
                  <p className="text-body-sm text-sekkha-slate flex items-center gap-2">
                    <MapPinIcon className="size-4 text-rose-500 shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </p>
                </div>
              </motion.article>
            )
          })}
        </div>

        {/* View all */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <a
            href="/events"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full glass-pill text-body-sm-medium text-sekkha-ink hover:bg-white hover:shadow-md transition-all border border-white/80"
          >
            Lihat semua jadwal kegiatan →
          </a>
        </motion.div>
      </div>
    </section>
  )
}
