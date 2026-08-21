// modules/events — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { EventsPage } from "./internal/components/EventsPage"
export type { EventListItem, EventType } from "./internal/types"

export const eventsModule: ModuleDefinition = {
  name: "events",
  navItems: [
    { label: "Events", to: "/events", icon: "CalendarDays" },
  ],
}
