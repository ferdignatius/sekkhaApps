import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { GenericSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/home/achievements")({
  component: lazyRouteComponent(() => import("@/feature/profile").then(m => ({ default: m.AchievementsPage }))),
  pendingComponent: GenericSkeleton,
})
