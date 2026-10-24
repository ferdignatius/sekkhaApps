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
  PlusIcon,
  Trash2Icon,
  ClockIcon,
  AlertTriangleIcon,
} from "lucide-react"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { useAuth } from "@/modules/auth"
import { seasonsApi } from "../api/configureApi"
import type { SeasonDto } from "../api/configureApi"

function formatDateDisplay(iso: string) {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  } catch {
    return iso
  }
}

function toUpperKebabCase(str: string): string {
  return str
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function SeasonPage() {
  const { authState } = useAuth()
  const isAdmin =
    authState.status === "authenticated" && authState.role === "admin"

  const [seasons, setSeasons] = useState<SeasonDto[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Add / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false)
  const [editingSeason, setEditingSeason] = useState<SeasonDto | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    start_date: "",
    end_date: "",
    target_attendance: 500,
    is_active: false,
    description: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [activatingId, setActivatingId] = useState<string | null>(null)

  // Delete & Conflict Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deletingSeason, setDeletingSeason] = useState<SeasonDto | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [conflictSeason, setConflictSeason] = useState<SeasonDto | null>(null)

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

  function handleOpenCreate() {
    const now = new Date()
    const startDateStr = now.toISOString().slice(0, 10)
    const endDateObj = new Date(now)
    endDateObj.setMonth(endDateObj.getMonth() + 3)
    const endDateStr = endDateObj.toISOString().slice(0, 10)

    setEditingSeason(null)
    setFormData({
      name: "",
      code: "",
      start_date: startDateStr,
      end_date: endDateStr,
      target_attendance: 500,
      is_active: false,
      description: "",
    })
    setFormError(null)
    setModalOpen(true)
  }

  function handleOpenEdit(s: SeasonDto) {
    setEditingSeason(s)
    setFormData({
      name: s.name,
      code: s.code || toUpperKebabCase(s.name),
      start_date: s.start_date.slice(0, 10),
      end_date: s.end_date.slice(0, 10),
      target_attendance: s.target_attendance,
      is_active: s.is_active,
      description: s.description || "",
    })
    setFormError(null)
    setModalOpen(true)
  }

  function handleNameChange(name: string) {
    setFormData((prev) => ({
      ...prev,
      name,
      code: toUpperKebabCase(name),
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isAdmin) return

    if (!formData.name.trim() || !formData.start_date || !formData.end_date) {
      setFormError("Please fill in the season name and valid date range.")
      return
    }

    if (new Date(formData.end_date) <= new Date(formData.start_date)) {
      setFormError("End date must be chronologically after the start date.")
      return
    }

    try {
      setSubmitting(true)
      setFormError(null)

      if (editingSeason) {
        await seasonsApi.update(editingSeason.id, {
          name: formData.name.trim(),
          start_date: new Date(formData.start_date).toISOString(),
          end_date: new Date(formData.end_date + "T23:59:59.999Z").toISOString(),
          target_attendance: Number(formData.target_attendance) || 500,
          is_active: formData.is_active,
          description: formData.description.trim() || null,
        })
      } else {
        await seasonsApi.create({
          name: formData.name.trim(),
          code: formData.code.trim() || undefined,
          start_date: new Date(formData.start_date).toISOString(),
          end_date: new Date(formData.end_date + "T23:59:59.999Z").toISOString(),
          target_attendance: Number(formData.target_attendance) || 500,
          is_active: formData.is_active,
          description: formData.description.trim() || null,
        })
      }

      await loadSeasons()
      setModalOpen(false)
    } catch (err: any) {
      console.error("Failed to save season:", err)
      setFormError(err.message || "Failed to save season configuration.")
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

  function handleOpenDelete(s: SeasonDto) {
    setDeletingSeason(s)
    setDeleteError(null)
    setDeleteModalOpen(true)
  }

  async function handleConfirmDelete() {
    if (!isAdmin || !deletingSeason) return
    try {
      setIsDeleting(true)
      setDeleteError(null)
      await seasonsApi.remove(deletingSeason.id)
      await loadSeasons()
      setDeleteModalOpen(false)
      setDeletingSeason(null)
    } catch (err: any) {
      console.error("Failed to delete season:", err)
      // Check for 409 Conflict / SEASON_IN_USE
      if (err.status === 409 || err.message?.includes("SEASON_IN_USE") || err.message?.includes("linked")) {
        setConflictSeason(deletingSeason)
        setDeleteModalOpen(false)
      } else {
        setDeleteError(err.message || "Failed to delete season.")
      }
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleDeactivateConflictSeason() {
    if (!conflictSeason) return
    try {
      await seasonsApi.update(conflictSeason.id, { is_active: false })
      await loadSeasons()
      setConflictSeason(null)
    } catch (err: any) {
      alert(err.message || "Failed to deactivate season.")
    }
  }

  // Filter default calendar seasons vs custom seasons
  const currentYear = new Date().getFullYear()
  const customSeasons = seasons.filter(
    (s) =>
      !s.code?.startsWith(`S${currentYear}-SEM`) &&
      !s.code?.startsWith(`S${currentYear}-ANNUAL`)
  )

  const activeCustomSeason = customSeasons.find((s) => s.is_active)

  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 text-left font-sans md:pb-12">
      <PageBreadcrumb
        items={[
          { label: "Configure" },
          { label: "Rules" },
          { label: "Season Leaderboard" },
        ]}
      />

      <div className="mx-auto max-w-7xl space-y-6 px-3.5 py-4 sm:px-6 sm:py-6 md:px-8">
        {/* Header Section */}
        <div className="flex flex-col gap-4 border-b border-[#e5e5e5] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#0a0a0a] text-white shadow-xs">
              <TrophyIcon className="size-6 text-[#e8b94a]" />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-[#0a0a0a] sm:text-xl">
                Leaderboard Seasons & Competition Periods
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Configure standard calendar timeframes, community attendance goals, and custom active periods.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex shrink-0 items-center gap-2 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] px-3.5 py-2 text-xs font-bold text-[#0a0a0a]">
              <ShieldCheckIcon className="size-4 text-[#0a0a0a]" />
              <span>{seasons.length} Total Periods</span>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="flex h-9 cursor-pointer items-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1f1f1f]"
              >
                <PlusIcon className="size-4 text-[#e8b94a]" />
                <span>Add Custom Season</span>
              </button>
            )}
          </div>
        </div>

        {/* Info Philosophy Banner */}
        <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-4 text-xs text-[#0a0a0a] shadow-xs">
          <InfoIcon className="mt-0.5 size-5 shrink-0 text-[#e8b94a]" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#0a0a0a]">
              Fair Competition & Zero-Reset Principle
            </p>
            <p className="text-xs leading-relaxed text-[#6a6a6a]">
              Every season resets competition points to <strong>0</strong> so all members have an equal opportunity to compete. Lifetime points remain safely archived in user profiles.
              At most <strong>one (1) custom season</strong> can be active at a time; when active, it appears as the primary left-most tab on the Leaderboard.
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
              <strong className="text-[#0a0a0a]">Read-only access.</strong> You can view season settings, but only an Admin can create, modify dates, or activate a custom season.
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

        {/* ── Section 1: Standard Auto-Active Calendar Periods ── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SparklesIcon className="size-4 text-[#e8b94a]" />
              <h2 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                Standard Calendar Periods (Auto-Active)
              </h2>
            </div>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              Always Available in Leaderboard
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Semester Card */}
            <div className="relative space-y-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4.5 shadow-xs transition-all hover:border-[#0a0a0a]/20">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                    6-Month Evaluation
                  </span>
                  <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                    Semester Period
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircleIcon className="size-3" />
                  <span>Auto-Active</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[#6a6a6a]">
                Evaluates attendance and points in 6-month cycles (Sem 1: Jan 1 – Jun 30, Sem 2: Jul 1 – Dec 31). Resets to 0 at the start of each semester.
              </p>
              <div className="flex items-center gap-4 rounded-[10px] border border-[#e5e5e5] bg-[#faf5e8] p-2.5 text-xs">
                <div>
                  <span className="block text-[10px] text-[#6a6a6a]">Community Goal</span>
                  <span className="font-bold text-[#0a0a0a]">500 Check-ins</span>
                </div>
                <div className="border-l border-[#e5e5e5] pl-4">
                  <span className="block text-[10px] text-[#6a6a6a]">Tab Order</span>
                  <span className="font-bold text-[#0a0a0a]">{activeCustomSeason ? "Position 2 (Middle)" : "Position 1 (Default)"}</span>
                </div>
              </div>
            </div>

            {/* Annual Card */}
            <div className="relative space-y-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4.5 shadow-xs transition-all hover:border-[#0a0a0a]/20">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase">
                    Full Calendar Year
                  </span>
                  <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                    Annual Period ({currentYear})
                  </h3>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                  <CheckCircleIcon className="size-3" />
                  <span>Auto-Active</span>
                </span>
              </div>
              <p className="text-xs leading-relaxed text-[#6a6a6a]">
                Accumulates annual dedication from Jan 1 through Dec 31. Resets automatically on January 1st at 00:00.
              </p>
              <div className="flex items-center gap-4 rounded-[10px] border border-[#e5e5e5] bg-[#faf5e8] p-2.5 text-xs">
                <div>
                  <span className="block text-[10px] text-[#6a6a6a]">Community Goal</span>
                  <span className="font-bold text-[#0a0a0a]">1,000 Check-ins</span>
                </div>
                <div className="border-l border-[#e5e5e5] pl-4">
                  <span className="block text-[10px] text-[#6a6a6a]">Tab Order</span>
                  <span className="font-bold text-[#0a0a0a]">{activeCustomSeason ? "Position 3 (Right-most)" : "Position 2 (Right-most)"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Custom Seasons (Special Periods) ── */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                Custom Seasons (Special Campaigns)
              </h2>
              <p className="text-xs text-[#6a6a6a]">
                Only <strong>one custom season</strong> can be active at a time (e.g. Vassa, Intensive Retreat, Youth Camp).
              </p>
            </div>
            {activeCustomSeason && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#0a0a0a] bg-[#0a0a0a] px-3 py-1 text-xs font-bold text-white shadow-xs">
                <SparklesIcon className="size-3.5 text-[#e8b94a]" />
                <span>Active: {activeCustomSeason.name}</span>
              </span>
            )}
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-56 animate-pulse rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-5 shadow-xs"
                />
              ))}
            </div>
          ) : customSeasons.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-[20px] border border-dashed border-[#e5e5e5] bg-[#faf5e8] p-10 text-center">
              <TrophyIcon className="size-10 text-[#6a6a6a]/50" />
              <h3 className="mt-3 text-sm font-bold text-[#0a0a0a]">
                No Custom Seasons Configured
              </h3>
              <p className="mt-1 max-w-sm text-xs text-[#6a6a6a]">
                You can create custom seasonal periods such as Vassa or holiday youth retreats.
              </p>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="mt-4 flex h-9 cursor-pointer items-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-4 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1f1f1f]"
                >
                  <PlusIcon className="size-4 text-[#e8b94a]" />
                  <span>Create First Custom Season</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {customSeasons.map((season) => {
                const isActive = season.is_active
                const progressPct = Math.min(
                  100,
                  Math.round(
                    ((season.total_attendances || 0) / (season.target_attendance || 500)) * 100
                  )
                )

                return (
                  <div
                    key={season.id}
                    className={`relative flex flex-col justify-between overflow-hidden rounded-[16px] border bg-[#fffaf0] p-4.5 shadow-xs transition-all ${
                      isActive
                        ? "border-[#0a0a0a] ring-2 ring-[#0a0a0a]/10"
                        : "border-[#e5e5e5] hover:border-[#0a0a0a]/30"
                    }`}
                  >
                    {/* Active Ribbon */}
                    {isActive && (
                      <div className="absolute top-0 right-0 flex items-center gap-1.5 rounded-bl-[14px] bg-[#0a0a0a] px-3 py-1 text-[10px] font-bold text-white shadow-xs">
                        <SparklesIcon className="size-3 text-[#e8b94a]" />
                        <span>ACTIVE ON LEADERBOARD</span>
                      </div>
                    )}

                    <div className="space-y-3">
                      {/* Title & Code */}
                      <div className="space-y-1 pr-14">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                            {season.name}
                          </h3>
                        </div>
                        {season.code && (
                          <span className="inline-block rounded-[6px] border border-[#e5e5e5] bg-[#faf5e8] px-2 py-0.5 font-mono text-[10px] font-bold text-[#6a6a6a]">
                            {season.code}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="line-clamp-2 text-xs leading-relaxed text-[#6a6a6a]">
                        {season.description || "No specific description provided for this custom season."}
                      </p>

                      {/* Date Range & Days Left */}
                      <div className="space-y-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3 text-xs">
                        <div className="flex items-center justify-between text-[11px] text-[#6a6a6a]">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="size-3.5 text-[#0a0a0a]" />
                            <span>Duration</span>
                          </span>
                          {season.days_left !== undefined && (
                            <span className="flex items-center gap-1 font-bold text-[#0a0a0a]">
                              <ClockIcon className="size-3 text-[#e8b94a]" />
                              <span>{season.days_left} days left</span>
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-[#0a0a0a]">
                          {formatDateDisplay(season.start_date)} – {formatDateDisplay(season.end_date)}
                        </p>
                      </div>

                      {/* Attendance Progress */}
                      <div className="space-y-1.5 rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3 text-xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="flex items-center gap-1 text-[#6a6a6a]">
                            <UsersIcon className="size-3.5 text-[#0a0a0a]" />
                            <span>Community Goal</span>
                          </span>
                          <span className="font-bold text-[#0a0a0a]">
                            {season.total_attendances || 0} / {season.target_attendance} ({progressPct}%)
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#e5e5e5]">
                          <div
                            className="h-full rounded-full bg-[#0a0a0a] transition-all"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="mt-4 flex items-center justify-between gap-2 border-t border-[#e5e5e5] pt-3">
                      <div>
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                            <CheckCircleIcon className="size-4 text-emerald-600" />
                            <span>Active Period</span>
                          </span>
                        ) : (
                          isAdmin && (
                            <button
                              type="button"
                              disabled={activatingId === season.id}
                              onClick={() => handleActivate(season)}
                              className="cursor-pointer text-xs font-bold text-[#0a0a0a] underline underline-offset-4 transition-colors hover:text-[#e8b94a] disabled:opacity-50"
                            >
                              {activatingId === season.id ? "Activating..." : "Set as Active"}
                            </button>
                          )
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(season)}
                            aria-label={`Edit ${season.name}`}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-xs transition-colors hover:bg-[#faf5e8]"
                          >
                            <PencilIcon className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(season)}
                            aria-label={`Delete ${season.name}`}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-[8px] border border-rose-200 bg-rose-50 text-rose-700 shadow-xs transition-colors hover:bg-rose-100"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Season Modal */}
      <ResponsiveFormModal
        isOpen={modalOpen && isAdmin}
        onClose={() => setModalOpen(false)}
        title={editingSeason ? "Edit Season Configuration" : "Add Custom Season"}
        description={
          editingSeason
            ? `Update timeframe and goals for ${editingSeason.name}.`
            : "Create a new custom season period for leaderboard competition."
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
            <label className="text-xs font-bold text-[#0a0a0a]">
              Season Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Vassa 2026, Youth Retreat 2026"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Season Code (Auto-synced, Read-Only)
              </label>
              <span className="text-[10px] font-bold text-[#6a6a6a]">UPPERCASE KEBAB-CASE</span>
            </div>
            <input
              type="text"
              disabled
              readOnly
              value={formData.code}
              className="h-11 w-full cursor-not-allowed rounded-[12px] border border-[#e5e5e5] bg-[#f5f0e6] px-3.5 font-mono text-xs font-bold text-[#6a6a6a] shadow-xs outline-none sm:text-sm"
            />
            <p className="text-[10px] text-[#6a6a6a]">
              The code is automatically generated from the season name and is read-only to preserve relational integrity.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.start_date}
                onChange={(e) =>
                  setFormData({ ...formData, start_date: e.target.value })
                }
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[#0a0a0a]">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={formData.end_date}
                onChange={(e) =>
                  setFormData({ ...formData, end_date: e.target.value })
                }
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">
              Community Attendance Goal
            </label>
            <input
              type="number"
              min={1}
              value={formData.target_attendance}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  target_attendance: Number(e.target.value),
                })
              }
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
            />
            <p className="text-[10px] text-[#6a6a6a]">
              Collective community milestone goal for all members combined (e.g. 500 attendances).
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#0a0a0a]">
              Description / Spiritual Focus (Optional)
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe season focus or retreat theme..."
              className="w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
            />
          </div>

          {/* Active Status Toggle */}
          <div className="rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) =>
                  setFormData({ ...formData, is_active: e.target.checked })
                }
                className="mt-0.5 size-4 rounded border-[#e5e5e5] text-[#0a0a0a] focus:ring-[#0a0a0a]"
              />
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-[#0a0a0a]">
                  Set as Active Custom Season
                </span>
                <p className="text-[11px] text-[#6a6a6a]">
                  Only 1 custom season can be active at a time. Activating this will automatically archive any previously active custom season.
                </p>
              </div>
            </label>
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
              {submitting ? "Saving..." : editingSeason ? "Update Season" : "Create Season"}
            </button>
          </div>
        </form>
      </ResponsiveFormModal>

      {/* Delete Confirmation Modal */}
      <ResponsiveFormModal
        isOpen={deleteModalOpen && isAdmin}
        onClose={() => setDeleteModalOpen(false)}
        title="Delete Season"
        description="Are you sure you want to delete this custom season?"
      >
        <div className="space-y-4 text-left font-sans">
          {deleteError && (
            <div className="flex items-center gap-2 rounded-[10px] border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
              <AlertCircleIcon className="size-4 shrink-0 text-rose-600" />
              <span>{deleteError}</span>
            </div>
          )}

          <div className="rounded-[12px] border border-rose-200 bg-rose-50/50 p-3.5 text-xs text-rose-900">
            <p className="font-bold">
              Confirm deletion of season: &ldquo;{deletingSeason?.name}&rdquo;
            </p>
            <p className="mt-1 text-[11px] text-rose-700">
              This action cannot be undone. Seasons that are currently linked to existing event records cannot be deleted to preserve attendance audit integrity.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] pt-3">
            <button
              type="button"
              onClick={() => setDeleteModalOpen(false)}
              className="h-10 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="h-10 cursor-pointer rounded-[12px] bg-rose-600 px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-rose-700 disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete Season"}
            </button>
          </div>
        </div>
      </ResponsiveFormModal>

      {/* Safe Delete Conflict (409 Conflict) Modal */}
      <ResponsiveFormModal
        isOpen={Boolean(conflictSeason)}
        onClose={() => setConflictSeason(null)}
        title="Season In Use (Cannot Delete)"
        description="This season cannot be deleted because it is linked to existing event records."
      >
        <div className="space-y-4 text-left font-sans">
          <div className="flex items-start gap-3 rounded-[12px] border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-900">
            <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-bold">Historical Attendance Integrity Protected</p>
              <p className="text-[11px] leading-relaxed text-amber-800">
                &ldquo;{conflictSeason?.name}&rdquo; has recorded events and attendance transactions. To protect member points and attendance history, the database prevents hard deletion.
              </p>
            </div>
          </div>

          <p className="text-xs text-[#6a6a6a]">
            Instead of deleting, you can deactivate this season so it no longer appears as the active custom season on the leaderboard.
          </p>

          <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] pt-3">
            <button
              type="button"
              onClick={() => setConflictSeason(null)}
              className="h-10 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
            >
              Close
            </button>
            {conflictSeason?.is_active && (
              <button
                type="button"
                onClick={handleDeactivateConflictSeason}
                className="h-10 cursor-pointer rounded-[12px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#1f1f1f]"
              >
                Deactivate Instead
              </button>
            )}
          </div>
        </div>
      </ResponsiveFormModal>
    </main>
  )
}
