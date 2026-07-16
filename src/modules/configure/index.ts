// modules/configure — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { BadgePage } from "./internal/components/BadgePage"
export { LevelPage } from "./internal/components/LevelPage"
export { EventTypePage } from "./internal/components/EventTypePage"
export { AchievementPage } from "./internal/components/AchievementPage"

export const configureModule: ModuleDefinition = {
  name: "configure",
  navItems: [],
  // Configure sections — pengurus/admin only, dengan sub-menu
  configureSections: [
    {
      label: "Master Data",
      icon: "Layers",
      items: [
        { label: "Badge", to: "/configure/master/badge", icon: "Award", hasRoute: true },
        { label: "Level", to: "/configure/master/level", icon: "Zap", hasRoute: true },
        { label: "Event Type", to: "/configure/master/event-type", icon: "Tag", hasRoute: true },
        { label: "Achievement", to: "/configure/master/achievement", icon: "Trophy", hasRoute: true },
      ],
    },
    {
      label: "Gamifikasi Rules",
      icon: "Activity",
      items: [
        { label: "Poin per Aksi", to: "/configure/gamifikasi/poin", icon: "Zap", hasRoute: false },
        { label: "Streak Logic", to: "/configure/gamifikasi/streak", icon: "Activity", hasRoute: false },
      ],
    },
    {
      label: "Early Warning",
      icon: "Bell",
      items: [
        { label: "Threshold", to: "/configure/early-warning/threshold", icon: "Bell", hasRoute: false },
      ],
    },
    {
      label: "Organisasi",
      icon: "Building",
      items: [
        { label: "Profil Vihara", to: "/configure/organisasi/profil", icon: "Building", hasRoute: false },
        { label: "Pengurus", to: "/configure/organisasi/pengurus", icon: "Users", hasRoute: false },
      ],
    },
  ],
}
