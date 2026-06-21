import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { GenericSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/analysis")({
  component: lazyRouteComponent(() => import("@/feature/pengurus").then(m => ({ default: m.AnalysisPage }))),
  pendingComponent: GenericSkeleton,
})
