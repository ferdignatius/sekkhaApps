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

export interface InvitationDto {
  id: string
  email: string
  role: "pengurus" | "aktivis"
  status: "pending" | "accepted" | "rejected"
  created_at: string
  invited_by: {
    id: string
    name: string
  }
}

export const teamsApi = {
  listMembers: (params?: { search?: string; claimed_status?: string; role?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set("search", params.search)
    if (params?.claimed_status && params.claimed_status !== "all") searchParams.set("claimed_status", params.claimed_status)
    if (params?.role && params.role !== "all") searchParams.set("role", params.role)
    const qs = searchParams.toString()
    return api.get<MemberDto[]>(`/teams/members${qs ? `?${qs}` : ""}`)
  },

  getMember: (id: string) => api.get<MemberDetailDto>(`/teams/members/${id}`),

  createMember: (data: CreateMemberPayload) => api.post<MemberDto>("/teams/members", data),

  updateMember: (id: string, data: UpdateMemberPayload) => api.put<MemberDto>(`/teams/members/${id}`, data),

  deleteMember: (id: string) => api.delete<{ success: boolean; message: string }>(`/teams/members/${id}`),

  resetMemberPassword: (id: string) =>
    api.post<{
      success: boolean
      user_number: string
      username?: string | null
      name: string
      default_password: string
      message: string
    }>(`/teams/members/${id}/reset-password`),

  listInvitations: () => api.get<InvitationDto[]>("/teams/invitations"),

  sendInvitation: (data: { email: string; role: "pengurus" | "aktivis" }) =>
    api.post<{ id: string; email: string; role: string; status: string }>("/teams/invitations", data),

  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post<{ success: boolean; message: string }>("/users/change-password", data),
}


