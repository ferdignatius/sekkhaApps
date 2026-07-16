// modules/pengurus — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { InsightPage } from "./internal/components/InsightPage"
export { AnalysisPage } from "./internal/components/AnalysisPage"

export const pengurusModule: ModuleDefinition = {
  name: "pengurus",
  navItems: [],
  // Pengurus-only nav items (Insight & Analysis)
  pengurusNavItems: [
    { label: "Insight", to: "/insight", icon: "BarChart3" },
    { label: "Analysis", to: "/analysis", icon: "TrendingDown" },
  ],
}
