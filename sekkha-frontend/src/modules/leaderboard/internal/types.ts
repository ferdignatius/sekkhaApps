// feature/leaderboard/types.ts
// Season-based leaderboard — each season = 6 months.
// Season 1: Jan–Jun, Season 2: Jul–Dec

export type LeaderboardMetric = "points" | "streak" | "attendance"

export interface Season {
  year: number
  half: 1 | 2  // 1 = Jan–Jun, 2 = Jul–Dec
}

export interface LeaderboardEntry {
  rank: number
  user_id: string
  name: string
  initials: string
  photo_url?: string | null
  value: number
  label: string
  role?: "umat" | "pengurus" | "admin" | "aktivis" | string
}

export interface LeaderboardResponse {
  season: Season
  metric: LeaderboardMetric
  entries: LeaderboardEntry[]
  my_rank: MyRank
}

export interface MyRank {
  rank: number
  value: number
  label: string
  is_in_top: boolean
}

export interface LeaderboardFilter {
  season: Season
  metric: LeaderboardMetric
}

// ─── Season helpers ───────────────────────────────────────────────────────────

export function getCurrentSeason(): Season {
  const now = new Date()
  return {
    year: now.getFullYear(),
    half: now.getMonth() < 6 ? 1 : 2,
  }
}

export function seasonLabel(s: Season): string {
  const range = s.half === 1 ? "Jan – Jun" : "Jul – Des"
  return `Season ${s.half} · ${range} ${s.year}`
}

export function prevSeason(s: Season): Season {
  if (s.half === 1) return { year: s.year - 1, half: 2 }
  return { year: s.year, half: 1 }
}

export function nextSeason(s: Season): Season | null {
  const current = getCurrentSeason()
  const next: Season = s.half === 2
    ? { year: s.year + 1, half: 1 }
    : { year: s.year, half: 2 }
  // Can't go beyond current season
  if (next.year > current.year) return null
  if (next.year === current.year && next.half > current.half) return null
  return next
}
