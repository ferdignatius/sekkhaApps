import { useEffect, useState, useRef } from "react"
import {
  UsersIcon,
  SearchIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  ChevronDownIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  AwardIcon,
  CalendarIcon,
  XIcon,
  UserPlusIcon,
  ZapIcon,
  TargetIcon,
  UserCheckIcon,
  ClipboardListIcon,
} from "lucide-react"
import {
  fetchContributions,
  CONTRIBUTION_PERIODS,
  DIVISI_OPTIONS,
  STATUS_CONFIG,
} from "../api/contributionApi"
import type {
  ContributionResponse,
  ContributionRoleFilter,
  ContributionPeriod,
  ContributionPerson,
} from "../api/contributionApi"

// ─── Trend Indicator Helper ────────────────────────────────────────────

function TrendBadge({
  value,
  suffix = "",
}: {
  value: number
  suffix?: string
}) {
  if (value > 0) {
    return (
      <span className="text-micro inline-flex items-center gap-0.5 font-bold text-emerald-600">
        <TrendingUpIcon className="size-3" />+{value}
        {suffix}
      </span>
    )
  }
  if (value < 0) {
    return (
      <span className="text-micro inline-flex items-center gap-0.5 font-bold text-rose-600">
        <TrendingDownIcon className="size-3" />
        {value}
        {suffix}
      </span>
    )
  }
  return (
    <span className="text-micro inline-flex items-center gap-0.5 font-bold text-sekkha-slate">
      <MinusIcon className="size-3" />0{suffix}
    </span>
  )
}

// ─── Detail Drawer ─────────────────────────────────────────────────────

