import { api } from "@/lib/api"

export interface MemberDto {
  id: string
  name: string
  email: string
  role: "umat" | "aktivis" | "pengurus" | "admin"
  school?: string | null
  avatarUrl?: string | null
  createdAt: string
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
  listMembers: () => api.get<MemberDto[]>("/teams/members"),
  listInvitations: () => api.get<InvitationDto[]>("/teams/invitations"),
  sendInvitation: (data: { email: string; role: "pengurus" | "aktivis" }) =>
    api.post<{ id: string; email: string; role: string; status: string }>("/teams/invitations", data),
}
