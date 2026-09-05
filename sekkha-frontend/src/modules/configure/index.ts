// modules/configure — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { BadgePage } from "./internal/components/BadgePage"
export { LevelPage } from "./internal/components/LevelPage"
export { EventTypePage } from "./internal/components/EventTypePage"
export { AchievementPage } from "./internal/components/AchievementPage"
export { EventTimePage } from "./internal/components/EventTimePage"
export { AttendanceBadgePage } from "./internal/components/AttendanceBadgePage"
export { ThresholdPage } from "./internal/components/ThresholdPage"
export { SeasonPage } from "./internal/components/SeasonPage"
export { PointsRulesPage } from "./internal/components/PointsRulesPage"

export const configureModule: ModuleDefinition = {
  name: "configure",
  navItems: [],
  // Configure sections — pengurus/admin only, with sub-menus
  configureSections: [
    {
      label: "Master Data",
      icon: "Layers",
      items: [
        { label: "Event Categories", to: "/configure/master/event-type", icon: "Tag", hasRoute: true },
        { label: "Time Presets", to: "/configure/master/event-time", icon: "Clock", hasRoute: true },
        { label: "Attendance Badges", to: "/configure/master/attendance-badge", icon: "Award", hasRoute: true },
      ],
    },
    {
      label: "Gamification",
      icon: "Sparkles",
      items: [
        { label: "Achievements", to: "/configure/master/achievement", icon: "Trophy", hasRoute: true },
        { label: "Master Badges", to: "/configure/master/badge", icon: "Award", hasRoute: true },
        { label: "Member Levels", to: "/configure/master/level", icon: "Zap", hasRoute: true },
      ],
    },
    {
      label: "Rules",
      icon: "Activity",
      items: [
        { label: "Season Leaderboard", to: "/configure/rules/season", icon: "Trophy", hasRoute: true },
        { label: "Point Rules", to: "/configure/rules/points", icon: "Zap", hasRoute: true },
      ],
    },
    {
      label: "Early Warning",
      icon: "Bell",
      items: [
        { label: "Threshold Settings", to: "/configure/early-warning/threshold", icon: "Bell", hasRoute: true },
      ],
    },
  ],
}
