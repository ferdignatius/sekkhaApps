import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { PeopleSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/people/")({
  component: lazyRouteComponent(() =>
    import("@/modules/people").then((m) => ({ default: m.PeoplePage }))
  ),
  pendingComponent: PeopleSkeleton,
})
