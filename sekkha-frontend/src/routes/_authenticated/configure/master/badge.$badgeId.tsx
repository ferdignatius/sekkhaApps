import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
export const Route = createFileRoute("/_authenticated/configure/master/badge/$badgeId")({ component: lazyRouteComponent(() => import("@/modules/configure").then(m => ({ default: m.BadgeDetailPage }))) })
