import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { ProfileSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/home/profile")({
  component: lazyRouteComponent(() => import("@/modules/profile").then(m => ({ default: m.ProfilePage }))),
  pendingComponent: ProfileSkeleton,
})
