// modules/pengurus — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { InsightPage } from "./internal/components/InsightPage"
export { RecencyAlertsPage } from "./internal/components/RecencyAlertsPage"
export { PengurusContributionPage } from "./internal/components/PengurusContributionPage"

export const pengurusModule: ModuleDefinition = {
  name: "pengurus",
  navItems: [],
  // Pengurus-only nav items (Insight, Kontribusi & Recency Alert)
  pengurusNavItems: [
    { label: "Insight Umat", to: "/insight", icon: "BarChart3" },
    { label: "Insight Kontribusi", to: "/pengurus-contribution", icon: "Award" },
    { label: "Silent-Churn Alert", to: "/recency-alerts", icon: "AlertTriangle" },
  ],
}
