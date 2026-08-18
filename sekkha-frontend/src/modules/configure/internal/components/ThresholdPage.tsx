import { useState } from "react"
import { BellIcon, SaveIcon, CheckCircle2Icon, RotateCcwIcon, HelpCircleIcon } from "lucide-react"
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
  const isAdminOrPengurus =
    authState.status === "authenticated" && (authState.role === "admin" || authState.role === "pengurus")

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
    try {
      localStorage.setItem("sekkha_early_warning_thresholds", JSON.stringify(thresholds))
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      console.error(err)
    }
  }

  const handleReset = () => {
    setThresholds(DEFAULT_THRESHOLDS)
    localStorage.removeItem("sekkha_early_warning_thresholds")
  }

  return (
    <main className="min-h-screen pb-24 md:pb-12">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Early Warning Threshold" }]} />

      <div className="px-4 py-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header Banner */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas p-6 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-sekkha-brand-blue/10 text-sekkha-brand-blue">
                  <BellIcon className="size-5" />
                </div>
                <h1 className="text-heading-4 font-bold text-sekkha-ink">Konfigurasi Early Warning Threshold</h1>
              </div>
              <p className="text-body-sm text-sekkha-slate">
                Atur kriteria dan batas toleransi (threshold) untuk klasifikasi Silent-Churn Alert pengurus.
              </p>
            </div>

            {isAdminOrPengurus && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={handleReset}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 text-caption-bold font-semibold text-sekkha-slate transition hover:bg-sekkha-hairline-soft"
                >
                  <RotateCcwIcon className="size-4" /> Reset Default
                </button>

                <button
                  onClick={handleSave}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sekkha-brand-blue px-4 py-2 text-caption-bold font-bold text-white shadow-xs transition hover:bg-sekkha-brand-blue/90"
                >
                  <SaveIcon className="size-4" /> Simpan Perubahan
                </button>
              </div>
            )}
          </div>

          {/* Success Toast Banner */}
          {savedSuccess && (
            <div className="flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-body-sm font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2Icon className="size-5" /> Konfigurasi threshold berhasil disimpan!
            </div>
          )}

          {/* Form Settings Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* 1. Warning Level (🟡) */}
            <div className="rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-sekkha-canvas p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-sekkha-hairline-soft pb-3">
                <span className="flex size-3 rounded-full bg-amber-500" />
                <h3 className="text-body-sm-medium font-bold text-amber-700 dark:text-amber-400">
                  🟡 Threshold Warning
                </h3>
              </div>

              <div>
                <label className="block text-caption font-bold text-sekkha-ink mb-1">
                  Event Dilewati Berturut-turut (Missed)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={thresholds.warningConsecutiveMissed}
                    onChange={(e) =>
                      setThresholds((p) => ({ ...p, warningConsecutiveMissed: parseInt(e.target.value) || 2 }))
                    }
                    className="w-full rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 text-body-sm font-bold text-sekkha-ink outline-none"
                  />
                  <span className="text-caption text-sekkha-slate shrink-0">Event</span>
                </div>
              </div>
            </div>

            {/* 2. At Risk Level (🟠) */}
            <div className="rounded-2xl border border-orange-200 dark:border-orange-900/40 bg-sekkha-canvas p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-sekkha-hairline-soft pb-3">
                <span className="flex size-3 rounded-full bg-orange-500" />
                <h3 className="text-body-sm-medium font-bold text-orange-700 dark:text-orange-400">
                  🟠 Threshold At Risk
                </h3>
              </div>

              <div>
                <label className="block text-caption font-bold text-sekkha-ink mb-1">
                  Event Dilewati Berturut-turut (Missed)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={thresholds.atRiskConsecutiveMissed}
                    onChange={(e) =>
                      setThresholds((p) => ({ ...p, atRiskConsecutiveMissed: parseInt(e.target.value) || 3 }))
                    }
                    className="w-full rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 text-body-sm font-bold text-sekkha-ink outline-none"
                  />
                  <span className="text-caption text-sekkha-slate shrink-0">Event</span>
                </div>
              </div>
            </div>

            {/* 3. Lost / Churned Level (🔴) */}
            <div className="rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-sekkha-canvas p-5 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 border-b border-sekkha-hairline-soft pb-3">
                <span className="flex size-3 rounded-full bg-rose-500" />
                <h3 className="text-body-sm-medium font-bold text-rose-700 dark:text-rose-400">
                  🔴 Threshold Lost & Churned
                </h3>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-caption font-bold text-sekkha-ink mb-1">
                    Minimal Event Dilewati (Lost)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={thresholds.lostConsecutiveMissed}
                      onChange={(e) =>
                        setThresholds((p) => ({ ...p, lostConsecutiveMissed: parseInt(e.target.value) || 4 }))
                      }
                      className="w-full rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 text-body-sm font-bold text-sekkha-ink outline-none"
                    />
                    <span className="text-caption text-sekkha-slate shrink-0">Event</span>
                  </div>
                </div>

                <div>
                  <label className="block text-caption font-bold text-sekkha-ink mb-1">
                    Batas Absen Maksimal (Churned)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={14}
                      max={365}
                      value={thresholds.churnedDaysThreshold}
                      onChange={(e) =>
                        setThresholds((p) => ({ ...p, churnedDaysThreshold: parseInt(e.target.value) || 60 }))
                      }
                      className="w-full rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 text-body-sm font-bold text-sekkha-ink outline-none"
                    />
                    <span className="text-caption text-sekkha-slate shrink-0">Hari</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Guidance Card */}
          <div className="rounded-2xl border border-sekkha-hairline-soft bg-sekkha-surface p-4 flex items-start gap-3 text-caption text-sekkha-slate">
            <HelpCircleIcon className="size-5 text-sekkha-brand-blue shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sekkha-ink">Catatan Pengaturan Threshold:</p>
              <p className="mt-0.5 leading-relaxed">
                Klasifikasi status presensi member mengacu sepenuhnya pada threshold event dilewati & batas absen hari. Perubahan threshold langsung berlaku untuk klasifikasi status member di mini dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
