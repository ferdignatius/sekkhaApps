import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"

export const Route = createFileRoute(
  "/_authenticated/configure/master/school/new"
)({
  component: lazyRouteComponent(() =>
    import("@/modules/configure").then((m) => ({ default: m.SchoolFormPage }))
  ),
})
