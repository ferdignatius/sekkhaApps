import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { AwardIcon } from "lucide-react"
import { PengurusContributionTab } from "./PengurusContributionTab"

export function PengurusContributionPage() {
  return (
    <main className="min-h-screen pb-24 md:pb-12">
      <PageBreadcrumb items={[{ label: "Pengurus" }, { label: "Insight Kontribusi" }]} />

      <div className="px-3.5 py-4 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col gap-3.5 rounded-2xl sm:rounded-3xl border border-sekkha-hairline-soft bg-gradient-to-br from-sekkha-canvas via-sekkha-surface to-sekkha-canvas p-4 sm:p-6 shadow-2xs md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-8.5 sm:size-9 items-center justify-center rounded-xl bg-sekkha-brand-blue/10 text-sekkha-brand-blue shrink-0">
                  <AwardIcon className="size-4.5 sm:size-5" />
                </span>
                <h1 className="text-heading-5 sm:text-heading-4 font-bold text-sekkha-ink">Insight Kontribusi</h1>
              </div>
              <p className="text-caption sm:text-body-sm text-sekkha-slate max-w-2xl leading-relaxed">
                Pelacakan & evaluasi kontribusi Pengurus & Aktivis Vihara berbasis data objektif. Membantu identifikasi regenerasi & pencegahan burnout.
              </p>
            </div>
          </div>

          <PengurusContributionTab />
        </div>
      </div>
    </main>
  )
}
