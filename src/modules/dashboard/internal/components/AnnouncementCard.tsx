// feature/dashboard/components/AnnouncementCard
// Displays a single announcement item on the dashboard.

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
      className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5"
    >
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <MegaphoneIcon className="size-4 text-sekkha-brand-blue" aria-hidden="true" />
        <h2
          id="announcement-heading"
          className="text-body-sm-medium text-sekkha-ink"
        >
          Pengumuman
        </h2>
      </div>

      {/* List */}
      {announcements.length === 0 ? (
        <p className="text-caption text-sekkha-muted">
          Tidak ada pengumuman saat ini.
        </p>
      ) : (
        <ul className="space-y-4" role="list">
          {announcements.map((item, idx) => (
            <li key={item.id}>
              {idx > 0 && (
                <div className="mb-4 h-px bg-sekkha-hairline-soft" aria-hidden="true" />
              )}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sekkha-teal-light">
                  <MegaphoneIcon className="size-3 text-sekkha-brand-blue" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="text-body-sm-medium text-sekkha-ink">{item.title}</p>
                  <p className="mt-0.5 text-caption text-sekkha-slate">{item.body}</p>
                  <p className="mt-1 text-caption text-sekkha-muted">{item.date}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
