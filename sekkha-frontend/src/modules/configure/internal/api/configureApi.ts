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
  }) =>
    api.post<{ id: string; code: string; label?: string }>(
      "/configure/event-types",
      data
    ),
  update: (
    id: string,
    data: {
      label?: string
      color?: string
      description?: string | null
      default_point_reward?: number
      is_active?: boolean
    }
  ) =>
    api.put<{ id: string; code: string; label?: string }>(
      `/configure/event-types/${id}`,
      data
    ),
  remove: (id: string) =>
    api.delete<{ success: boolean; message?: string }>(
      `/configure/event-types/${id}`
    ),
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

export type SchoolType = "SMP" | "SMA/SMK" | "Universitas" | "Umum"
export type SchoolStatus = "pending" | "active" | "cancel"

export interface SchoolDto {
  id: string
  name: string
  type: SchoolType
  is_active: boolean
  status: SchoolStatus
  userCount?: number
  requester_name?: string
  created_at?: string
  updated_at?: string
}

export type SchoolRequestDto = SchoolDto

export const schoolsApi = {
  list: (
    params?: { search?: string; type?: string; is_active?: boolean } | string
  ) => {
    const search = typeof params === "string" ? params : params?.search
    const type = typeof params === "object" ? params.type : undefined
    const isActive = typeof params === "object" ? params.is_active : undefined

    const q = new URLSearchParams()
    q.append("page", "1")
    q.append("page_size", "150")
    if (search) q.append("search", search)
    if (type && type !== "all") q.append("type", type)
    if (isActive !== undefined) q.append("is_active", String(isActive))

    return api.get<any>(`/configure/schools?${q.toString()}`).then((res) => {
      if (Array.isArray(res)) return res as SchoolDto[]
      if (Array.isArray(res?.data)) return res.data as SchoolDto[]
      if (Array.isArray(res?.items)) return res.items as SchoolDto[]
      if (Array.isArray(res?.schools)) return res.schools as SchoolDto[]
      return []
    })
  },
  get: (id: string) =>
    api
      .get<any>(`/configure/schools/${id}`)
      .then((res) => (res?.data || res) as SchoolDto),
  create: (data: { name: string; type: string }) =>
    api.post<SchoolDto>("/configure/schools", data),
  update: (
    id: string,
    data: Partial<{
      name: string
      type: string
      is_active: boolean
    }>
  ) => api.patch<SchoolDto>(`/configure/schools/${id}`, data),
  remove: (id: string) =>
    api.delete<{ success: boolean; message?: string }>(
      `/configure/schools/${id}`
    ),
  requests: () =>
    api.get<any>("/configure/schools/pending").then((res) => {
      if (Array.isArray(res)) return res as SchoolRequestDto[]
      if (Array.isArray(res?.data)) return res.data as SchoolRequestDto[]
      if (Array.isArray(res?.items)) return res.items as SchoolRequestDto[]
      return []
    }),
  acceptRequest: (id: string, review_note?: string) =>
    api.post(`/configure/schools/${id}/approve`, { review_note }),
  rejectRequest: (id: string, review_note?: string) =>
    api.post(`/configure/schools/${id}/reject`, { review_note }),
}
