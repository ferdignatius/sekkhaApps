import { prisma } from "../../lib/prisma"

export const notificationModels = {
  findUserNotifications(userId: string, skip: number, take: number) {
    return prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    })
  },

  findNotificationById(id: string) {
    return prisma.notification.findUnique({
      where: { id },
    })
  },

  markNotificationAsRead(id: string) {
    return prisma.notification.update({
      where: { id },
      data: { status: "read" },
    })
  },
}
