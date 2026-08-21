import { useState, useEffect } from "react"
import {
  ZapIcon,
  PencilIcon,
  ShieldCheckIcon,
  FlameIcon,
  CalendarCheckIcon,
  SparklesIcon,
  InfoIcon,
  AlertCircleIcon,
  CalendarDaysIcon,
  AwardIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { pointRulesApi, type PointRuleDto } from "../api/configureApi"

// Hardcoded structured rule sections
interface RuleSectionConfig {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  badge: string
  ruleCodes: string[]
}

const RULE_SECTIONS: RuleSectionConfig[] = [
  {
    id: "attendance_section",
    title: "1. Aturan Poin Presensi Kegiatan",
    subtitle: "Poin yang langsung diperoleh umat saat mencatatkan kehadiran di sesi kebaktian.",
    icon: <CalendarDaysIcon className="size-5 text-blue-600" />,
    badge: "Presensi Event",
    ruleCodes: ["attendance_rutin", "attendance_special"],
  },
  {
    id: "streak_section",
    title: "2. Aturan Streak & Retensi Mingguan",
    subtitle: "Poin apresiasi bagi umat yang mempertahankan konsistensi kehadiran berturut-turut.",
    icon: <FlameIcon className="size-5 text-orange-600" />,
    badge: "Gamifikasi Streak",
    ruleCodes: ["streak_weekly_bonus"],
  },
  {
    id: "engagement_section",
    title: "3. Aturan Sambutan Umat Baru",
    subtitle: "Poin bonus motivasi bagi umat yang baru pertama kali bergabung dan hadir di vihara.",
    icon: <AwardIcon className="size-5 text-emerald-600" />,
    badge: "Engagement",
    ruleCodes: ["first_attendance_bonus"],
  },
]

export function PointsRulesPage() {
  const [rules, setRules] = useState<PointRuleDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PointRuleDto | null>(null)
  const [editForm, setEditForm] = useState({
    label: "",
    points: 50,
    description: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    loadRules()
  }, [])

  async function loadRules() {
    try {
      setLoading(true)
      const data = await pointRulesApi.list()
      setRules(data)
      setError(null)
    } catch (err: any) {
      console.error("Gagal memuat aturan poin:", err)
      setError("Gagal memuat aturan poin dari server.")
    } finally {
      setLoading(false)
    }
  }

  function handleOpenEdit(r: PointRuleDto) {
    setEditingRule(r)
    setEditForm({
      label: r.label,
      points: r.points,
      description: r.description || "",
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingRule) return

    if (editForm.points < 0) {
      setFormError("Nilai poin tidak boleh bernilai negatif.")
      return
    }

    try {
      setSubmitting(true)
      setFormError(null)
      await pointRulesApi.update(editingRule.id, {
        label: editForm.label.trim(),
        points: Number(editForm.points),
        description: editForm.description.trim() || null,
      })
      await loadRules()
      setModalOpen(false)
    } catch (err: any) {
      setFormError(err.message || "Gagal menyimpan perubahan aturan poin.")
    } finally {
      setSubmitting(false)
    }
  }

  // Helper to find rule by code
  function getRuleByCode(code: string): PointRuleDto | undefined {
    return rules.find((r) => r.code === code)
  }

  return (
    <main className="min-h-screen bg-sekkha-surface pb-32 md:pb-12 font-sans">
      <PageBreadcrumb
        items={[
          { label: "Konfigurasi" },
          { label: "Rules" },
          { label: "Points Rules" },
        ]}
      />

      <div className="px-4 py-6 sm:px-6 md:px-8 max-w-6xl mx-auto space-y-7">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-sekkha-hairline-soft pb-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700">
                <ZapIcon className="size-5" />
              </div>
              <h1 className="text-heading-5 font-black text-sekkha-ink">
                Aturan Poin Sistem (Points Rules)
              </h1>
            </div>
            <p className="text-body-sm text-sekkha-slate">
              Struktur aturan poin inti yang terpasang pada sistem. Anda dapat menyesuaikan nilai poin dan keterangan kapan saja.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-100/90 border border-slate-200/80 px-3.5 py-2 text-micro font-bold text-sekkha-slate shrink-0">
            <ShieldCheckIcon className="size-4 text-sekkha-brand-blue" />
            <span>Aturan Inti (Dapat diedit, Tidak dapat dihapus)</span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-2xl bg-blue-50/70 border border-blue-200/80 p-4 text-body-sm text-blue-900 shadow-2xs">
          <InfoIcon className="size-5 shrink-0 text-blue-600 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-caption text-blue-950">Mekanisme Kalkulasi Otomatis</p>
            <p className="text-micro text-blue-800 leading-relaxed">
              Nilai poin yang tersimpan di bawah akan otomatis dipakai saat pengurus menutup sesi presensi event, mencatat streak mingguan, atau menyambut kehadiran umat baru.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 p-4 border border-red-200 text-body-sm text-red-800">
            <AlertCircleIcon className="size-5 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Hardcoded Sections Container */}
        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-3xl bg-white border border-sekkha-hairline animate-pulse p-6" />
            ))}
          </div>
        ) : (
          <div className="space-y-7">
            {RULE_SECTIONS.map((section) => (
              <div
                key={section.id}
                className="rounded-3xl border border-sekkha-hairline bg-white/95 p-5 sm:p-7 shadow-xs space-y-4 transition-all"
              >
                {/* Section Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-sekkha-hairline-soft pb-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60 shrink-0">
                      {section.icon}
                    </div>
                    <div>
                      <h2 className="text-body-base font-extrabold text-sekkha-ink">
                        {section.title}
                      </h2>
                      <p className="text-micro text-sekkha-slate">
                        {section.subtitle}
                      </p>
                    </div>
                  </div>
                  <span className="self-start sm:self-center rounded-full bg-slate-100 border border-slate-200/80 px-2.5 py-0.5 text-micro-bold text-sekkha-slate">
                    {section.badge}
                  </span>
                </div>

                {/* Section Rules Cards */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {section.ruleCodes.map((code) => {
                    const rule = getRuleByCode(code)
                    if (!rule) return null

                    return (
                      <div
                        key={rule.id}
                        className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/40 p-4.5 transition-all hover:bg-white hover:border-sekkha-brand-blue/40 hover:shadow-sm"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <code className="text-micro font-mono text-sekkha-slate bg-white border border-slate-200 px-1.5 py-0.5 rounded-md">
                              {rule.code}
                            </code>
                            <div className="flex items-baseline gap-1 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 px-3 py-0.5 text-white shadow-2xs">
                              <span className="text-heading-6 font-black tracking-tight">+{rule.points}</span>
                              <span className="text-micro-bold opacity-90">Poin</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-body-sm font-extrabold text-sekkha-ink">
                              {rule.label}
                            </h3>
                            <p className="text-micro text-sekkha-slate leading-relaxed">
                              {rule.description || "Tidak ada keterangan tambahan."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-micro text-sekkha-muted">
                            Sistem Inti
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rule)}
                            className="flex items-center gap-1.5 rounded-xl border border-sekkha-hairline-strong bg-white px-3 py-1.5 text-micro font-bold text-sekkha-ink shadow-2xs hover:bg-slate-50 hover:border-sekkha-brand-blue hover:text-sekkha-brand-blue transition-colors"
                          >
                            <PencilIcon className="size-3" />
                            <span>Ubah Nilai</span>
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Edit Rule Modal */}
      <ResponsiveFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Ubah Nilai Aturan Poin"
        description={`Perbarui besaran poin untuk ${editingRule?.label || "aturan ini"}.`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 border border-red-200 text-caption text-red-800">
              <AlertCircleIcon className="size-4 text-red-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-caption font-bold text-sekkha-ink">Nama Aturan</label>
            <input
              type="text"
              required
              value={editForm.label}
              onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
              className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
            />
          </div>

          <div className="space-y-1">
            <label className="text-caption font-bold text-sekkha-ink">
              Jumlah Poin Diberikan (+Poin) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                required
                min={0}
                max={10000}
                value={editForm.points}
                onChange={(e) => setEditForm({ ...editForm, points: Number(e.target.value) })}
                className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2.5 font-mono text-heading-6 font-black text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
              />
              <span className="absolute right-3.5 top-3 text-caption font-bold text-sekkha-slate">
                Poin
              </span>
            </div>
            <p className="text-micro text-sekkha-slate">
              Poin ini akan otomatis diberikan ke akun umat saat trigger kondisi terpenuhi.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-caption font-bold text-sekkha-ink">Keterangan / Fungsi</label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Jelaskan kondisi kapan poin ini didapatkan..."
              className="w-full rounded-xl border border-sekkha-hairline-strong px-3.5 py-2 text-body-sm text-sekkha-ink outline-none focus:border-sekkha-brand-blue"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-sekkha-hairline-soft">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-sekkha-hairline-strong px-4 py-2.5 text-body-sm font-bold text-sekkha-slate hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-sekkha-brand-blue px-5 py-2.5 text-body-sm font-bold text-white shadow-xs hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </ResponsiveFormModal>
    </main>
  )
}
