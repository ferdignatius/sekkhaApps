import { motion } from "motion/react"

interface FooterLink {
  label: string
  href: string
}

interface FooterNavColumn {
  heading: string
  links: FooterLink[]
}

interface LandingFooterProps {
  navColumns: FooterNavColumn[]
}

/**
 * Landing Footer — bottom section of the Sekkha landing page.
 * @requirements 7.1–7.7
 */
export function LandingFooter({ navColumns }: LandingFooterProps) {
  return (
    <footer
      role="contentinfo"
      className="w-full border-t border-sekkha-hairline bg-sekkha-surface py-16 text-sekkha-ink md:py-20"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">
        {/* Top area */}
        <motion.div
          className="flex flex-col gap-10 md:flex-row md:justify-between"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Brand */}
          <div className="flex max-w-[320px] flex-col gap-3">
            <span className="text-title-lg flex items-center gap-2 font-semibold tracking-tight text-sekkha-ink">
              <img
                src="/sekkha_logo.svg"
                alt=""
                className="size-6 object-contain"
              />
              <span>Sekkha</span>
            </span>
            <p className="text-body-sm leading-relaxed text-sekkha-slate">
              Digital community & fellowship platform for Buddhist youth of
              Vihara Tri Maha Dharma.
            </p>
          </div>

          {/* Nav columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:gap-16">
            {navColumns.map((column) => (
              <div key={column.heading} className="flex flex-col gap-3.5">
                <p className="text-title-sm font-semibold text-sekkha-ink">
                  {column.heading}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-body-sm rounded-sm text-sekkha-slate transition-colors duration-150 hover:text-sekkha-ink focus-visible:ring-2 focus-visible:ring-sekkha-primary focus-visible:ring-offset-2 focus-visible:outline-none"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Divider + copyright */}
        <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-sekkha-hairline pt-8 md:flex-row md:items-center">
          <p className="text-micro text-sekkha-slate">
            © {new Date().getFullYear()} Vihara Tri Maha Dharma — Sekkha. All
            rights reserved.
          </p>
          <p className="text-micro text-sekkha-slate">
            May all beings be peaceful and happy 🙏
          </p>
        </div>
      </div>
    </footer>
  )
}
