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
  fellowship: { bg: 'bg-teal-100/80 text-teal-900 border-teal-200/60', label: 'Fellowship' },
  retreat: { bg: 'bg-amber-100/80 text-amber-900 border-amber-200/60', label: 'Retreat' },
  social: { bg: 'bg-rose-100/80 text-rose-900 border-rose-200/60', label: 'Social Action' },
  event: { bg: 'bg-fuchsia-100/80 text-fuchsia-900 border-fuchsia-200/60', label: 'Special Event' },
}

export function EventsSection({ heading, subheading, items }: EventsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all')

  const filteredItems = activeCategory === 'all' 
    ? items 
    : items.filter(item => item.category === activeCategory)

  return (
    <section aria-labelledby="events-heading" id="events" className="relative py-16 md:py-24">
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">

        {/* Heading */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-sekkha-hairline px-3.5 py-1 text-caption-uppercase text-sekkha-ink tracking-[1.5px] mb-4 shadow-xs">
            <SparklesIcon className="size-3.5 text-[#e8b94a]" /> Agenda & Events
          </span>
          <h2 id="events-heading" className="text-3xl sm:text-4xl md:text-display-md text-sekkha-ink font-medium tracking-[-1px]">
            {heading}
          </h2>
          <p className="text-body-md md:text-lg text-sekkha-slate mt-3 max-w-[540px] mx-auto">
            {subheading}
          </p>

          {/* Interactive Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {[
              { id: 'all', label: 'All Events' },
              { id: 'fellowship', label: 'Fellowship & Puja' },
              { id: 'retreat', label: 'Retreat & Dhamma Camp' },
              { id: 'social', label: 'Social Action & Charity' },
              { id: 'event', label: 'Special Celebrations' },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-body-sm font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-sekkha-primary text-white shadow-xs'
                    : 'bg-transparent text-sekkha-slate hover:text-sekkha-ink hover:bg-black/5'
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
            const cat = categoryStyles[event.category] || { bg: 'bg-[#a4d4c5]/40 text-[#1a3a3a] border-[#a4d4c5]/60', label: 'Event' }
            return (
              <motion.article
                key={i}
                className="flex flex-col justify-between gap-4 rounded-lg bg-white p-6 border border-sekkha-hairline shadow-xs relative overflow-hidden group hover:border-black/20 hover:shadow-md transition-all"
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.55, delay: i * 0.1, ease: "easeOut" }}
                whileHover={{ y: -4, transition: { duration: 0.25 } }}
              >
                <div>
                  {/* Category badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-micro font-semibold border ${cat.bg}`}
                    >
                      {cat.label}
                    </span>
                    <span className="text-micro font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                      Available
                    </span>
                  </div>

                  {/* Title */}
                  <h3 className="text-title-md text-sekkha-ink font-semibold leading-snug group-hover:text-sekkha-primary transition-colors">
                    {event.title}
                  </h3>
                </div>

                {/* Meta */}
                <div className="mt-4 pt-4 border-t border-sekkha-hairline flex flex-col gap-2">
                  <p className="text-body-sm text-sekkha-slate flex items-center gap-2">
                    <CalendarIcon className="size-4 text-[#1a3a3a] shrink-0" />
                    <span>{event.date}</span>
                  </p>
                  <p className="text-body-sm text-sekkha-slate flex items-center gap-2">
                    <MapPinIcon className="size-4 text-[#ff4d8b] shrink-0" />
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
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[12px] bg-white text-body-sm font-semibold text-sekkha-ink hover:bg-sekkha-surface hover:shadow-xs transition-all border border-sekkha-hairline"
          >
            View all upcoming events →
          </a>
        </motion.div>
      </div>
    </section>
  )
}
