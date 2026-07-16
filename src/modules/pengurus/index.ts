// modules/pengurus — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { InsightPage } from "./internal/components/InsightPage"

export const pengurusModule: ModuleDefinition = {
  name: "pengurus",
  navItems: [],
  // Pengurus-only nav items (Insight)
  pengurusNavItems: [
    { label: "Insight", to: "/insight", icon: "BarChart3" },
  ],
}
