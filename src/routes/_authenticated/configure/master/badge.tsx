import { createFileRoute } from "@tanstack/react-router"
import { BadgePage } from "@/feature/configure"

export const Route = createFileRoute("/_authenticated/configure/master/badge")({
  component: BadgePage,
})
