// modules/pengurus/internal/api/contributionApi.ts
// Mock API & Data definitions for Pengurus & Aktivis Contribution Tracker

export type ContributionRoleFilter = "all" | "pengurus" | "aktivis"
export type ContributionPeriod = "Q3 2026" | "Q2 2026" | "Q1 2026" | "Q4 2025"
export type ContributionStatusBadge =
  | "reliable"        // Kandidat Regenerasi Kuat
  | "overloaded"      // Risiko Burnout
  | "promotion_ready" // Aktivis Siap Promosi Pengurus
  | "consistent"      // Normal & Konsisten
  | "growing"         // Baru Bertumbuh
  | "passive"         // Kurang Aktif

interface StatusDesign {
  label: string
  badgeBg: string
  dotColor: string
  description: string
}

export const STATUS_CONFIG: Record<ContributionStatusBadge, StatusDesign> = {
  reliable: {
    label: "Reliable",
    badgeBg: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
    dotColor: "bg-emerald-500",
    description: "Consistent & effective, strong leadership successor",
  },
  overloaded: {
    label: "Overloaded",
    badgeBg: "bg-rose-500/10 text-rose-700 border-rose-500/20",
    dotColor: "bg-rose-500",
    description: "Event workload far above average, burnout risk",
  },
  promotion_ready: {
    label: "Promotion Ready",
    badgeBg: "bg-violet-500/10 text-violet-700 border-violet-500/20",
    dotColor: "bg-violet-500",
    description: "High-achieving activist, ready for organizer role",
  },
  consistent: {
    label: "Consistent",
    badgeBg: "bg-blue-500/10 text-blue-700 border-blue-500/20",
    dotColor: "bg-blue-500",
    description: "Stable and regular contribution",
  },
  growing: {
    label: "Growing",
    badgeBg: "bg-amber-500/10 text-amber-700 border-amber-500/20",
    dotColor: "bg-amber-500",
    description: "Newly active, showing high potential",
  },
  passive: {
    label: "Passive",
    badgeBg: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    dotColor: "bg-gray-400",
    description: "Minimal contribution, requires follow-up",
  },
}

export const CONTRIBUTION_PERIODS: ContributionPeriod[] = [
  "Q3 2026",
  "Q2 2026",
  "Q1 2026",
  "Q4 2025",
]

export const DIVISI_OPTIONS = [
  { id: "all", label: "All Divisions" },
  { id: "acara", label: "Events Division" },
  { id: "logistik", label: "Logistics Division" },
  { id: "humas", label: "Public Relations Division" },
  { id: "pendidikan", label: "Dhamma Education Division" },
  { id: "pemuda", label: "Youth Division" },
]

export interface ContributionPerson {
  id: string
  name: string
  role: "pengurus" | "aktivis"
  divisi: string
  avatarInitials: string
  status: ContributionStatusBadge

  // 4 Core Objective Scores
  initiativeScore: number     // Events created/organized
  executionScore: number      // Events handled as PJ/MC/Dokumentasi
  effectivenessPercent: number // Avg attendance rate of events handled (%)
  presencePercent: number     // Personal attendance rate as member (%)

  // Trends vs previous period
  initiativeTrend: number    // +/- change
  executionTrend: number
  effectivenessTrend: number
  presenceTrend: number

  // Aktivis-specific
  invitedCount: number       // Invite points (number of Umat invited)
  invitedTrend: number       // +/- change

  // Consistency
  activeMonths: number       // Months active within period (out of 3 for quarterly)
  totalMonths: number        // Total months in period

  // Event role breakdown
  roleBreakdown: { role: string; count: number }[]
}

export interface ContributionSummary {
  totalPengurus: number
  totalAktivis: number
  reliableCandidates: number
  overloadedRisk: number
  promotionReady: number
  avgTeamPresence: number
  totalInvitedByAktivis: number
}

export interface ContributionResponse {
  period: ContributionPeriod
  summary: ContributionSummary
  persons: ContributionPerson[]
}

