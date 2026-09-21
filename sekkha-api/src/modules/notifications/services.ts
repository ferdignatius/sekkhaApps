import { notificationModels } from "./models"

export const notificationServices = {
  async listNotifications(userId: string, page: number = 1, limit: number = 20) {
    const validPage = Math.max(1, page)
    const validLimit = Math.min(50, Math.max(1, limit))
    const skip = (validPage - 1) * validLimit

    const notifications = await notificationModels.findUserNotifications(userId, skip, validLimit)
    return notifications.map((n) => ({
      id: n.id,
      title: n.title,
      message: n.message,
      type: n.type,
      status: n.status,
      data: n.data,
      created_at: n.createdAt.toISOString(),
    }))
  },

  async markAsRead(id: string, userId: string) {
    const notification = await notificationModels.findNotificationById(id)
    if (!notification) {
      const error = new Error("Notification not found") as any
      error.statusCode = 404
      throw error
    }

    if (notification.userId !== userId) {
      const error = new Error("Access denied") as any
      error.statusCode = 403
      throw error
    }

    await notificationModels.markNotificationAsRead(id)
    return { success: true }
  },
}
