import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/configure/master/badge")({
  beforeLoad: () => {
    throw redirect({ to: "/configure/master/achievement" })
  },
  component: () => null,
})

