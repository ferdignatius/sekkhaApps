import { api } from "@/lib/api"

export interface MemberDto {
  id: string
  name: string
  username?: string | null
  email?: string | null
  phone?: string | null
  school?: string | null
  birth_date?: string | null
  gender?: string | null
  role: "umat" | "aktivis" | "pengurus" | "admin"
  avatar_url?: string | null
  user_number?: string | null
  is_claimed: boolean
  claimed_at?: string | null
  default_password?: string
  total_attendance?: number
  points?: number
  created_at: string
}

export interface MemberDetailDto extends MemberDto {
  attendances: Array<{
    id: string
    event_title: string
    event_date: string
    location: string
    method: string
    points_earned: number
    scanned_at: string
  }>
  badges: Array<{
    id: string
    name: string
    icon_url: string
    earned_at: string
  }>
}

export interface CreateMemberPayload {
  name: string
  username?: string
  email?: string
  phone?: string
  school?: string
  birth_date?: string
  gender?: string
  role?: "umat" | "aktivis" | "pengurus" | "admin"
  default_password?: string
}

export interface UpdateMemberPayload {
  name?: string
  username?: string | null
  email?: string | null
  phone?: string | null
  school?: string | null
  birth_date?: string | null
  gender?: string | null
  role?: "umat" | "aktivis" | "pengurus" | "admin"
}

export interface PaginatedMembersResponse {
  items: MemberDto[]
  total: number
  page: number
  limit: number
  totalPages: number
  stats?: {
    total: number
    umat: number
    aktivis: number
    pengurus: number
  }
}

export interface ListMembersParams {
  search?: string
  claimed_status?: string
  role?: string
}

export interface ListPaginatedMembersParams extends ListMembersParams {
  page: number
  limit?: number
}

export const teamsApi = {
  listMembers: ((
    params?: ListMembersParams & { page?: number; limit?: number }
  ) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set("search", params.search)
    if (params?.claimed_status && params.claimed_status !== "all")
      searchParams.set("claimed_status", params.claimed_status)
    if (params?.role && params.role !== "all")
      searchParams.set("role", params.role)
    if (params?.page !== undefined)
      searchParams.set("page", params.page.toString())
    if (params?.limit !== undefined)
      searchParams.set("limit", params.limit.toString())
    const qs = searchParams.toString()
    if (params?.page !== undefined || params?.limit !== undefined) {
      return api.get<PaginatedMembersResponse>(
        `/teams/members${qs ? `?${qs}` : ""}`
      )
    }
    return api.get<MemberDto[]>(`/teams/members${qs ? `?${qs}` : ""}`)
  }) as {
    (params: ListPaginatedMembersParams): Promise<PaginatedMembersResponse>
    (params?: ListMembersParams): Promise<MemberDto[]>
  },

  getMember: (id: string) => api.get<MemberDetailDto>(`/teams/members/${id}`),

  createMember: (data: CreateMemberPayload) =>
    api.post<MemberDto>("/teams/members", data),

  updateMember: (id: string, data: UpdateMemberPayload) =>
    api.put<MemberDto>(`/teams/members/${id}`, data),

  deleteMember: (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/teams/members/${id}`),

  resetMemberPassword: (id: string) =>
    api.post<{
      success: boolean
      user_number: string
      username?: string | null
      name: string
      default_password: string
      message: string
    }>(`/teams/members/${id}/reset-password`),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post<{ success: boolean; message: string }>(
      "/users/change-password",
      data
    ),
}
