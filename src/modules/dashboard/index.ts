// modules/dashboard — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { DashboardPage } from "./internal/components/DashboardPage"

export const dashboardModule: ModuleDefinition = {
  name: "dashboard",
  navItems: [
    { label: "Home", to: "/home", icon: "LayoutDashboard" },
  ],
}
