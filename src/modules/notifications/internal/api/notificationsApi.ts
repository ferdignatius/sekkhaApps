import { api } from "@/lib/api"

export interface NotificationDto {
  id: string
  title: string
  message: string
  type: string
  status: "unread" | "read"
  data?: {
    invitationId?: string
  }
  created_at: string
}

export const notificationsApi = {
  list: () => api.get<NotificationDto[]>("/notifications"),
  markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
  acceptInvitation: (invitationId: string) => api.post<{ success: boolean; role: string }>(`/teams/invitations/${invitationId}/accept`),
  rejectInvitation: (invitationId: string) => api.post(`/teams/invitations/${invitationId}/reject`),
}
