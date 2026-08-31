// feature/events/components/EventsPage
// Events page: month calendar with colored dots + event list below.
// Role-based Category Filtering (Many-to-Many Access Control) & Dynamic Master Data Colors.

import { useState, useMemo, useEffect } from "react"
import { PlusIcon, CalendarDaysIcon, SearchIcon } from "lucide-react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { EventCalendar } from "@/components/ui/EventCalendar"
import type { EventDotItem } from "@/components/ui/EventCalendar"
import { useDebounce } from "@/hooks/useDebounce"
import { Skeleton } from "@/components/ui/skeleton"
import { EventCard } from "./EventCard"
import { EventDetailSheet } from "./EventDetailSheet"
import { EventForm } from "./EventForm"
import { getAccessibleCategories, getCategoryColor } from "../masterdata"
import type { EventListItem, CreateEventPayload, AttendanceRecord } from "../types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function isSameMonth(iso?: string, month?: Date): boolean {
  if (!iso || !month) return false
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
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

  const [events, setEvents] = useState<EventListItem[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [view, setView] = useState<View>("calendar")
  const [selected, setSelected] = useState<EventListItem | null>(null)
  const [editTarget, setEditTarget] = useState<EventListItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [activeMonth, setActiveMonth] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 250)
  const [selectedCategoryTag, setSelectedCategoryTag] = useState<string>("all")

  // Dynamic Accessible Categories for logged in User Role
  const accessibleCategories = useMemo(() => {
    return getAccessibleCategories(role, true)
  }, [role])

  const accessibleTagsSet = useMemo(() => {
    return new Set(accessibleCategories.map(c => c.tag.toLowerCase()))
  }, [accessibleCategories])

  // Load events from backend API
  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    try {
      setLoadingEvents(true)
      const data = await api.get<EventListItem[]>("/events")
      setEvents(data)
    } catch (err) {
      console.error("Gagal memuat event dari server:", err)
      setEvents([])
    } finally {
      setLoadingEvents(false)
    }
  }

  // Attendance records keyed by event id
  const [attendances, setAttendances] = useState<Record<string, AttendanceRecord[]>>({})

  useEffect(() => {
    if (selected?.id) {
      loadEventAttendances(selected.id)
    }
  }, [selected?.id])

  async function loadEventAttendances(eventId: string) {
    try {
      const data = await api.get<AttendanceRecord[]>(`/events/${eventId}/attendances`)
      setAttendances(prev => ({ ...prev, [eventId]: data }))
    } catch (err) {
      console.error("Gagal memuat presensi event:", err)
    }
  }

  function handleRecordAttendance(eventId: string, _record: AttendanceRecord) {
    loadEventAttendances(eventId)
  }

  // ── Build dot map for calendar (Filtered by Role Permission & Master Data Colors) ──
  const dotMap = useMemo<Record<string, EventDotItem[]>>(() => {
    const map: Record<string, EventDotItem[]> = {}
    for (const ev of events) {
      const tagKey = (ev.tag ?? ev.event_type ?? "").toLowerCase()
      // Skip events whose category is not accessible by current user role
      if (!accessibleTagsSet.has(tagKey)) continue

      const key = toDateKey(ev.event_date)
      const colorInfo = getCategoryColor(tagKey)
      if (!map[key]) map[key] = []
      if (map[key].length < 3) {
        map[key].push({ colorHex: colorInfo.hex })
      }
    }
    return map
  }, [events, accessibleTagsSet])

  // ── Events to display in list (Filtered by Role Permission, Month, Date, Search, Category) ──
  const listedEvents = useMemo(() => {
    let base = events
      .filter(ev => {
        const tagKey = (ev.tag ?? ev.event_type ?? "").toLowerCase()
        return accessibleTagsSet.has(tagKey) && isSameMonth(ev.event_date, activeMonth)
      })
      .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())

    if (selectedDate) {
      base = base.filter(ev => toDateKey(ev.event_date) === selectedDate)
    }

    // Search filter with debounced query
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase()
      base = base.filter(ev =>
        ev.title.toLowerCase().includes(q) ||
        ev.location.toLowerCase().includes(q)
      )
    }

    // Category Tag filter
    if (selectedCategoryTag !== "all") {
      base = base.filter(ev => (ev.tag ?? ev.event_type ?? "").toLowerCase() === selectedCategoryTag.toLowerCase())
    }

    return base
  }, [events, accessibleTagsSet, activeMonth, selectedDate, debouncedSearchQuery, selectedCategoryTag])

  async function handleFormSubmit(payload: CreateEventPayload) {
    try {
      if (editTarget) {
        await api.put(`/events/${editTarget.id}`, payload)
      } else {
        await api.post("/events", payload)
      }
      await loadEvents()
    } catch (err) {
      console.error("Gagal menyimpan event:", err)
    } finally {
      setEditTarget(null)
      setFormOpen(false)
    }
  }

  // ── Detail View ──
  if (view === "detail" && selected) {
    return (
      <main className="font-sans text-left">
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
                onDelete={isPengurus ? async ev => {
                  if (!window.confirm(`Apakah Anda yakin ingin menghapus event "${ev.title}"?`)) return
                  try {
                    await api.delete(`/events/${ev.id}`)
                    setEvents(prev => prev.filter(e => e.id !== ev.id))
                    setSelected(null)
                    setView("calendar")
                  } catch (err) {
                    console.error("Gagal menghapus event dari server:", err)
                    alert("Gagal menghapus event dari server.")
                  }
                } : undefined}
                onDuplicate={isPengurus ? async ev => {
                  try {
                    const payload: CreateEventPayload = {
                      title: `${ev.title} (Salinan)`,
                      description: ev.description ?? "",
                      location: ev.location ?? "",
                      event_date: ev.event_date,
                      event_type: ev.event_type,
                      tag: ev.tag,
                    }
                    const dup = await api.post<EventListItem>("/events", payload)
                    setEvents(prev => [dup, ...prev])
                    setSelected(dup)
                  } catch (err) {
                    console.error("Gagal menduplikasi event:", err)
                    alert("Gagal menduplikasi event ke server.")
                  }
                } : undefined}
                onStatusChange={isPengurus ? async (eventId, newStatus) => {
                  try {
                    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e))
                    setSelected(prev => prev && prev.id === eventId ? { ...prev, status: newStatus } : prev)
                    await api.patch(`/events/${eventId}/status`, { status: newStatus })
                    await loadEvents()
                  } catch (err) {
                    console.error("Gagal memperbarui status event ke server:", err)
                    await loadEvents()
                  }
                } : undefined}
                attendances={attendances[selected.id] ?? []}
                onRecordAttendance={handleRecordAttendance}
                onDeleteAttendance={isPengurus ? async (userId) => {
                  try {
                    await api.delete(`/events/${selected.id}/attendances/${userId}`)
                    await loadEventAttendances(selected.id)
                  } catch (err) {
                    console.error("Gagal menghapus presensi:", err)
                  }
                } : undefined}
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
            initialDate={!editTarget && selectedDate ? selectedDate : undefined}
            onSubmit={handleFormSubmit}
            onCancel={() => { setEditTarget(null); setFormOpen(false) }}
          />
        </ResponsiveFormModal>
      </main>
    )
  }

  // ── Calendar + List View ──
  return (
    <main className="min-h-screen bg-sekkha-surface pb-32 md:pb-12 font-sans text-left">
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
          
          {/* ── Search Bar + Category Filter + Create Button Row ── */}
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

            {/* Dynamic Role-Based Category Filter Dropdown / Toggle */}
            <div className="relative shrink-0">
              <select
                value={selectedCategoryTag}
                onChange={e => setSelectedCategoryTag(e.target.value)}
                className="h-10 rounded-xl border border-sekkha-hairline bg-sekkha-canvas/95 backdrop-blur-md px-3 text-caption-bold text-sekkha-ink outline-none shadow-2xs focus:border-sekkha-brand-blue transition-all cursor-pointer capitalize"
              >
                <option value="all">Semua Kategori</option>
                {accessibleCategories.map(cat => (
                  <option key={cat.id} value={cat.tag}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Create button for Pengurus */}
            {isPengurus && (
              <button
                type="button"
                onClick={() => { setEditTarget(null); setFormOpen(true) }}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-sekkha-brand-blue px-3 sm:px-4 text-caption-bold text-white shadow-2xs hover:bg-blue-700 transition-all shrink-0 active:scale-95 cursor-pointer"
                title="Buat Event Baru"
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Buat Event</span>
              </button>
            )}

          </div>

          {/* ── Two-column layout: Integrated Event List (2/3) | Calendar Mini (1/3 Desktop) ── */}
          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row items-start">

            {/* ── Left: Event List Container ── */}
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

                {loadingEvents ? (
                  <div className="space-y-3 py-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-3.5 p-3 rounded-xl border border-sekkha-hairline bg-white/70">
                        <Skeleton className="size-11 rounded-xl shrink-0" />
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <Skeleton className="h-4 w-40 rounded-md" />
                          <Skeleton className="h-3 w-24 rounded-md" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : listedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2.5 py-12 text-center">
                    <CalendarDaysIcon className="size-10 text-sekkha-slate/40" aria-hidden="true" />
                    <p className="text-caption font-medium text-sekkha-slate">
                      {selectedDate ? "Tidak ada event di tanggal ini." : "Tidak ada event yang dapat diakses bulan ini."}
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

            {/* ── Right: Mini Calendar Card (Desktop Only lg+) ── */}
            <aside className="hidden lg:block w-full shrink-0 lg:w-80 xl:w-96">
              <div className="sticky top-16 relative rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/95 backdrop-blur-md p-4 shadow-xs">
                
                <EventCalendar
                  dots={dotMap}
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={activeMonth}
                  onMonthChange={month => { setActiveMonth(month); setSelectedDate(null) }}
                />

                {/* Dynamic Master Data Category Legend */}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-sekkha-hairline-soft pt-3 text-micro">
                  {accessibleCategories.map(cat => {
                    const colorHex = cat.colorHex || "#0284c7"
                    return (
                      <div key={cat.id} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: colorHex }} />
                        <span className="capitalize font-medium text-sekkha-slate">{cat.name}</span>
                      </div>
                    )
                  })}
                </div>

              </div>
            </aside>

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
          initialDate={!editTarget && selectedDate ? selectedDate : undefined}
          onSubmit={handleFormSubmit}
          onCancel={() => { setEditTarget(null); setFormOpen(false) }}
        />
      </ResponsiveFormModal>
    </main>
  )
}
