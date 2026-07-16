import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { GenericSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/notifications")({
  component: lazyRouteComponent(() => import("@/modules/notifications").then(m => ({ default: m.NotificationsPage }))),
  pendingComponent: GenericSkeleton,
})
