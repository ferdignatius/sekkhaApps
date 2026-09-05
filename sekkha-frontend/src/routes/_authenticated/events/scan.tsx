import { createFileRoute, lazyRouteComponent } from "@tanstack/react-router"

function ScanLoadingSkeleton() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black text-white gap-3 font-sans">
      <div className="size-8 animate-spin rounded-full border-4 border-amber-400 border-t-transparent" />
      <p className="text-caption font-semibold">Preparing Attendance Scanner...</p>
    </div>
  )
}

export const Route = createFileRoute("/_authenticated/events/scan")({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      eventId: typeof search.eventId === "string" ? search.eventId : undefined,
    }
  },
  component: lazyRouteComponent(() =>
    import("@/modules/events").then((m) => ({ default: m.AttendanceScanPage }))
  ),
  pendingComponent: ScanLoadingSkeleton,
})