function PersonDetailDrawer({
  person,
  onClose,
}: {
  person: ContributionPerson
  onClose: () => void
}) {
  const statusDesign = STATUS_CONFIG[person.status]

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="animate-slideUp relative z-10 max-h-[85vh] w-full overflow-y-auto rounded-t-3xl border border-sekkha-hairline-soft bg-white shadow-2xl sm:max-w-lg sm:rounded-3xl">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-sekkha-hairline-soft bg-white/95 px-5 py-4 backdrop-blur-sm sm:rounded-t-3xl">
          <div className="flex min-w-0 items-center gap-3">
            <div className="text-caption flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sekkha-brand-blue/10 font-extrabold text-sekkha-brand-blue">
              {person.avatarInitials}
            </div>
            <div className="min-w-0">
              <h3 className="text-body-sm-medium truncate font-bold text-sekkha-ink">
                {person.name}
              </h3>
              <div className="text-micro flex items-center gap-2 text-sekkha-slate">
                <span
                  className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-bold ${statusDesign.badgeBg}`}
                >
                  <span
                    className={`size-1.5 rounded-full ${statusDesign.dotColor}`}
                  />
                  {statusDesign.label}
                </span>
                <span className="capitalize">{person.role}</span>
                <span>·</span>
                <span>
                  {DIVISI_OPTIONS.find((d) => d.id === person.divisi)?.label ||
                    person.divisi}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 cursor-pointer items-center justify-center rounded-xl bg-sekkha-surface text-sekkha-slate transition hover:bg-sekkha-hairline-soft"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 p-5">
          {/* 4 Core Scores Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5 rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5">
              <div className="text-micro flex items-center gap-1.5 text-sekkha-slate">
                <ZapIcon className="size-3.5 text-amber-500" />
                <span className="font-bold">Initiative</span>
              </div>
              <p className="text-heading-5 font-extrabold text-sekkha-ink">
                {person.initiativeScore}
              </p>
              <TrendBadge value={person.initiativeTrend} />
              <p className="text-micro text-sekkha-slate">Events organized</p>
            </div>

            <div className="space-y-1.5 rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5">
              <div className="text-micro flex items-center gap-1.5 text-sekkha-slate">
                <ClipboardListIcon className="size-3.5 text-blue-500" />
                <span className="font-bold">Execution</span>
              </div>
              <p className="text-heading-5 font-extrabold text-sekkha-ink">
                {person.executionScore}
              </p>
              <TrendBadge value={person.executionTrend} />
              <p className="text-micro text-sekkha-slate">Events handled</p>
            </div>

            <div className="space-y-1.5 rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5">
              <div className="text-micro flex items-center gap-1.5 text-sekkha-slate">
                <TargetIcon className="size-3.5 text-emerald-500" />
                <span className="font-bold">Effectiveness</span>
              </div>
              <p className="text-heading-5 font-extrabold text-sekkha-ink">
                {person.effectivenessPercent}%
              </p>
              <TrendBadge value={person.effectivenessTrend} suffix="%" />
              <p className="text-micro text-sekkha-slate">
                Avg attendance rate
              </p>
            </div>

            <div className="space-y-1.5 rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5">
              <div className="text-micro flex items-center gap-1.5 text-sekkha-slate">
                <UserCheckIcon className="size-3.5 text-violet-500" />
                <span className="font-bold">Presence</span>
              </div>
              <p className="text-heading-5 font-extrabold text-sekkha-ink">
                {person.presencePercent}%
              </p>
              <TrendBadge value={person.presenceTrend} suffix="%" />
              <p className="text-micro text-sekkha-slate">
                Personal attendance
              </p>
            </div>
          </div>

          {/* Aktivis: Invite Points */}
          {person.role === "aktivis" && (
            <div className="space-y-2 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
              <div className="flex items-center justify-between">
                <div className="text-caption-bold flex items-center gap-2 font-bold text-violet-700">
                  <UserPlusIcon className="size-4" />
                  <span>Members Brought In</span>
                </div>
                <TrendBadge value={person.invitedTrend} />
              </div>
              <p className="text-heading-4 font-extrabold text-violet-700">
                {person.invitedCount}{" "}
                <span className="text-caption font-normal text-violet-600">
                  Members
                </span>
              </p>
            </div>
          )}

          {/* Consistency */}
          <div className="space-y-2 rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4">
            <h4 className="text-caption-bold flex items-center gap-2 font-bold text-sekkha-ink">
              <CalendarIcon className="size-4 text-sekkha-brand-blue" />
              Consistency
            </h4>
            <div className="text-micro flex items-center justify-between">
              <span className="text-sekkha-slate">Active months in period</span>
              <span className="font-extrabold text-sekkha-ink">
                {person.activeMonths} / {person.totalMonths} Months
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full border border-sekkha-hairline-soft bg-sekkha-surface">
              <div
                style={{
                  width: `${(person.activeMonths / person.totalMonths) * 100}%`,
                }}
                className="h-full rounded-full bg-sekkha-brand-blue transition-all duration-500"
              />
            </div>
          </div>

          {/* Role Breakdown */}
          <div className="space-y-3 rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4">
            <h4 className="text-caption-bold flex items-center gap-2 font-bold text-sekkha-ink">
              <ClipboardListIcon className="size-4 text-sekkha-brand-blue" />
              Event Duty Distribution
            </h4>
            <div className="space-y-2">
              {person.roleBreakdown.map((rb) => (
                <div
                  key={rb.role}
                  className="text-micro flex items-center justify-between"
                >
                  <span className="text-sekkha-slate">{rb.role}</span>
                  <span className="rounded-md border border-sekkha-hairline-soft bg-sekkha-surface px-2 py-0.5 font-extrabold text-sekkha-ink">
                    {rb.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Description */}
          <div className={`rounded-2xl border p-4 ${statusDesign.badgeBg}`}>
            <p className="text-caption font-bold">
              {statusDesign.label}: {statusDesign.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Tab Component ────────────────────────────────────────────────

export function PengurusContributionTab() {
  const [period, setPeriod] = useState<ContributionPeriod>("Q3 2026")
  const [roleFilter, setRoleFilter] = useState<ContributionRoleFilter>("all")
  const [divisiFilter, setDivisiFilter] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isDivisiOpen, setIsDivisiOpen] = useState(false)
  const divisiRef = useRef<HTMLDivElement>(null)

  const [data, setData] = useState<ContributionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPerson, setSelectedPerson] =
    useState<ContributionPerson | null>(null)

  // Close divisi dropdown on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (divisiRef.current && !divisiRef.current.contains(e.target as Node)) {
        setIsDivisiOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const loadData = async () => {
    setIsLoading(true)
    try {
      const res = await fetchContributions({
        period,
        roleFilter,
        divisiFilter,
        searchQuery,
      })
      setData(res)
    } catch (err) {
      console.error("Failed to load contribution data", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [period, roleFilter, divisiFilter, searchQuery])

  if (isLoading || !data) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas">
        <div className="flex flex-col items-center gap-2 text-sekkha-muted">
          <AwardIcon className="size-7 animate-pulse text-sekkha-brand-blue" />
          <p className="text-body-sm font-semibold">
            Calculating Organizer & Activist contributions...
          </p>
        </div>
      </div>
    )
  }

  const { summary, persons } = data

  const reliablePersons = persons.filter((p) => p.status === "reliable")
  const overloadedPersons = persons.filter((p) => p.status === "overloaded")
  const promotionPersons = persons.filter((p) => p.status === "promotion_ready")

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* ── Control Panel ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5 shadow-xs sm:rounded-3xl sm:p-5">
        {/* Top Row: Period + Divisi + Search */}
        <div className="flex flex-col items-stretch gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Period Selector */}
          <div className="text-caption-bold flex w-full items-center gap-1.5 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 font-bold text-sekkha-ink shadow-2xs sm:w-auto">
            <CalendarIcon className="size-4 shrink-0 text-sekkha-brand-blue" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ContributionPeriod)}
              className="text-caption sm:text-caption-bold w-full cursor-pointer bg-transparent font-bold text-sekkha-ink outline-none"
            >
              {CONTRIBUTION_PERIODS.map((p) => (
                <option key={p} value={p}>
                  Period: {p}
                </option>
              ))}
            </select>
          </div>

          {/* Divisi Dropdown */}
          <div className="relative w-full sm:w-auto" ref={divisiRef}>
            <button
              type="button"
              onClick={() => setIsDivisiOpen(!isDivisiOpen)}
              className={`text-caption-bold flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3.5 py-2 shadow-2xs transition sm:w-auto sm:justify-start ${
                divisiFilter !== "all"
                  ? "border border-amber-500/40 bg-amber-500/10 font-bold text-amber-700"
                  : "border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-ink hover:bg-sekkha-hairline-soft"
              }`}
            >
              <span className="truncate">
                {DIVISI_OPTIONS.find((d) => d.id === divisiFilter)?.label ||
                  "All Divisions"}
              </span>
              <ChevronDownIcon className="size-4 shrink-0 opacity-70" />
            </button>
            {isDivisiOpen && (
              <div className="animate-fadeIn absolute top-full right-0 left-0 z-30 mt-2 w-full space-y-1 rounded-2xl border border-sekkha-hairline-soft bg-white p-2.5 shadow-xl sm:right-auto sm:w-64">
                {DIVISI_OPTIONS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setDivisiFilter(d.id)
                      setIsDivisiOpen(false)
                    }}
                    className={`text-caption-bold w-full cursor-pointer rounded-xl px-3 py-2 text-left transition ${
                      divisiFilter === d.id
                        ? "bg-sekkha-brand-blue/10 font-bold text-sekkha-brand-blue"
                        : "text-sekkha-ink hover:bg-sekkha-surface"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search */}
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 shadow-2xs sm:max-w-xs">
            <SearchIcon className="size-4 shrink-0 text-sekkha-slate" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name..."
              className="text-caption w-full bg-transparent text-sekkha-ink outline-none placeholder:text-sekkha-muted"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="cursor-pointer text-sekkha-slate hover:text-sekkha-ink"
              >
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Role Segment Filter */}
        <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-micro mr-1 shrink-0 font-extrabold tracking-wider text-sekkha-slate uppercase">
            Role:
          </span>
          {[
            {
              id: "all" as const,
              label: `All (${summary.totalPengurus + summary.totalAktivis})`,
            },
            {
              id: "pengurus" as const,
              label: `Organizers (${summary.totalPengurus})`,
            },
            {
              id: "aktivis" as const,
              label: `Activists (${summary.totalAktivis})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              className={`text-micro-bold shrink-0 cursor-pointer rounded-lg px-2.5 py-1 font-bold transition ${
                roleFilter === tab.id
                  ? "bg-sekkha-brand-blue text-white shadow-xs"
                  : "border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-slate hover:text-sekkha-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4 Summary Cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {/* Pengurus + Aktivis Total */}
        <div className="rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5 shadow-xs sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-micro sm:text-caption font-medium text-sekkha-slate">
                Total Staff
              </p>
              <h3 className="text-heading-5 sm:text-heading-4 mt-0.5 font-extrabold text-sekkha-ink">
                {summary.totalPengurus + summary.totalAktivis}
              </h3>
            </div>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-sekkha-brand-blue sm:size-9">
              <UsersIcon className="size-4" />
            </span>
          </div>
          <p className="text-micro mt-2 text-sekkha-slate">
            {summary.totalPengurus} Organizers · {summary.totalAktivis}{" "}
            Activists
          </p>
        </div>

        {/* Reliable Candidates */}
        <div className="rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5 shadow-xs sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-micro sm:text-caption font-medium text-sekkha-slate">
                Reliable
              </p>
              <h3 className="text-heading-5 sm:text-heading-4 mt-0.5 font-extrabold text-emerald-700">
                {summary.reliableCandidates}
              </h3>
            </div>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 sm:size-9">
              <ShieldCheckIcon className="size-4" />
            </span>
          </div>
          <p className="text-micro mt-2 text-sekkha-slate">
            Strong successor candidates
          </p>
        </div>

        {/* Overloaded Risk */}
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 shadow-xs sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-micro sm:text-caption font-semibold text-rose-700">
                Overloaded
              </p>
              <h3 className="text-heading-5 sm:text-heading-4 mt-0.5 font-extrabold text-rose-700">
                {summary.overloadedRisk}
              </h3>
            </div>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 sm:size-9">
              <AlertTriangleIcon className="size-4" />
            </span>
          </div>
          <p className="text-micro mt-2 text-rose-700/70">
            Burnout risk, task redistribution needed
          </p>
        </div>

        {/* Umat Diajak by Aktivis */}
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3.5 shadow-xs sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-micro sm:text-caption font-semibold text-violet-700">
                Members Brought In
              </p>
              <h3 className="text-heading-5 sm:text-heading-4 mt-0.5 font-extrabold text-violet-700">
                {summary.totalInvitedByAktivis}
              </h3>
            </div>
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 sm:size-9">
              <UserPlusIcon className="size-4" />
            </span>
          </div>
          <p className="text-micro mt-2 text-violet-700/70">
            Total Activist Invite Points
          </p>
        </div>
      </div>

      {/* ── Highlight Banners ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {/* Strong Succession Candidates */}
        {reliablePersons.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-sekkha-canvas p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                <ShieldCheckIcon className="size-4" />
              </span>
              <h3 className="text-caption-bold font-bold text-sekkha-ink">
                Strong Succession Candidates
              </h3>
            </div>
            <div className="space-y-2">
              {reliablePersons.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPerson(p)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-emerald-500/10 bg-white/60 px-3 py-2 text-left transition hover:bg-emerald-500/5"
                >
                  <div className="text-micro flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 font-bold text-emerald-700">
                    {p.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption-bold truncate font-bold text-sekkha-ink">
                      {p.name}
                    </p>
                    <p className="text-micro text-sekkha-slate capitalize">
                      {p.role} · {p.effectivenessPercent}% effectiveness
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Overloaded Organizers */}
        {overloadedPersons.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-sekkha-canvas p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                <AlertTriangleIcon className="size-4" />
              </span>
              <h3 className="text-caption-bold font-bold text-sekkha-ink">
                Overloaded Organizers
              </h3>
            </div>
            <div className="space-y-2">
              {overloadedPersons.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPerson(p)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-rose-500/10 bg-white/60 px-3 py-2 text-left transition hover:bg-rose-500/5"
                >
                  <div className="text-micro flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 font-bold text-rose-700">
                    {p.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption-bold truncate font-bold text-sekkha-ink">
                      {p.name}
                    </p>
                    <p className="text-micro text-sekkha-slate">
                      {p.executionScore} events handled · {p.initiativeScore}{" "}
                      created
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Activists Ready for Promotion */}
        {promotionPersons.length > 0 && (
          <div className="space-y-3 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-sekkha-canvas p-4 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600">
                <AwardIcon className="size-4" />
              </span>
              <h3 className="text-caption-bold font-bold text-sekkha-ink">
                Activists Ready for Promotion
              </h3>
            </div>
            <div className="space-y-2">
              {promotionPersons.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPerson(p)}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-xl border border-violet-500/10 bg-white/60 px-3 py-2 text-left transition hover:bg-violet-500/5"
                >
                  <div className="text-micro flex size-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 font-bold text-violet-700">
                    {p.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption-bold truncate font-bold text-sekkha-ink">
                      {p.name}
                    </p>
                    <p className="text-micro text-sekkha-slate">
                      {p.invitedCount} Members brought in · {p.presencePercent}%
                      attendance
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Contribution Matrix Table ── */}
      <div className="overflow-hidden rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas shadow-xs sm:rounded-3xl">
        <div className="border-b border-sekkha-hairline-soft bg-sekkha-surface/50 px-4 py-3.5 sm:px-5">
          <h2 className="text-caption-bold sm:text-body-sm flex items-center gap-2 font-bold text-sekkha-ink">
            <ClipboardListIcon className="size-4 text-sekkha-brand-blue" />
            <span>Contribution Evaluation Matrix</span>
            <span className="text-micro-bold rounded-lg bg-sekkha-brand-blue/10 px-2 py-0.5 text-sekkha-brand-blue">
              {persons.length} members
            </span>
          </h2>
        </div>

        {persons.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-2 py-12 text-sekkha-muted">
            <SearchIcon className="size-8 text-sekkha-hairline-soft" />
            <p className="text-body-sm font-semibold">
              No matching records found
            </p>
            <p className="text-caption text-sekkha-slate">
              Try adjusting your filters or search keywords.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-micro border-b border-sekkha-hairline-soft bg-sekkha-surface/30 font-extrabold tracking-wider text-sekkha-slate uppercase">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-center">Initiative</th>
                    <th className="px-3 py-3 text-center">Execution</th>
                    <th className="px-3 py-3 text-center">Effectiveness</th>
                    <th className="px-3 py-3 text-center">Presence</th>
                    {(roleFilter === "all" || roleFilter === "aktivis") && (
                      <th className="px-3 py-3 text-center">Invite Points</th>
                    )}
                    <th className="px-3 py-3 text-center">Consistency</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p) => {
                    const statusDesign = STATUS_CONFIG[p.status]
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPerson(p)}
                        className="cursor-pointer border-b border-sekkha-hairline-soft/60 transition hover:bg-sekkha-surface/50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="text-micro flex size-8 shrink-0 items-center justify-center rounded-lg bg-sekkha-brand-blue/10 font-bold text-sekkha-brand-blue">
                              {p.avatarInitials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-caption-bold truncate font-bold text-sekkha-ink">
                                {p.name}
                              </p>
                              <p className="text-micro text-sekkha-slate capitalize">
                                {p.role} ·{" "}
                                {DIVISI_OPTIONS.find((d) => d.id === p.divisi)
                                  ?.label || p.divisi}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`text-micro inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-bold ${statusDesign.badgeBg}`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${statusDesign.dotColor}`}
                            />
                            {statusDesign.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <p className="text-caption-bold font-extrabold text-sekkha-ink">
                            {p.initiativeScore}
                          </p>
                          <TrendBadge value={p.initiativeTrend} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <p className="text-caption-bold font-extrabold text-sekkha-ink">
                            {p.executionScore}
                          </p>
                          <TrendBadge value={p.executionTrend} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <p className="text-caption-bold font-extrabold text-sekkha-ink">
                            {p.effectivenessPercent}%
                          </p>
                          <TrendBadge value={p.effectivenessTrend} suffix="%" />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <p className="text-caption-bold font-extrabold text-sekkha-ink">
                            {p.presencePercent}%
                          </p>
                          <TrendBadge value={p.presenceTrend} suffix="%" />
                        </td>
                        {(roleFilter === "all" || roleFilter === "aktivis") && (
                          <td className="px-3 py-3 text-center">
                            {p.role === "aktivis" ? (
                              <>
                                <p className="text-caption-bold font-extrabold text-violet-700">
                                  {p.invitedCount}
                                </p>
                                <TrendBadge value={p.invitedTrend} />
                              </>
                            ) : (
                              <span className="text-micro text-sekkha-muted">
                                —
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-3 text-center">
                          <span className="text-caption-bold font-extrabold text-sekkha-ink">
                            {p.activeMonths}/{p.totalMonths}
                          </span>
                          <span className="text-micro ml-0.5 text-sekkha-slate">
                            mo
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="divide-y divide-sekkha-hairline-soft/60 md:hidden">
              {persons.map((p) => {
                const statusDesign = STATUS_CONFIG[p.status]
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPerson(p)}
                    className="flex w-full cursor-pointer flex-col gap-2.5 p-3.5 text-left transition hover:bg-sekkha-surface/50"
                  >
                    {/* Row 1: Avatar + Name + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="text-micro flex size-9 shrink-0 items-center justify-center rounded-xl bg-sekkha-brand-blue/10 font-bold text-sekkha-brand-blue">
                          {p.avatarInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-caption-bold truncate font-bold text-sekkha-ink">
                            {p.name}
                          </p>
                          <p className="text-micro text-sekkha-slate capitalize">
                            {p.role} ·{" "}
                            {DIVISI_OPTIONS.find((d) => d.id === p.divisi)
                              ?.label || p.divisi}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-micro inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-bold ${statusDesign.badgeBg}`}
                      >
                        <span
                          className={`size-1.5 rounded-full ${statusDesign.dotColor}`}
                        />
                        {statusDesign.label}
                      </span>
                    </div>

                    {/* Row 2: 4 Core Scores */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-micro text-sekkha-slate">Init</p>
                        <p className="text-caption-bold font-extrabold text-sekkha-ink">
                          {p.initiativeScore}
                        </p>
                        <TrendBadge value={p.initiativeTrend} />
                      </div>
                      <div>
                        <p className="text-micro text-sekkha-slate">Exec</p>
                        <p className="text-caption-bold font-extrabold text-sekkha-ink">
                          {p.executionScore}
                        </p>
                        <TrendBadge value={p.executionTrend} />
                      </div>
                      <div>
                        <p className="text-micro text-sekkha-slate">Effect</p>
                        <p className="text-caption-bold font-extrabold text-sekkha-ink">
                          {p.effectivenessPercent}%
                        </p>
                        <TrendBadge value={p.effectivenessTrend} suffix="%" />
                      </div>
                      <div>
                        <p className="text-micro text-sekkha-slate">Presence</p>
                        <p className="text-caption-bold font-extrabold text-sekkha-ink">
                          {p.presencePercent}%
                        </p>
                        <TrendBadge value={p.presenceTrend} suffix="%" />
                      </div>
                    </div>

                    {/* Row 3: Invite Points (aktivis only) + Consistency */}
                    <div className="text-micro flex items-center justify-between">
                      {p.role === "aktivis" ? (
                        <span className="inline-flex items-center gap-1 font-bold text-violet-700">
                          <UserPlusIcon className="size-3" />
                          {p.invitedCount} Members brought in
                          <TrendBadge value={p.invitedTrend} />
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="font-bold text-sekkha-slate">
                        {p.activeMonths}/{p.totalMonths} months active
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      {selectedPerson && (
        <PersonDetailDrawer
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  )
}
