import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { CommunitySkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/community/")({
  component: lazyRouteComponent(() => import("@/feature/community").then(m => ({ default: m.CommunityPage }))),
  pendingComponent: CommunitySkeleton,
})
