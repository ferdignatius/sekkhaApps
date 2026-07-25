// modules/pengurus — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { InsightPage } from "./internal/components/InsightPage"
export { RecencyAlertsPage } from "./internal/components/RecencyAlertsPage"

export const pengurusModule: ModuleDefinition = {
  name: "pengurus",
  navItems: [],
  // Pengurus-only nav items (Insight & Recency Alert)
  pengurusNavItems: [
    { label: "Insight", to: "/insight", icon: "BarChart3" },
    { label: "Silent-Churn Alert", to: "/recency-alerts", icon: "AlertTriangle" },
  ],
}
