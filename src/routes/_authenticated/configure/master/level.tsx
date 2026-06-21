import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { ConfigureSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/configure/master/level")({
  component: lazyRouteComponent(() => import("@/feature/configure").then(m => ({ default: m.LevelPage }))),
  pendingComponent: ConfigureSkeleton,
})
