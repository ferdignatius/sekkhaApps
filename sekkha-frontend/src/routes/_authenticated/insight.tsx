import { createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router"
import { GenericSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/insight")({
  beforeLoad: ({ context }) => {
    const role = (context as any).authState.role
    if (role !== "pengurus" && role !== "admin") {
      throw redirect({ to: "/home" })
    }
  },
  component: lazyRouteComponent(() => import("@/modules/pengurus").then(m => ({ default: m.InsightPage }))),
  pendingComponent: GenericSkeleton,
})
