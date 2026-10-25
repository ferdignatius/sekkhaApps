// modules/home — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { HomePage } from "./internal/components/HomePage"
// Alias for backward compatibility
export { HomePage as DashboardPage } from "./internal/components/HomePage"

export const homeModule: ModuleDefinition = {
  name: "home",
  navItems: [{ label: "Home", to: "/home", icon: "Home" }],
}
export const dashboardModule = homeModule
