import type { ModuleDefinition } from "@/shell/registry"

export { PeoplePage } from "./internal/components/PeoplePage"
export { MemberDetailPage } from "./internal/components/MemberDetailPage"

export const peopleModule: ModuleDefinition = {
  name: "people",
  navItems: [{ label: "People", to: "/people", icon: "Users" }],
  pengurusNavItems: [],
}
