// modules/community — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { CommunityPage } from "./internal/components/CommunityPage"

export const communityModule: ModuleDefinition = {
  name: "community",
  navItems: [
    { label: "Komunitas", to: "/community", icon: "MessageCircle" },
  ],
}