// ─── Mock Data Generator ───────────────────────────────────────────────

const PENGURUS_DATA: Omit<ContributionPerson, "status">[] = [
  {
    id: "p1", name: "Budi Hartono", role: "pengurus", divisi: "acara",
    avatarInitials: "BH",
    initiativeScore: 14, executionScore: 18, effectivenessPercent: 87.2, presencePercent: 96.0,
    initiativeTrend: 3, executionTrend: 4, effectivenessTrend: 2.1, presenceTrend: 0.5,
    invitedCount: 0, invitedTrend: 0,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Penanggung Jawab", count: 10 }, { role: "MC", count: 5 }, { role: "Dokumentasi", count: 3 }],
  },
  {
    id: "p2", name: "Siti Rahayu", role: "pengurus", divisi: "pendidikan",
    avatarInitials: "SR",
    initiativeScore: 11, executionScore: 14, effectivenessPercent: 92.8, presencePercent: 98.5,
    initiativeTrend: 2, executionTrend: 1, effectivenessTrend: 3.4, presenceTrend: 1.0,
    invitedCount: 0, invitedTrend: 0,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Penanggung Jawab", count: 8 }, { role: "Pengajar Dhamma", count: 6 }],
  },
  {
    id: "p3", name: "Agus Wijaya", role: "pengurus", divisi: "logistik",
    avatarInitials: "AW",
    initiativeScore: 22, executionScore: 26, effectivenessPercent: 78.4, presencePercent: 94.0,
    initiativeTrend: 6, executionTrend: 8, effectivenessTrend: -1.2, presenceTrend: -2.0,
    invitedCount: 0, invitedTrend: 0,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Penanggung Jawab", count: 15 }, { role: "Logistik", count: 8 }, { role: "MC", count: 3 }],
  },
  {
    id: "p4", name: "Dewi Kartika", role: "pengurus", divisi: "humas",
    avatarInitials: "DK",
    initiativeScore: 9, executionScore: 12, effectivenessPercent: 91.5, presencePercent: 97.0,
    initiativeTrend: 1, executionTrend: 2, effectivenessTrend: 1.8, presenceTrend: 0.0,
    invitedCount: 0, invitedTrend: 0,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Humas", count: 6 }, { role: "Dokumentasi", count: 4 }, { role: "MC", count: 2 }],
  },
  {
    id: "p5", name: "Eko Prasetyo", role: "pengurus", divisi: "acara",
    avatarInitials: "EP",
    initiativeScore: 7, executionScore: 10, effectivenessPercent: 85.6, presencePercent: 92.0,
    initiativeTrend: 0, executionTrend: -1, effectivenessTrend: -0.5, presenceTrend: -3.0,
    invitedCount: 0, invitedTrend: 0,
    activeMonths: 2, totalMonths: 3,
    roleBreakdown: [{ role: "Penanggung Jawab", count: 5 }, { role: "Among", count: 3 }, { role: "MC", count: 2 }],
  },
  {
    id: "p6", name: "Fitri Handayani", role: "pengurus", divisi: "pemuda",
    avatarInitials: "FH",
    initiativeScore: 6, executionScore: 8, effectivenessPercent: 89.0, presencePercent: 95.5,
    initiativeTrend: 1, executionTrend: 2, effectivenessTrend: 4.2, presenceTrend: 1.5,
    invitedCount: 0, invitedTrend: 0,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Penanggung Jawab", count: 4 }, { role: "Pendamping Pemuda", count: 4 }],
  },
  {
    id: "p7", name: "Gunawan Salim", role: "pengurus", divisi: "logistik",
    avatarInitials: "GS",
    initiativeScore: 4, executionScore: 5, effectivenessPercent: 82.0, presencePercent: 88.0,
    initiativeTrend: -2, executionTrend: -3, effectivenessTrend: -4.0, presenceTrend: -5.0,
    invitedCount: 0, invitedTrend: 0,
    activeMonths: 1, totalMonths: 3,
    roleBreakdown: [{ role: "Logistik", count: 3 }, { role: "Among", count: 2 }],
  },
  {
    id: "p8", name: "Hendra Kusuma", role: "pengurus", divisi: "acara",
    avatarInitials: "HK",
    initiativeScore: 8, executionScore: 11, effectivenessPercent: 90.2, presencePercent: 96.5,
    initiativeTrend: 2, executionTrend: 3, effectivenessTrend: 2.0, presenceTrend: 0.5,
    invitedCount: 0, invitedTrend: 0,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Penanggung Jawab", count: 6 }, { role: "MC", count: 3 }, { role: "Dokumentasi", count: 2 }],
  },
  {
    id: "p9", name: "Indah Permata", role: "pengurus", divisi: "pendidikan",
    avatarInitials: "IP",
    initiativeScore: 10, executionScore: 13, effectivenessPercent: 88.5, presencePercent: 93.0,
    initiativeTrend: 1, executionTrend: 0, effectivenessTrend: 1.5, presenceTrend: -1.0,
    invitedCount: 0, invitedTrend: 0,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Pengajar Dhamma", count: 7 }, { role: "Penanggung Jawab", count: 4 }, { role: "Among", count: 2 }],
  },
  {
    id: "p10", name: "Joko Santoso", role: "pengurus", divisi: "humas",
    avatarInitials: "JS",
    initiativeScore: 5, executionScore: 7, effectivenessPercent: 84.0, presencePercent: 90.0,
    initiativeTrend: 0, executionTrend: 1, effectivenessTrend: 0.5, presenceTrend: -2.0,
    invitedCount: 0, invitedTrend: 0,
    activeMonths: 2, totalMonths: 3,
    roleBreakdown: [{ role: "Humas", count: 4 }, { role: "Dokumentasi", count: 3 }],
  },
  {
    id: "p11", name: "Kartini Wulandari", role: "pengurus", divisi: "pemuda",
    avatarInitials: "KW",
    initiativeScore: 12, executionScore: 15, effectivenessPercent: 93.5, presencePercent: 99.0,
    initiativeTrend: 4, executionTrend: 5, effectivenessTrend: 3.0, presenceTrend: 1.0,
    invitedCount: 0, invitedTrend: 0,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Penanggung Jawab", count: 8 }, { role: "Pendamping Pemuda", count: 5 }, { role: "MC", count: 2 }],
  },
  {
    id: "p12", name: "Lukman Hakim", role: "pengurus", divisi: "acara",
    avatarInitials: "LH",
    initiativeScore: 3, executionScore: 4, effectivenessPercent: 76.0, presencePercent: 85.0,
    initiativeTrend: -1, executionTrend: -2, effectivenessTrend: -3.0, presenceTrend: -4.0,
    invitedCount: 0, invitedTrend: 0,
    activeMonths: 1, totalMonths: 3,
    roleBreakdown: [{ role: "Penanggung Jawab", count: 2 }, { role: "Among", count: 2 }],
  },
]

