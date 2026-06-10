// feature/leaderboard/types.ts
// Types matching GET /leaderboard API contract.

export type LeaderboardPeriod = "monthly" | "yearly"
export type LeaderboardMetric = "points" | "streak" | "attendance"

export interface LeaderboardEntry {
  rank: number
  user_id: string
  name: string
  initials: string
  photo_url?: string | null
  value: number
  label: string         // e.g. "530 poin", "8 minggu", "24 hadir"
}

export interface LeaderboardResponse {
  period: LeaderboardPeriod
  metric: LeaderboardMetric
  year: number
  month?: number        // only present for monthly
  entries: LeaderboardEntry[]
  my_rank: MyRank
}

export interface MyRank {
  rank: number
  value: number
  label: string
  is_in_top: boolean    // true if already visible in entries list
}

export interface LeaderboardFilter {
  period: LeaderboardPeriod
  metric: LeaderboardMetric
  year: number
  month: number         // 1–12, ignored for yearly
}
