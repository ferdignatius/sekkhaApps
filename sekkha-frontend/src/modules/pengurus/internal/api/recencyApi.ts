import { api } from "@/lib/api"

export type AlertLevel = "normal" | "mulai_jarang" | "at_risk" | "kemungkinan_hilang" | "churned"

export interface MemberRecency {
  userId: string
  name: string
  email: string
  phone?: string | null
  userNumber?: string | null
  avatarUrl: string | null
  role: string
  createdAt: string
  lastAttendedDate: string | null
  daysSinceLastAttendance: number
  consecutiveMissedEvents: number
  level: AlertLevel
  attendanceCount: number
  recentAttendances: Array<{
    eventId: string
    title: string
    eventDate: string
    scannedAt: string
  }>
}

export interface RecencySummary {
  totalMembers: number
  normalCount: number
  warningCount: number
  atRiskCount: number
  lostCount: number
  totalClosedEvents: number
}

export interface RecencyAlertsResponse {
  summary: RecencySummary
  members: MemberRecency[]
}

export interface MemberDetailResponse {
  member: MemberRecency
  eventTimeline: Array<{
    eventId: string
    title: string
    eventDate: string
    attended: boolean
  }>
}

// ─── DUMMY DATA FOR DEMO ─────────────────────────────────────────────────────

