import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { GenericSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/people/$memberId")({
  component: lazyRouteComponent(() =>
    import("@/modules/people").then((m) => ({ default: m.MemberDetailPage }))
  ),
  pendingComponent: GenericSkeleton,
})