const AKTIVIS_DATA: Omit<ContributionPerson, "status">[] = [
  {
    id: "a1", name: "Maya Sari", role: "aktivis", divisi: "pemuda",
    avatarInitials: "MS",
    initiativeScore: 5, executionScore: 8, effectivenessPercent: 88.0, presencePercent: 95.0,
    initiativeTrend: 2, executionTrend: 3, effectivenessTrend: 5.0, presenceTrend: 2.0,
    invitedCount: 24, invitedTrend: 8,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Among", count: 4 }, { role: "Dokumentasi", count: 3 }, { role: "MC", count: 1 }],
  },
  {
    id: "a2", name: "Nadia Putri", role: "aktivis", divisi: "humas",
    avatarInitials: "NP",
    initiativeScore: 3, executionScore: 6, effectivenessPercent: 91.2, presencePercent: 97.0,
    initiativeTrend: 1, executionTrend: 2, effectivenessTrend: 3.2, presenceTrend: 1.5,
    invitedCount: 18, invitedTrend: 5,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Humas", count: 3 }, { role: "Dokumentasi", count: 2 }, { role: "Among", count: 1 }],
  },
  {
    id: "a3", name: "Oscar Tanujaya", role: "aktivis", divisi: "acara",
    avatarInitials: "OT",
    initiativeScore: 4, executionScore: 7, effectivenessPercent: 84.5, presencePercent: 92.0,
    initiativeTrend: 1, executionTrend: 1, effectivenessTrend: 1.0, presenceTrend: 0.0,
    invitedCount: 12, invitedTrend: 3,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Among", count: 4 }, { role: "Logistik", count: 3 }],
  },
  {
    id: "a4", name: "Patricia Lin", role: "aktivis", divisi: "pendidikan",
    avatarInitials: "PL",
    initiativeScore: 2, executionScore: 4, effectivenessPercent: 86.0, presencePercent: 90.0,
    initiativeTrend: 0, executionTrend: 1, effectivenessTrend: 2.5, presenceTrend: -1.0,
    invitedCount: 15, invitedTrend: 4,
    activeMonths: 2, totalMonths: 3,
    roleBreakdown: [{ role: "Among", count: 2 }, { role: "Pendamping Pemuda", count: 2 }],
  },
  {
    id: "a5", name: "Ricky Setiawan", role: "aktivis", divisi: "pemuda",
    avatarInitials: "RS",
    initiativeScore: 6, executionScore: 9, effectivenessPercent: 90.8, presencePercent: 96.5,
    initiativeTrend: 3, executionTrend: 4, effectivenessTrend: 4.5, presenceTrend: 1.0,
    invitedCount: 28, invitedTrend: 10,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "MC", count: 4 }, { role: "Among", count: 3 }, { role: "Dokumentasi", count: 2 }],
  },
  {
    id: "a6", name: "Sarah Angeline", role: "aktivis", divisi: "acara",
    avatarInitials: "SA",
    initiativeScore: 1, executionScore: 3, effectivenessPercent: 79.0, presencePercent: 82.0,
    initiativeTrend: 0, executionTrend: 0, effectivenessTrend: -2.0, presenceTrend: -5.0,
    invitedCount: 4, invitedTrend: -1,
    activeMonths: 1, totalMonths: 3,
    roleBreakdown: [{ role: "Among", count: 2 }, { role: "Logistik", count: 1 }],
  },
  {
    id: "a7", name: "Tommy Halim", role: "aktivis", divisi: "logistik",
    avatarInitials: "TH",
    initiativeScore: 3, executionScore: 5, effectivenessPercent: 83.5, presencePercent: 89.0,
    initiativeTrend: 1, executionTrend: 1, effectivenessTrend: 0.5, presenceTrend: -1.0,
    invitedCount: 9, invitedTrend: 2,
    activeMonths: 2, totalMonths: 3,
    roleBreakdown: [{ role: "Logistik", count: 3 }, { role: "Among", count: 2 }],
  },
  {
    id: "a8", name: "Ulin Nuha", role: "aktivis", divisi: "pendidikan",
    avatarInitials: "UN",
    initiativeScore: 4, executionScore: 6, effectivenessPercent: 87.0, presencePercent: 93.0,
    initiativeTrend: 2, executionTrend: 2, effectivenessTrend: 3.0, presenceTrend: 1.0,
    invitedCount: 16, invitedTrend: 6,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Pendamping Pemuda", count: 3 }, { role: "Among", count: 2 }, { role: "Dokumentasi", count: 1 }],
  },
  {
    id: "a9", name: "Vina Christabel", role: "aktivis", divisi: "humas",
    avatarInitials: "VC",
    initiativeScore: 2, executionScore: 3, effectivenessPercent: 80.0, presencePercent: 86.0,
    initiativeTrend: -1, executionTrend: 0, effectivenessTrend: -1.5, presenceTrend: -3.0,
    invitedCount: 6, invitedTrend: 0,
    activeMonths: 1, totalMonths: 3,
    roleBreakdown: [{ role: "Humas", count: 2 }, { role: "Dokumentasi", count: 1 }],
  },
  {
    id: "a10", name: "Willy Gunawan", role: "aktivis", divisi: "pemuda",
    avatarInitials: "WG",
    initiativeScore: 5, executionScore: 7, effectivenessPercent: 89.5, presencePercent: 94.0,
    initiativeTrend: 2, executionTrend: 3, effectivenessTrend: 2.0, presenceTrend: 0.5,
    invitedCount: 20, invitedTrend: 7,
    activeMonths: 3, totalMonths: 3,
    roleBreakdown: [{ role: "Among", count: 3 }, { role: "MC", count: 2 }, { role: "Dokumentasi", count: 2 }],
  },
]

