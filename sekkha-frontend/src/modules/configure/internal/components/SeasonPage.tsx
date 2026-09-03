import { useState, useEffect } from "react"
import {
  TrophyIcon,
  PencilIcon,
  CheckCircleIcon,
  CalendarIcon,
  SparklesIcon,
  UsersIcon,
  ShieldCheckIcon,
  InfoIcon,
  AlertCircleIcon,
  FlameIcon,
  LayersIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import { seasonsApi, type SeasonDto } from "../api/configureApi"

interface SeasonSectionConfig {
  code: string
  label: string
  subtitle: string
  badge: string
  icon: React.ReactNode
}

const HARDCODED_SEASONS: SeasonSectionConfig[] = [
  {
    code: "semester",
    label: "Semester Season (6 Months)",
    subtitle: "Official 6-month vihara competition period for leaderboard rankings and community milestones.",
    badge: "Primary Default",
    icon: <SparklesIcon className="size-5 text-[#e8b94a]" />,
  },
  {
    code: "quarterly",
    label: "Quarterly Season (3 Months)",
    subtitle: "Dynamic 3-month evaluation period per quarter (Q1, Q2, Q3, Q4) for seasonal milestones.",
    badge: "Quarterly",
    icon: <LayersIcon className="size-5 text-[#b8a4ed]" />,
  },
  {
    code: "annual",
    label: "Annual Season (Full Year)",
    subtitle: "Comprehensive full calendar year format for point recalculation and annual awards.",
    badge: "Annual",
    icon: <TrophyIcon className="size-5 text-[#e8b94a]" />,
  },
]

function formatDateDisplay(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
  } catch {
    return iso
  }
}

