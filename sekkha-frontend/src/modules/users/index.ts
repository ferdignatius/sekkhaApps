// modules/profile — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { ProfilePage } from "./internal/components/ProfilePage"

export const profileModule: ModuleDefinition = {
  name: "profile",
  navItems: [{ label: "Profile", to: "/profile", icon: "User" }],
}