function deriveStatus(p: Omit<ContributionPerson, "status">): ContributionStatusBadge {
  const avgInit = p.role === "pengurus" ? 8.5 : 3.5
  const avgExec = p.role === "pengurus" ? 11.5 : 5.5

  // Overloaded: initiative & execution significantly above average
  if (p.initiativeScore > avgInit * 1.8 && p.executionScore > avgExec * 1.8) {
    return "overloaded"
  }

  // Aktivis: promotion ready if high invite + high presence + consistent
  if (p.role === "aktivis" && p.invitedCount >= 18 && p.presencePercent >= 93 && p.activeMonths >= 3) {
    return "promotion_ready"
  }

  // Reliable: high consistency + high effectiveness
  if (p.activeMonths >= 3 && p.effectivenessPercent >= 88 && p.presencePercent >= 93) {
    return "reliable"
  }

  // Passive: low months or low presence
  if (p.activeMonths <= 1 || p.presencePercent < 85) {
    return "passive"
  }

  // Growing: decent but not yet consistent
  if (p.activeMonths === 2 || (p.initiativeTrend > 0 && p.executionTrend > 0 && p.effectivenessPercent < 88)) {
    return "growing"
  }

  return "consistent"
}

export interface FetchContributionParams {
  period: ContributionPeriod
  roleFilter: ContributionRoleFilter
  divisiFilter: string
  searchQuery: string
}

