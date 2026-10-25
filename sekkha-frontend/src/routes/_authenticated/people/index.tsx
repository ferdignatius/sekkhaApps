import {
  createFileRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router"
import { PeopleSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/people/")({
  beforeLoad: ({ context }) => {
    const role = (context as any).authState?.role
    if (role !== "organizer" && role !== "pengurus" && role !== "admin") {
      throw redirect({ to: "/home" })
    }
  },
  component: lazyRouteComponent(() =>
    import("@/modules/people").then((m) => ({ default: m.PeoplePage }))
  ),
  pendingComponent: PeopleSkeleton,
})
