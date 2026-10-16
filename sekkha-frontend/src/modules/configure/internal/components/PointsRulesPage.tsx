import { useState, useEffect } from "react"
import {
  ZapIcon,
  PencilIcon,
  ShieldCheckIcon,
  FlameIcon,
  CalendarDaysIcon,
  AwardIcon,
  AlertCircleIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import { pointRulesApi } from "../api/configureApi"
import type { PointRuleDto } from "../api/configureApi"

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
    title: "1. Event Attendance Points Rules",
    subtitle:
      "Points earned directly by members when logging attendance in service sessions.",
    icon: <CalendarDaysIcon className="size-5 text-[#0a0a0a]" />,
    badge: "Event Attendance",
    ruleCodes: ["attendance_rutin", "attendance_special"],
  },
  {
    id: "streak_section",
    title: "2. Weekly Streak & Retention Rules",
    subtitle:
      "Appreciation points for members maintaining consecutive attendance consistency.",
    icon: <FlameIcon className="size-5 text-[#e8b94a]" />,
    badge: "Streak Gamification",
    ruleCodes: ["streak_weekly_bonus"],
  },
  {
    id: "engagement_section",
    title: "3. New Member Welcome Rules",
    subtitle:
      "Motivational bonus points for first-time attendees visiting the vihara.",
    icon: <AwardIcon className="size-5 text-[#b8a4ed]" />,
    badge: "Engagement",
    ruleCodes: ["first_attendance_bonus"],
  },
]

export function PointsRulesPage() {
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

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
      console.error("Failed to load point rules:", err)
      setError("Failed to load point rules from server.")
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
    if (!isAdmin || !editingRule) return

    if (editForm.points < 0) {
      setFormError("Point value cannot be negative.")
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
      setFormError(err.message || "Failed to save point rule changes.")
    } finally {
      setSubmitting(false)
    }
  }

  // Helper to find rule by code
  function getRuleByCode(code: string): PointRuleDto | undefined {
    return rules.find((r) => r.code === code)
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 text-left font-sans md:pb-12">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Rules" },
          { label: "Points Rules" },
        ]}
      />

      <div className="mx-auto max-w-7xl space-y-5 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 border-b border-[#e5e5e5] pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shadow-xs">
              <ZapIcon className="size-5 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#0a0a0a] sm:text-xl">
                System Points Rules
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Core system point distribution rules. Point values and trigger
                descriptions are customizable.
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] px-3.5 py-2 text-xs font-bold text-[#0a0a0a]">
            <ShieldCheckIcon className="size-4 text-[#0a0a0a]" />
            <span>Core Rules System</span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 text-xs text-[#0a0a0a] shadow-xs">
          <ZapIcon className="mt-0.5 size-5 shrink-0 text-[#e8b94a]" />
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#0a0a0a]">
              Automatic Calculation Mechanism
            </p>
            <p className="text-xs leading-relaxed text-[#6a6a6a]">
              Point values below are automatically awarded when organizers
              conclude event attendance sessions, calculate streaks, or welcome
              new members.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800">
            <AlertCircleIcon className="size-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Hardcoded Sections Container */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-6 shadow-xs"
              />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {RULE_SECTIONS.map((section) => (
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
                <div className="grid gap-3.5 sm:grid-cols-2">
                  {section.ruleCodes.map((code) => {
                    const rule = getRuleByCode(code)
                    if (!rule) return null

                    return (
                      <div
                        key={rule.id}
                        className="flex flex-col justify-between space-y-3 rounded-[14px] border border-[#e5e5e5] bg-[#faf5e8] p-4 transition-all hover:bg-[#faf5e8]/90"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <code className="rounded-[6px] border border-[#e5e5e5] bg-[#fffaf0] px-1.5 py-0.5 font-mono text-[10px] text-[#6a6a6a]">
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
                            <h3 className="text-xs font-bold text-[#0a0a0a] sm:text-sm">
                              {rule.label}
                            </h3>
                            <p className="text-xs leading-relaxed text-[#6a6a6a]">
                              {rule.description || "No additional description."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between border-t border-[#e5e5e5] pt-2.5">
                          <span className="text-[11px] font-medium text-[#6a6a6a]">
                            System Core Rule
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(rule)}
                              className="flex h-8 cursor-pointer items-center gap-1 rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
                            >
                              <PencilIcon className="size-3.5" />
                              <span>Edit Value</span>
                            </button>
                          )}
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
        isOpen={modalOpen && isAdmin}
        onClose={() => setModalOpen(false)}
        title="Edit Point Rule Value"
        description={`Update points value for ${editingRule?.label || "this rule"}.`}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left font-sans">
          {formError && (
            <div className="flex items-center gap-2 rounded-[10px] border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">
              Rule Name *
            </label>
            <input
              required
              value={editForm.label}
              onChange={(e) =>
                setEditForm({ ...editForm, label: e.target.value })
              }
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">
              Points Awarded (+Points) *
            </label>
            <input
              type="number"
              required
              min={0}
              max={10000}
              value={editForm.points}
              onChange={(e) =>
                setEditForm({ ...editForm, points: Number(e.target.value) })
              }
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
            />
            <p className="text-[11px] text-[#6a6a6a]">
              Points will be automatically awarded to member accounts upon
              trigger fulfillment.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">
              Description / Details
            </label>
            <textarea
              rows={3}
              value={editForm.description}
              onChange={(e) =>
                setEditForm({ ...editForm, description: e.target.value })
              }
              placeholder="Describe when and how these points are awarded..."
              className="w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] pt-3">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 cursor-pointer rounded-[12px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1f1f1f] disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </ResponsiveFormModal>
    </main>
  )
}