export async function fetchContributions(
  params: FetchContributionParams
): Promise<ContributionResponse> {
  await new Promise((res) => setTimeout(res, 200))

  const allRaw = [...PENGURUS_DATA, ...AKTIVIS_DATA]
  const allPersons: ContributionPerson[] = allRaw.map((p) => ({
    ...p,
    status: deriveStatus(p),
  }))

  let filtered = allPersons

  if (params.roleFilter !== "all") {
    filtered = filtered.filter((p) => p.role === params.roleFilter)
  }

  if (params.divisiFilter !== "all") {
    filtered = filtered.filter((p) => p.divisi === params.divisiFilter)
  }

  if (params.searchQuery.trim()) {
    const q = params.searchQuery.toLowerCase()
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(q))
  }

  const pengurusAll = allPersons.filter((p) => p.role === "pengurus")
  const aktivisAll = allPersons.filter((p) => p.role === "aktivis")

  const summary: ContributionSummary = {
    totalPengurus: pengurusAll.length,
    totalAktivis: aktivisAll.length,
    reliableCandidates: allPersons.filter((p) => p.status === "reliable").length,
    overloadedRisk: allPersons.filter((p) => p.status === "overloaded").length,
    promotionReady: allPersons.filter((p) => p.status === "promotion_ready").length,
    avgTeamPresence: Math.round(
      (allPersons.reduce((sum, p) => sum + p.presencePercent, 0) / allPersons.length) * 10
    ) / 10,
    totalInvitedByAktivis: aktivisAll.reduce((sum, p) => sum + p.invitedCount, 0),
  }

  return {
    period: params.period,
    summary,
    persons: filtered,
  }
}
