import {
  createFileRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router"
import { GenericSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/people/$memberId")({
  beforeLoad: ({ context }) => {
    const role = (context as any).authState?.role
    if (!role || role === "member" || role === "umat") {
      throw redirect({ to: "/home" })
    }
  },
  component: lazyRouteComponent(() =>
    import("@/modules/people").then((m) => ({ default: m.MemberDetailPage }))
  ),
  pendingComponent: GenericSkeleton,
})
