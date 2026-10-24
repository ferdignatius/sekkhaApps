// feature/configure/api/configureApi
// API service layer for all Configure (Master Data) pages.
// Connects frontend CRUD operations to backend endpoints.

import { api } from "@/lib/api"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EventTypeDto {
  id: string
  code: string
  label: string
  color: string
  description?: string | null
  default_point_reward: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

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

// ─── Event Types ─────────────────────────────────────────────────────────────

export const eventTypesApi = {
  list: (params?: { is_active?: boolean }) => {
    const query =
      params?.is_active !== undefined ? `?is_active=${params.is_active}` : ""
    return api.get<EventTypeDto[]>(`/configure/event-types${query}`)
  },
  create: (data: {
    code?: string
    label: string
    color: string
    description?: string | null
    default_point_reward?: number
    is_active?: boolean
  }) => api.post<{ id: string; code: string; label?: string }>("/configure/event-types", data),
  update: (
    id: string,
    data: {
      label?: string
      color?: string
      description?: string | null
      default_point_reward?: number
      is_active?: boolean
    }
  ) => api.put<{ id: string; code: string; label?: string }>(`/configure/event-types/${id}`, data),
  remove: (id: string) => api.delete<{ success: boolean; message?: string }>(`/configure/event-types/${id}`),
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
export type SchoolRequestStatus =
  "pending" | "accepted" | "rejected" | "cancelled"
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
    api
      .get<{ items: SchoolDto[] }>(
        `/configure/schools?page=1&page_size=100${search ? `&search=${encodeURIComponent(search)}` : ""}`
      )
      .then((res) => res.items || []),
  create: (
    data: Omit<SchoolDto, "id" | "is_active" | "user_count" | "request_count">
  ) => api.post<SchoolDto>("/configure/schools", data),
  update: (
    id: string,
    data: Partial<
      Omit<SchoolDto, "id" | "is_active" | "user_count" | "request_count">
    >
  ) => api.patch<SchoolDto>(`/configure/schools/${id}`, data),
  remove: (id: string) => api.delete(`/configure/schools/${id}`),
  requests: () =>
    api.get<{ items: SchoolRequestDto[] }>("/configure/school-requests"),
  acceptRequest: (id: string, review_note: string) =>
    api.post(`/configure/school-requests/${id}/accept`, { review_note }),
  rejectRequest: (id: string, review_note: string) =>
    api.post(`/configure/school-requests/${id}/reject`, { review_note }),
}
