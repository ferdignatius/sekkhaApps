import {
  createFileRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router"
import { PeopleSkeleton } from "@/components/common/PageSkeletons"
import { safeStorage } from "@/lib/storage"

export const Route = createFileRoute("/_authenticated/people/")({
  beforeLoad: ({ context }) => {
    const authState = (context as any)?.authState
    const role = authState?.role
    const token = safeStorage.getItem("sekkha_access_token")
    if (authState?.status === "loading" || (token && !role)) {
      return
    }
    if (role !== "organizer" && role !== "pengurus" && role !== "admin") {
      throw redirect({ to: "/home" })
    }
  },
  component: lazyRouteComponent(() =>
    import("@/modules/people").then((m) => ({ default: m.PeoplePage }))
  ),
  pendingComponent: PeopleSkeleton,
})
