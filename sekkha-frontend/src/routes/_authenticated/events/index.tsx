import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"
import { EventsSkeleton } from "@/components/common/PageSkeletons"

export const Route = createFileRoute("/_authenticated/events/")({
  validateSearch: (
    search: Record<string, unknown>
  ): { eventId?: string } => ({
    eventId:
      typeof search.eventId === "string" && search.eventId.trim() !== ""
        ? search.eventId
        : undefined,
  }),
  component: lazyRouteComponent(() =>
    import("@/modules/events").then((m) => ({ default: m.EventsPage }))
  ),
  pendingComponent: EventsSkeleton,
})
