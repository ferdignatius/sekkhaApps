import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { HomeSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/home/")({
  component: lazyRouteComponent(() => import("@/feature/dashboard").then(m => ({ default: m.DashboardPage }))),
  pendingComponent: HomeSkeleton,
})
