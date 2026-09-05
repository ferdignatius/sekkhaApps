// feature/configure/api/configureApi
// API service layer for all Configure (Master Data) pages.
// Connects frontend CRUD operations to backend endpoints.

import { api } from "@/lib/api"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BadgeDto {
  id: string
  name: string
  description: string
  icon_url: string
  condition_type: "streak" | "attendance" | "points" | "event_count" | "manual"
  condition_value: number
  is_active: boolean
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
  label: string
  color: string
  is_default: boolean
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
  activate: (id: string) => api.post<{ success: boolean; season: SeasonDto }>(`/configure/seasons/${id}/activate`),
}

// ─── Badges ──────────────────────────────────────────────────────────────────

export const badgesApi = {
  list: () => api.get<BadgeDto[]>("/configure/badges"),
  create: (data: Omit<BadgeDto, "id" | "is_active">) => api.post<{ id: string }>("/configure/badges", data),
  update: (id: string, data: Partial<BadgeDto>) => api.put<{ id: string }>(`/configure/badges/${id}`, data),
  remove: (id: string) => api.delete(`/configure/badges/${id}`),
}

// ─── Levels ──────────────────────────────────────────────────────────────────

export const levelsApi = {
  list: () => api.get<LevelDto[]>("/configure/levels"),
  create: (data: Omit<LevelDto, "id">) => api.post<{ id: string }>("/configure/levels", data),
  update: (id: string, data: Partial<LevelDto>) => api.put<{ id: string }>(`/configure/levels/${id}`, data),
  remove: (id: string) => api.delete(`/configure/levels/${id}`),
}

// ─── Event Types ─────────────────────────────────────────────────────────────

export const eventTypesApi = {
  list: () => api.get<EventTypeDto[]>("/configure/event-types"),
  create: (data: Omit<EventTypeDto, "id">) => api.post<{ id: string }>("/configure/event-types", data),
  update: (id: string, data: Partial<EventTypeDto>) => api.put<{ id: string }>(`/configure/event-types/${id}`, data),
  remove: (id: string) => api.delete(`/configure/event-types/${id}`),
}

// ─── Achievements ────────────────────────────────────────────────────────────

export const achievementsApi = {
  list: () => api.get<AchievementDto[]>("/configure/achievements"),
  create: (data: Omit<AchievementDto, "id" | "is_active"> & { is_active?: boolean }) =>
    api.post<{ id: string }>("/configure/achievements", data),
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
  update: (id: string, data: { label?: string; points: number; description?: string | null }) =>
    api.put<PointRuleDto>(`/configure/point-rules/${id}`, data),
}

// ─── Master Data: Schools ───────────────────────────────────────────────────

export interface SchoolDto {
  id: string
  name: string
  type: string
  city: string
  userCount?: number
}

export const schoolsApi = {
  list: (search?: string) =>
    api
      .get<{ total: number; schools: SchoolDto[] }>(
        `/schools?limit=200${search ? `&search=${encodeURIComponent(search)}` : ""}`
      )
      .then((res) => res.schools || []),
  create: (data: Omit<SchoolDto, "id" | "userCount">) =>
    api.post<SchoolDto>("/schools", data),
  update: (id: string, data: Partial<Omit<SchoolDto, "id" | "userCount">>) =>
    api.put<SchoolDto>(`/schools/${id}`, data),
  remove: (id: string) => api.delete<{ success: boolean; message: string }>(`/schools/${id}`),
}


