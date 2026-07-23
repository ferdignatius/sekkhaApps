// feature/events/components/EventsPage
// Events page: month calendar with colored dots + event list below.
// - Default: show all events in the visible month
// - Tap a date: show events on that date only (tap again to deselect)
// - Pengurus+: "Buat Event" button, edit from detail view

import { useState, useMemo } from "react"
import { PlusIcon, CalendarDaysIcon, SearchIcon, FilterIcon } from "lucide-react"
import { useAuth } from "@/modules/auth"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { EventCalendar } from "@/components/ui/EventCalendar"
import { EventCard } from "./EventCard"
import { EventDetailSheet } from "./EventDetailSheet"
import { EventForm } from "./EventForm"
import { EVENT_TAG_COLORS } from "../types"
import type { EventListItem, CreateEventPayload, EventTag, AttendanceRecord } from "../types"

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

type View = "calendar" | "detail"

export function EventsPage() {
  const { authState } = useAuth()
  const role = authState.status === "authenticated" ? authState.role : null
  const isPengurus = role === "pengurus" || role === "admin"

  const [events, setEvents] = useState<EventListItem[]>(INITIAL_EVENTS)
  const [view, setView] = useState<View>("calendar")
  const [selected, setSelected] = useState<EventListItem | null>(null)
  const [editTarget, setEditTarget] = useState<EventListItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [activeMonth, setActiveMonth] = useState<Date>(new Date(2025, 6, 1))
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [tagFilter, setTagFilter] = useState<EventTag | "all">("all")

  // Attendance records keyed by event id
  const [attendances, setAttendances] = useState<Record<string, AttendanceRecord[]>>({})

  function handleRecordAttendance(eventId: string, record: AttendanceRecord) {
    setAttendances(prev => ({
      ...prev,
      [eventId]: [...(prev[eventId] ?? []), record],
    }))
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
    let base = events
      .filter(ev => isSameMonth(ev.event_date, activeMonth))
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

    if (selectedDate) {
      base = base.filter(ev => toDateKey(ev.event_date) === selectedDate)
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      base = base.filter(ev =>
        ev.title.toLowerCase().includes(q) ||
        ev.location.toLowerCase().includes(q)
      )
    }

    // Tag filter
    if (tagFilter !== "all") {
      base = base.filter(ev => (ev.tag ?? ev.event_type) === tagFilter)
    }

    return base
  }, [events, activeMonth, selectedDate, searchQuery, tagFilter])

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
    setFormOpen(false)
  }

  // ────────────────────────────────────────────────────────────────────────────
  // Detail view
  if (view === "detail" && selected) {
    return (
      <main>
        <PageBreadcrumb
          items={[
            {
              label: "Events",
              href: "/events",
              onClick: () => { setSelected(null); setView("calendar") },
            },
            { label: selected.title },
          ]}
          onBack={() => { setSelected(null); setView("calendar") }}
        />
        <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12 pb-24 md:pb-12">
          <div className="mx-auto max-w-7xl">
            <div className="rounded-xl border border-sekkha-hairline-soft bg-sekkha-canvas p-5">
              <EventDetailSheet
                event={selected}
                role={role}
                onClose={() => { setSelected(null); setView("calendar") }}
                onEdit={isPengurus ? ev => { setEditTarget(ev); setFormOpen(true) } : undefined}
                onDelete={isPengurus ? ev => {
                  setEvents(prev => prev.filter(e => e.id !== ev.id))
                  setSelected(null)
                  setView("calendar")
                } : undefined}
                onDuplicate={isPengurus ? ev => {
                  const dup: EventListItem = {
                    ...ev,
                    id: `event-${Date.now()}`,
                    title: `${ev.title} (Salinan)`,
                  }
                  setEvents(prev => [dup, ...prev])
                  setSelected(dup)
                } : undefined}
                onStatusChange={isPengurus ? (eventId, newStatus) => {
                  setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e))
                  setSelected(prev => prev && prev.id === eventId ? { ...prev, status: newStatus } : prev)
                } : undefined}
                attendances={attendances[selected.id] ?? []}
                onRecordAttendance={handleRecordAttendance}
              />
            </div>
          </div>
        </div>

        {/* Create / Edit event modal */}
        <ResponsiveFormModal
          open={formOpen}
          onOpenChange={(open) => {
            setFormOpen(open)
            if (!open) setEditTarget(null)
          }}
          title={editTarget ? "Edit Event" : "Buat Event Baru"}
          description={editTarget ? "Perbarui detail event." : "Isi form untuk membuat event baru."}
        >
          <EventForm
            initial={editTarget ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => { setEditTarget(null); setFormOpen(false) }}
          />
        </ResponsiveFormModal>
      </main>
    )
  }

  // Calendar + list view
  return (
    <main className="min-h-screen bg-sekkha-surface pb-32 md:pb-12">
      <PageBreadcrumb items={[{ label: "Events" }]} />

      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          
          {/* ── Month & Year Title Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h1 className="text-body-base sm:text-heading-4 font-extrabold text-sekkha-ink tracking-tight">
                {selectedDate ? formatSelectedDate(selectedDate) : formatMonthLabel(activeMonth)}
              </h1>
              <p className="text-micro sm:text-caption font-medium text-sekkha-slate">
                Agenda kegiatan & kebaktian pemuda vihara
              </p>
            </div>
          </div>

          {/* ── Mobile-Only: Calendar Mini Top Section ── */}
          <div className="w-full lg:hidden">
            <div className="relative rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/95 backdrop-blur-md p-3.5 shadow-xs">
              <EventCalendar
                dots={dotMap}
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={activeMonth}
                onMonthChange={month => { setActiveMonth(month); setSelectedDate(null) }}
              />
            </div>
          </div>
          
          {/* ── Search Bar + Filter Button + Create Button Row (Inline 1 Baris di Mobile) ── */}
          <div className="relative flex flex-row items-center gap-2 w-full z-20">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-sekkha-brand-blue pointer-events-none z-10" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari event..."
                className="w-full rounded-xl border border-sekkha-hairline bg-sekkha-canvas/95 backdrop-blur-md py-2.5 pl-9 pr-3 text-caption text-sekkha-ink placeholder:text-sekkha-slate/70 outline-none shadow-2xs focus:border-sekkha-brand-blue transition-all"
              />
            </div>

            {/* Single Filter Button (Icon-only di mobile, Icon + Text di sm+) */}
            <button
              type="button"
              onClick={() => setTagFilter(prev => prev === "all" ? "retreat" : prev === "retreat" ? "meditasi" : prev === "meditasi" ? "rutin" : prev === "rutin" ? "sosial" : prev === "sosial" ? "special" : "all")}
              className="flex h-10 items-center justify-center gap-2 rounded-xl border border-sekkha-hairline bg-sekkha-canvas/95 backdrop-blur-md px-3 sm:px-4 text-caption-bold text-sekkha-ink shadow-2xs hover:bg-sekkha-surface transition-all shrink-0 active:scale-95"
              title={tagFilter === "all" ? "Semua Filter" : `Kategori: ${tagFilter}`}
            >
              <FilterIcon className="size-4 text-sekkha-brand-blue" />
              <span className="hidden sm:inline capitalize">
                {tagFilter === "all" ? "Semua Filter" : `Kategori: ${tagFilter}`}
              </span>
            </button>

            {/* Create button for Pengurus (Icon-only di mobile, Icon + Text di sm+) */}
            {isPengurus && (
              <button
                type="button"
                onClick={() => { setEditTarget(null); setFormOpen(true) }}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-sekkha-brand-blue px-3 sm:px-4 text-caption-bold text-white shadow-2xs hover:bg-blue-700 transition-all shrink-0 active:scale-95"
                title="Buat Event Baru"
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Buat Event</span>
              </button>
            )}

          </div>

          {/* ── Two-column layout: Single Integrated Event Card (2/3) | Calendar Mini (1/3 Desktop) ──────── */}
          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row items-start">

            {/* ── Left: Single Integrated Glassmorphism Event Card (2/3 on desktop) ──────────────────────── */}
            <div className="flex-1 w-full lg:min-w-0">
              <div className="relative rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/95 backdrop-blur-md p-4 sm:p-5 shadow-xs">
                
                {/* Card Sub-header */}
                <div className="mb-3 flex items-center justify-between border-b border-sekkha-hairline-soft pb-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sekkha-brand-blue text-white shadow-xs">
                      <CalendarDaysIcon className="size-4" />
                    </span>
                    <h2 className="text-body-sm-medium font-bold text-sekkha-ink">
                      Daftar Kegiatan Vihara
                    </h2>
                    <span className="rounded-full bg-sekkha-brand-blue/10 px-2 py-0.5 text-micro-bold text-sekkha-brand-blue">
                      {listedEvents.length} Event
                    </span>
                  </div>
                  {selectedDate && (
                    <button
                      type="button"
                      onClick={() => setSelectedDate(null)}
                      className="text-xs font-bold text-sekkha-brand-blue hover:underline"
                    >
                      Tampilkan Semua
                    </button>
                  )}
                </div>

                {listedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2.5 py-12 text-center">
                    <CalendarDaysIcon className="size-10 text-sekkha-slate/40" aria-hidden="true" />
                    <p className="text-caption font-medium text-sekkha-slate">
                      {selectedDate ? "Tidak ada event di tanggal ini." : "Tidak ada event bulan ini."}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-sekkha-hairline-soft">
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

            {/* ── Right: Mini Calendar Card (Desktop Only lg+) ───────────────────────── */}
            <aside className="hidden lg:block w-full shrink-0 lg:w-80 xl:w-96">
              <div className="sticky top-16 relative rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/95 backdrop-blur-md p-4 shadow-xs">
                
                <EventCalendar
                  dots={dotMap}
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={activeMonth}
                  onMonthChange={month => { setActiveMonth(month); setSelectedDate(null) }}
                />

                {/* Tag Legend */}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-sekkha-hairline-soft pt-3 text-micro">
                  {(Object.entries(EVENT_TAG_COLORS) as [EventTag, typeof EVENT_TAG_COLORS[EventTag]][]).map(
                    ([tag, colors]) => (
                      <div key={tag} className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${colors.dot}`} aria-hidden="true" />
                        <span className="capitalize font-medium text-sekkha-slate">{tag}</span>
                      </div>
                    ),
                  )}
                </div>

              </div>
            </aside>

          </div>
        </div>
      </div>

      {/* Create / Edit event modal (drawer on mobile, modal on desktop) */}
      <ResponsiveFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditTarget(null)
        }}
        title={editTarget ? "Edit Event" : "Buat Event Baru"}
        description={editTarget ? "Perbarui detail event." : "Isi form untuk membuat event baru."}
      >
        <EventForm
          initial={editTarget ?? undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => { setEditTarget(null); setFormOpen(false) }}
        />
      </ResponsiveFormModal>
    </main>
  )
}
