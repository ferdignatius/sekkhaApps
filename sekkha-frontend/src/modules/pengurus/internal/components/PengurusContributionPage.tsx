import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { AwardIcon } from "lucide-react"
import { PengurusContributionTab } from "./PengurusContributionTab"

export function PengurusContributionPage() {
  return (
    <main className="min-h-screen pb-24 md:pb-12">
      <PageBreadcrumb
        items={[{ label: "Organizer" }, { label: "Contributor Insights" }]}
      />

      <div className="px-3.5 py-4 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col gap-3.5 rounded-2xl border border-sekkha-hairline-soft bg-gradient-to-br from-sekkha-canvas via-sekkha-surface to-sekkha-canvas p-4 shadow-2xs sm:rounded-3xl sm:p-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex size-8.5 shrink-0 items-center justify-center rounded-xl bg-sekkha-brand-blue/10 text-sekkha-brand-blue sm:size-9">
                  <AwardIcon className="size-4.5 sm:size-5" />
                </span>
                <h1 className="text-heading-5 sm:text-heading-4 font-bold text-sekkha-ink">
                  Contributor Insights
                </h1>
              </div>
              <p className="text-caption sm:text-body-sm max-w-2xl leading-relaxed text-sekkha-slate">
                Objective data tracking & evaluation of Organizer & Activist
                contributions. Helps identify leadership succession & burnout
                prevention.
              </p>
            </div>
          </div>

          <PengurusContributionTab />
        </div>
      </div>
    </main>
  )
}
