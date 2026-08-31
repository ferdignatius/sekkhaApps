// modules/pengurus — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { InsightPage } from "./internal/components/InsightPage"
export { RecencyAlertsPage } from "./internal/components/RecencyAlertsPage"
export { PengurusContributionPage } from "./internal/components/PengurusContributionPage"

export const pengurusModule: ModuleDefinition = {
  name: "pengurus",
  navItems: [],
  // Pengurus-only nav items (Community Insights, Contributor Insights & Recency Alerts)
  pengurusNavItems: [
    { label: "Community Insights", to: "/insight", icon: "BarChart3" },
    { label: "Contributor Insights", to: "/pengurus-contribution", icon: "Award" },
    { label: "Recency Alerts", to: "/recency-alerts", icon: "AlertTriangle" },
  ],
}
