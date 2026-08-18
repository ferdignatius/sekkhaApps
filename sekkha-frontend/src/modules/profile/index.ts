// modules/profile — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { ProfilePage } from "./internal/components/ProfilePage"
export { AchievementsPage } from "./internal/components/AchievementsPage"

export const profileModule: ModuleDefinition = {
  name: "profile",
  navItems: [
    { label: "Profil", to: "/home/profile", icon: "User" },
  ],
}
