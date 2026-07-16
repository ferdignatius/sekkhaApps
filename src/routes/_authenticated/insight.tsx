import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { GenericSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/insight")({
  component: lazyRouteComponent(() => import("@/modules/pengurus").then(m => ({ default: m.InsightPage }))),
  pendingComponent: GenericSkeleton,
})
