// modules/configure — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { EventTypePage } from "./internal/components/EventTypeListPage"
export { EventTypeCreatePage } from "./internal/components/EventTypePage"
export { EventTypeDetailPage } from "./internal/components/EventTypeDetailPage"
export { ThresholdPage } from "./internal/components/ThresholdPage"
export { SeasonPage } from "./internal/components/SeasonPage"
export { PointsRulesPage } from "./internal/components/PointsRulesPage"
export { SchoolPage } from "./internal/components/SchoolPage"
export { SchoolFormPage } from "./internal/components/SchoolFormPage"
export { SchoolDetailPage } from "./internal/components/SchoolDetailPage"
export const configureModule: ModuleDefinition = {
  name: "configure",
  navItems: [],
  configureSections: [
    {
      label: "Master Data",
      icon: "Layers",
      items: [
        {
          label: "Schools Directory",
          to: "/configure/master/school",
          icon: "GraduationCap",
          hasRoute: true,
        },
        {
          label: "Event Categories",
          to: "/configure/master/event-type",
          icon: "Tag",
          hasRoute: true,
        },
      ],
    },
    {
      label: "Rules",
      icon: "Activity",
      items: [
        {
          label: "Season Leaderboard",
          to: "/configure/rules/season",
          icon: "Trophy",
          hasRoute: true,
        },
        {
          label: "Point Rules",
          to: "/configure/rules/points",
          icon: "Zap",
          hasRoute: true,
        },
      ],
    },
    {
      label: "Early Warning",
      icon: "Bell",
      items: [
        {
          label: "Threshold Settings",
          to: "/configure/early-warning/threshold",
          icon: "Bell",
          hasRoute: true,
        },
      ],
    },
  ],
}
