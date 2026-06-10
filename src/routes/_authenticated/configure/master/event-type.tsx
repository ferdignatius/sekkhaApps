import { createFileRoute } from "@tanstack/react-router"
import { EventTypePage } from "@/feature/configure"

export const Route = createFileRoute("/_authenticated/configure/master/event-type")({
  component: EventTypePage,
})
