import { useState } from "react"
import { motion } from "motion/react"
import type { EventItem } from "../data/landingContent"
import { CalendarIcon, MapPinIcon } from "lucide-react"

interface EventsSectionProps {
  heading: string
  subheading: string
  items: EventItem[]
}

export function EventsSection({
  heading,
  subheading,
  items,
}: EventsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<string>("all")

  const filteredItems =
    activeCategory === "all"
      ? items
      : items.filter((item) => item.category === activeCategory)

  return (
    <section
      aria-labelledby="events-heading"
      id="events"
      className="relative py-16 md:py-24"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        {/* Heading */}
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <h2
            id="events-heading"
            className="md:text-display-md text-3xl font-extrabold tracking-tight text-sekkha-ink sm:text-4xl"
          >
            {heading}
          </h2>
          <p className="text-body-md mx-auto mt-3 max-w-[560px] text-sekkha-slate md:text-lg">
            {subheading}
          </p>

          {/* Interactive Category Filter Pills (44px min touch target) */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
            {[
              { id: "all", label: "All Events" },
              { id: "fellowship", label: "Fellowship & Puja" },
              { id: "retreat", label: "Retreat & Dhamma Camp" },
              { id: "social", label: "Social Action & Charity" },
              { id: "event", label: "Special Celebrations" },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`text-body-sm min-h-[44px] cursor-pointer rounded-full px-4 py-2 font-semibold transition-colors ${
                  activeCategory === cat.id
                    ? "bg-sekkha-primary text-white shadow-xs"
                    : "border border-sekkha-hairline bg-white text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Event cards grid */}
        {filteredItems.length === 0 ? (
          <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-surface p-8 text-center text-sm text-sekkha-slate">
            No sample events in this category. Select &ldquo;All Events&rdquo;
            to view all temple gatherings.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {filteredItems.map((event, i) => (
                <motion.article
                  key={event.title}
                  className="group relative flex flex-col justify-between gap-4 overflow-hidden rounded-2xl border border-[#e5dec9] bg-white p-6 shadow-xs transition-all hover:border-sekkha-hairline-strong hover:shadow-md"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.45,
                    delay: i * 0.07,
                    ease: "easeOut",
                  }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                >
                  <div>
                    <h3 className="text-title-md leading-snug font-semibold text-sekkha-ink transition-colors group-hover:text-sekkha-primary">
                      {event.title}
                    </h3>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 border-t border-sekkha-hairline pt-4">
                    <p className="text-body-sm flex items-center gap-2 text-sekkha-slate">
                      <CalendarIcon className="size-4 shrink-0 text-clay-teal" />
                      <span>{event.date}</span>
                    </p>
                    <p className="text-body-sm flex items-center gap-2 text-sekkha-slate">
                      <MapPinIcon className="size-4 shrink-0 text-clay-pink" />
                      <span className="truncate">{event.location}</span>
                    </p>
                  </div>
                </motion.article>
            ))}
          </div>
        )}

        {/* Auth-gated CTA directly to /events */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          <a
            href="/events"
            className="text-body-sm inline-flex min-h-[44px] items-center gap-2 rounded-[12px] border border-sekkha-hairline bg-white px-6 py-3 font-semibold text-sekkha-ink transition-colors hover:bg-sekkha-surface"
          >
            View all upcoming events →
          </a>
        </motion.div>
      </div>
    </section>
  )
}
