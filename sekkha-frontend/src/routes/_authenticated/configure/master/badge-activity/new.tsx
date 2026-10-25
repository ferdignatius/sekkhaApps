import {
  createFileRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router"
import { ConfigureSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute(
  "/_authenticated/configure/master/badge-activity/new"
)({
  beforeLoad: ({ context }) => {
    const role = (context as any).authState.role
    if (role !== "admin") {
      throw redirect({ to: "/configure/master/badge-activity" })
    }
  },
  component: lazyRouteComponent(() =>
    import("@/modules/configure").then((m) => ({
      default: m.BadgeActivityCreatePage,
    }))
  ),
  pendingComponent: ConfigureSkeleton,
})
