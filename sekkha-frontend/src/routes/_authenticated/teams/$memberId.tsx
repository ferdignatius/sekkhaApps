import { createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router"
import { GenericSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/teams/$memberId")({
  beforeLoad: ({ context }) => {
    const role = (context as any).authState?.role
    if (!role || role === "umat") {
      throw redirect({ to: "/home" })
    }
  },
  component: lazyRouteComponent(() => import("@/modules/teams").then(m => ({ default: m.MemberDetailPage }))),
  pendingComponent: GenericSkeleton,
})
