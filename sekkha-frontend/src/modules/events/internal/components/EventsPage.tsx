// feature/events/components/EventsPage
// Events page: month calendar with colored dots + event list below.
// Strictly adhering to Clay Design System: consistent 12px control radius, warm cream canvas, custom dropdown, and full English localization.

import { useState, useMemo, useEffect, useRef } from "react"
import { PlusIcon, CalendarDaysIcon, SearchIcon, ChevronDownIcon, CheckIcon, FilterIcon, XIcon } from "lucide-react"
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
  return d.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

function formatMonthLabel(month: Date): string {
  return month.toLocaleDateString("en-US", { month: "long", year: "numeric" })
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
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)

  // Dynamic Accessible Categories for logged in User Role
  const accessibleCategories = useMemo(() => {
    return getAccessibleCategories(role, true)
  }, [role])

  const accessibleTagsSet = useMemo(() => {
    return new Set(accessibleCategories.map(c => c.tag.toLowerCase()))
  }, [accessibleCategories])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setCategoryDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

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
      console.error("Failed to load events from server:", err)
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
      console.error("Failed to load event attendances:", err)
    }
  }

  function handleRecordAttendance(eventId: string, _record: AttendanceRecord) {
    loadEventAttendances(eventId)
  }

  // ── Build dot map for calendar ──
  const dotMap = useMemo<Record<string, EventDotItem[]>>(() => {
    const map: Record<string, EventDotItem[]> = {}
    events.forEach(ev => {
      const tag = (ev.tag ?? ev.event_type ?? "rutin").toLowerCase()
      if (!accessibleTagsSet.has(tag)) return

      const key = toDateKey(ev.event_date)
      if (!key) return
      if (!map[key]) map[key] = []
      
      const colorInfo = getCategoryColor(tag)
      map[key].push({
        colorHex: colorInfo.hex,
        className: colorInfo.badgeClass,
      })
    })
    return map
  }, [events, accessibleTagsSet])

  // Filtered Events
  const listedEvents = useMemo(() => {
    let base = events.filter(ev => {
      const tag = (ev.tag ?? ev.event_type ?? "rutin").toLowerCase()
      return accessibleTagsSet.has(tag)
    })

    const isSearching = Boolean(debouncedSearchQuery.trim())

    // If searching, search across all events globally (don't restrict to current month/selected date)
    if (isSearching) {
      const q = debouncedSearchQuery.toLowerCase().trim()
      base = base.filter(ev => {
        const titleMatch = (ev.title ?? "").toLowerCase().includes(q)
        const locMatch = (ev.location ?? "").toLowerCase().includes(q)
        const descMatch = (ev.description ?? "").toLowerCase().includes(q)
        const tagMatch = (ev.tag ?? "").toLowerCase().includes(q)
        const typeMatch = (ev.event_type ?? "").toLowerCase().includes(q)
        return titleMatch || locMatch || descMatch || tagMatch || typeMatch
      })
    } else {
      if (selectedDate) {
        base = base.filter(ev => toDateKey(ev.event_date) === selectedDate)
      } else {
        base = base.filter(ev => isSameMonth(ev.event_date, activeMonth))
      }
    }

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
      console.error("Failed to save event:", err)
    } finally {
      setEditTarget(null)
      setFormOpen(false)
    }
  }

  // ── Detail View ──
  if (view === "detail" && selected) {
    return (
      <main className="font-sans text-left min-h-screen bg-[#fffaf0]">
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
        <div className="px-3 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12 pb-28 md:pb-12">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-[20px] sm:rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 sm:p-6 shadow-xs">
              <EventDetailSheet
                event={selected}
                role={role}
                onClose={() => { setSelected(null); setView("calendar") }}
                onEdit={isPengurus ? ev => { setEditTarget(ev); setFormOpen(true) } : undefined}
                onDelete={isPengurus ? async ev => {
                  if (!window.confirm(`Are you sure you want to delete "${ev.title}"?`)) return
                  try {
                    await api.delete(`/events/${ev.id}`)
                    setEvents(prev => prev.filter(e => e.id !== ev.id))
                    setSelected(null)
                    setView("calendar")
                  } catch (err) {
                    console.error("Failed to delete event:", err)
                    alert("Failed to delete event from server.")
                  }
                } : undefined}
                onDuplicate={isPengurus ? async ev => {
                  try {
                    const payload: CreateEventPayload = {
                      title: `${ev.title} (Copy)`,
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
                    console.error("Failed to duplicate event:", err)
                    alert("Failed to duplicate event on server.")
                  }
                } : undefined}
                onStatusChange={isPengurus ? async (eventId, newStatus) => {
                  try {
                    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, status: newStatus } : e))
                    setSelected(prev => prev && prev.id === eventId ? { ...prev, status: newStatus } : prev)
                    await api.patch(`/events/${eventId}/status`, { status: newStatus })
                    await loadEvents()
                  } catch (err) {
                    console.error("Failed to update event status:", err)
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
                    console.error("Failed to remove attendance record:", err)
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
          title={editTarget ? "Edit Event" : "Create New Event"}
          description={editTarget ? "Update event details." : "Fill in the form to create a new event."}
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

  // Selected Category Label
  const currentCategoryObj = accessibleCategories.find(c => c.tag === selectedCategoryTag)
  const currentCategoryLabel = selectedCategoryTag === "all" ? "All Categories" : (currentCategoryObj?.name ?? selectedCategoryTag)

  // ── Calendar + List View ──
  return (
    <main className="min-h-screen bg-[#fffaf0] pb-32 md:pb-12 font-sans text-left">
      <PageBreadcrumb items={[{ label: "Events" }]} />

      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          
          {/* ── Month & Year Title Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-[#0a0a0a] tracking-tight">
                {selectedDate ? formatSelectedDate(selectedDate) : formatMonthLabel(activeMonth)}
              </h1>
              <p className="text-xs text-[#6a6a6a]">
                Sekkha community schedules & activities
              </p>
            </div>
          </div>

          {/* ── Mobile-Only: Calendar Mini Top Section ── */}
          <div className="w-full lg:hidden">
            <EventCalendar
              dots={dotMap}
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={activeMonth}
              onMonthChange={month => { setActiveMonth(month); setSelectedDate(null) }}
            />
          </div>
          
          {/* ── Search Bar + Category Filter + Create Button Controls Row ── */}
          <div className="relative flex flex-row items-center gap-2.5 w-full z-20">
            
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <SearchIcon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#6a6a6a] pointer-events-none z-10" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search events by title, location, category..."
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pl-10 pr-9 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-[#e5e5e5] text-[#6a6a6a] hover:bg-[#0a0a0a] hover:text-white transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>

            {/* Custom Clay Category Filter Dropdown */}
            <div className="relative shrink-0" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="h-11 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8] px-3 sm:px-3.5 flex items-center justify-between gap-2 text-xs sm:text-sm font-semibold text-[#0a0a0a] outline-none shadow-xs transition-all cursor-pointer"
                title="Filter by category"
              >
                <div className="flex items-center gap-1.5">
                  <FilterIcon className="size-3.5 text-[#6a6a6a]" />
                  <span className="capitalize truncate max-w-[110px] sm:max-w-[140px]">{currentCategoryLabel}</span>
                </div>
                <ChevronDownIcon className="size-3.5 text-[#6a6a6a] shrink-0" />
              </button>

              {/* Popover Menu */}
              {categoryDropdownOpen && (
                <div className="absolute right-0 top-12 z-40 w-52 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-1.5 shadow-xl text-left animate-in fade-in zoom-in-95 space-y-0.5">
                  <button
                    type="button"
                    onClick={() => { setSelectedCategoryTag("all"); setCategoryDropdownOpen(false) }}
                    className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      selectedCategoryTag === "all"
                        ? "bg-[#faf5e8] text-[#0a0a0a] font-bold"
                        : "text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
                    }`}
                  >
                    <span>All Categories</span>
                    {selectedCategoryTag === "all" && <CheckIcon className="size-3.5 text-[#0a0a0a]" />}
                  </button>

                  <div className="h-px bg-[#e5e5e5] my-1" />

                  {accessibleCategories.map(cat => {
                    const isSelected = selectedCategoryTag.toLowerCase() === cat.tag.toLowerCase()
                    const colorHex = cat.colorHex || "#1a3a3a"
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => { setSelectedCategoryTag(cat.tag); setCategoryDropdownOpen(false) }}
                        className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2 text-xs font-semibold transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-[#faf5e8] text-[#0a0a0a] font-bold"
                            : "text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: colorHex }} />
                          <span className="capitalize">{cat.name}</span>
                        </div>
                        {isSelected && <CheckIcon className="size-3.5 text-[#0a0a0a]" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Create button for Pengurus */}
            {isPengurus && (
              <button
                type="button"
                onClick={() => { setEditTarget(null); setFormOpen(true) }}
                className="h-11 rounded-[12px] bg-[#0a0a0a] px-3.5 sm:px-4 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all shrink-0 active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5"
                title="Create New Event"
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Create Event</span>
                <span className="sm:hidden">New</span>
              </button>
            )}

          </div>

          {/* ── Two-column layout: Integrated Event List (2/3) | Calendar Mini (1/3 Desktop) ── */}
          <div className="flex flex-col gap-4 sm:gap-5 lg:flex-row items-start">

            {/* ── Left: Event List Container ── */}
            <div className="flex-1 w-full lg:min-w-0">
              <div className="relative rounded-[20px] sm:rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-5 shadow-xs">
                
                {/* Card Sub-header */}
                <div className="mb-3 flex items-center justify-between border-b border-[#e5e5e5] pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#0a0a0a] text-white shadow-xs">
                      <CalendarDaysIcon className="size-4 text-[#e8b94a]" />
                    </span>
                    <h2 className="text-sm font-bold text-[#0a0a0a]">
                      {searchQuery.trim() ? `Search: "${searchQuery}"` : "Community Events"}
                    </h2>
                    <span className="rounded-full bg-[#f5f0e0] border border-[#e5e5e5] px-2.5 py-0.5 text-xs font-bold text-[#0a0a0a]">
                      {listedEvents.length} {listedEvents.length === 1 ? "Event" : "Events"}
                    </span>
                  </div>
                  {(selectedDate || searchQuery.trim()) && (
                    <button
                      type="button"
                      onClick={() => { setSelectedDate(null); setSearchQuery("") }}
                      className="text-xs font-bold text-[#0a0a0a] hover:underline cursor-pointer"
                    >
                      {searchQuery.trim() ? "Clear Search" : "Show All"}
                    </button>
                  )}
                </div>

                {loadingEvents ? (
                  <div className="space-y-3 py-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="flex items-center gap-3.5 p-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8]">
                        <Skeleton className="size-11 rounded-[12px] shrink-0" />
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <Skeleton className="h-4 w-40 rounded-md" />
                          <Skeleton className="h-3 w-24 rounded-md" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full shrink-0" />
                      </div>
                    ))}
                  </div>
                ) : listedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <CalendarDaysIcon className="size-10 text-[#6a6a6a]/40" aria-hidden="true" />
                    <p className="text-xs font-medium text-[#6a6a6a]">
                      {searchQuery.trim()
                        ? `No events found matching "${searchQuery}".`
                        : selectedDate
                          ? "No events on this date."
                          : "No events available for this month."}
                    </p>
                    {searchQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="rounded-[8px] border border-[#e5e5e5] bg-[#faf5e8] px-3 py-1.5 text-xs font-semibold text-[#0a0a0a] hover:bg-[#f5f0e0] transition-colors cursor-pointer"
                      >
                        Clear Search Filter
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0f0f0]">
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
              <div className="sticky top-16 relative rounded-[20px] sm:rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs space-y-3">
                
                <EventCalendar
                  dots={dotMap}
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={activeMonth}
                  onMonthChange={month => { setActiveMonth(month); setSelectedDate(null) }}
                />

                {/* Dynamic Master Data Category Legend */}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[#e5e5e5] pt-3 text-xs">
                  {accessibleCategories.map(cat => {
                    const colorHex = cat.colorHex || "#1a3a3a"
                    return (
                      <div key={cat.id} className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: colorHex }} />
                        <span className="capitalize font-medium text-[#6a6a6a]">{cat.name}</span>
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
        title={editTarget ? "Edit Event" : "Create New Event"}
        description={editTarget ? "Update event details." : "Fill in the form to create a new event."}
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
