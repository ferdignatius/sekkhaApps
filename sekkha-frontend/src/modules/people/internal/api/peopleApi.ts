import { api } from "@/lib/api"
import {
  DROPDOWN_PAGE_SIZE,
  fetchSchoolsPaginated,
} from "@/lib/pagination"
import type { PaginatedFetchParams, PaginatedResult } from "@/lib/pagination"

export type PeopleRole = "member" | "activist" | "organizer" | "admin"

export interface MemberDto {
  id: string
  name: string
  username?: string | null
  email?: string | null
  school?: string | null
  school_id?: string | null
  school_status?: string | null
  role: PeopleRole
  user_number?: string | number | null
  is_claimed: boolean
  claimed_at?: string | null
  created_at: string
  last_attended_at?: string | null
}

export interface MemberDetailDto extends MemberDto {
  points?: number
  total_attendances?: number
  attendances: Array<{
    id: string
    event_title: string
    event_date: string
    method: string
    points_earned: number
    scanned_at: string
  }>
}

export interface CreateMemberPayload {
  name: string
  school_id?: string | null
}

export interface CreateMemberResponse {
  id: string
  user_number: string
  username: string
  name: string
  role: PeopleRole
  is_claimed: boolean
  temporary_password: string
  whatsapp_invite_message: string
  copy_template?: string
  school?: string | null
  school_id?: string | null
  created_at: string
}

export interface ResetTemporaryPasswordResponse {
  id: string
  user_number: string
  username: string
  name: string
  temporary_password: string
  whatsapp_invite_message: string
  copy_template?: string
  message: string
}

export interface UpdateMemberPayload {
  name?: string
  username?: string | null
  email?: string | null
  school_id?: string | null
  school?: string | null
  role?: PeopleRole
}

export interface PaginatedMembersResponse {
  items: MemberDto[]
  total: number
  page: number
  limit: number
  totalPages: number
  stats?: {
    total: number
    member?: number
    activist?: number
    organizer?: number
    claimed?: number
    unclaimed?: number
  }
}

export interface ListMembersParams {
  search?: string
  claimed_status?: string
  role?: string
  school_id?: string
}

export interface ListPaginatedMembersParams extends ListMembersParams {
  page: number
  limit?: number
}

export interface VerifiedSchoolDto {
  id: string
  name: string
  type: string
  status?: string
  is_active?: boolean
}

export interface SimilarMemberDto {
  id: string
  user_number?: string | number | null
  username?: string | null
  name: string
  role: PeopleRole
  is_claimed: boolean
  school?: string | null
  similarity_score?: number
}

export interface SimilarMembersResponse {
  items: SimilarMemberDto[]
  total: number
}

export const peopleApi = {
  listMembers: ((
    params?: ListMembersParams & { page?: number; limit?: number }
  ) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set("search", params.search)
    if (params?.claimed_status && params.claimed_status !== "all")
      searchParams.set("claimed_status", params.claimed_status)
    if (params?.role && params.role !== "all")
      searchParams.set("role", params.role)
    if (params?.school_id) searchParams.set("school_id", params.school_id)
    if (params?.page !== undefined)
      searchParams.set("page", params.page.toString())
    if (params?.limit !== undefined)
      searchParams.set("limit", params.limit.toString())
    const qs = searchParams.toString()
    if (params?.page !== undefined || params?.limit !== undefined) {
      return api.get<PaginatedMembersResponse>(
        `/people/members${qs ? `?${qs}` : ""}`
      )
    }
    return api.get<MemberDto[]>(`/people/members${qs ? `?${qs}` : ""}`)
  }) as {
    (params: ListPaginatedMembersParams): Promise<PaginatedMembersResponse>
    (params?: ListMembersParams): Promise<MemberDto[]>
  },

  getMember: (id: string) => api.get<MemberDetailDto>(`/people/members/${id}`),

  findSimilarMembers: async (
    name: string,
    limit = 5,
    options?: { signal?: AbortSignal }
  ): Promise<SimilarMembersResponse> => {
    const trimmed = name.trim()
    if (trimmed.length < 2) return { items: [], total: 0 }
    const cappedLimit = Math.min(Math.max(limit, 1), 5)
    const res = await api.get<unknown>(
      `/people/members/similar?name=${encodeURIComponent(trimmed)}&limit=${cappedLimit}`,
      { noCache: true, signal: options?.signal }
    )
    if (Array.isArray(res)) {
      const sliced = (res as SimilarMemberDto[]).slice(0, cappedLimit)
      return { items: sliced, total: sliced.length }
    }
    if (res && typeof res === "object") {
      const obj = res as Record<string, unknown>
      const rawItems = Array.isArray(obj.items)
        ? (obj.items as SimilarMemberDto[])
        : Array.isArray(obj.data)
          ? (obj.data as SimilarMemberDto[])
          : []
      const items = rawItems.slice(0, cappedLimit)
      const total = Math.min(
        typeof obj.total === "number" ? obj.total : items.length,
        cappedLimit
      )
      return { items, total }
    }
    return { items: [], total: 0 }
  },

  createMember: (data: CreateMemberPayload) =>
    api.post<CreateMemberResponse>("/people/members", data),

  updateMember: (id: string, data: UpdateMemberPayload) =>
    api.put<MemberDto>(`/people/members/${id}`, data),

  deleteMember: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/people/members/${id}`),

  resetMemberPassword: (id: string) =>
    api.post<ResetTemporaryPasswordResponse>(
      `/people/members/${id}/reset-temporary-password`
    ),

  getVerifiedSchools: async (
    params?: PaginatedFetchParams
  ): Promise<PaginatedResult<VerifiedSchoolDto> | VerifiedSchoolDto[]> => {
    try {
      return await fetchSchoolsPaginated<VerifiedSchoolDto>({
        page: params?.page ?? 1,
        limit: params?.limit ?? DROPDOWN_PAGE_SIZE,
        search: params?.search,
        isActive: true,
        fallbackToPublic: true,
        noCache: true,
      })
    } catch {
      return {
        items: [],
        total: 0,
        page: params?.page ?? 1,
        limit: params?.limit ?? DROPDOWN_PAGE_SIZE,
        total_pages: 1,
        has_more: false,
      }
    }
  },
}
