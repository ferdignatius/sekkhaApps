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
      className="w-full bg-sekkha-footer-bg text-sekkha-on-dark py-[64px]"
    >
      <div className="mx-auto w-full max-w-[1280px] px-4 md:px-8">

        {/* Top area */}
        <motion.div
          className="flex flex-col md:flex-row gap-8 md:justify-between"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Brand */}
          <div className="flex flex-col gap-3 max-w-[280px]">
            <span className="text-heading-5 text-sekkha-on-dark font-bold tracking-tight">🙏 Sekkha</span>
            <p className="text-body-sm text-sekkha-on-dark-muted leading-relaxed">
              Digital community & fellowship platform for Vihara Tri Maha Dharma.
            </p>
          </div>

          {/* Nav columns */}
          <div className="flex flex-col md:flex-row gap-8">
            {navColumns.map((column) => (
              <div key={column.heading} className="flex flex-col gap-3">
                <p className="text-body-md-medium text-sekkha-on-dark">{column.heading}</p>
                <ul className="flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <a
                        href={link.href}
                        className="text-footer-link text-sekkha-on-dark-muted rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sekkha-on-dark hover:text-sekkha-on-dark transition-colors duration-150"
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
        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-micro text-sekkha-on-dark-muted">
            © {new Date().getFullYear()} Vihara Tri Maha Dharma — Sekkha. All rights reserved.
          </p>
          <p className="text-micro text-sekkha-on-dark-muted">
            May all beings be peaceful and happy 🙏
          </p>
        </div>
      </div>
    </footer>
  )
}
