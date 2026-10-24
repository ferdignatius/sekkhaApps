import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/pengurus-contribution")({
  beforeLoad: () => {
    throw redirect({ to: "/insight" })
  },
  component: () => null,
})
