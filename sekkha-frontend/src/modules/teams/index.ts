import type { ModuleDefinition } from "@/shell/registry"

export { TeamsPage } from "./internal/components/TeamsPage"
export { MemberDetailPage } from "./internal/components/MemberDetailPage"

export const teamsModule: ModuleDefinition = {
  name: "teams",
  navItems: [
    { label: "People", to: "/teams", icon: "Users" },
  ],
  pengurusNavItems: [],
}
