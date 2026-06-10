// feature/events/components/EventsPage
// Events calendar page — list of upcoming events with RSVP (umat)
// and create/edit (pengurus+).

import { useState } from "react"
import { CalendarDaysIcon, PlusIcon } from "lucide-react"
import { useAuth } from "@/feature/auth"
import { EventCard } from "./EventCard"
import { EventDetailSheet } from "./EventDetailSheet"
import { EventForm } from "./EventForm"
import type { EventListItem, RsvpStatus, CreateEventPayload } from "../types"

// ─── Dummy data — shapes match GET /events ────────────────────────────────────

const INITIAL_EVENTS: EventListItem[] = [
  {
    id: "evt-1",
    title: "Kebaktian Minggu",
    description: "Kebaktian rutin setiap Minggu pagi. Terbuka untuk semua umat.",
    location: "Vihara Dharma Bhakti",
    event_date: "2025-07-13T08:00:00+07:00",
    event_type: "rutin",
    status: "published",
    rsvp_count: 23,
    my_rsvp: null,
  },
  {
    id: "evt-2",
    title: "Retreat Tahunan 2025",
    description: "Retreat tahunan selama 2 hari. Daftar sebelum 10 Juli.",
    location: "Pondok Meditasi Bogor",
    event_date: "2025-07-26T07:00:00+07:00",
    event_type: "special",
    status: "published",
    rsvp_count: 14,
    my_rsvp: "hadir",
  },
  {
    id: "evt-3",
    title: "Kebaktian Minggu",
    description: "Kebaktian rutin setiap Minggu pagi.",
    location: "Vihara Dharma Bhakti",
    event_date: "2025-07-20T08:00:00+07:00",
    event_type: "rutin",
    status: "published",
    rsvp_count: 18,
    my_rsvp: null,
  },
]

// ─── Month grouping ───────────────────────────────────────────────────────────

function groupByMonth(events: EventListItem[]) {
  const groups = new Map<string, EventListItem[]>()
  for (const ev of events) {
    const key = new Date(ev.event_date).toLocaleDateString("id-ID", {
      month: "long", year: "numeric",
    })
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(ev)
  }
  return groups
}

// ─── Component ───────────────────────────────────────────────────────────────

type View = "list" | "detail" | "form"

export function EventsPage() {
  const { authState } = useAuth()
  const role = authState.status === "authenticated" ? authState.role : null
  const isPengurus = role === "pengurus" || role === "admin"

  const [events, setEvents] = useState<EventListItem[]>(INITIAL_EVENTS)
  const [view, setView] = useState<View>("list")
  const [selected, setSelected] = useState<EventListItem | null>(null)
  const [editTarget, setEditTarget] = useState<EventListItem | null>(null)

  // ── RSVP handler ────────────────────────────────────────────────────────────
  function handleRsvp(eventId: string, status: RsvpStatus) {
    setEvents(prev =>
      prev.map(ev =>
        ev.id === eventId
          ? { ...ev, my_rsvp: status, rsvp_count: ev.my_rsvp ? ev.rsvp_count : ev.rsvp_count + (status === "hadir" ? 1 : 0) }
          : ev,
      ),
    )
    // Update the selected event state too
    setSelected(prev =>
      prev?.id === eventId ? { ...prev, my_rsvp: status } : prev,
    )
  }

  // ── Create / edit handler ───────────────────────────────────────────────────
  function handleFormSubmit(payload: CreateEventPayload) {
    if (editTarget) {
      setEvents(prev =>
        prev.map(ev =>
          ev.id === editTarget.id ? { ...ev, ...payload } : ev,
        ),
      )
    } else {
      const newEvent: EventListItem = {
        id: `evt-${Date.now()}`,
        ...payload,
        status: "published",
        rsvp_count: 0,
        my_rsvp: null,
      }
      setEvents(prev => [...prev, newEvent].sort(
        (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
      ))
    }
    setEditTarget(null)
    setView("list")
  }

  // ── Sorted + grouped events ─────────────────────────────────────────────────
  const sorted = [...events].sort(
    (a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime(),
  )
  const groups = groupByMonth(sorted)

  // ────────────────────────────────────────────────────────────────────────────
  // Render: form view
  if (view === "form") {
    return (
      <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="mb-6 text-heading-5 text-sekkha-ink">
            {editTarget ? "Edit Event" : "Buat Event Baru"}
          </h1>
          <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
            <EventForm
              initial={editTarget ?? undefined}
              onSubmit={handleFormSubmit}
              onCancel={() => { setEditTarget(null); setView("list") }}
            />
          </div>
        </div>
      </main>
    )
  }

  // Render: detail sheet (overlay style on mobile, panel on desktop)
  if (view === "detail" && selected) {
    return (
      <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
            <EventDetailSheet
              event={selected}
              role={role}
              onClose={() => { setSelected(null); setView("list") }}
              onRsvp={(id, status) => { handleRsvp(id, status) }}
              onEdit={isPengurus ? (ev) => { setEditTarget(ev); setView("form") } : undefined}
            />
          </div>
        </div>
      </main>
    )
  }

  // Render: list view
  return (
    <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
      <div className="mx-auto max-w-3xl">
        {/* Page header */}
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDaysIcon className="size-5 text-sekkha-brand-blue" aria-hidden="true" />
            <h1 className="text-heading-5 text-sekkha-ink">Events</h1>
          </div>
          {isPengurus && (
            <button
              type="button"
              onClick={() => { setEditTarget(null); setView("form") }}
              className="flex items-center gap-1.5 rounded-full bg-sekkha-primary px-4 py-2 text-body-sm-medium text-white transition-opacity hover:opacity-90"
            >
              <PlusIcon className="size-4" aria-hidden="true" />
              Buat Event
            </button>
          )}
        </div>

        {/* Event list grouped by month */}
        {events.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <CalendarDaysIcon className="size-10 text-sekkha-muted" aria-hidden="true" />
            <p className="text-body-sm text-sekkha-muted">Belum ada event yang dijadwalkan.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(groups.entries()).map(([month, monthEvents]) => (
              <section key={month} aria-labelledby={`month-${month}`}>
                <h2
                  id={`month-${month}`}
                  className="mb-3 text-micro-uppercase text-sekkha-muted"
                >
                  {month}
                </h2>
                <div className="space-y-3">
                  {monthEvents.map(ev => (
                    <EventCard
                      key={ev.id}
                      event={ev}
                      onClick={() => { setSelected(ev); setView("detail") }}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