export const DUMMY_MEMBERS: MemberRecency[] = [
  {
    userId: "user-5",
    name: "Andi Wijaya",
    email: "andi.wijaya@gmail.com",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    role: "aktivis",
    createdAt: "2023-05-10T08:00:00.000Z",
    lastAttendedDate: "2026-07-21T09:00:00.000Z",
    daysSinceLastAttendance: 3,
    consecutiveMissedEvents: 0,
    level: "normal",
    attendanceCount: 42,
    recentAttendances: [
      { eventId: "ev-8", title: "Puja Bhakti Mingguan", eventDate: "2026-07-21T09:00:00.000Z", scannedAt: "2026-07-21T08:50:00.000Z" },
      { eventId: "ev-9", title: "Puja Bhakti Mingguan", eventDate: "2026-07-14T09:00:00.000Z", scannedAt: "2026-07-14T08:53:00.000Z" },
      { eventId: "ev-10", title: "Puja Bhakti Mingguan", eventDate: "2026-07-07T09:00:00.000Z", scannedAt: "2026-07-07T08:58:00.000Z" },
    ],
  },
  {
    userId: "user-6",
    name: "Clarissa Tan",
    email: "clarissa.tan@gmail.com",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    role: "umat",
    createdAt: "2024-03-01T08:00:00.000Z",
    lastAttendedDate: "2026-07-19T09:00:00.000Z",
    daysSinceLastAttendance: 5,
    consecutiveMissedEvents: 0,
    level: "normal",
    attendanceCount: 12,
    recentAttendances: [
      { eventId: "ev-11", title: "Meditasi Malam Minggu", eventDate: "2026-07-19T09:00:00.000Z", scannedAt: "2026-07-19T08:55:00.000Z" },
      { eventId: "ev-12", title: "Meditasi Malam Minggu", eventDate: "2026-07-05T09:00:00.000Z", scannedAt: "2026-07-05T08:48:00.000Z" },
    ],
  },
  {
    userId: "user-1",
    name: "Budi Santoso",
    email: "budi.santoso@gmail.com",
    avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80",
    role: "umat",
    createdAt: "2024-01-15T08:00:00.000Z",
    lastAttendedDate: "2026-07-08T09:00:00.000Z",
    daysSinceLastAttendance: 16,
    consecutiveMissedEvents: 2,
    level: "mulai_jarang",
    attendanceCount: 28,
    recentAttendances: [
      { eventId: "ev-1", title: "Puja Bhakti Mingguan", eventDate: "2026-07-08T09:00:00.000Z", scannedAt: "2026-07-08T08:55:00.000Z" },
      { eventId: "ev-2", title: "Puja Bhakti Mingguan", eventDate: "2026-07-01T09:00:00.000Z", scannedAt: "2026-07-01T08:50:00.000Z" },
    ],
  },
  {
    userId: "user-2",
    name: "Hendra Gunawan",
    email: "hendra.gunawan@gmail.com",
    avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    role: "umat",
    createdAt: "2023-11-20T08:00:00.000Z",
    lastAttendedDate: "2026-07-06T09:00:00.000Z",
    daysSinceLastAttendance: 18,
    consecutiveMissedEvents: 2,
    level: "mulai_jarang",
    attendanceCount: 19,
    recentAttendances: [
      { eventId: "ev-3", title: "Puja Bhakti Mingguan", eventDate: "2026-07-06T09:00:00.000Z", scannedAt: "2026-07-06T08:48:00.000Z" },
    ],
  },
  {
    userId: "user-3",
    name: "Siti Rahmawati",
    email: "siti.rahma@yahoo.com",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    role: "aktivis",
    createdAt: "2023-08-12T08:00:00.000Z",
    lastAttendedDate: "2026-06-30T09:00:00.000Z",
    daysSinceLastAttendance: 24,
    consecutiveMissedEvents: 3,
    level: "at_risk",
    attendanceCount: 34,
    recentAttendances: [
      { eventId: "ev-4", title: "Puja Bhakti Mingguan", eventDate: "2026-06-30T09:00:00.000Z", scannedAt: "2026-06-30T08:52:00.000Z" },
    ],
  },
  {
    userId: "user-4",
    name: "Veronica Chen",
    email: "v.chen@gmail.com",
    avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    role: "umat",
    createdAt: "2024-02-10T08:00:00.000Z",
    lastAttendedDate: "2026-06-27T09:00:00.000Z",
    daysSinceLastAttendance: 27,
    consecutiveMissedEvents: 3,
    level: "at_risk",
    attendanceCount: 15,
    recentAttendances: [
      { eventId: "ev-5", title: "Puja Bhakti Mingguan", eventDate: "2026-06-27T09:00:00.000Z", scannedAt: "2026-06-27T08:45:00.000Z" },
    ],
  },
  {
    userId: "user-7",
    name: "Eko Prasetyo",
    email: "eko.prasetyo@outlook.com",
    avatarUrl: null,
    role: "umat",
    createdAt: "2023-12-01T08:00:00.000Z",
    lastAttendedDate: "2026-06-16T09:00:00.000Z",
    daysSinceLastAttendance: 38,
    consecutiveMissedEvents: 5,
    level: "kemungkinan_hilang",
    attendanceCount: 8,
    recentAttendances: [
      { eventId: "ev-6", title: "Puja Bhakti Mingguan", eventDate: "2026-06-16T09:00:00.000Z", scannedAt: "2026-06-16T08:58:00.000Z" },
    ],
  },
  {
    userId: "user-8",
    name: "Dewi Lestari",
    email: "dewi.lestari@gmail.com",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    role: "umat",
    createdAt: "2023-06-15T08:00:00.000Z",
    lastAttendedDate: "2026-05-13T09:00:00.000Z",
    daysSinceLastAttendance: 72,
    consecutiveMissedEvents: 8,
    level: "churned",
    attendanceCount: 22,
    recentAttendances: [
      { eventId: "ev-7", title: "Hari Raya Asadha", eventDate: "2026-05-13T09:00:00.000Z", scannedAt: "2026-05-13T08:45:00.000Z" },
    ],
  },
  {
    userId: "user-9",
    name: "Ferry Kurniawan",
    email: "ferry.kurniawan@gmail.com",
    avatarUrl: null,
    role: "umat",
    createdAt: "2024-01-10T08:00:00.000Z",
    lastAttendedDate: "2026-07-20T09:00:00.000Z",
    daysSinceLastAttendance: 4,
    consecutiveMissedEvents: 0,
    level: "normal",
    attendanceCount: 31,
    recentAttendances: [
      { eventId: "ev-13", title: "Puja Bhakti Mingguan", eventDate: "2026-07-20T09:00:00.000Z", scannedAt: "2026-07-20T08:45:00.000Z" },
    ],
  },
  {
    userId: "user-10",
    name: "Grace Susanto",
    email: "grace.susanto@gmail.com",
    avatarUrl: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
    role: "aktivis",
    createdAt: "2023-04-12T08:00:00.000Z",
    lastAttendedDate: "2026-07-09T09:00:00.000Z",
    daysSinceLastAttendance: 15,
    consecutiveMissedEvents: 2,
    level: "mulai_jarang",
    attendanceCount: 50,
    recentAttendances: [],
  },
  {
    userId: "user-11",
    name: "Hansen Pratama",
    email: "hansen.p@gmail.com",
    avatarUrl: null,
    role: "umat",
    createdAt: "2024-02-01T08:00:00.000Z",
    lastAttendedDate: "2026-06-29T09:00:00.000Z",
    daysSinceLastAttendance: 25,
    consecutiveMissedEvents: 3,
    level: "at_risk",
    attendanceCount: 14,
    recentAttendances: [],
  },
  {
    userId: "user-12",
    name: "Indah Permata",
    email: "indah.permata@yahoo.com",
    avatarUrl: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
    role: "umat",
    createdAt: "2023-09-09T08:00:00.000Z",
    lastAttendedDate: "2026-05-20T09:00:00.000Z",
    daysSinceLastAttendance: 65,
    consecutiveMissedEvents: 7,
    level: "churned",
    attendanceCount: 18,
    recentAttendances: [],
  },
  {
    userId: "user-13",
    name: "Joko Susilo",
    email: "joko.susilo@gmail.com",
    avatarUrl: null,
    role: "umat",
    createdAt: "2024-04-05T08:00:00.000Z",
    lastAttendedDate: "2026-07-22T09:00:00.000Z",
    daysSinceLastAttendance: 2,
    consecutiveMissedEvents: 0,
    level: "normal",
    attendanceCount: 8,
    recentAttendances: [],
  },
  {
    userId: "user-14",
    name: "Kevin Sanjaya",
    email: "kevin.sanjaya@gmail.com",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    role: "aktivis",
    createdAt: "2023-02-15T08:00:00.000Z",
    lastAttendedDate: "2026-07-12T09:00:00.000Z",
    daysSinceLastAttendance: 12,
    consecutiveMissedEvents: 2,
    level: "mulai_jarang",
    attendanceCount: 65,
    recentAttendances: [],
  },
  {
    userId: "user-15",
    name: "Linda Hartono",
    email: "linda.hartono@outlook.com",
    avatarUrl: null,
    role: "umat",
    createdAt: "2023-10-18T08:00:00.000Z",
    lastAttendedDate: "2026-06-25T09:00:00.000Z",
    daysSinceLastAttendance: 29,
    consecutiveMissedEvents: 3,
    level: "at_risk",
    attendanceCount: 20,
    recentAttendances: [],
  },
  {
    userId: "user-16",
    name: "Michael Budiman",
    email: "m.budiman@gmail.com",
    avatarUrl: null,
    role: "umat",
    createdAt: "2023-07-22T08:00:00.000Z",
    lastAttendedDate: "2026-06-01T09:00:00.000Z",
    daysSinceLastAttendance: 53,
    consecutiveMissedEvents: 6,
    level: "kemungkinan_hilang",
    attendanceCount: 11,
    recentAttendances: [],
  },
  {
    userId: "user-17",
    name: "Nadia Utami",
    email: "nadia.utami@gmail.com",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    role: "umat",
    createdAt: "2024-03-15T08:00:00.000Z",
    lastAttendedDate: "2026-07-23T09:00:00.000Z",
    daysSinceLastAttendance: 1,
    consecutiveMissedEvents: 0,
    level: "normal",
    attendanceCount: 15,
    recentAttendances: [],
  },
  {
    userId: "user-18",
    name: "Oscar Wijaya",
    email: "oscar.w@gmail.com",
    avatarUrl: null,
    role: "umat",
    createdAt: "2023-11-05T08:00:00.000Z",
    lastAttendedDate: "2026-07-10T09:00:00.000Z",
    daysSinceLastAttendance: 14,
    consecutiveMissedEvents: 2,
    level: "mulai_jarang",
    attendanceCount: 26,
    recentAttendances: [],
  },
]

