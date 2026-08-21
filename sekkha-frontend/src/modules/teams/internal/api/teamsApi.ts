import { api } from "@/lib/api"

export interface MemberDto {
  id: string
  name: string
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
  claim_pin?: string | null
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
  email?: string
  phone?: string
  school?: string
  birth_date?: string
  gender?: string
  role?: "umat" | "aktivis" | "pengurus" | "admin"
}

export interface UpdateMemberPayload {
  name?: string
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

export interface LinkLegacyAccountPayload {
  claim_pin: string
  target_user_id?: string
}

export interface LinkLegacyAccountResponse {
  status?: string
  success?: boolean
  data: {
    merged_attendances_count: number
    merged_badges_count: number
    new_total_points: number
    claimed_user_number?: string
    merged_user_name?: string
  }
  message: string
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

  generateClaimPin: (id: string) =>
    api.post<{
      success: boolean
      claim_pin: string
      user_number: string
      name: string
      phone?: string
      expires_at: string
      message: string
    }>(`/teams/members/${id}/generate-claim-pin`),

  listInvitations: () => api.get<InvitationDto[]>("/teams/invitations"),

  sendInvitation: (data: { email: string; role: "pengurus" | "aktivis" }) =>
    api.post<{ id: string; email: string; role: string; status: string }>("/teams/invitations", data),

  linkLegacyAccount: (data: LinkLegacyAccountPayload) =>
    api.post<LinkLegacyAccountResponse>("/users/link-legacy-account", data),
}

