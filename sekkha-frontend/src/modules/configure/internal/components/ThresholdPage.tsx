import { useState } from "react"
import {
  BellIcon,
  SaveIcon,
  RotateCcwIcon,
  HelpCircleIcon,
  CheckCircleIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"

export interface ThresholdConfig {
  warningConsecutiveMissed: number
  atRiskConsecutiveMissed: number
  lostConsecutiveMissed: number
  churnedDaysThreshold: number
}

const DEFAULT_THRESHOLDS: ThresholdConfig = {
  warningConsecutiveMissed: 2,
  atRiskConsecutiveMissed: 3,
  lostConsecutiveMissed: 4,
  churnedDaysThreshold: 60,
}

export function ThresholdPage() {
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

  const [thresholds, setThresholds] = useState<ThresholdConfig>(() => {
    try {
      const saved = localStorage.getItem("sekkha_early_warning_thresholds")
      return saved ? JSON.parse(saved) : DEFAULT_THRESHOLDS
    } catch {
      return DEFAULT_THRESHOLDS
    }
  })

  const [savedSuccess, setSavedSuccess] = useState(false)

  const handleSave = () => {
    if (!isAdmin) return
    try {
      localStorage.setItem(
        "sekkha_early_warning_thresholds",
        JSON.stringify(thresholds)
      )
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleReset = () => {
    if (!isAdmin) return
    setThresholds(DEFAULT_THRESHOLDS)
    localStorage.removeItem("sekkha_early_warning_thresholds")
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 text-left font-sans md:pb-12">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Early Warning" },
          { label: "Threshold Settings" },
        ]}
      />

      <div className="mx-auto max-w-7xl space-y-5 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 border-b border-[#e5e5e5] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shadow-xs">
              <BellIcon className="size-5 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#0a0a0a] sm:text-xl">
                Early Warning Threshold Settings
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Configure criteria and tolerance thresholds for organizer
                Silent-Churn and attendance alerts
              </p>
            </div>
          </div>

          {isAdmin && (
            <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
              <button
                type="button"
                onClick={handleReset}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-all hover:bg-[#faf5e8]"
              >
                <RotateCcwIcon className="size-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f]"
              >
                <SaveIcon className="size-3.5" />
                <span>Save Changes</span>
              </button>
            </div>
          )}
        </div>

        {/* Success Toast Banner */}
        {savedSuccess && (
          <div className="flex items-center gap-2 rounded-[16px] border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-xs">
            <CheckCircleIcon className="size-4 shrink-0 text-emerald-600" />
            <span>
              Threshold configuration saved to the system successfully!
            </span>
          </div>
        )}

        {/* Form Settings Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* 1. Warning Level */}
          <div className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#e8b94a]/30 bg-[#e8b94a]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#0a0a0a]">
                🟡 Warning Alert
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Consecutive Missed Events
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={10}
                  disabled={!isAdmin}
                  value={thresholds.warningConsecutiveMissed}
                  onChange={(e) =>
                    setThresholds((p) => ({
                      ...p,
                      warningConsecutiveMissed: parseInt(e.target.value) || 2,
                    }))
                  }
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 pr-14 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] disabled:opacity-60 sm:text-sm"
                />
                <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-bold text-[#6a6a6a]">
                  Events
                </span>
              </div>
            </div>
          </div>

          {/* 2. At Risk Level */}
          <div className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#ffb084]/40 bg-[#ffb084]/25 px-2.5 py-0.5 text-[11px] font-bold text-[#0a0a0a]">
                🟠 At Risk Alert
              </span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Consecutive Missed Events
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  max={10}
                  disabled={!isAdmin}
                  value={thresholds.atRiskConsecutiveMissed}
                  onChange={(e) =>
                    setThresholds((p) => ({
                      ...p,
                      atRiskConsecutiveMissed: parseInt(e.target.value) || 3,
                    }))
                  }
                  className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 pr-14 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] disabled:opacity-60 sm:text-sm"
                />
                <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-bold text-[#6a6a6a]">
                  Events
                </span>
              </div>
            </div>
          </div>

          {/* 3. Lost / Churned Level */}
          <div className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-800">
                🔴 Lost & Churned
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Minimum Missed Events (Lost)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    disabled={!isAdmin}
                    value={thresholds.lostConsecutiveMissed}
                    onChange={(e) =>
                      setThresholds((p) => ({
                        ...p,
                        lostConsecutiveMissed: parseInt(e.target.value) || 4,
                      }))
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 pr-14 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] disabled:opacity-60 sm:text-sm"
                  />
                  <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-bold text-[#6a6a6a]">
                    Events
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#0a0a0a]">
                  Maximum Days Absent (Churned)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min={14}
                    max={365}
                    disabled={!isAdmin}
                    value={thresholds.churnedDaysThreshold}
                    onChange={(e) =>
                      setThresholds((p) => ({
                        ...p,
                        churnedDaysThreshold: parseInt(e.target.value) || 60,
                      }))
                    }
                    className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 pr-14 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] disabled:opacity-60 sm:text-sm"
                  />
                  <span className="absolute top-1/2 right-3.5 -translate-y-1/2 text-xs font-bold text-[#6a6a6a]">
                    Days
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Guidance */}
        <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 text-xs text-[#0a0a0a] shadow-xs">
          <HelpCircleIcon className="mt-0.5 size-5 shrink-0 text-[#0a0a0a]" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#0a0a0a]">
              Threshold Configuration Notes
            </p>
            <p className="text-xs leading-relaxed text-[#6a6a6a]">
              Member attendance status classification directly references missed
              event counts & absent day limits. Changes take effect immediately
              across all dashboard metrics.
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
