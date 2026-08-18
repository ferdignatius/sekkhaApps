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
  type ContributionResponse,
  type ContributionRoleFilter,
  type ContributionPeriod,
  type ContributionPerson,
} from "../api/contributionApi"

// ─── Trend Indicator Helper ────────────────────────────────────────────

function TrendBadge({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-micro font-bold text-emerald-600">
        <TrendingUpIcon className="size-3" />
        +{value}{suffix}
      </span>
    )
  }
  if (value < 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-micro font-bold text-rose-600">
        <TrendingDownIcon className="size-3" />
        {value}{suffix}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-micro font-bold text-sekkha-slate">
      <MinusIcon className="size-3" />
      0{suffix}
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div className="relative z-10 w-full sm:max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white border border-sekkha-hairline-soft shadow-2xl animate-slideUp">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-sekkha-hairline-soft bg-white/95 backdrop-blur-sm px-5 py-4 rounded-t-3xl sm:rounded-t-3xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-extrabold text-caption shrink-0">
              {person.avatarInitials}
            </div>
            <div className="min-w-0">
              <h3 className="text-body-sm-medium font-bold text-sekkha-ink truncate">{person.name}</h3>
              <div className="flex items-center gap-2 text-micro text-sekkha-slate">
                <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-bold ${statusDesign.badgeBg}`}>
                  <span className={`size-1.5 rounded-full ${statusDesign.dotColor}`} />
                  {statusDesign.label}
                </span>
                <span className="capitalize">{person.role}</span>
                <span>·</span>
                <span>{DIVISI_OPTIONS.find((d) => d.id === person.divisi)?.label || person.divisi}</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-xl bg-sekkha-surface text-sekkha-slate hover:bg-sekkha-hairline-soft transition cursor-pointer"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">
          {/* 4 Core Scores Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-micro text-sekkha-slate">
                <ZapIcon className="size-3.5 text-amber-500" />
                <span className="font-bold">Initiative</span>
              </div>
              <p className="text-heading-5 font-extrabold text-sekkha-ink">{person.initiativeScore}</p>
              <TrendBadge value={person.initiativeTrend} />
              <p className="text-micro text-sekkha-slate">Event dibuat</p>
            </div>

            <div className="rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-micro text-sekkha-slate">
                <ClipboardListIcon className="size-3.5 text-blue-500" />
                <span className="font-bold">Execution</span>
              </div>
              <p className="text-heading-5 font-extrabold text-sekkha-ink">{person.executionScore}</p>
              <TrendBadge value={person.executionTrend} />
              <p className="text-micro text-sekkha-slate">Event ditangani</p>
            </div>

            <div className="rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-micro text-sekkha-slate">
                <TargetIcon className="size-3.5 text-emerald-500" />
                <span className="font-bold">Effectiveness</span>
              </div>
              <p className="text-heading-5 font-extrabold text-sekkha-ink">{person.effectivenessPercent}%</p>
              <TrendBadge value={person.effectivenessTrend} suffix="%" />
              <p className="text-micro text-sekkha-slate">Avg kehadiran Umat</p>
            </div>

            <div className="rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-micro text-sekkha-slate">
                <UserCheckIcon className="size-3.5 text-violet-500" />
                <span className="font-bold">Presence</span>
              </div>
              <p className="text-heading-5 font-extrabold text-sekkha-ink">{person.presencePercent}%</p>
              <TrendBadge value={person.presenceTrend} suffix="%" />
              <p className="text-micro text-sekkha-slate">Kehadiran pribadi</p>
            </div>
          </div>

          {/* Aktivis: Invite Points */}
          {person.role === "aktivis" && (
            <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-caption-bold font-bold text-violet-700">
                  <UserPlusIcon className="size-4" />
                  <span>Umat yang Berhasil Diajak</span>
                </div>
                <TrendBadge value={person.invitedTrend} />
              </div>
              <p className="text-heading-4 font-extrabold text-violet-700">{person.invitedCount} <span className="text-caption font-normal text-violet-600">Orang</span></p>
            </div>
          )}

          {/* Consistency */}
          <div className="rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4 space-y-2">
            <h4 className="text-caption-bold font-bold text-sekkha-ink flex items-center gap-2">
              <CalendarIcon className="size-4 text-sekkha-brand-blue" />
              Konsistensi
            </h4>
            <div className="flex items-center justify-between text-micro">
              <span className="text-sekkha-slate">Bulan aktif dalam periode</span>
              <span className="font-extrabold text-sekkha-ink">{person.activeMonths} / {person.totalMonths} Bulan</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-sekkha-surface overflow-hidden border border-sekkha-hairline-soft">
              <div
                style={{ width: `${(person.activeMonths / person.totalMonths) * 100}%` }}
                className="h-full rounded-full bg-sekkha-brand-blue transition-all duration-500"
              />
            </div>
          </div>

          {/* Role Breakdown */}
          <div className="rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4 space-y-3">
            <h4 className="text-caption-bold font-bold text-sekkha-ink flex items-center gap-2">
              <ClipboardListIcon className="size-4 text-sekkha-brand-blue" />
              Distribusi Peran dalam Event
            </h4>
            <div className="space-y-2">
              {person.roleBreakdown.map((rb) => (
                <div key={rb.role} className="flex items-center justify-between text-micro">
                  <span className="text-sekkha-slate">{rb.role}</span>
                  <span className="font-extrabold text-sekkha-ink rounded-md bg-sekkha-surface border border-sekkha-hairline-soft px-2 py-0.5">
                    {rb.count}x
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Description */}
          <div className={`rounded-2xl border p-4 ${statusDesign.badgeBg}`}>
            <p className="text-caption font-bold">{statusDesign.label}: {statusDesign.description}</p>
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
  const [selectedPerson, setSelectedPerson] = useState<ContributionPerson | null>(null)

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
      const res = await fetchContributions({ period, roleFilter, divisiFilter, searchQuery })
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
          <p className="text-body-sm font-semibold">Menghitung kontribusi Pengurus & Aktivis...</p>
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
      <div className="flex flex-col gap-3 rounded-2xl sm:rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5 sm:p-5 shadow-xs">
        {/* Top Row: Period + Divisi + Search */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-sekkha-hairline-soft bg-sekkha-surface px-3 py-2 text-caption-bold font-bold text-sekkha-ink shadow-2xs w-full sm:w-auto">
            <CalendarIcon className="size-4 text-sekkha-brand-blue shrink-0" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as ContributionPeriod)}
              className="w-full bg-transparent font-bold text-sekkha-ink outline-none cursor-pointer text-caption sm:text-caption-bold"
            >
              {CONTRIBUTION_PERIODS.map((p) => (
                <option key={p} value={p}>Periode: {p}</option>
              ))}
            </select>
          </div>

          {/* Divisi Dropdown */}
          <div className="relative w-full sm:w-auto" ref={divisiRef}>
            <button
              type="button"
              onClick={() => setIsDivisiOpen(!isDivisiOpen)}
              className={`flex w-full sm:w-auto items-center justify-between sm:justify-start gap-2 rounded-xl px-3.5 py-2 text-caption-bold transition cursor-pointer shadow-2xs ${
                divisiFilter !== "all"
                  ? "border border-amber-500/40 bg-amber-500/10 text-amber-700 font-bold"
                  : "border border-sekkha-hairline-soft bg-sekkha-surface text-sekkha-ink hover:bg-sekkha-hairline-soft"
              }`}
            >
              <span className="truncate">
                {DIVISI_OPTIONS.find((d) => d.id === divisiFilter)?.label || "Semua Divisi"}
              </span>
              <ChevronDownIcon className="size-4 opacity-70 shrink-0" />
            </button>
            {isDivisiOpen && (
              <div className="absolute left-0 right-0 sm:right-auto top-full mt-2 w-full sm:w-64 rounded-2xl border border-sekkha-hairline-soft bg-white p-2.5 shadow-xl z-30 space-y-1 animate-fadeIn">
                {DIVISI_OPTIONS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => { setDivisiFilter(d.id); setIsDivisiOpen(false) }}
                    className={`w-full text-left rounded-xl px-3 py-2 text-caption-bold transition cursor-pointer ${
                      divisiFilter === d.id
                        ? "bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-bold"
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
            <SearchIcon className="size-4 text-sekkha-slate shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama..."
              className="w-full bg-transparent text-caption text-sekkha-ink outline-none placeholder:text-sekkha-muted"
            />
            {searchQuery && (
              <button type="button" onClick={() => setSearchQuery("")} className="text-sekkha-slate hover:text-sekkha-ink cursor-pointer">
                <XIcon className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Bottom Row: Role Segment Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <span className="text-micro font-extrabold uppercase tracking-wider text-sekkha-slate mr-1 shrink-0">Role:</span>
          {[
            { id: "all" as const, label: `Semua (${summary.totalPengurus + summary.totalAktivis})` },
            { id: "pengurus" as const, label: `Pengurus (${summary.totalPengurus})` },
            { id: "aktivis" as const, label: `Aktivis (${summary.totalAktivis})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setRoleFilter(tab.id)}
              className={`rounded-lg px-2.5 py-1 text-micro-bold font-bold transition cursor-pointer shrink-0 ${
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Pengurus + Aktivis Total */}
        <div className="rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-micro sm:text-caption text-sekkha-slate font-medium">Total Anggota</p>
              <h3 className="mt-0.5 text-heading-5 sm:text-heading-4 font-extrabold text-sekkha-ink">
                {summary.totalPengurus + summary.totalAktivis}
              </h3>
            </div>
            <span className="flex size-8 sm:size-9 items-center justify-center rounded-xl bg-blue-500/10 text-sekkha-brand-blue shrink-0">
              <UsersIcon className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-micro text-sekkha-slate">{summary.totalPengurus} Pengurus · {summary.totalAktivis} Aktivis</p>
        </div>

        {/* Reliable Candidates */}
        <div className="rounded-2xl border border-sekkha-hairline-soft bg-sekkha-canvas p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-micro sm:text-caption text-sekkha-slate font-medium">Reliable</p>
              <h3 className="mt-0.5 text-heading-5 sm:text-heading-4 font-extrabold text-emerald-700">
                {summary.reliableCandidates}
              </h3>
            </div>
            <span className="flex size-8 sm:size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shrink-0">
              <ShieldCheckIcon className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-micro text-sekkha-slate">Kandidat regenerasi kuat</p>
        </div>

        {/* Overloaded Risk */}
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-micro sm:text-caption text-rose-700 font-semibold">Overloaded</p>
              <h3 className="mt-0.5 text-heading-5 sm:text-heading-4 font-extrabold text-rose-700">
                {summary.overloadedRisk}
              </h3>
            </div>
            <span className="flex size-8 sm:size-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-600 shrink-0">
              <AlertTriangleIcon className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-micro text-rose-700/70">Risiko burnout, perlu bagi tugas</p>
        </div>

        {/* Umat Diajak by Aktivis */}
        <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-3.5 sm:p-4 shadow-xs">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-micro sm:text-caption text-violet-700 font-semibold">Umat Diajak</p>
              <h3 className="mt-0.5 text-heading-5 sm:text-heading-4 font-extrabold text-violet-700">
                {summary.totalInvitedByAktivis}
              </h3>
            </div>
            <span className="flex size-8 sm:size-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-600 shrink-0">
              <UserPlusIcon className="size-4" />
            </span>
          </div>
          <p className="mt-2 text-micro text-violet-700/70">Total Invite Points Aktivis</p>
        </div>
      </div>

      {/* ── Highlight Banners ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* Kandidat Regenerasi Kuat */}
        {reliablePersons.length > 0 && (
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-sekkha-canvas p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0">
                <ShieldCheckIcon className="size-4" />
              </span>
              <h3 className="text-caption-bold font-bold text-sekkha-ink">Kandidat Regenerasi Kuat</h3>
            </div>
            <div className="space-y-2">
              {reliablePersons.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPerson(p)}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-white/60 border border-emerald-500/10 px-3 py-2 text-left hover:bg-emerald-500/5 transition cursor-pointer"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 font-bold text-micro shrink-0">
                    {p.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption-bold font-bold text-sekkha-ink truncate">{p.name}</p>
                    <p className="text-micro text-sekkha-slate capitalize">{p.role} · {p.effectivenessPercent}% efektivitas</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pengurus Overloaded */}
        {overloadedPersons.length > 0 && (
          <div className="rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-sekkha-canvas p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 shrink-0">
                <AlertTriangleIcon className="size-4" />
              </span>
              <h3 className="text-caption-bold font-bold text-sekkha-ink">Pengurus Overloaded</h3>
            </div>
            <div className="space-y-2">
              {overloadedPersons.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPerson(p)}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-white/60 border border-rose-500/10 px-3 py-2 text-left hover:bg-rose-500/5 transition cursor-pointer"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-700 font-bold text-micro shrink-0">
                    {p.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption-bold font-bold text-sekkha-ink truncate">{p.name}</p>
                    <p className="text-micro text-sekkha-slate">{p.executionScore} event ditangani · {p.initiativeScore} event dibuat</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Aktivis Siap Promosi */}
        {promotionPersons.length > 0 && (
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-sekkha-canvas p-4 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 shrink-0">
                <AwardIcon className="size-4" />
              </span>
              <h3 className="text-caption-bold font-bold text-sekkha-ink">Aktivis Siap Promosi</h3>
            </div>
            <div className="space-y-2">
              {promotionPersons.slice(0, 3).map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPerson(p)}
                  className="flex w-full items-center gap-2.5 rounded-xl bg-white/60 border border-violet-500/10 px-3 py-2 text-left hover:bg-violet-500/5 transition cursor-pointer"
                >
                  <div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 font-bold text-micro shrink-0">
                    {p.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-caption-bold font-bold text-sekkha-ink truncate">{p.name}</p>
                    <p className="text-micro text-sekkha-slate">{p.invitedCount} Umat diajak · {p.presencePercent}% hadir</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Contribution Matrix Table ── */}
      <div className="rounded-2xl sm:rounded-3xl border border-sekkha-hairline-soft bg-sekkha-canvas shadow-xs overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-sekkha-hairline-soft bg-sekkha-surface/50">
          <h2 className="text-caption-bold sm:text-body-sm font-bold text-sekkha-ink flex items-center gap-2">
            <ClipboardListIcon className="size-4 text-sekkha-brand-blue" />
            <span>Matrix Evaluasi Kontribusi</span>
            <span className="rounded-lg bg-sekkha-brand-blue/10 px-2 py-0.5 text-micro-bold text-sekkha-brand-blue">{persons.length} orang</span>
          </h2>
        </div>

        {persons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-sekkha-muted space-y-2">
            <SearchIcon className="size-8 text-sekkha-hairline-soft" />
            <p className="text-body-sm font-semibold">Tidak ada data yang cocok</p>
            <p className="text-caption text-sekkha-slate">Coba ubah filter atau kata kunci pencarian.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-sekkha-hairline-soft bg-sekkha-surface/30 text-micro font-extrabold uppercase tracking-wider text-sekkha-slate">
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-center">Initiative</th>
                    <th className="px-3 py-3 text-center">Execution</th>
                    <th className="px-3 py-3 text-center">Effectiveness</th>
                    <th className="px-3 py-3 text-center">Presence</th>
                    {(roleFilter === "all" || roleFilter === "aktivis") && (
                      <th className="px-3 py-3 text-center">Invite Points</th>
                    )}
                    <th className="px-3 py-3 text-center">Konsistensi</th>
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p) => {
                    const statusDesign = STATUS_CONFIG[p.status]
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPerson(p)}
                        className="border-b border-sekkha-hairline-soft/60 hover:bg-sekkha-surface/50 transition cursor-pointer"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex size-8 items-center justify-center rounded-lg bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-bold text-micro shrink-0">
                              {p.avatarInitials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-caption-bold font-bold text-sekkha-ink truncate">{p.name}</p>
                              <p className="text-micro text-sekkha-slate capitalize">{p.role} · {DIVISI_OPTIONS.find((d) => d.id === p.divisi)?.label || p.divisi}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-micro font-bold ${statusDesign.badgeBg}`}>
                            <span className={`size-1.5 rounded-full ${statusDesign.dotColor}`} />
                            {statusDesign.label}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <p className="text-caption-bold font-extrabold text-sekkha-ink">{p.initiativeScore}</p>
                          <TrendBadge value={p.initiativeTrend} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <p className="text-caption-bold font-extrabold text-sekkha-ink">{p.executionScore}</p>
                          <TrendBadge value={p.executionTrend} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <p className="text-caption-bold font-extrabold text-sekkha-ink">{p.effectivenessPercent}%</p>
                          <TrendBadge value={p.effectivenessTrend} suffix="%" />
                        </td>
                        <td className="px-3 py-3 text-center">
                          <p className="text-caption-bold font-extrabold text-sekkha-ink">{p.presencePercent}%</p>
                          <TrendBadge value={p.presenceTrend} suffix="%" />
                        </td>
                        {(roleFilter === "all" || roleFilter === "aktivis") && (
                          <td className="px-3 py-3 text-center">
                            {p.role === "aktivis" ? (
                              <>
                                <p className="text-caption-bold font-extrabold text-violet-700">{p.invitedCount}</p>
                                <TrendBadge value={p.invitedTrend} />
                              </>
                            ) : (
                              <span className="text-micro text-sekkha-muted">—</span>
                            )}
                          </td>
                        )}
                        <td className="px-3 py-3 text-center">
                          <span className="text-caption-bold font-extrabold text-sekkha-ink">{p.activeMonths}/{p.totalMonths}</span>
                          <span className="text-micro text-sekkha-slate ml-0.5">bln</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-sekkha-hairline-soft/60">
              {persons.map((p) => {
                const statusDesign = STATUS_CONFIG[p.status]
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPerson(p)}
                    className="flex w-full flex-col gap-2.5 p-3.5 text-left hover:bg-sekkha-surface/50 transition cursor-pointer"
                  >
                    {/* Row 1: Avatar + Name + Status */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex size-9 items-center justify-center rounded-xl bg-sekkha-brand-blue/10 text-sekkha-brand-blue font-bold text-micro shrink-0">
                          {p.avatarInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-caption-bold font-bold text-sekkha-ink truncate">{p.name}</p>
                          <p className="text-micro text-sekkha-slate capitalize">{p.role} · {DIVISI_OPTIONS.find((d) => d.id === p.divisi)?.label || p.divisi}</p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-micro font-bold shrink-0 ${statusDesign.badgeBg}`}>
                        <span className={`size-1.5 rounded-full ${statusDesign.dotColor}`} />
                        {statusDesign.label}
                      </span>
                    </div>

                    {/* Row 2: 4 Core Scores */}
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div>
                        <p className="text-micro text-sekkha-slate">Init</p>
                        <p className="text-caption-bold font-extrabold text-sekkha-ink">{p.initiativeScore}</p>
                        <TrendBadge value={p.initiativeTrend} />
                      </div>
                      <div>
                        <p className="text-micro text-sekkha-slate">Exec</p>
                        <p className="text-caption-bold font-extrabold text-sekkha-ink">{p.executionScore}</p>
                        <TrendBadge value={p.executionTrend} />
                      </div>
                      <div>
                        <p className="text-micro text-sekkha-slate">Efek</p>
                        <p className="text-caption-bold font-extrabold text-sekkha-ink">{p.effectivenessPercent}%</p>
                        <TrendBadge value={p.effectivenessTrend} suffix="%" />
                      </div>
                      <div>
                        <p className="text-micro text-sekkha-slate">Hadir</p>
                        <p className="text-caption-bold font-extrabold text-sekkha-ink">{p.presencePercent}%</p>
                        <TrendBadge value={p.presenceTrend} suffix="%" />
                      </div>
                    </div>

                    {/* Row 3: Invite Points (aktivis only) + Consistency */}
                    <div className="flex items-center justify-between text-micro">
                      {p.role === "aktivis" ? (
                        <span className="inline-flex items-center gap-1 font-bold text-violet-700">
                          <UserPlusIcon className="size-3" />
                          {p.invitedCount} Umat diajak
                          <TrendBadge value={p.invitedTrend} />
                        </span>
                      ) : (
                        <span />
                      )}
                      <span className="text-sekkha-slate font-bold">
                        {p.activeMonths}/{p.totalMonths} bulan aktif
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
