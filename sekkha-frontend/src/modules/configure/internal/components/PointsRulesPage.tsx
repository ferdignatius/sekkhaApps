import { useState, useEffect } from "react"
import {
  ZapIcon,
  PencilIcon,
  ShieldCheckIcon,
  FlameIcon,
  CalendarDaysIcon,
  AlertCircleIcon,
  InfoIcon,
  CheckCircleIcon,
  SparklesIcon,
  SlidersIcon,
} from "lucide-react"
import { Link } from "@tanstack/react-router"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import { pointRulesApi } from "../api/configureApi"
import type { PointRuleDto } from "../api/configureApi"

interface RuleSectionConfig {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  badge: string
  ruleCodes: string[]
}

const SYSTEM_RULE_SECTIONS: RuleSectionConfig[] = [
  {
    id: "attendance_section",
    title: "1. Global Attendance Rules",
    subtitle:
      "Baseline points awarded to members when scanning attendance at standard weekly services.",
    icon: <CalendarDaysIcon className="size-5 text-[#0a0a0a]" />,
    badge: "Attendance",
    ruleCodes: ["attendance_rutin"],
  },
  {
    id: "engagement_section",
    title: "2. Streak & Member Engagement Rules",
    subtitle:
      "Appreciation points for 4-week attendance consistency and verified claimed members' first attendance.",
    icon: <FlameIcon className="size-5 text-[#e8b94a]" />,
    badge: "Engagement",
    ruleCodes: [
      "streak_monthly_bonus",
      "first_attendance_bonus",
    ],
  },
]

