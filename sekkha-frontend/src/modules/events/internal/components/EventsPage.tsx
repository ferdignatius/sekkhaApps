// feature/events/components/EventsPage
// Events page: month calendar with colored dots + event list below.
// Strictly adhering to Clay Design System: consistent 12px control radius, warm cream canvas, custom dropdown, and full English localization.

import { useState, useMemo, useEffect, useRef } from "react"
import {
  PlusIcon,
  CalendarDaysIcon,
  SearchIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckIcon,
  FilterIcon,
  XIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import { z } from "zod"

import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { Button, Chip, Card, Badge, ConfirmDialog } from "@/components/base"
import { EventCalendar } from "@/components/ui/EventCalendar"
import type { EventDotItem } from "@/components/ui/EventCalendar"
import { useDebounce } from "@/hooks/useDebounce"
import { Skeleton } from "@/components/ui/skeleton"
import { EventCard } from "./EventCard"
import { EventDetailSheet } from "./EventDetailSheet"
import { EventForm } from "./EventForm"
import { getAccessibleCategories, getCategoryColor } from "../masterdata"
import type {
  EventListItem,
  CreateEventPayload,
  AttendanceRecord,
} from "../types"

const EventsResponseSchema = z.array(
  z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string().nullable().optional(),
      location: z.string().default(""),
      event_date: z.string().datetime(),
      event_type: z.string().default("rutin"),
      tag: z.string().optional(),
      status: z.string(),
      qr_code: z.object({ code: z.string(), expires_at: z.string().nullable() }).nullable().optional(),
    })
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateKey(iso?: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const y = values.year
  const m = values.month
  const day = values.day
  return `${y}-${m}-${day}`
}

function isSameMonth(iso?: string, month?: Date): boolean {
  if (!iso || !month) return false
  const d = new Date(iso)
  if (isNaN(d.getTime())) return false
  return (
    d.getFullYear() === month.getFullYear() && d.getMonth() === month.getMonth()
  )
}

