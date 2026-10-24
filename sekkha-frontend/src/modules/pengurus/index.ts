// modules/pengurus — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { InsightPage } from "./internal/components/InsightPage"

export const pengurusModule: ModuleDefinition = {
  name: "pengurus",
  navItems: [],
  // Pengurus-only nav item (Community & Contributor Insights)
  pengurusNavItems: [
    { label: "Community Insights", to: "/insight", icon: "BarChart3" },
  ],
}