export function PointsRulesPage() {
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

  const [rules, setRules] = useState<PointRuleDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Tune Policy Modal State
  const [editingRule, setEditingRule] = useState<PointRuleDto | null>(null)
  const [formData, setFormData] = useState({
    label: "",
    points: 50,
    description: "",
    is_active: true,
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
      console.error("Failed to load point rules:", err)
      setError("Failed to load point rules from server.")
    } finally {
      setLoading(false)
    }
  }

  function handleOpenTune(r: PointRuleDto) {
    setEditingRule(r)
    setFormData({
      label: r.label,
      points: r.points,
      description: r.description || "",
      is_active: r.is_active !== false,
    })
    setFormError(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin || !editingRule) return

    const pointsNum = Number(formData.points)
    if (isNaN(pointsNum) || pointsNum < 0 || pointsNum > 100) {
      setFormError(
        "Point value must be between 0 and 100 to protect point economy from inflation."
      )
      return
    }

    if (!formData.label.trim()) {
      setFormError("Rule label is required.")
      return
    }

    try {
      setSubmitting(true)
      setFormError(null)

      await pointRulesApi.update(editingRule.id, {
        label: formData.label.trim(),
        points: pointsNum,
        description: formData.description.trim() || null,
        is_active: formData.is_active,
      })

      await loadRules()
      setEditingRule(null)
    } catch (err: any) {
      console.error("Failed to save point rule:", err)
      setFormError(err.message || "Failed to save point rule changes.")
    } finally {
      setSubmitting(false)
    }
  }

  function getRuleByCode(code: string): PointRuleDto | undefined {
    return rules.find((r) => r.code === code)
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 text-left font-sans md:pb-12">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Rules" },
          { label: "Point Rules" },
        ]}
      />

      <div className="mx-auto max-w-7xl space-y-5 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 border-b border-[#e5e5e5] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#0a0a0a] text-white shadow-xs">
              <ZapIcon className="size-6 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#0a0a0a] sm:text-xl">
                Point Rules & Economy Policy
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Fixed system gamification engine rules with anti-inflation parameter tuning.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex shrink-0 items-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] px-3.5 py-2 text-xs font-bold text-[#0a0a0a]">
              <ShieldCheckIcon className="size-4 text-[#0a0a0a]" />
              <span>{rules.length} Fixed Engine Policies</span>
            </div>
          </div>
        </div>

        {/* Anti-Inflation Economy Banner (PRD Section 1 & Section 6) */}
        <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 text-xs text-[#0a0a0a] shadow-xs">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-[#e8b94a]" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#0a0a0a]">
              Point Scarcity & Anti-Inflation Guardrail
            </p>
            <p className="text-xs leading-relaxed text-[#6a6a6a]">
              Points represent genuine effort and dedication. To prevent points from becoming cheapened vanity metrics, every rule is strictly capped between <strong>0 and 100 points</strong>, paired with a maximum daily accumulation limit of <strong>150 points per member</strong>.
            </p>
          </div>
        </div>

        {!isAdmin && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-[16px] border border-[#e8b94a]/50 bg-[#e8b94a]/10 p-4 text-xs text-[#3a3a3a]"
          >
            <ShieldCheckIcon className="mt-0.5 size-5 shrink-0 text-[#855f05]" />
            <p className="leading-relaxed">
              <strong className="text-[#0a0a0a]">Read-only access.</strong> You can view point rule settings, but only an Admin can tune parameter values and toggle active status.
            </p>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
            <AlertCircleIcon className="size-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Rule Sections */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-6 shadow-xs"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {SYSTEM_RULE_SECTIONS.map((section) => {
              const sectionRules = section.ruleCodes
                .map((code) => getRuleByCode(code))
                .filter((r): r is PointRuleDto => Boolean(r))

              if (sectionRules.length === 0) return null

              return (
                <div
                  key={section.id}
                  className="space-y-4 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs sm:p-6"
                >
                  {/* Section Header */}
                  <div className="flex flex-col gap-2 border-b border-[#e5e5e5] pb-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="shrink-0 rounded-[10px] border border-[#e5e5e5] bg-[#faf5e8] p-2">
                        {section.icon}
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                          {section.title}
                        </h2>
                        <p className="text-xs text-[#6a6a6a]">
                          {section.subtitle}
                        </p>
                      </div>
                    </div>
                    <span className="self-start rounded-full border border-[#e5e5e5] bg-[#faf5e8] px-2.5 py-0.5 text-[11px] font-bold text-[#0a0a0a] sm:self-auto">
                      {section.badge}
                    </span>
                  </div>

                  {/* Section Rules Cards */}
                  <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                    {sectionRules.map((rule) => (
                      <div
                        key={rule.id}
                        className="flex flex-col justify-between space-y-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4.5 transition-all hover:border-[#0a0a0a]/30"
                      >
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <code className="rounded-[6px] border border-[#e5e5e5] bg-[#fffaf0] px-2 py-0.5 font-mono text-[10px] font-bold text-[#6a6a6a]">
                              {rule.code}
                            </code>
                            <div className="inline-flex items-baseline gap-1 rounded-[8px] bg-[#0a0a0a] px-2.5 py-0.5 font-mono text-xs font-bold text-white shadow-xs">
                              <span>+{rule.points}</span>
                              <span className="text-[10px] font-normal opacity-80">
                                Pts
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <h3 className="text-xs font-bold text-[#0a0a0a] sm:text-sm">
                                {rule.label}
                              </h3>
                              {rule.is_active === false && (
                                <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-bold text-rose-700">
                                  Disabled
                                </span>
                              )}
                            </div>
                            <p className="text-xs leading-relaxed text-[#6a6a6a]">
                              {rule.description || "No additional description provided."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-[#e5e5e5] pt-2.5">
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                            <CheckCircleIcon className="size-3 text-emerald-600" />
                            <span>Engine Policy</span>
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenTune(rule)}
                              aria-label={`Tune ${rule.label}`}
                              className="flex items-center gap-1 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 py-1 text-[11px] font-bold text-[#0a0a0a] shadow-xs transition-colors hover:bg-[#faf5e8]"
                            >
                              <PencilIcon className="size-3" />
                              <span>Tune Policy</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Architecture Guidance Card */}
            <div className="rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-5 shadow-xs">
              <div className="flex items-start gap-3">
                <SparklesIcon className="mt-0.5 size-5 shrink-0 text-[#e8b94a]" />
                <div className="space-y-1.5">
                  <h3 className="text-xs font-bold text-[#0a0a0a] sm:text-sm">
                    Looking to reward new activities or youth assignments?
                  </h3>
                  <p className="text-xs leading-relaxed text-[#6a6a6a]">
                    Point Rules above govern automatic core platform policies (like baseline attendance, 4-week consistency streak, and verified claimed members).
                    To introduce custom point rewards for your temple:
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1 text-xs">
                    <Link
                      to="/configure/master/event-type"
                      className="inline-flex items-center gap-1 rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 py-1.5 font-bold text-[#0a0a0a] shadow-xs hover:bg-[#f0ebd8]"
                    >
                      <CalendarDaysIcon className="size-3.5 text-[#0a0a0a]" />
                      <span>Configure Event Types</span>
                    </Link>
                    <Link
                      to="/configure/master/badge-activity"
                      className="inline-flex items-center gap-1 rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-3 py-1.5 font-bold text-[#0a0a0a] shadow-xs hover:bg-[#f0ebd8]"
                    >
                      <SlidersIcon className="size-3.5 text-[#0a0a0a]" />
                      <span>Configure Badge Activities (Service Duties)</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tune Policy Modal */}
      <ResponsiveFormModal
        isOpen={Boolean(editingRule) && isAdmin}
        onClose={() => setEditingRule(null)}
        title="Tune Engine Point Policy"
        description={
          editingRule
            ? `Adjust policy parameters and anti-inflation weight for "${editingRule.label}".`
            : "Update point rule policy."
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left font-sans">
          {formError && (
            <div className="flex items-center gap-2 rounded-[10px] border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0a0a0a]">
                System Code
              </label>
              <span className="text-[10px] font-bold text-[#6a6a6a]">
                FIXED LEDGER IDENTIFIER
              </span>
            </div>
            <input
              disabled
              readOnly
              value={editingRule?.code || ""}
              className="h-11 w-full cursor-not-allowed rounded-[12px] border border-[#e5e5e5] bg-[#f5f0e6] px-3.5 font-mono text-xs font-bold text-[#6a6a6a] shadow-xs outline-none sm:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">
              Rule Label <span className="text-rose-500">*</span>
            </label>
            <input
              required
              value={formData.label}
              onChange={(e) =>
                setFormData({ ...formData, label: e.target.value })
              }
              placeholder="e.g. Weekly Regular Puja"
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Awarded Points (+Points) <span className="text-rose-500">*</span>
              </label>
              <span className="text-[10px] font-bold text-[#6a6a6a]">
                CEILING: 0 – 100 PTS
              </span>
            </div>
            <input
              type="number"
              required
              min={0}
              max={100}
              value={formData.points}
              onChange={(e) =>
                setFormData({ ...formData, points: Number(e.target.value) })
              }
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs font-bold text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
            />
            <p className="text-[10px] text-[#6a6a6a]">
              Values are capped at 100 to prevent point inflation and maintain healthy gamification economy.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">
              Description & Operational Context
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe when and how these points are awarded..."
              className="w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
            />
          </div>

          <div className="rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3">
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="size-4 rounded border-[#e5e5e5] text-[#0a0a0a] focus:ring-[#0a0a0a]"
              />
              <span className="text-xs font-bold text-[#0a0a0a]">
                Rule is Active in System
              </span>
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] pt-3">
            <button
              type="button"
              onClick={() => setEditingRule(null)}
              className="h-10 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 cursor-pointer rounded-[12px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1f1f1f] disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Policy"}
            </button>
          </div>
        </form>
      </ResponsiveFormModal>
    </main>
  )
}
