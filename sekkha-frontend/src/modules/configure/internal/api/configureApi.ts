// feature/configure/api/configureApi
// API service layer for all Configure (Master Data) pages.
// Connects frontend CRUD operations to backend endpoints.

import { api } from "@/lib/api"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BadgeDto {
  id: string
  code?: string
  name: string
  description: string
  color?: string
  point_value?: number
  /** Legacy achievement fields retained until achievement UI migration. */
  icon_url: string
  condition_type: "streak" | "attendance" | "points" | "event_count" | "manual"
  condition_value: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface LevelDto {
  id: string
  level: number
  label: string
  min_points: number
}

export interface EventTypeDto {
  id: string
  code: string
  name: string
  color: string
  description?: string | null
  default_point_reward: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export type AchievementDto = BadgeDto // same shape

export interface SeasonDto {
  id: string
  name: string
  code?: string | null
  start_date: string
  end_date: string
  is_active: boolean
  target_attendance: number
  bonus_points: number
  description?: string | null
  total_attendances?: number
  created_at?: string
}

// ─── Seasons ─────────────────────────────────────────────────────────────────

export const seasonsApi = {
  list: () => api.get<SeasonDto[]>("/configure/seasons"),
  create: (data: Omit<SeasonDto, "id" | "total_attendances" | "created_at">) =>
    api.post<SeasonDto>("/configure/seasons", data),
  update: (id: string, data: Partial<SeasonDto>) =>
    api.put<SeasonDto>(`/configure/seasons/${id}`, data),
  remove: (id: string) => api.delete(`/configure/seasons/${id}`),
  activate: (id: string) =>
    api.post<{ success: boolean; season: SeasonDto }>(
      `/configure/seasons/${id}/activate`
    ),
}

// ─── Badges ──────────────────────────────────────────────────────────────────

export const badgesApi = {
  list: () =>
    api
      .get<{ items: BadgeDto[] }>("/configure/badges")
      .then((res) => res.items || []),
  create: (data: Omit<BadgeDto, "id" | "created_at" | "updated_at">) =>
    api.post<BadgeDto>("/configure/badges", data),
  update: (id: string, data: Partial<BadgeDto>) =>
    api.patch<BadgeDto>(`/configure/badges/${id}`, data),
  remove: (id: string) => api.delete(`/configure/badges/${id}`),
}

// ─── Levels ──────────────────────────────────────────────────────────────────

export const levelsApi = {
  list: () => api.get<LevelDto[]>("/configure/levels"),
  create: (data: Omit<LevelDto, "id">) =>
    api.post<{ id: string }>("/configure/levels", data),
  update: (id: string, data: Partial<LevelDto>) =>
    api.put<{ id: string }>(`/configure/levels/${id}`, data),
  remove: (id: string) => api.delete(`/configure/levels/${id}`),
}

// ─── Event Types ─────────────────────────────────────────────────────────────

export const eventTypesApi = {
  list: () =>
    api.get<EventTypeDto[]>("/configure/event-types"),
  create: (data: Omit<EventTypeDto, "id" | "created_at" | "updated_at">) =>
    api.post<EventTypeDto>("/configure/event-types", data),
  update: (id: string, data: Partial<EventTypeDto>) =>
    api.patch<EventTypeDto>(`/configure/event-types/${id}`, data),
  remove: (id: string) => api.delete(`/configure/event-types/${id}`),
}

// ─── Achievements ────────────────────────────────────────────────────────────

export const achievementsApi = {
  list: () => api.get<AchievementDto[]>("/configure/achievements"),
  create: (
    data: Omit<AchievementDto, "id" | "is_active"> & { is_active?: boolean }
  ) => api.post<{ id: string }>("/configure/achievements", data),
  update: (id: string, data: Partial<AchievementDto>) =>
    api.put<{ id: string }>(`/configure/achievements/${id}`, data),
  remove: (id: string) => api.delete(`/configure/achievements/${id}`),
}

// ─── Point Rules (Rules: Non-deletable, Editable) ────────────────────────────

export interface PointRuleDto {
  id: string
  code: string
  label: string
  points: number
  description?: string | null
  category: "attendance" | "streak" | "general"
  updated_at?: string
}

export const pointRulesApi = {
  list: () => api.get<PointRuleDto[]>("/configure/point-rules"),
  update: (
    id: string,
    data: { label?: string; points: number; description?: string | null }
  ) => api.put<PointRuleDto>(`/configure/point-rules/${id}`, data),
}

// ─── Master Data: Schools ───────────────────────────────────────────────────

export interface SchoolDto {
  id: string
  name: string
  type: string
  city: string
  user_count?: number
  userCount?: number
  request_count?: number
  is_active: boolean
}

export type SchoolType = "SMP" | "SMA" | "SMK" | "Universitas" | "Umum"
export type SchoolRequestStatus = "pending" | "accepted" | "rejected" | "cancelled"
export interface SchoolRequestDto {
  id: string
  requested_name: string
  requested_type: SchoolType
  requested_city: string
  status: SchoolRequestStatus
  review_note?: string | null
  school_id?: string | null
  created_at: string
}

export const schoolsApi = {
  list: (search?: string) =>
    api.get<{ items: SchoolDto[] }>(
      `/configure/schools?page=1&page_size=100${search ? `&search=${encodeURIComponent(search)}` : ""}`
    ).then((res) => res.items || []),
  create: (data: Omit<SchoolDto, "id" | "is_active" | "user_count" | "request_count">) =>
    api.post<SchoolDto>("/configure/schools", data),
  update: (id: string, data: Partial<Omit<SchoolDto, "id" | "is_active" | "user_count" | "request_count">>) =>
    api.patch<SchoolDto>(`/configure/schools/${id}`, data),
  remove: (id: string) => api.delete(`/configure/schools/${id}`),
  requests: () => api.get<{ items: SchoolRequestDto[] }>("/configure/school-requests"),
  acceptRequest: (id: string, review_note: string) =>
    api.post(`/configure/school-requests/${id}/accept`, { review_note }),
  rejectRequest: (id: string, review_note: string) =>
    api.post(`/configure/school-requests/${id}/reject`, { review_note }),
}
