import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { LeaderboardSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/leaderboard/")({
  component: lazyRouteComponent(() => import("@/modules/leaderboard").then(m => ({ default: m.LeaderboardPage }))),
  pendingComponent: LeaderboardSkeleton,
})
