// feature/pengurus/components/InsightPage
// Insight dashboard for pengurus — overview metrics, attendance trends, etc.

import { BarChart3Icon, UsersIcon, TrendingUpIcon, CalendarIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"

// ─── Dummy stats ─────────────────────────────────────────────────────────────

const STATS = [
  { label: "Total Anggota Aktif", value: "47", icon: UsersIcon, color: "bg-sekkha-teal-light text-sekkha-brand-blue" },
  { label: "Rata-rata Kehadiran", value: "72%", icon: TrendingUpIcon, color: "bg-sekkha-surface-yellow text-sekkha-yellow-dark" },
  { label: "Event Bulan Ini", value: "8", icon: CalendarIcon, color: "bg-sekkha-coral-light text-red-600" },
  { label: "Streak Tertinggi", value: "14", icon: BarChart3Icon, color: "bg-sekkha-rose-light text-pink-600" },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function InsightPage() {
  return (
    <main>
      <PageBreadcrumb items={[{ label: "Insight" }]} />
      <div className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-8xl space-y-5">

        <div className="flex items-center gap-2">
          <BarChart3Icon className="size-5 text-sekkha-brand-blue" aria-hidden="true" />
          <h1 className="text-heading-5 text-sekkha-ink">Insight</h1>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {STATS.map((stat) => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4"
              >
                <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                  <Icon className="size-5" aria-hidden="true" />
                </div>
                <p className="text-heading-4 font-semibold text-sekkha-ink">{stat.value}</p>
                <p className="mt-0.5 text-caption text-sekkha-slate">{stat.label}</p>
              </div>
            )
          })}
        </div>

        {/* Placeholder chart area */}
        <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-6">
          <h2 className="mb-4 text-body-sm-medium text-sekkha-ink">Tren Kehadiran Mingguan</h2>
          <div className="flex h-48 items-center justify-center rounded-lg bg-sekkha-surface">
            <p className="text-body-sm text-sekkha-muted">Grafik kehadiran akan ditampilkan di sini</p>
          </div>
        </div>

        {/* Attendance breakdown */}
        <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-6">
          <h2 className="mb-4 text-body-sm-medium text-sekkha-ink">Breakdown Kehadiran per Event</h2>
          <div className="flex h-36 items-center justify-center rounded-lg bg-sekkha-surface">
            <p className="text-body-sm text-sekkha-muted">Data breakdown akan ditampilkan di sini</p>
          </div>
          </div>
        </div>
      </div>
    </main>
  )
}
