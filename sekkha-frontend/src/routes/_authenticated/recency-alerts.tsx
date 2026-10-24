import { createFileRoute, redirect } from "@tanstack/react-router"

export const Route = createFileRoute("/_authenticated/recency-alerts")({
  beforeLoad: () => {
    throw redirect({ to: "/insight" })
  },
  component: () => null,
})
