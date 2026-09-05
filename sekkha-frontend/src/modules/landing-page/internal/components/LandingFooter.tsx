import { motion } from 'motion/react'

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
      className="w-full bg-sekkha-surface text-sekkha-ink border-t border-sekkha-hairline py-[80px]"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">

        {/* Top area */}
        <motion.div
          className="flex flex-col md:flex-row gap-10 md:justify-between"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Brand */}
          <div className="flex flex-col gap-3 max-w-[320px]">
            <span className="flex items-center gap-2 text-title-lg text-sekkha-ink font-semibold tracking-tight">
              <img src="/sekkha_logo.svg" alt="" className="size-6 object-contain" />
              <span>Sekkha</span>
            </span>
            <p className="text-body-sm text-sekkha-slate leading-relaxed">
              Digital community & fellowship platform for Buddhist youth of Vihara Tri Maha Dharma.
            </p>
          </div>

          {/* Nav columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 md:gap-16">
            {navColumns.map((column) => (
              <div key={column.heading} className="flex flex-col gap-3.5">
                <p className="text-title-sm text-sekkha-ink font-semibold">{column.heading}</p>
                <ul className="flex flex-col gap-2.5">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-body-sm text-sekkha-slate rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sekkha-primary hover:text-sekkha-ink transition-colors duration-150"
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
        <div className="mt-14 pt-8 border-t border-sekkha-hairline flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-micro text-sekkha-slate">
            © {new Date().getFullYear()} Vihara Tri Maha Dharma — Sekkha. All rights reserved.
          </p>
          <p className="text-micro text-sekkha-slate">
            May all beings be peaceful and happy 🙏
          </p>
        </div>
      </div>
    </footer>
  )
}
