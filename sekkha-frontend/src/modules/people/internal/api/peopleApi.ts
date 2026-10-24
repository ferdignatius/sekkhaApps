import { api } from "@/lib/api"

export type PeopleRole = "member" | "activist" | "organizer" | "admin"

export interface MemberDto {
  id: string
  name: string
  username?: string | null
  email?: string | null
  phone?: string | null
  school?: string | null
  school_id?: string | null
  date_of_birth?: string | null
  birth_date?: string | null
  role: PeopleRole
  user_number?: string | null
  is_claimed: boolean
  claimed_at?: string | null
  created_at: string
  last_attended_at?: string | null
}

export interface MemberDetailDto extends MemberDto {
  points?: number
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
  role?: PeopleRole
  school_id?: string | null
  school?: string | null
  phone?: string | null
  date_of_birth?: string | null
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
  phone?: string | null
  school_id?: string | null
  school?: string | null
  date_of_birth?: string | null
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
    if (params?.school_id)
      searchParams.set("school_id", params.school_id)
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

  getVerifiedSchools: async (): Promise<VerifiedSchoolDto[]> => {
    try {
      const res = await api.get<{ items: VerifiedSchoolDto[] }>(
        "/configure/schools?is_active=true&limit=100"
      )
      return res?.items || []
    } catch {
      return []
    }
  },
}
