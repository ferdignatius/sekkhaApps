// modules/configure — Public API
import type { ModuleDefinition } from "@/shell/registry"
export { BadgePage, BadgeFormPage, BadgeDetailPage } from "./internal/components/BadgePage"
export { LevelPage } from "./internal/components/LevelPage"
export { EventTypePage } from "./internal/components/EventTypePage"
export { AchievementPage } from "./internal/components/AchievementPage"
export { AttendanceBadgePage } from "./internal/components/AttendanceBadgePage"
export { ThresholdPage } from "./internal/components/ThresholdPage"
export { SeasonPage } from "./internal/components/SeasonPage"
export { PointsRulesPage } from "./internal/components/PointsRulesPage"
export { SchoolPage } from "./internal/components/SchoolPage"
export const configureModule: ModuleDefinition = { name: "configure", navItems: [], configureSections: [] }
