import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { EventsSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/events/")({
  component: lazyRouteComponent(() => import("@/modules/events").then(m => ({ default: m.EventsPage }))),
  pendingComponent: EventsSkeleton,
})
