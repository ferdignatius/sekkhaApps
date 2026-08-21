import { createFileRoute, lazyRouteComponent, redirect } from "@tanstack/react-router"
import { ConfigureSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/configure/master/badge")({
  beforeLoad: () => {
    throw redirect({ to: "/configure/master/achievement" })
  },
  component: () => null,
})

