// modules/configure — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { BadgePage } from "./internal/components/BadgePage"
export { LevelPage } from "./internal/components/LevelPage"
export { EventTypePage } from "./internal/components/EventTypePage"
export { AchievementPage } from "./internal/components/AchievementPage"
export { EventTimePage } from "./internal/components/EventTimePage"
export { AttendanceBadgePage } from "./internal/components/AttendanceBadgePage"
export { ThresholdPage } from "./internal/components/ThresholdPage"

export const configureModule: ModuleDefinition = {
  name: "configure",
  navItems: [],
  // Configure sections — pengurus/admin only, dengan sub-menu
  configureSections: [
    {
      label: "Master Data",
      icon: "Layers",
      items: [
        { label: "Kategori Event", to: "/configure/master/event-type", icon: "Tag", hasRoute: true },
        { label: "Badge Tugas Presensi", to: "/configure/master/attendance-badge", icon: "Award", hasRoute: true },
        { label: "Preset Waktu Vihara", to: "/configure/master/event-time", icon: "Clock", hasRoute: true },
        { label: "Badge Pencapaian Umat", to: "/configure/master/badge", icon: "Award", hasRoute: true },
        { label: "Level Umat", to: "/configure/master/level", icon: "Zap", hasRoute: true },
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
        { label: "Threshold", to: "/configure/early-warning/threshold", icon: "Bell", hasRoute: true },
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
