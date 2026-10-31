import {
  createFileRoute,
  lazyRouteComponent,
  redirect,
} from "@tanstack/react-router"
import { GenericSkeleton } from "@/components/common/PageSkeletons"
import { safeStorage } from "@/lib/storage"

export const Route = createFileRoute("/_authenticated/insight")({
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
    import("@/modules/pengurus").then((m) => ({ default: m.InsightPage }))
  ),
  pendingComponent: GenericSkeleton,
})