export function getDummyRecencyResponse(params?: {
  level?: string
  search?: string
  sortBy?: string
}): RecencyAlertsResponse {
  let list = [...DUMMY_MEMBERS]

  if (params?.level && params.level !== "all") {
    if (params.level === "warning") {
      list = list.filter((m) => m.level === "mulai_jarang")
    } else if (params.level === "at_risk") {
      list = list.filter((m) => m.level === "at_risk")
    } else if (params.level === "lost") {
      list = list.filter((m) => m.level === "kemungkinan_hilang" || m.level === "churned")
    } else if (params.level === "normal") {
      list = list.filter((m) => m.level === "normal")
    }
  }

  if (params?.search) {
    const q = params.search.toLowerCase().trim()
    list = list.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
  }

  const sort = params?.sortBy || "longest_absence"
  list.sort((a, b) => {
    if (sort === "longest_absence") return b.daysSinceLastAttendance - a.daysSinceLastAttendance
    if (sort === "consecutive_missed") return b.consecutiveMissedEvents - a.consecutiveMissedEvents
    if (sort === "name") return a.name.localeCompare(b.name)
    return b.daysSinceLastAttendance - a.daysSinceLastAttendance
  })

  return {
    summary: {
      totalMembers: DUMMY_MEMBERS.length,
      normalCount: DUMMY_MEMBERS.filter((m) => m.level === "normal").length,
      warningCount: DUMMY_MEMBERS.filter((m) => m.level === "mulai_jarang").length,
      atRiskCount: DUMMY_MEMBERS.filter((m) => m.level === "at_risk").length,
      lostCount: DUMMY_MEMBERS.filter((m) => m.level === "kemungkinan_hilang" || m.level === "churned").length,
      totalClosedEvents: 12,
    },
    members: list,
  }
}

