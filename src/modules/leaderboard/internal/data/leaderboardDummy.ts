// Dummy data for season-based leaderboard.
import type { LeaderboardFilter, LeaderboardResponse, LeaderboardMetric } from "../types"

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

function seededRandom(seed: number): () => number {
  let s = seed
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646 }
}

function makeLabel(metric: LeaderboardMetric, value: number): string {
  if (metric === "points") return `${value.toLocaleString("id-ID")} poin`
  if (metric === "streak") return `${value} minggu`
  return `${value} hadir`
}

const MAX_VALUES: Record<LeaderboardMetric, [number, number]> = {
  points:     [80, 600],
  streak:     [1,  16],
  attendance: [1,  24],
}

export function getLeaderboardData(filter: LeaderboardFilter, _myUserId: string): LeaderboardResponse {
  const seed = filter.season.year * 100 + filter.season.half * 10 + filter.metric.length
  const rng = seededRandom(seed)
  const [minVal, maxVal] = MAX_VALUES[filter.metric]

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

  const MY_VALUE = Math.round(minVal + seededRandom(seed + 999)() * (maxVal - minVal))
  const myRankPos = entries.filter(e => e.value > MY_VALUE).length + 1

  return {
    season: filter.season,
    metric: filter.metric,
    entries,
    my_rank: {
      rank: myRankPos,
      value: MY_VALUE,
      label: makeLabel(filter.metric, MY_VALUE),
      is_in_top: myRankPos <= entries.length,
    },
  }
}
