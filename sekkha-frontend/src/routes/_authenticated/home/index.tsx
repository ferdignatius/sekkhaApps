import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { HomeSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/home/")({
  component: lazyRouteComponent(() =>
    import("@/modules/home").then((m) => ({ default: m.HomePage }))
  ),
  pendingComponent: HomeSkeleton,
})