export async function fetchRecencyAlerts(params?: {
  level?: string
  search?: string
  sortBy?: string
}): Promise<RecencyAlertsResponse> {
  try {
    const query = new URLSearchParams()
    if (params?.level) query.set("level", params.level)
    if (params?.search) query.set("search", params.search)
    if (params?.sortBy) query.set("sortBy", params.sortBy)

    const res = await api.get<RecencyAlertsResponse>(`/pengurus/recency-alerts?${query.toString()}`)
    return res
  } catch (err) {
    console.warn("API /pengurus/recency-alerts error or endpoint offline, using dummy fallback:", err)
    return getDummyRecencyResponse(params)
  }
}

export async function fetchMemberRecencyDetail(userId: string): Promise<MemberDetailResponse> {
  try {
    const res = await api.get<MemberDetailResponse>(`/pengurus/recency-alerts/${userId}`)
    return res
  } catch (err) {
    console.warn(`API /pengurus/recency-alerts/${userId} error, using dummy fallback:`, err)
    const member = DUMMY_MEMBERS.find((m) => m.userId === userId) || DUMMY_MEMBERS[0]
    return {
      member,
      eventTimeline: [
        { eventId: "ev-1", title: "Puja Bhakti Mingguan", eventDate: "2026-07-21T09:00:00.000Z", attended: member.consecutiveMissedEvents === 0 },
        { eventId: "ev-2", title: "Puja Bhakti Mingguan", eventDate: "2026-07-14T09:00:00.000Z", attended: member.consecutiveMissedEvents <= 1 },
        { eventId: "ev-3", title: "Puja Bhakti Mingguan", eventDate: "2026-07-07T09:00:00.000Z", attended: member.consecutiveMissedEvents <= 2 },
        { eventId: "ev-4", title: "Puja Bhakti Mingguan", eventDate: "2026-06-30T09:00:00.000Z", attended: member.consecutiveMissedEvents <= 3 },
      ],
    }
  }
}
