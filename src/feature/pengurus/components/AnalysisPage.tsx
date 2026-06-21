// feature/pengurus/components/AnalysisPage
// Analysis page for pengurus — early warning, member engagement, churn risk.

import { AlertTriangleIcon, UserXIcon, TrendingDownIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"

// ─── Dummy data ──────────────────────────────────────────────────────────────

const AT_RISK_MEMBERS = [
  { id: "u1", name: "Rina Santoso", lastSeen: "21 hari lalu", streak: 0 },
  { id: "u2", name: "Budi Dharma", lastSeen: "14 hari lalu", streak: 0 },
  { id: "u3", name: "Maya Putri", lastSeen: "10 hari lalu", streak: 1 },
]

const ENGAGEMENT_METRICS = [
  { label: "Aktif minggu ini", value: 34, total: 47, pct: 72 },
  { label: "RSVP rate", value: 28, total: 47, pct: 60 },
  { label: "Badge earned (bulan ini)", value: 12, total: null, pct: null },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function AnalysisPage() {
  return (
    <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
      <div className="mx-auto max-w-8xl space-y-5">
        <PageBreadcrumb items={[{ label: "Beranda", href: "/dashboard" }, { label: "Analysis" }]} />

        <div className="flex items-center gap-2">
          <TrendingDownIcon className="size-5 text-sekkha-brand-blue" aria-hidden="true" />
          <h1 className="text-heading-5 text-sekkha-ink">Analysis</h1>
        </div>

        {/* Early warning — at risk members */}
        <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertTriangleIcon className="size-4 text-amber-500" aria-hidden="true" />
            <h2 className="text-body-sm-medium text-sekkha-ink">Early Warning — Anggota Berisiko</h2>
          </div>
          <p className="mb-4 text-caption text-sekkha-muted">
            Anggota yang tidak hadir lebih dari 7 hari dan berisiko churn.
          </p>

          {AT_RISK_MEMBERS.length === 0 ? (
            <p className="py-4 text-center text-body-sm text-sekkha-muted">Semua anggota aktif 🎉</p>
          ) : (
            <ul className="space-y-0" role="list">
              {AT_RISK_MEMBERS.map((member, idx) => (
                <li key={member.id}>
                  {idx > 0 && <div className="h-px bg-sekkha-hairline-soft" aria-hidden="true" />}
                  <div className="flex items-center gap-3 py-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50">
                      <UserXIcon className="size-4 text-amber-500" aria-hidden="true" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-body-sm-medium text-sekkha-ink">{member.name}</p>
                      <p className="text-caption text-sekkha-muted">Terakhir aktif: {member.lastSeen}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-caption-bold text-amber-600">
                      Berisiko
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Engagement metrics */}
        <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
          <h2 className="mb-4 text-body-sm-medium text-sekkha-ink">Engagement Metrics</h2>
          <div className="space-y-4">
            {ENGAGEMENT_METRICS.map((metric) => (
              <div key={metric.label}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-body-sm text-sekkha-ink">{metric.label}</span>
                  <span className="text-body-sm-medium text-sekkha-ink">
                    {metric.pct !== null ? `${metric.value}/${metric.total} (${metric.pct}%)` : metric.value}
                  </span>
                </div>
                {metric.pct !== null && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-sekkha-surface">
                    <div
                      className="h-full rounded-full bg-sekkha-brand-blue transition-all"
                      style={{ width: `${metric.pct}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}
