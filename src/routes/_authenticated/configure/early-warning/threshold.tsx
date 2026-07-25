import { createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router"
import { ConfigureSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/configure/early-warning/threshold")({
  beforeLoad: ({ context }) => {
    const role = (context as any).authState.role
    if (role !== "pengurus" && role !== "admin") {
      throw redirect({ to: "/home" })
    }
  },
  component: lazyRouteComponent(() => import("@/modules/configure").then(m => ({ default: m.ThresholdPage }))),
  pendingComponent: ConfigureSkeleton,
})
