import type { ModuleDefinition } from "@/shell/registry"

export { PeoplePage } from "./internal/components/PeoplePage"
export { MemberDetailPage } from "./internal/components/MemberDetailPage"
export { PreProvisionMemberModal } from "./internal/components/PreProvisionMemberModal"
export {
  SimilarMembersNotice,
  SimilarMembersModal,
} from "./internal/components/SimilarMembersModal"
export { useSimilarMembers } from "./internal/hooks/useSimilarMembers"
export { peopleApi } from "./internal/api/peopleApi"
export type {
  MemberDto,
  CreateMemberPayload,
  CreateMemberResponse,
  SimilarMemberDto,
  SimilarMembersResponse,
  VerifiedSchoolDto,
} from "./internal/api/peopleApi"

export const peopleModule: ModuleDefinition = {
  name: "people",
  navItems: [],
  pengurusNavItems: [{ label: "People", to: "/people", icon: "Users" }],
}
