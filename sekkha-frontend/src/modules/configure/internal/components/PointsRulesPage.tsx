import { useState, useEffect } from "react"
import {
  ZapIcon,
  PencilIcon,
  ShieldCheckIcon,
  FlameIcon,
  CalendarDaysIcon,
  AwardIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { Button, Badge, Alert, Card, Input } from "@/components/base"
import { pointRulesApi, type PointRuleDto } from "../api/configureApi"

// Hardcoded structured rule sections
interface RuleSectionConfig {
  id: string
  title: string
  subtitle: string
  icon: React.ReactNode
  badge: string
  badgeVariant: "blue" | "coral" | "emerald"
  ruleCodes: string[]
}

const RULE_SECTIONS: RuleSectionConfig[] = [
  {
    id: "attendance_section",
    title: "1. Event Attendance Points Rules",
    subtitle: "Points earned directly by members when logging attendance in service sessions.",
    icon: <CalendarDaysIcon className="size-5 text-blue-600" />,
    badge: "Event Attendance",
    badgeVariant: "blue",
    ruleCodes: ["attendance_rutin", "attendance_special"],
  },
  {
    id: "streak_section",
    title: "2. Weekly Streak & Retention Rules",
    subtitle: "Appreciation points for members maintaining consecutive attendance consistency.",
    icon: <FlameIcon className="size-5 text-orange-600" />,
    badge: "Streak Gamification",
    badgeVariant: "coral",
    ruleCodes: ["streak_weekly_bonus"],
  },
  {
    id: "engagement_section",
    title: "3. New Member Welcome Rules",
    subtitle: "Motivational bonus points for first-time attendees visiting the vihara.",
    icon: <AwardIcon className="size-5 text-emerald-600" />,
    badge: "Engagement",
    badgeVariant: "emerald",
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
    if (!editingRule) return

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
    <main className="min-h-screen bg-sekkha-surface pb-32 md:pb-12 font-sans">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
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
                System Points Rules
              </h1>
            </div>
            <p className="text-body-sm text-sekkha-slate">
              Core system point distribution rules. You can customize point values and descriptions anytime.
            </p>
          </div>

          <Badge variant="slate" size="lg" icon={<ShieldCheckIcon className="size-4 text-sekkha-brand-blue" />}>
            Core Rules (Editable, Cannot be deleted)
          </Badge>
        </div>

        {/* Info Banner */}
        <Alert
          variant="info"
          title="Automatic Calculation Mechanism"
          description="Point values below are automatically awarded when organizers conclude event attendance sessions, calculate streaks, or welcome new members."
        />

        {/* Error Alert */}
        {error && (
          <Alert
            variant="destructive"
            title="Error Occurred"
            description={error}
          />
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
              <Card
                key={section.id}
                className="p-5 sm:p-7 space-y-4"
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
                  <Badge variant={section.badgeVariant}>
                    {section.badge}
                  </Badge>
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
                              <span className="text-micro-bold opacity-90">Pts</span>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-body-sm font-extrabold text-sekkha-ink">
                              {rule.label}
                            </h3>
                            <p className="text-micro text-sekkha-slate leading-relaxed">
                              {rule.description || "No additional description."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                          <span className="text-micro text-sekkha-muted">
                            Core System
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleOpenEdit(rule)}
                            className="h-8 px-3 text-caption font-bold"
                          >
                            <PencilIcon className="size-3 mr-1" />
                            <span>Edit Value</span>
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}

      </div>

      {/* Edit Rule Modal */}
      <ResponsiveFormModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit Point Rule Value"
        description={`Update points value for ${editingRule?.label || "this rule"}.`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <Alert
              variant="destructive"
              title="Failed to Save"
              description={formError}
            />
          )}

          <Input
            id="rule-label"
            label="Rule Name"
            required
            value={editForm.label}
            onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
          />

          <div className="space-y-1">
            <Input
              id="rule-points"
              label="Points Awarded (+Points)"
              type="number"
              required
              min={0}
              max={10000}
              value={editForm.points}
              onChange={(e) => setEditForm({ ...editForm, points: Number(e.target.value) })}
              endIcon={<span className="text-caption font-bold text-sekkha-slate">Pts</span>}
              helperText="Points will be automatically awarded to member accounts upon trigger fulfillment."
            />
          </div>

          <div className="flex flex-col gap-1.5 w-full">
            <label htmlFor="rule-desc" className="text-caption font-bold text-sekkha-ink">
              Description / Details
            </label>
            <textarea
              id="rule-desc"
              rows={3}
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              placeholder="Describe when and how these points are awarded..."
              className="w-full rounded-2xl bg-slate-50/70 border border-sekkha-hairline-strong px-3.5 py-2.5 text-body-sm text-sekkha-ink outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-sekkha-brand-blue focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-sekkha-hairline-soft">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </ResponsiveFormModal>
    </main>
  )
}
