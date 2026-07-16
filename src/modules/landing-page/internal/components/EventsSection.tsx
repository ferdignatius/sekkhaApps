import { motion } from 'motion/react'
import type { EventItem } from '../data/landingContent'

interface EventsSectionProps {
  heading: string
  subheading: string
  items: EventItem[]
}

const categoryStyles: Record<EventItem['category'], { bg: string; label: string }> = {
  kebaktian: { bg: 'bg-sekkha-teal-light text-sekkha-ink', label: 'Kebaktian' },
  retreat: { bg: 'bg-sekkha-brand-yellow text-sekkha-ink', label: 'Retreat' },
  'bakti-sosial': { bg: 'bg-sekkha-coral-light text-sekkha-ink', label: 'Bakti Sosial' },
  event: { bg: 'bg-sekkha-rose-light text-sekkha-ink', label: 'Event' },
}

export function EventsSection({ heading, subheading, items }: EventsSectionProps) {
  return (
    <section aria-labelledby="events-heading" id="events" className="py-[96px] bg-sekkha-surface">
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">

        {/* Heading */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <h2 id="events-heading" className="text-heading-2 text-sekkha-ink">
            {heading}
          </h2>
          <p className="text-subtitle text-sekkha-slate mt-3 max-w-[480px] mx-auto">
            {subheading}
          </p>
        </motion.div>

        {/* Event cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((event, i) => {
            const cat = categoryStyles[event.category]
            return (
              <motion.article
                key={i}
                className="flex flex-col gap-4 rounded-[28px] bg-sekkha-canvas p-6 border border-sekkha-hairline"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: "easeOut" }}
                whileHover={{ y: -4, boxShadow: '0 12px 32px -4px rgba(5,0,56,0.08)', transition: { duration: 0.2 } }}
              >
                {/* Category badge */}
                <span
                  className={`self-start rounded-full px-3 py-1 text-micro font-medium ${cat.bg}`}
                >
                  {cat.label}
                </span>

                {/* Title */}
                <h3 className="text-heading-5 text-sekkha-ink leading-snug">
                  {event.title}
                </h3>

                {/* Meta */}
                <div className="mt-auto flex flex-col gap-1">
                  <p className="text-body-sm text-sekkha-slate flex items-center gap-1.5">
                    <span aria-hidden="true">📅</span>
                    {event.date}
                  </p>
                  <p className="text-body-sm text-sekkha-slate flex items-center gap-1.5">
                    <span aria-hidden="true">📍</span>
                    {event.location}
                  </p>
                </div>
              </motion.article>
            )
          })}
        </div>

        {/* View all */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <a
            href="/events"
            className="text-body-sm-medium text-sekkha-slate underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sekkha-primary rounded-sm"
          >
            Lihat semua kegiatan →
          </a>
        </motion.div>
      </div>
    </section>
  )
}