function formatSelectedDate(key: string): string {
  const d = new Date(key + "T00:00:00")
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatSelectedDateShort(key: string): string {
  const d = new Date(key + "T00:00:00")
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function formatMonthLabel(month: Date): string {
  return month.toLocaleDateString("en-US", { month: "long", year: "numeric" })
}

const MONTH_NAMES_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
]

// ─── Component ────────────────────────────────────────────────────────────────

type View = "calendar" | "detail"

export function EventsPage() {
  const { authState } = useAuth()
  const role = authState.status === "authenticated" ? authState.role : null
  const isPengurus =
    role === "organizer" || role === "pengurus" || role === "admin"

  const [events, setEvents] = useState<EventListItem[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [view, setView] = useState<View>("calendar")
  const [selected, setSelected] = useState<EventListItem | null>(null)
  const [editTarget, setEditTarget] = useState<EventListItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [activeMonth, setActiveMonth] = useState<Date>(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearchQuery = useDebounce(searchQuery, 250)
  const [selectedCategoryTag, setSelectedCategoryTag] = useState<string>("all")
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear())
  const [deleteEventTarget, setDeleteEventTarget] =
    useState<EventListItem | null>(null)
  const [deletingEvent, setDeletingEvent] = useState(false)
  const monthPickerRef = useRef<HTMLDivElement>(null)

  // Dynamic Accessible Categories for logged in User Role
  const accessibleCategories = useMemo(() => {
    return getAccessibleCategories(role, true)
  }, [role])

  const accessibleTagsSet = useMemo(() => {
    return new Set(accessibleCategories.map((c) => c.tag.toLowerCase()))
  }, [accessibleCategories])

  // Sync pickerYear when activeMonth changes
  useEffect(() => {
    setPickerYear(activeMonth.getFullYear())
  }, [activeMonth])

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        categoryDropdownRef.current &&
        !categoryDropdownRef.current.contains(event.target as Node)
      ) {
        setCategoryDropdownOpen(false)
      }
      if (
        monthPickerRef.current &&
        !monthPickerRef.current.contains(event.target as Node)
      ) {
        setMonthPickerOpen(false)
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
      const data = await api.get<EventListItem[]>("/events", {
        schema: EventsResponseSchema,
      })
      setEvents(data)
    } catch (err) {
      console.error("Failed to load events from server:", err)
      setEvents([])
    } finally {
      setLoadingEvents(false)
    }
  }

  // Attendance records keyed by event id
  const [attendances, setAttendances] = useState<
    Record<string, AttendanceRecord[]>
  >({})

  function handleSelectEvent(ev: EventListItem) {
    setSelected(ev)
    setView("detail")
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("eventId", ev.id)
      window.history.pushState({ eventId: ev.id }, "", url.toString())
    }
  }

  // Auto-open event detail if URL contains ?eventId=... and support browser Back/Forward
  useEffect(() => {
    if (typeof window === "undefined") return

    function syncFromUrl() {
      const searchParams = new URLSearchParams(window.location.search)
      const eventIdParam = searchParams.get("eventId")
      if (!eventIdParam) {
        setSelected(null)
        setView("calendar")
        return
      }

      if (events.length > 0) {
        const found = events.find((e) => e.id === eventIdParam)
        if (found) {
          setSelected(found)
          setView("detail")
          return
        }
      }

      // If not found in loaded events list (e.g. direct link), fetch directly from API
      if (!loadingEvents) {
        api
          .get<EventListItem>(`/events/${eventIdParam}`)
          .then((directEvent) => {
            if (directEvent) {
              setSelected(directEvent)
              setView("detail")
            }
          })
          .catch((err) => {
            console.warn("Event from eventId param not found:", err)
          })
      }
    }

    syncFromUrl()
    window.addEventListener("popstate", syncFromUrl)
    return () => window.removeEventListener("popstate", syncFromUrl)
  }, [events, loadingEvents])

  useEffect(() => {
    if (selected?.id) {
      loadEventAttendances(selected.id)
    }
  }, [selected?.id])

  async function loadEventAttendances(eventId: string) {
    try {
      const data = await api.get<AttendanceRecord[]>(
        `/events/${eventId}/attendances`
      )
      setAttendances((prev) => ({ ...prev, [eventId]: data }))
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
    events.forEach((ev) => {
      const tag = (ev.tag ?? ev.event_type ?? "rutin").toLowerCase()
      if (!accessibleTagsSet.has(tag)) return

      const key = toDateKey(ev.event_date)
      if (!key) return
      if (!map[key]) map[key] = []

      const colorInfo = getCategoryColor(tag)
      map[key].push({
        colorHex: colorInfo.hex,
      })
    })
    return map
  }, [events, accessibleTagsSet])

  // Filtered Events
  const listedEvents = useMemo(() => {
    let base = events.filter((ev) => {
      const tag = (ev.tag ?? ev.event_type ?? "rutin").toLowerCase()
      return accessibleTagsSet.has(tag)
    })

    const isSearching = Boolean(debouncedSearchQuery.trim())

    // If searching, search across all events globally (don't restrict to current month/selected date)
    if (isSearching) {
      const q = debouncedSearchQuery.toLowerCase().trim()
      base = base.filter((ev) => {
        const titleMatch = (ev.title ?? "").toLowerCase().includes(q)
        const locMatch = (ev.location ?? "").toLowerCase().includes(q)
        const descMatch = (ev.description ?? "").toLowerCase().includes(q)
        const tagMatch = (ev.tag ?? "").toLowerCase().includes(q)
        const typeMatch = (ev.event_type ?? "").toLowerCase().includes(q)
        return titleMatch || locMatch || descMatch || tagMatch || typeMatch
      })
    } else {
      if (selectedDate) {
        base = base.filter((ev) => toDateKey(ev.event_date) === selectedDate)
      } else {
        base = base.filter((ev) => isSameMonth(ev.event_date, activeMonth))
      }
    }

    if (selectedCategoryTag !== "all") {
      base = base.filter(
        (ev) =>
          (ev.tag ?? ev.event_type ?? "").toLowerCase() ===
          selectedCategoryTag.toLowerCase()
      )
    }

    return base
  }, [
    events,
    accessibleTagsSet,
    activeMonth,
    selectedDate,
    debouncedSearchQuery,
    selectedCategoryTag,
  ])

  async function handleFormSubmit(payload: CreateEventPayload) {
    try {
      setFormSubmitting(true)
      setFormError(null)
      if (editTarget) {
        await api.put(`/events/${editTarget.id}`, payload)
      } else {
        await api.post("/events", payload)
      }
      await loadEvents()
      setEditTarget(null)
      setFormOpen(false)
    } catch (err) {
      console.error("Failed to save event:", err)
      setFormError(
        err instanceof Error
          ? err.message
          : "Event could not be saved. Please try again."
      )
    } finally {
      setFormSubmitting(false)
    }
  }

  function handleCloseDetail() {
    setSelected(null)
    setView("calendar")
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      if (url.searchParams.has("eventId")) {
        url.searchParams.delete("eventId")
        window.history.replaceState(
          {},
          "",
          url.pathname + (url.search ? url.search : "")
        )
      }
    }
  }

  // ── Detail View ──
  if (view === "detail" && selected) {
    return (
      <main className="relative min-h-screen bg-[#fffaf0] text-left font-sans">
        {/* Apple HIG Ambient Vibrancy Backdrop Mesh */}
        <div
          className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute -top-32 right-1/4 size-96 rounded-full bg-[#e8b94a]/12 blur-3xl" />
          <div className="absolute top-1/3 -left-24 size-96 rounded-full bg-[#ffb084]/12 blur-3xl" />
          <div className="absolute right-12 -bottom-24 size-96 rounded-full bg-[#ff4d8b]/8 blur-3xl" />
        </div>

        <PageBreadcrumb
          items={[
            {
              label: "Events",
              href: "/events",
              onClick: handleCloseDetail,
            },
            { label: selected.title },
          ]}
          onBack={handleCloseDetail}
        />
        <div className="px-3.5 py-4 pb-28 sm:px-6 sm:py-6 sm:pb-12 md:px-8 lg:px-12">
          <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
            <EventDetailSheet
              event={selected}
              role={role}
              onClose={handleCloseDetail}
              onEdit={
                isPengurus
                  ? (ev) => {
                      setEditTarget(ev)
                      setFormError(null)
                      setFormOpen(true)
                    }
                  : undefined
              }
              onDelete={
                isPengurus ? (ev) => setDeleteEventTarget(ev) : undefined
              }
              onDuplicate={
                isPengurus
                  ? async (ev) => {
                      try {
                        const payload: CreateEventPayload = {
                          title: `${ev.title} (Copy)`,
                          description: ev.description ?? "",
                          location: ev.location ?? "",
                          event_date: ev.event_date,
                          event_type: ev.event_type,
                          tag: ev.tag,
                        }
                        const dup = await api.post<EventListItem>(
                          "/events",
                          payload
                        )
                        setEvents((prev) => [dup, ...prev])
                        setSelected(dup)
                      } catch (err) {
                        console.error("Failed to duplicate event:", err)
                        alert("Failed to duplicate event on server.")
                      }
                    }
                  : undefined
              }
              onStatusChange={
                isPengurus
                  ? async (eventId, newStatus) => {
                      try {
                        setEvents((prev) =>
                          prev.map((e) =>
                            e.id === eventId ? { ...e, status: newStatus } : e
                          )
                        )
                        setSelected((prev) =>
                          prev && prev.id === eventId
                            ? { ...prev, status: newStatus }
                            : prev
                        )
                        await api.patch(`/events/${eventId}/status`, {
                          status: newStatus,
                        })
                        await loadEvents()
                      } catch (err) {
                        console.error("Failed to update event status:", err)
                        await loadEvents()
                      }
                    }
                  : undefined
              }
              attendances={attendances[selected.id] ?? []}
              onRecordAttendance={handleRecordAttendance}
              onDeleteAttendance={
                isPengurus
                  ? async (userId) => {
                      try {
                        await api.delete(
                          `/events/${selected.id}/attendances/${userId}`
                        )
                        await loadEventAttendances(selected.id)
                      } catch (err) {
                        console.error(
                          "Failed to remove attendance record:",
                          err
                        )
                      }
                    }
                  : undefined
              }
            />
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
          description={
            editTarget
              ? "Update event details."
              : "Fill in the form to create a new event."
          }
        >
          <EventForm
            initial={editTarget ?? undefined}
            initialDate={!editTarget && selectedDate ? selectedDate : undefined}
            onSubmit={handleFormSubmit}
            isSubmitting={formSubmitting}
            submissionError={formError}
            onCancel={() => {
              setEditTarget(null)
              setFormOpen(false)
            }}
          />
        </ResponsiveFormModal>

        {/* Delete Event Confirmation Dialog */}
        <ConfirmDialog
          open={Boolean(deleteEventTarget)}
          onOpenChange={(open) => !open && setDeleteEventTarget(null)}
          title="Hapus Acara Ini?"
          description={
            deleteEventTarget
              ? `Apakah Anda yakin ingin menghapus "${deleteEventTarget.title}"? Seluruh data presensi dan riwayat acara ini akan dihapus secara permanen.`
              : ""
          }
          confirmLabel={deletingEvent ? "Menghapus..." : "Ya, Hapus Acara"}
          cancelLabel="Batal"
          variant="destructive"
          isLoading={deletingEvent}
          onConfirm={async () => {
            if (!deleteEventTarget) return
            try {
              setDeletingEvent(true)
              await api.delete(`/events/${deleteEventTarget.id}`)
              setEvents((prev) =>
                prev.filter((e) => e.id !== deleteEventTarget.id)
              )
              setDeleteEventTarget(null)
              handleCloseDetail()
            } catch (err) {
              console.error("Failed to delete event:", err)
            } finally {
              setDeletingEvent(false)
            }
          }}
        />
      </main>
    )
  }

  // Selected Category Label & Color
  const currentCategoryObj = accessibleCategories.find(
    (c) => c.tag === selectedCategoryTag
  )
  const currentCategoryLabel =
    selectedCategoryTag === "all"
      ? "All Categories"
      : (currentCategoryObj?.name ?? selectedCategoryTag)
  const currentCategoryColor = currentCategoryObj?.colorHex ?? null

  // ── Calendar + List View ──
  return (
    <main className="relative min-h-screen bg-[#fffaf0] pb-32 text-left font-sans md:pb-12">
      {/* Apple HIG Ambient Vibrancy Backdrop Mesh */}
      <div
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute -top-32 right-1/4 size-96 rounded-full bg-[#e8b94a]/12 blur-3xl" />
        <div className="absolute top-1/3 -left-24 size-96 rounded-full bg-[#ffb084]/12 blur-3xl" />
        <div className="absolute right-12 -bottom-24 size-96 rounded-full bg-[#ff4d8b]/8 blur-3xl" />
      </div>

      <PageBreadcrumb items={[{ label: "Events" }]} />

      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          {/* ── Month & Year Title Header with Unified Controls & Category Filter ── */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            {/* Top Bar: Month/Year Title & Controls */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div className="relative min-w-0" ref={monthPickerRef}>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedDate) {
                        setPickerYear(activeMonth.getFullYear())
                        setMonthPickerOpen(!monthPickerOpen)
                      }
                    }}
                    className={`group flex min-w-0 items-center gap-1.5 text-base font-bold tracking-tight text-[#0a0a0a] sm:text-xl md:text-2xl ${
                      !selectedDate ? "cursor-pointer hover:text-[#c28e20]" : ""
                    }`}
                    title={!selectedDate ? "Choose month and year" : undefined}
                  >
                    <span className="truncate">
                      {selectedDate ? (
                        <>
                          <span className="hidden sm:inline">
                            {formatSelectedDate(selectedDate)}
                          </span>
                          <span className="sm:hidden">
                            {formatSelectedDateShort(selectedDate)}
                          </span>
                        </>
                      ) : (
                        formatMonthLabel(activeMonth)
                      )}
                    </span>
                    {!selectedDate && (
                      <ChevronDownIcon
                        className={`size-4 shrink-0 text-[#6a6a6a] transition-transform duration-200 group-hover:text-[#0a0a0a] sm:size-5 ${
                          monthPickerOpen ? "rotate-180" : ""
                        }`}
                      />
                    )}
                  </button>

                  {/* Apple HIG Month/Year Picker Popover */}
                  {monthPickerOpen && !selectedDate && (
                    <div className="absolute top-full left-0 z-40 mt-2 w-68 animate-in space-y-3 rounded-[24px] border border-[#ded5c0] bg-[#faf5e8]/95 p-3.5 shadow-[0_16px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] backdrop-blur-2xl zoom-in-95 fade-in">
                      {/* Year Navigation Bar */}
                      <div className="flex items-center justify-between border-b border-black/[0.06] px-1 pb-2">
                        <span className="text-sm font-bold tracking-tight text-[#0a0a0a]">
                          {pickerYear}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPickerYear((y) => y - 1)}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-[#ded6c2] bg-[#fffaf0] text-[#0a0a0a] shadow-2xs backdrop-blur-md transition-all hover:bg-[#f5efe0] active:scale-95"
                            title="Previous year"
                          >
                            <ChevronLeftIcon className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPickerYear((y) => y + 1)}
                            className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-[#ded6c2] bg-[#fffaf0] text-[#0a0a0a] shadow-2xs backdrop-blur-md transition-all hover:bg-[#f5efe0] active:scale-95"
                            title="Next year"
                          >
                            <ChevronRightIcon className="size-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* 12 Months Grid */}
                      <div className="grid grid-cols-3 gap-1.5 text-xs font-semibold">
                        {MONTH_NAMES_SHORT.map((m, idx) => {
                          const isSelected =
                            activeMonth.getFullYear() === pickerYear &&
                            activeMonth.getMonth() === idx
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                setActiveMonth(new Date(pickerYear, idx, 1))
                                setSelectedDate(null)
                                setMonthPickerOpen(false)
                              }}
                              className={`cursor-pointer rounded-[14px] py-2 text-center transition-all ${
                                isSelected
                                  ? "bg-[#0a0a0a] font-bold text-white shadow-xs"
                                  : "text-[#3a3a3a] hover:bg-[#f0e8d5] hover:text-[#0a0a0a]"
                              }`}
                            >
                              {m}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {selectedDate && (
                  <Chip
                    variant="assist"
                    onClick={() => setSelectedDate(null)}
                    title="View full month"
                    className="hidden sm:inline-flex"
                  >
                    Full Month
                  </Chip>
                )}

                {/* Custom Category Filter Dropdown (Desktop Beside Title) */}
                <div
                  className="relative hidden shrink-0 sm:block"
                  ref={categoryDropdownRef}
                >
                  <Chip
                    variant="filter"
                    selected={selectedCategoryTag !== "all"}
                    onClick={() =>
                      setCategoryDropdownOpen(!categoryDropdownOpen)
                    }
                    leadingIcon={
                      selectedCategoryTag !== "all" && currentCategoryColor ? (
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: currentCategoryColor }}
                        />
                      ) : (
                        <FilterIcon className="size-3.5 text-[#6a6a6a]" />
                      )
                    }
                    trailingIcon={
                      <ChevronDownIcon className="size-3 text-[#6a6a6a]" />
                    }
                    title={`Filter by category: ${currentCategoryLabel}`}
                  >
                    {currentCategoryLabel}
                  </Chip>

                  {/* Popover Menu */}
                  {categoryDropdownOpen && (
                    <div className="absolute top-full left-0 z-40 mt-1.5 w-56 animate-in space-y-0.5 rounded-[22px] border border-[#ded5c0] bg-[#faf5e8]/95 p-2 text-left shadow-[0_16px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/[0.04] backdrop-blur-2xl zoom-in-95 fade-in">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategoryTag("all")
                          setCategoryDropdownOpen(false)
                        }}
                        className={`flex w-full cursor-pointer items-center justify-between rounded-[12px] px-3 py-2 text-xs font-semibold transition-colors ${
                          selectedCategoryTag === "all"
                            ? "bg-[#fffaf0] font-bold text-[#0a0a0a] shadow-2xs"
                            : "text-[#6a6a6a] hover:bg-[#fffaf0]/80 hover:text-[#0a0a0a]"
                        }`}
                      >
                        <span>All Categories</span>
                        {selectedCategoryTag === "all" && (
                          <CheckIcon className="size-3.5 text-[#0a0a0a]" />
                        )}
                      </button>

                      <div className="my-1 h-px bg-black/[0.06]" />

                      {accessibleCategories.map((cat) => {
                        const isSelected =
                          selectedCategoryTag.toLowerCase() ===
                          cat.tag.toLowerCase()
                        const colorHex = cat.colorHex || "#1a3a3a"
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategoryTag(cat.tag)
                              setCategoryDropdownOpen(false)
                            }}
                            className={`flex w-full cursor-pointer items-center justify-between rounded-[12px] px-3 py-2 text-xs font-semibold transition-colors ${
                              isSelected
                                ? "bg-[#fffaf0] font-bold text-[#0a0a0a] shadow-2xs"
                                : "text-[#6a6a6a] hover:bg-[#fffaf0]/80 hover:text-[#0a0a0a]"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2 w-2 shrink-0 rounded-full shadow-2xs"
                                style={{ backgroundColor: colorHex }}
                              />
                              <span className="capitalize">{cat.name}</span>
                            </div>
                            {isSelected && (
                              <CheckIcon className="size-3.5 text-[#0a0a0a]" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile-Only Action: Shows Full Month button if date selected, or Today + Prev/Next if browsing whole month */}
              <div className="flex shrink-0 items-center gap-1 sm:hidden">
                {selectedDate ? (
                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={() => setSelectedDate(null)}
                    className="h-9 shrink-0 gap-1 rounded-full border-[#ded6c2] bg-[#faf5e8] px-3 text-xs font-semibold shadow-2xs backdrop-blur-md hover:bg-[#f5efe0]"
                    title="Show full month events"
                  >
                    <XIcon className="size-3" />
                    <span>Full Month</span>
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outlined"
                      size="sm"
                      onClick={() => {
                        const now = new Date()
                        setActiveMonth(now)
                        setSelectedDate(toDateKey(now.toISOString()))
                      }}
                      className="h-9 rounded-full border-[#ded6c2] bg-[#faf5e8] px-3 text-xs font-semibold shadow-2xs backdrop-blur-md hover:bg-[#f5efe0]"
                      title="Go to Today"
                    >
                      Today
                    </Button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMonth(
                            (prev) =>
                              new Date(
                                prev.getFullYear(),
                                prev.getMonth() - 1,
                                1
                              )
                          )
                          setSelectedDate(null)
                        }}
                        className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-[#ded6c2] bg-[#faf5e8] text-[#0a0a0a] shadow-2xs backdrop-blur-md transition-all hover:bg-[#f5efe0] active:scale-95"
                        title="Previous month"
                        aria-label="Previous month"
                      >
                        <ChevronLeftIcon className="size-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveMonth(
                            (prev) =>
                              new Date(
                                prev.getFullYear(),
                                prev.getMonth() + 1,
                                1
                              )
                          )
                          setSelectedDate(null)
                        }}
                        className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-[#ded6c2] bg-[#faf5e8] text-[#0a0a0a] shadow-2xs backdrop-blur-md transition-all hover:bg-[#f5efe0] active:scale-95"
                        title="Next month"
                        aria-label="Next month"
                      >
                        <ChevronRightIcon className="size-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mobile-Only Row 2: Smooth Horizontal Scrollable Category Filter Chips */}
            <div className="flex scrollbar-none items-center gap-1.5 overflow-x-auto pb-0.5 sm:hidden">
              <Chip
                variant="filter"
                selected={selectedCategoryTag === "all"}
                onClick={() => setSelectedCategoryTag("all")}
              >
                All Categories
              </Chip>
              {accessibleCategories.map((cat) => {
                const isSelected =
                  selectedCategoryTag.toLowerCase() === cat.tag.toLowerCase()
                const colorHex = cat.colorHex || "#1a3a3a"
                return (
                  <Chip
                    key={cat.id}
                    variant="filter"
                    selected={isSelected}
                    onClick={() => setSelectedCategoryTag(cat.tag)}
                    leadingIcon={
                      <span
                        className="size-2 shrink-0 rounded-full shadow-2xs"
                        style={{ backgroundColor: colorHex }}
                      />
                    }
                  >
                    {cat.name}
                  </Chip>
                )
              })}
            </div>

            {/* Desktop-Only Month Controls: Today, Prev, Next */}
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <Button
                variant="outlined"
                size="sm"
                onClick={() => {
                  const now = new Date()
                  setActiveMonth(now)
                  setSelectedDate(toDateKey(now.toISOString()))
                }}
                className="h-9 rounded-full border-[#ded6c2] bg-[#faf5e8] px-3.5 text-xs font-semibold shadow-2xs backdrop-blur-md hover:bg-[#f5efe0]"
                title="Go to Today"
              >
                Today
              </Button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMonth(
                      (prev) =>
                        new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                    )
                    setSelectedDate(null)
                  }}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-[#ded6c2] bg-[#faf5e8] text-[#0a0a0a] shadow-2xs backdrop-blur-md transition-all hover:bg-[#f5efe0] active:scale-95"
                  title="Previous month"
                  aria-label="Previous month"
                >
                  <ChevronLeftIcon className="size-4" />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveMonth(
                      (prev) =>
                        new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                    )
                    setSelectedDate(null)
                  }}
                  className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-[#ded6c2] bg-[#faf5e8] text-[#0a0a0a] shadow-2xs backdrop-blur-md transition-all hover:bg-[#f5efe0] active:scale-95"
                  title="Next month"
                  aria-label="Next month"
                >
                  <ChevronRightIcon className="size-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Mobile-Only: Calendar Mini Top Section ── */}
          <div className="w-full lg:hidden">
            <Card
              variant="soft"
              glass
              className="rounded-[22px] border border-[#e6decb]/80 bg-[#faf5e8]/80 p-3.5 shadow-xs ring-1 ring-black/[0.04] backdrop-blur-xl"
            >
              <EventCalendar
                dots={dotMap}
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={activeMonth}
                onMonthChange={(month) => {
                  setActiveMonth(month)
                  setSelectedDate(null)
                }}
                hideHeader={true}
              />
            </Card>
          </div>

          {/* ── Search Bar + Create Button Controls Row ── */}
          <div className="relative z-20 flex w-full flex-row items-center gap-2 sm:gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-0 flex-1">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-[#7a776a]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="h-12 w-full rounded-[18px] border border-[#e5dec9] bg-[#faf5e8]/90 pr-10 pl-11 text-xs text-[#0a0a0a] shadow-xs ring-1 ring-black/[0.03] backdrop-blur-md transition-all outline-none placeholder:text-[#8a8678] focus:border-[#0a0a0a] focus:bg-[#fffaf0] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-3.5 flex size-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/[0.08] text-[#6a6a6a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
                  title="Clear search"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>

            {/* Create button for Pengurus */}
            {isPengurus && (
              <Button
                variant="filled"
                onClick={() => {
                  setEditTarget(null)
                  setFormError(null)
                  setFormOpen(true)
                }}
                className="h-12 shrink-0 rounded-full px-5 font-bold shadow-xs active:scale-[0.98]"
                title="Create New Event"
                aria-label="Create New Event"
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Create Event</span>
              </Button>
            )}
          </div>

          {/* ── Two-column layout: Integrated Event List (2/3) | Calendar Mini (1/3 Desktop) ── */}
          <div className="flex flex-col items-start gap-4 sm:gap-5 lg:flex-row">
            {/* ── Left: Event List Container ── */}
            <div className="w-full flex-1 lg:min-w-0">
              <Card
                variant="soft"
                glass
                className="relative rounded-[26px] border border-[#e6decb]/80 bg-[#faf5e8]/80 p-4 shadow-xs ring-1 ring-black/[0.04] backdrop-blur-xl sm:rounded-[28px] sm:p-6"
              >
                {/* Card Sub-header */}
                <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] pb-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="flex size-8 items-center justify-center rounded-full bg-[#0a0a0a] text-white shadow-2xs">
                      <CalendarDaysIcon className="size-4 text-[#e8b94a]" />
                    </span>
                    <h2 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                      {searchQuery.trim()
                        ? `Search: "${searchQuery}"`
                        : "Community Events"}
                    </h2>
                    <Badge
                      variant="secondary"
                      glass
                      className="font-semibold text-[#0a0a0a]"
                    >
                      {listedEvents.length}{" "}
                      {listedEvents.length === 1 ? "Event" : "Events"}
                    </Badge>
                  </div>
                  {(selectedDate || searchQuery.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(null)
                        setSearchQuery("")
                      }}
                      className="cursor-pointer text-xs font-semibold text-[#1a3a3a] hover:underline"
                    >
                      {searchQuery.trim() ? "Clear Search" : "Show All"}
                    </button>
                  )}
                </div>

                {loadingEvents ? (
                  <div className="space-y-3 py-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3.5 rounded-[20px] border border-[#e6decb]/80 bg-[#fffaf0]/70 p-3.5 backdrop-blur-md"
                      >
                        <Skeleton className="size-11 shrink-0 rounded-[14px]" />
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Skeleton className="h-4 w-40 rounded-md" />
                          <Skeleton className="h-3 w-24 rounded-md" />
                        </div>
                        <Skeleton className="h-6 w-16 shrink-0 rounded-full" />
                      </div>
                    ))}
                  </div>
                ) : listedEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                    <CalendarDaysIcon
                      className="size-10 text-[#6a6a6a]/40"
                      aria-hidden="true"
                    />
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
                        className="cursor-pointer rounded-full border border-[#ded6c2] bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[#0a0a0a] shadow-2xs backdrop-blur-md transition-colors hover:bg-[#faf5e8]"
                      >
                        Clear Search Filter
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-black/[0.04]">
                    {listedEvents.map((ev) => (
                      <EventCard
                        key={ev.id}
                        event={ev}
                        onClick={() => handleSelectEvent(ev)}
                      />
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* ── Right: Mini Calendar Card (Desktop Only lg+) ── */}
            <aside className="hidden w-full shrink-0 lg:block lg:w-80 xl:w-96">
              <Card
                variant="soft"
                glass
                className="relative sticky top-16 space-y-3.5 rounded-[26px] border border-[#e6decb]/80 bg-[#faf5e8]/80 p-4 shadow-xs ring-1 ring-black/[0.04] backdrop-blur-xl sm:rounded-[28px] sm:p-5"
              >
                <EventCalendar
                  dots={dotMap}
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={activeMonth}
                  onMonthChange={(month) => {
                    setActiveMonth(month)
                    setSelectedDate(null)
                  }}
                  hideHeader={true}
                />

                {/* Dynamic Master Data Category Legend */}
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-black/[0.06] pt-3 text-xs">
                  {accessibleCategories.map((cat) => {
                    const colorHex = cat.colorHex || "#1a3a3a"
                    return (
                      <div key={cat.id} className="flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full shadow-2xs"
                          style={{ backgroundColor: colorHex }}
                        />
                        <span className="font-medium text-[#6a6a6a] capitalize">
                          {cat.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </Card>
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
        description={
          editTarget
            ? "Update event details."
            : "Fill in the form to create a new event."
        }
      >
        <EventForm
          initial={editTarget ?? undefined}
          initialDate={!editTarget && selectedDate ? selectedDate : undefined}
          onSubmit={handleFormSubmit}
          isSubmitting={formSubmitting}
          submissionError={formError}
          onCancel={() => {
            setEditTarget(null)
            setFormOpen(false)
          }}
        />
      </ResponsiveFormModal>
    </main>
  )
}