export function SeasonPage() {
  const { authState } = useAuth()
  const isAdmin = authState.status === "authenticated" && authState.role === "admin"

  const [seasons, setSeasons] = useState<SeasonDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSeason, setEditingSeason] = useState<SeasonDto | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    start_date: "",
    end_date: "",
    target_attendance: 500,
    bonus_points: 100,
    description: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  useEffect(() => {
    loadSeasons()
  }, [])

  async function loadSeasons() {
    try {
      setLoading(true)
      const data = await seasonsApi.list()
      setSeasons(data)
      setError(null)
    } catch (err: any) {
      console.error("Failed to load seasons:", err)
      setError("Failed to load season data from server.")
    } finally {
      setLoading(false)
    }
  }

  function handleOpenEdit(s: SeasonDto) {
    setEditingSeason(s)
    setFormData({
      name: s.name,
      start_date: s.start_date.slice(0, 10),
      end_date: s.end_date.slice(0, 10),
      target_attendance: s.target_attendance,
      bonus_points: s.bonus_points,
      description: s.description || "",
    })
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin || !editingSeason) return

    if (!formData.name.trim() || !formData.start_date || !formData.end_date) {
      setFormError("Please fill in season name and valid date range.")
      return
    }

    try {
      setSubmitting(true)
      setFormError(null)
      await seasonsApi.update(editingSeason.id, {
        name: formData.name.trim(),
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date + "T23:59:59").toISOString(),
        target_attendance: Number(formData.target_attendance) || 500,
        bonus_points: Number(formData.bonus_points) || 100,
        description: formData.description.trim() || null,
      })
      await loadSeasons()
      setModalOpen(false)
    } catch (err: any) {
      console.error("Failed to save season:", err)
      setFormError(err.message || "Failed to save season changes.")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleActivate(s: SeasonDto) {
    if (!isAdmin) return
    try {
      setActivatingId(s.id)
      await seasonsApi.activate(s.id)
      await loadSeasons()
    } catch (err: any) {
      console.error("Failed to activate season:", err)
      alert(err.message || "Failed to activate season.")
    } finally {
      setActivatingId(null)
    }
  }

  function getSeasonByCode(code: string): SeasonDto | undefined {
    return seasons.find((s) => s.code === code)
  }

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 md:pb-12 font-sans text-left">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Rules" },
          { label: "Season Leaderboard" },
        ]}
      />

      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 max-w-7xl mx-auto space-y-5">
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e5e5e5] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-[12px] bg-[#0a0a0a] text-white shrink-0 shadow-xs">
              <TrophyIcon className="size-5 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-bold text-[#0a0a0a]">
                Leaderboard Season Period Rules
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Core 3 duration profiles: <strong>Semester</strong> (Default), <strong>Quarterly</strong>, and <strong>Annual</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-[12px] bg-[#faf5e8] border border-[#e5e5e5] px-3.5 py-2 text-xs font-bold text-[#0a0a0a] shrink-0">
            <ShieldCheckIcon className="size-4 text-[#0a0a0a]" />
            <span>3 Fixed Profiles</span>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex items-start gap-3 rounded-[16px] bg-[#faf5e8] border border-[#e5e5e5] p-4 text-xs text-[#0a0a0a] shadow-xs">
          <InfoIcon className="size-5 shrink-0 text-[#e8b94a] mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-xs text-[#0a0a0a]">Active Season Mechanism</p>
            <p className="text-xs text-[#6a6a6a] leading-relaxed">
              Only <strong>one active season</strong> can be active at a time. Leaderboard rankings and community goals are filtered according to the active season's date range.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 rounded-[12px] bg-rose-50 p-4 border border-rose-200 text-xs font-bold text-rose-800">
            <AlertCircleIcon className="size-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Hardcoded 3 Season Sections */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-[20px] bg-[#fffaf0] border border-[#e5e5e5] animate-pulse p-6 shadow-xs" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {HARDCODED_SEASONS.map((cfg) => {
              const season = getSeasonByCode(cfg.code)
              if (!season) return null

              const isActive = season.is_active

              return (
                <div
                  key={cfg.code}
                  className={`rounded-[20px] border bg-[#fffaf0] p-5 sm:p-6 shadow-xs space-y-4 transition-all relative overflow-hidden ${
                    isActive
                      ? "border-[#0a0a0a] ring-2 ring-[#0a0a0a]/10"
                      : "border-[#e5e5e5] hover:border-[#0a0a0a]/30"
                  }`}
                >
                  {/* Active Header Ribbon */}
                  {isActive && (
                    <div className="absolute top-0 right-0 rounded-bl-[16px] bg-[#0a0a0a] px-3.5 py-1 text-[11px] font-bold text-white shadow-xs flex items-center gap-1.5">
                      <SparklesIcon className="size-3 text-[#e8b94a]" />
                      <span>ACTIVE ON LEADERBOARD</span>
                    </div>
                  )}

                  {/* Section Title & Subtitle */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 border-b border-[#e5e5e5] pb-4">
                    <div className="space-y-1 max-w-2xl">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-[10px] bg-[#faf5e8] border border-[#e5e5e5]">
                          {cfg.icon}
                        </div>
                        <h2 className="text-sm sm:text-base font-bold text-[#0a0a0a]">
                          {season.name}
                        </h2>
                        <span className="rounded-full bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-0.5 text-[11px] font-bold text-[#0a0a0a]">
                          {cfg.badge}
                        </span>
                      </div>
                      <p className="text-xs text-[#6a6a6a] leading-relaxed">
                        {season.description || cfg.subtitle}
                      </p>
                    </div>

                    <div className="shrink-0 flex items-center gap-2 pt-2 sm:pt-0">
                      {isActive && (
                        <span className="inline-flex items-center gap-1.5 rounded-[12px] bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-800">
                          <CheckCircleIcon className="size-3.5 text-emerald-600" />
                          <span>Status: Active</span>
                        </span>
                      )}

                      {!isActive && isAdmin && (
                        <button
                          type="button"
                          disabled={activatingId === season.id}
                          onClick={() => handleActivate(season)}
                          className="h-10 px-4 flex items-center gap-1.5 rounded-[12px] bg-[#0a0a0a] text-xs font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <SparklesIcon className="size-3.5 text-[#e8b94a]" />
                          <span>{activatingId === season.id ? "Activating..." : "Set as Active Season"}</span>
                        </button>
                      )}

                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(season)}
                          className="h-10 px-4 flex items-center gap-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs font-bold text-[#0a0a0a] shadow-xs hover:bg-[#faf5e8] transition-colors cursor-pointer"
                        >
                          <PencilIcon className="size-3.5" />
                          <span>Edit Configuration</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Season Metrics Grid */}
                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* Period Date Range */}
                    <div className="rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6a6a6a] uppercase tracking-wider">
                        <CalendarIcon className="size-3.5 text-[#0a0a0a]" />
                        <span>Period Range</span>
                      </div>
                      <p className="text-xs font-bold text-[#0a0a0a]">
                        {formatDateDisplay(season.start_date)} – {formatDateDisplay(season.end_date)}
                      </p>
                    </div>

                    {/* Community Target */}
                    <div className="rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6a6a6a] uppercase tracking-wider">
                        <UsersIcon className="size-3.5 text-[#0a0a0a]" />
                        <span>Attendance Goal</span>
                      </div>
                      <p className="text-xs font-bold text-[#0a0a0a] flex items-baseline gap-1.5">
                        <span>{season.target_attendance}</span>
                        <span className="text-[11px] font-normal text-[#6a6a6a]">
                          (Logged: {season.total_attendances || 0} attended)
                        </span>
                      </p>
                    </div>

                    {/* Bonus Points */}
                    <div className="rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6a6a6a] uppercase tracking-wider">
                        <FlameIcon className="size-3.5 text-[#e8b94a]" />
                        <span>End of Season Bonus</span>
                      </div>
                      <p className="text-xs font-bold text-[#0a0a0a]">
                        +{season.bonus_points} Community Points
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </div>

      {/* Edit Season Modal */}
      <ResponsiveFormModal
        isOpen={modalOpen && isAdmin}
        onClose={() => setModalOpen(false)}
        title="Edit Season Configuration"
        description={`Update date range and goals for ${editingSeason?.name || "this season"}.`}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left font-sans">
          {formError && (
            <div className="flex items-center gap-2 rounded-[10px] bg-rose-50 p-3 border border-rose-200 text-xs font-bold text-rose-800">
              <AlertCircleIcon className="size-4 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">Season Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">Start Date</label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">End Date</label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">Attendance Goal</label>
              <input
                type="number"
                min={1}
                value={formData.target_attendance}
                onChange={(e) => setFormData({ ...formData, target_attendance: Number(e.target.value) })}
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">Completion Bonus Points</label>
              <input
                type="number"
                min={0}
                value={formData.bonus_points}
                onChange={(e) => setFormData({ ...formData, bonus_points: Number(e.target.value) })}
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs sm:text-sm text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">Description / Theme</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe season theme or community focus..."
              className="w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2.5 text-xs sm:text-sm text-[#0a0a0a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e5e5]">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="h-10 px-4 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] text-xs font-bold text-[#0a0a0a] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-5 rounded-[12px] bg-[#0a0a0a] hover:bg-[#1f1f1f] text-xs font-bold text-white shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </ResponsiveFormModal>
    </main>
  )
}
