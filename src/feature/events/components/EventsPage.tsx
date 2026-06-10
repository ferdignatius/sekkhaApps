// feature/events/components/EventsPage
// Events page: month calendar with colored dots + event list below.
// - Default: show all events in the visible month
// - Tap a date: show events on that date only (tap again to deselect)
// - Pengurus+: "Buat Event" button, edit from detail view

import { useState, useMemo } from "react"
import { PlusIcon, CalendarDaysIcon } from "lucide-react"
import { useAuth } from "@/feature/auth"
import { EventCalendar } from "@/components/ui/EventCalendar"
import { EventCard } from "./EventCard"
import { EventDetailSheet } from "./EventDetailSheet"
import { EventForm } from "./EventForm"
import { EVENT_TAG_COLORS } from "../types"
import type { EventListItem, RsvpStatus, CreateEventPayload, EventTag, AttendanceRecord } from "../types"

// ─── Dummy data ───────────────────────────────────────────────────────────────

function generateQrCode(eventId: string) {
  return {
    code: `EVT-${eventId.toUpperCase().slice(-6)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    expires_at: null,
  }
}

const INITIAL_EVENTS: EventListItem[] = [
  {
    id: "evt-1",
    title: "Kebaktian Minggu",
    description: "Kebaktian rutin setiap Minggu pagi. Terbuka untuk semua umat.",
    location: "Vihara Dharma Bhakti",
    event_date: "2025-07-06T08:00:00+07:00",
    event_type: "rutin",
    tag: "rutin",
    status: "published",
    rsvp_count: 23,
    my_rsvp: null,
    qr_code: { code: "EVT-RUTIN-7A2B", expires_at: null },
  },
  {
    id: "evt-2",
    title: "Retreat Tahunan 2025",
    description: "Retreat tahunan selama 2 hari. Daftar sebelum 10 Juli.",
    location: "Pondok Meditasi Bogor",
    event_date: "2025-07-12T07:00:00+07:00",
    event_type: "special",
    tag: "retreat",
    status: "published",
    rsvp_count: 14,
    my_rsvp: "hadir",
    qr_code: { code: "EVT-RET25-C3D4", expires_at: null },
  },
  {
    id: "evt-3",
    title: "Sesi Meditasi Bersama",
    description: "Meditasi pagi bersama komunitas.",
    location: "Vihara Dharma Bhakti",
    event_date: "2025-07-12T06:00:00+07:00",
    event_type: "rutin",
    tag: "meditasi",
    status: "published",
    rsvp_count: 9,
    my_rsvp: null,
    qr_code: { code: "EVT-MED-E5F6", expires_at: null },
  },
  {
    id: "evt-4",
    title: "Kebaktian Minggu",
    description: "Kebaktian rutin.",
    location: "Vihara Dharma Bhakti",
    event_date: "2025-07-13T08:00:00+07:00",
    event_type: "rutin",
    tag: "rutin",
    status: "published",
    rsvp_count: 18,
    my_rsvp: null,
    qr_code: { code: "EVT-KBK-G7H8", expires_at: null },
  },
  {
    id: "evt-5",
    title: "Bakti Sosial",
    description: "Kegiatan sosial bulanan.",
    location: "Panti Asuhan Harapan",
    event_date: "2025-07-19T09:00:00+07:00",
    event_type: "special",
    tag: "sosial",
    status: "published",
    rsvp_count: 31,
    my_rsvp: null,
    qr_code: { code: "EVT-SOS-I9J0", expires_at: null },
  },
  {
    id: "evt-6",
    title: "Kebaktian Minggu",
    description: "Kebaktian rutin.",
    location: "Vihara Dharma Bhakti",
    event_date: "2025-07-20T08:00:00+07:00",
    event_type: "rutin",
    tag: "rutin",
    status: "published",
    rsvp_count: 20,
    my_rsvp: null,
    qr_code: { code: "EVT-KBK-K1L2", expires_at: null },
  },
  {
    id: "evt-7",
    title: "Retreat Tahunan (hari 2)",
    description: "Lanjutan retreat.",
    location: "Pondok Meditasi Bogor",
    event_date: "2025-07-26T07:00:00+07:00",
    event_type: "special",
    tag: "retreat",
    status: "published",
    rsvp_count: 12,
    my_rsvp: null,
    qr_code: { code: "EVT-RET2-M3N4", expires_at: null },
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(iso: string): string {
  const d = new Date(iso)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function isSameMonth(iso: string, month: Date): boolean {
  const d = new Date(iso)
  return d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
}

function formatSelectedDate(key: string): string {
  const d = new Date(key + "T00:00:00")
  return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

function formatMonthLabel(month: Date): string {
  return month.toLocaleDateString("id-ID", { month: "long", year: "numeric" })
}

// ─── Component ────────────────────────────────────────────────────────────────

type View = "calendar" | "detail" | "form"

export function EventsPage() {
  const { authState } = useAuth()
  const role = authState.status === "authenticated" ? authState.role : null
  const isPengurus = role === "pengurus" || role === "admin"

  const [events, setEvents] = useState<EventListItem[]>(INITIAL_EVENTS)
  const [view, setView] = useState<View>("calendar")
  const [selected, setSelected] = useState<EventListItem | null>(null)
  const [editTarget, setEditTarget] = useState<EventListItem | null>(null)
  const [activeMonth, setActiveMonth] = useState<Date>(new Date(2025, 6, 1))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  // Attendance records keyed by event id
  const [attendances, setAttendances] = useState<Record<string, AttendanceRecord[]>>({})

  function handleRecordAttendance(eventId: string, record: AttendanceRecord) {
    setAttendances(prev => ({
      ...prev,
      [eventId]: [...(prev[eventId] ?? []), record],
    }))
  }

  function handleRegenerateQr(eventId: string) {
    setEvents(prev =>
      prev.map(ev =>
        ev.id === eventId
          ? { ...ev, qr_code: generateQrCode(eventId) }
          : ev,
      ),
    )
    // Keep selected in sync
    setSelected(prev =>
      prev?.id === eventId
        ? { ...prev, qr_code: generateQrCode(eventId) }
        : prev,
    )
  }

  // ── Build dot map for the calendar ──────────────────────────────────────────
  const dotMap = useMemo<Record<string, string[]>>(() => {
    const map: Record<string, string[]> = {}
    for (const ev of events) {
      const key = toDateKey(ev.event_date)
      const tag = (ev.tag ?? ev.event_type) as EventTag
      const color = EVENT_TAG_COLORS[tag]?.dot ?? "bg-sekkha-muted"
      if (!map[key]) map[key] = []
      if (map[key].length < 3) map[key].push(color)
    }
    return map
  }, [events])

  // ── Events to display in the list below the calendar ────────────────────────
  const listedEvents = useMemo(() => {
    const base = events
      .filter(ev => isSameMonth(ev.event_date, activeMonth))
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

    if (!selectedDate) return base
    return base.filter(ev => toDateKey(ev.event_date) === selectedDate)
  }, [events, activeMonth, selectedDate])

  // ── RSVP ─────────────────────────────────────────────────────────────────────
  function handleRsvp(eventId: string, status: RsvpStatus) {
    setEvents(prev =>
      prev.map(ev =>
        ev.id === eventId ? { ...ev, my_rsvp: status } : ev,
      ),
    )
    setSelected(prev =>
      prev?.id === eventId ? { ...prev, my_rsvp: status } : prev,
    )
  }

  function handleFormSubmit(payload: CreateEventPayload) {
    if (editTarget) {
      setEvents(prev =>
        prev.map(ev => ev.id === editTarget.id ? { ...ev, ...payload } : ev),
      )
    } else {
      const newId = `evt-${Date.now()}`
      setEvents(prev => [
        ...prev,
        {
          id: newId,
          ...payload,
          tag: payload.event_type as EventTag,
          status: "published",
          rsvp_count: 0,
          my_rsvp: null,
          qr_code: generateQrCode(newId),  // ← auto-generate QR on creation
        },
      ])
    }
    setEditTarget(null)
    setView("calendar")
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Form view
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
              onCancel={() => { setEditTarget(null); setView("calendar") }}
            />
          </div>
        </div>
      </main>
    )
  }

  // Detail view
  if (view === "detail" && selected) {
    return (
      <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
            <EventDetailSheet
              event={selected}
              role={role}
              onClose={() => { setSelected(null); setView("calendar") }}
              onRsvp={handleRsvp}
              onEdit={isPengurus ? ev => { setEditTarget(ev); setView("form") } : undefined}
              attendances={attendances[selected.id] ?? []}
              onRecordAttendance={handleRecordAttendance}
              onRegenerateQr={handleRegenerateQr}
            />
          </div>
        </div>
      </main>
    )
  }

  // Calendar + list view
  return (
    <main className="px-4 py-6 pb-24 md:px-8 md:pb-8 lg:px-12">
      <div className="mx-auto max-w-3xl space-y-4">
        {/* Page header */}
        <div className="flex items-center justify-between">
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

        {/* Calendar */}
        <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-4">
          <EventCalendar
            dots={dotMap}
            selected={selectedDate}
            onSelect={setSelectedDate}
            month={activeMonth}
            onMonthChange={month => { setActiveMonth(month); setSelectedDate(null) }}
          />

          {/* Tag legend */}
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-sekkha-hairline-soft pt-3">
            {(Object.entries(EVENT_TAG_COLORS) as [EventTag, typeof EVENT_TAG_COLORS[EventTag]][]).map(
              ([tag, colors]) => (
                <div key={tag} className="flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${colors.dot}`} aria-hidden="true" />
                  <span className="text-caption capitalize text-sekkha-slate">{tag}</span>
                </div>
              ),
            )}
          </div>
        </div>

        {/* Event list below calendar */}
        <div>
          {/* List header */}
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-body-sm-medium text-sekkha-ink">
              {selectedDate
                ? formatSelectedDate(selectedDate)
                : formatMonthLabel(activeMonth)}
            </h2>
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-caption text-sekkha-brand-blue hover:underline"
              >
                Lihat semua
              </button>
            )}
          </div>

          {listedEvents.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas py-10 text-center">
              <CalendarDaysIcon className="size-8 text-sekkha-muted" aria-hidden="true" />
              <p className="text-body-sm text-sekkha-muted">
                {selectedDate ? "Tidak ada event di tanggal ini." : "Tidak ada event bulan ini."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {listedEvents.map(ev => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  onClick={() => { setSelected(ev); setView("detail") }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
