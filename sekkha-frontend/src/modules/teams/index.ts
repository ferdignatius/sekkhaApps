import type { ModuleDefinition } from "@/shell/registry"

export { TeamsPage } from "./internal/components/TeamsPage"

export const teamsModule: ModuleDefinition = {
  name: "teams",
  navItems: [
    { label: "People", to: "/teams", icon: "Users" },
  ],
  pengurusNavItems: [],
}
