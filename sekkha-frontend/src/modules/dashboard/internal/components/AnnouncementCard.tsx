// feature/dashboard/components/AnnouncementCard
// Displays announcement items with Clay design system styling.

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
      className="relative overflow-hidden rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-5 shadow-xs transition-all font-sans text-left"
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#0a0a0a] text-white shadow-xs">
            <MegaphoneIcon className="size-4 text-[#e8b94a]" aria-hidden="true" />
          </span>
          <h2 id="announcement-heading" className="text-sm font-bold text-[#0a0a0a]">
            Announcements
          </h2>
        </div>
        <span className="rounded-full bg-[#1a3a3a]/10 px-2.5 py-0.5 text-xs font-semibold text-[#1a3a3a]">
          Community Updates
        </span>
      </div>

      {/* List */}
      {announcements.length === 0 ? (
        <p className="text-xs font-medium text-[#6a6a6a] py-2">
          No active announcements at the moment.
        </p>
      ) : (
        <ul className="space-y-3" role="list">
          {announcements.map((item, idx) => (
            <li key={item.id}>
              {idx > 0 && (
                <div className="mb-3 h-px bg-[#e5e5e5]" aria-hidden="true" />
              )}
              <div className="flex items-start gap-3 rounded-[12px] p-3 bg-[#faf5e8] border border-[#e5e5e5]">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[#1a3a3a]/10 text-[#1a3a3a]">
                  <MegaphoneIcon className="size-3.5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[#0a0a0a]">{item.title}</p>
                  <p className="mt-0.5 text-xs text-[#6a6a6a] leading-relaxed">{item.body}</p>
                  <p className="mt-1 text-[11px] text-[#9a9a9a] font-medium">{item.date}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
