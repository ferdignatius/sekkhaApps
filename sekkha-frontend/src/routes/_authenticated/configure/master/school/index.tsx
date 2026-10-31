import {
  createFileRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router"
import { ConfigureSkeleton } from "@/components/common/PageSkeletons"
import { safeStorage } from "@/lib/storage"

export const Route = createFileRoute(
  "/_authenticated/configure/master/school/"
)({
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
    import("@/modules/configure").then((m) => ({ default: m.SchoolPage }))
  ),
  pendingComponent: ConfigureSkeleton,
})
