import type { ModuleDefinition } from "@/shell/registry"

export { NotificationsPage } from "./internal/components/NotificationsPage"
export { NotificationBell, useUnreadNotificationsCount } from "./internal/components/NotificationBell"

export const notificationsModule: ModuleDefinition = {
  name: "notifications",
  navItems: [
    { label: "Notifications", to: "/notifications", icon: "Bell" },
  ],
}
