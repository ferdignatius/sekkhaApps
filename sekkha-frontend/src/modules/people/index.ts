import type { ModuleDefinition } from "@/shell/registry"

export { PeoplePage } from "./internal/components/PeoplePage"
export { MemberDetailPage } from "./internal/components/MemberDetailPage"
export { peopleApi } from "./internal/api/peopleApi"
export type { MemberDto } from "./internal/api/peopleApi"

export const peopleModule: ModuleDefinition = {
  name: "people",
  navItems: [],
  pengurusNavItems: [{ label: "People", to: "/people", icon: "Users" }],
}
