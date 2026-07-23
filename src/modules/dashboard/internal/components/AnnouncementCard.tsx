// feature/dashboard/components/AnnouncementCard
// Displays announcement items with youthful glassmorphism styling.

import { MegaphoneIcon } from "lucide-react"

interface Announcement {
  id: string
  title: string
  body: string
  date: string
}

interface AnnouncementCardProps {
  announcements: Announcement[]
}

export function AnnouncementCard({ announcements }: AnnouncementCardProps) {
  return (
    <section
      aria-labelledby="announcement-heading"
      className="relative overflow-hidden rounded-2xl border border-white/80 bg-gradient-to-br from-sekkha-canvas/95 via-white/90 to-blue-50/40 backdrop-blur-md p-4 sm:p-5 shadow-xs transition-all hover:shadow-md"
    >
      {/* Decorative Blur Accent */}
      <div className="absolute -top-10 -right-10 size-32 rounded-full bg-sekkha-brand-blue/10 blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sekkha-brand-blue text-white shadow-xs">
            <MegaphoneIcon className="size-4" aria-hidden="true" />
          </span>
          <h2 id="announcement-heading" className="text-body-sm-medium font-bold text-sekkha-ink">
            Pengumuman
          </h2>
        </div>
        <span className="rounded-full bg-sekkha-brand-blue/10 px-2 py-0.5 text-micro-bold text-sekkha-brand-blue">
          Info Vihara
        </span>
      </div>

      {/* List */}
      {announcements.length === 0 ? (
        <p className="text-caption text-sekkha-muted">
          Tidak ada pengumuman saat ini.
        </p>
      ) : (
        <ul className="space-y-3.5" role="list">
          {announcements.map((item, idx) => (
            <li key={item.id}>
              {idx > 0 && (
                <div className="mb-3.5 h-px bg-sekkha-hairline-soft" aria-hidden="true" />
              )}
              <div className="flex items-start gap-3 rounded-xl p-2.5 bg-sekkha-surface/60 border border-sekkha-hairline-soft/60 backdrop-blur-xs">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-sekkha-teal-light text-sekkha-brand-blue">
                  <MegaphoneIcon className="size-3.5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-body-sm-medium font-bold text-sekkha-ink">{item.title}</p>
                  <p className="mt-0.5 text-caption text-sekkha-slate leading-relaxed">{item.body}</p>
                  <p className="mt-1 text-micro text-sekkha-slate/80 font-medium">{item.date}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
