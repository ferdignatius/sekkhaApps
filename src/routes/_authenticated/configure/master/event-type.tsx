import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { ConfigureSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/configure/master/event-type")({
  component: lazyRouteComponent(() => import("@/feature/configure").then(m => ({ default: m.EventTypePage }))),
  pendingComponent: ConfigureSkeleton,
})
