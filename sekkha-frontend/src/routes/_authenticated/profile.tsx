import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { ProfileSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/profile")({
  component: lazyRouteComponent(() =>
    import("@/modules/users").then((m) => ({ default: m.ProfilePage }))
  ),
  pendingComponent: ProfileSkeleton,
})
