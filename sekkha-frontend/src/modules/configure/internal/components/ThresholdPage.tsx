import { useState } from "react"
import { BellIcon, SaveIcon, RotateCcwIcon, HelpCircleIcon } from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { useAuth } from "@/modules/auth"
import { Button, Input, Card, Alert, Badge } from "@/components/base"

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
    <main className="min-h-screen bg-sekkha-surface pb-32 md:pb-12 font-sans">
      <PageBreadcrumb items={[{ label: "Configure" }, { label: "Early Warning Threshold" }]} />

      <div className="px-4 py-6 sm:px-6 md:px-8 max-w-6xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-sekkha-hairline-soft pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-sekkha-brand-blue border border-blue-200/60">
                <BellIcon className="size-5" />
              </div>
              <h1 className="text-body-base sm:text-heading-5 font-black text-sekkha-ink">
                Konfigurasi Early Warning Threshold
              </h1>
            </div>
            <p className="text-body-sm text-sekkha-slate">
              Atur kriteria dan batas toleransi (threshold) untuk klasifikasi Silent-Churn Alert pengurus.
            </p>
          </div>

          {isAdminOrPengurus && (
            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
              <Button
                variant="secondary"
                onClick={handleReset}
              >
                <RotateCcwIcon className="size-4 mr-1.5" />
                <span>Reset</span>
              </Button>

              <Button
                onClick={handleSave}
              >
                <SaveIcon className="size-4 mr-1.5" />
                <span>Simpan Perubahan</span>
              </Button>
            </div>
          )}
        </div>

        {/* Success Toast Banner */}
        {savedSuccess && (
          <Alert
            variant="success"
            title="Tersimpan"
            description="Konfigurasi threshold berhasil disimpan ke sistem!"
          />
        )}

        {/* Form Settings Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* 1. Warning Level (🟡) */}
          <Card className="p-5 space-y-4 border-amber-200/80">
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <Badge variant="yellow">🟡 Warning Alert</Badge>
            </div>

            <div>
              <Input
                label="Event Dilewati Berturut-turut (Missed)"
                type="number"
                min={1}
                max={10}
                value={thresholds.warningConsecutiveMissed}
                onChange={(e) =>
                  setThresholds((p) => ({ ...p, warningConsecutiveMissed: parseInt(e.target.value) || 2 }))
                }
                endIcon={<span className="text-caption font-bold text-sekkha-slate">Event</span>}
              />
            </div>
          </Card>

          {/* 2. At Risk Level (🟠) */}
          <Card className="p-5 space-y-4 border-orange-200/80">
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <Badge variant="coral">🟠 At Risk Alert</Badge>
            </div>

            <div>
              <Input
                label="Event Dilewati Berturut-turut (Missed)"
                type="number"
                min={1}
                max={10}
                value={thresholds.atRiskConsecutiveMissed}
                onChange={(e) =>
                  setThresholds((p) => ({ ...p, atRiskConsecutiveMissed: parseInt(e.target.value) || 3 }))
                }
                endIcon={<span className="text-caption font-bold text-sekkha-slate">Event</span>}
              />
            </div>
          </Card>

          {/* 3. Lost / Churned Level (🔴) */}
          <Card className="p-5 space-y-4 border-red-200/80">
            <div className="flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
              <Badge variant="coral">🔴 Lost & Churned</Badge>
            </div>

            <div className="space-y-3">
              <Input
                label="Minimal Event Dilewati (Lost)"
                type="number"
                min={1}
                max={10}
                value={thresholds.lostConsecutiveMissed}
                onChange={(e) =>
                  setThresholds((p) => ({ ...p, lostConsecutiveMissed: parseInt(e.target.value) || 4 }))
                }
                endIcon={<span className="text-caption font-bold text-sekkha-slate">Event</span>}
              />

              <Input
                label="Batas Absen Maksimal (Churned)"
                type="number"
                min={14}
                max={365}
                value={thresholds.churnedDaysThreshold}
                onChange={(e) =>
                  setThresholds((p) => ({ ...p, churnedDaysThreshold: parseInt(e.target.value) || 60 }))
                }
                endIcon={<span className="text-caption font-bold text-sekkha-slate">Hari</span>}
              />
            </div>
          </Card>
        </div>

        {/* Additional Guidance */}
        <Alert
          variant="info"
          icon={<HelpCircleIcon className="size-5" />}
          title="Catatan Pengaturan Threshold"
          description="Klasifikasi status presensi member mengacu sepenuhnya pada threshold event dilewati & batas absen hari. Perubahan threshold langsung berlaku untuk klasifikasi status member di dashboard."
        />
      </div>
    </main>
  )
}
