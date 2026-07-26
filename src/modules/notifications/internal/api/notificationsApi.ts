import { api } from "@/lib/api"

// Feature toggle — set to true when notification service is enabled
export const ENABLE_NOTIFICATIONS = false

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
  list: () => (ENABLE_NOTIFICATIONS ? api.get<NotificationDto[]>("/notifications") : Promise.resolve([])),
  markAsRead: (id: string) => (ENABLE_NOTIFICATIONS ? api.patch(`/notifications/${id}/read`) : Promise.resolve({ success: true })),
  acceptInvitation: (invitationId: string) => api.post<{ success: boolean; role: string }>(`/teams/invitations/${invitationId}/accept`),
  rejectInvitation: (invitationId: string) => api.post(`/teams/invitations/${invitationId}/reject`),
}
