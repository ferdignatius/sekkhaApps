// Dummy data for leaderboard — replace with API calls later.
// Simulates GET /leaderboard?period=monthly&year=2025&month=7&metric=points etc.
import type { LeaderboardFilter, LeaderboardResponse } from "../types"

// ─── Static pool of fake users ────────────────────────────────────────────────

const USERS = [
  { user_id: "u1",  name: "Budi Santoso",   initials: "BS" },
  { user_id: "u2",  name: "Rina Kartika",   initials: "RK" },
  { user_id: "u3",  name: "Aryo Wibowo",    initials: "AW" },
  { user_id: "u4",  name: "Sari Indah",     initials: "SI" },
  { user_id: "u5",  name: "Dedi Pratama",   initials: "DP" },
  { user_id: "u6",  name: "Maya Putri",     initials: "MP" },
  { user_id: "u7",  name: "Hendra Kurnia",  initials: "HK" },
  { user_id: "u8",  name: "Lina Susanti",   initials: "LS" },
  { user_id: "u9",  name: "Fajar Ramadan",  initials: "FR" },
  { user_id: "u10", name: "Nita Rahayu",    initials: "NR" },
]

// ─── Seed function — deterministic based on filter ───────────────────────────

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

function makeLabel(metric: LeaderboardMetric, value: number): string {
  if (metric === "points")     return `${value} poin`
  if (metric === "streak")     return `${value} minggu`
  return `${value} hadir`
}

type LeaderboardMetric = "points" | "streak" | "attendance"

const MAX_VALUES: Record<LeaderboardMetric, [number, number]> = {
  points:     [80, 600],
  streak:     [1,  16],
  attendance: [1,  20],
}

export function getLeaderboardData(
  filter: LeaderboardFilter,
  myUserId: string,
): LeaderboardResponse {
  const seed = filter.year * 10000 + (filter.period === "monthly" ? filter.month : 0) + filter.metric.length
  const rng = seededRandom(seed)

  const [minVal, maxVal] = MAX_VALUES[filter.metric]

  // Build scores for all users
  const scores = USERS.map(u => ({
    ...u,
    value: Math.round(minVal + rng() * (maxVal - minVal)),
  })).sort((a, b) => b.value - a.value)

  const entries = scores.map((u, i) => ({
    rank: i + 1,
    user_id: u.user_id,
    name: u.name,
    initials: u.initials,
    photo_url: null,
    value: u.value,
    label: makeLabel(filter.metric, u.value),
  }))

  // My rank (admin-user-1 = rank based on seed, always included)
  const MY_VALUE = Math.round(minVal + seededRandom(seed + 999)() * (maxVal - minVal))
  const myRankPos = entries.filter(e => e.value > MY_VALUE).length + 1
  const isInTop = myRankPos <= entries.length

  return {
    period: filter.period,
    metric: filter.metric,
    year: filter.year,
    month: filter.period === "monthly" ? filter.month : undefined,
    entries,
    my_rank: {
      rank: myRankPos,
      value: MY_VALUE,
      label: makeLabel(filter.metric, MY_VALUE),
      is_in_top: isInTop,
    },
  }
}
