// feature/events/components/EventsPage
// Events page: month calendar with colored dots + event list below.
// Strictly adhering to Clay Design System: consistent 12px control radius, warm cream canvas, custom dropdown, and full English localization.

import { useState, useMemo, useEffect, useRef, useCallback } from "react"
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
import { api, clearApiCache } from "@/lib/api"
import { z } from "zod"

import { PageBreadcrumb } from "@/components/common/PageBreadcrumb"
import { CollapsibleBottomSheet } from "@/components/common/CollapsibleBottomSheet"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { Button, Card, Badge, ConfirmDialog, toast } from "@/components/base"
import { EventCalendar } from "@/components/ui/EventCalendar"
import type { EventDotItem } from "@/components/ui/EventCalendar"
import { useDebouncedSearch } from "@/hooks/useDebounce"
import { Skeleton } from "@/components/ui/skeleton"
import { EventCard } from "./EventCard"
import { EventDetailSheet } from "./EventDetailSheet"
import { EventForm, extractRecentLocations, extractRecentTimes } from "./EventForm"
import {
  getAccessibleCategories,
  getCategoryColor,
  getEventTag,
  fetchMasterCategoriesPage,
} from "../masterdata"
import { InfiniteScrollFooter } from "@/components/common/InfiniteScrollFooter"
import { usePaginatedDropdown } from "@/hooks/usePaginatedDropdown"
import { DROPDOWN_PAGE_SIZE } from "@/lib/pagination"
import type { EventCategoryItem } from "../masterdata"
import type {
  EventListItem,
  CreateEventPayload,
  AttendanceRecord,
} from "../types"
import { hexToTagColors } from "../types"
import {
  toWibDateKey as toDateKey,
  formatMonthParam,
  formatSelectedDate,
  getDefaultSelectedDateForMonth,
  sortEventsForDisplay,
} from "../utils/eventOrdering"

const EventsResponseSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    description: z.string().nullable().optional(),
    location: z.string().default(""),
    event_date: z.string(),
    event_type: z
      .union([
        z.string(),
        z.object({
          id: z.string(),
          code: z.string().optional(),
          label: z.string(),
          color: z.string().optional(),
          default_point_reward: z.number().optional(),
        }),
      ])
      .optional(),
    tag: z.string().optional(),
    status: z.string(),
    point_reward: z.number().optional(),
    max_late_minutes: z.number().optional(),
    late_penalty_points: z.number().optional(),
    total_attendees: z.number().optional(),
    qr_code: z
      .object({ code: z.string(), expires_at: z.string().nullable() })
      .nullable()
      .optional(),
  })
)

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
  const isPengurus = role === "organizer" || role === "admin"

  const [events, setEvents] = useState<EventListItem[]>([])
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [view, setView] = useState<View>("calendar")
  const [selected, setSelected] = useState<EventListItem | null>(null)
  const [editTarget, setEditTarget] = useState<EventListItem | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [activeMonth, setActiveMonth] = useState<Date>(() => new Date())
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    toDateKey(new Date().toISOString())
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [searchOpen, setSearchOpen] = useState(false)
  const [debouncedSearchQuery, flushEventSearch] = useDebouncedSearch(searchQuery)
  const [selectedCategoryTag, setSelectedCategoryTag] = useState<string>("all")
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false)
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false)
  const categoryDropdownRef = useRef<HTMLDivElement>(null)
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear())
  const [deleteEventTarget, setDeleteEventTarget] =
    useState<EventListItem | null>(null)
  const [deletingEvent, setDeletingEvent] = useState(false)
  const monthPickerRef = useRef<HTMLDivElement>(null)

  const showToast = useCallback(
    (text: string, type: "success" | "error" = "success") => {
      if (type === "error") {
        toast.error(text)
      } else {
        toast.success(text)
      }
    },
    []
  )

  const {
    items: masterCategories,
    hasMore: hasMoreCategories,
    loadingMore: loadingMoreCategories,
    total: totalCategories,
    loadMore: loadMoreCategories,
    handleScroll: handleCategoryScroll,
  } = usePaginatedDropdown<EventCategoryItem>({
    fetcher: ({ page, limit }) =>
      fetchMasterCategoriesPage({ page, limit, isActive: true, role }),
    getKey: (cat) => cat.id || cat.tag,
    pageSize: DROPDOWN_PAGE_SIZE,
    enabled: true,
    initialItems: [],
  })

  // Dynamic Accessible Categories for logged in User Role, merged with actual event types from API
  const accessibleCategories = useMemo(() => {
    const baseCats =
      masterCategories.length > 0
        ? masterCategories.filter((c) => c.is_active !== false)
        : getAccessibleCategories(role, true)
    const existingTags = new Set(baseCats.map((c) => c.tag.toLowerCase()))
    const extraCats: typeof baseCats = []

    events.forEach((ev) => {
      const tag = getEventTag(ev).toLowerCase()
      if (tag && !existingTags.has(tag)) {
        existingTags.add(tag)
        const et =
          ev.event_type && typeof ev.event_type === "object"
            ? ev.event_type
            : null
        const color = et?.color || "#4262FF"
        const tagStyles = hexToTagColors(color)
        extraCats.push({
          id: et?.id || `type-${tag}`,
          tag,
          name: et?.label || et?.code || tag,
          bg: tagStyles.bg,
          text: tagStyles.text,
          dot: tagStyles.dot,
          points: et?.default_point_reward ?? 50,
          is_active: true,
          colorHex: color,
        })
      }
    })

    return [...baseCats, ...extraCats]
  }, [role, events, masterCategories])

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

  // Month cache for instant navigation between months
  const [eventsCache, setEventsCache] = useState<
    Record<string, EventListItem[]>
  >({})

  const activeMonthParam = formatMonthParam(activeMonth)

  const loadEvents = useCallback(
    async (targetDate = activeMonth, force = false) => {
      const monthParam = formatMonthParam(targetDate)
      if (!force && eventsCache[monthParam]) {
        setEvents(eventsCache[monthParam])
        return
      }

      try {
        setLoadingEvents(true)
        const data = await api.get<EventListItem[]>(
          `/events?month=${monthParam}&page=1&limit=100`,
          {
            schema: EventsResponseSchema,
          }
        )
        setEventsCache((prev) => ({ ...prev, [monthParam]: data }))
        setEvents(data)
      } catch (err) {
        console.error("Failed to load events from server:", err)
      } finally {
        setLoadingEvents(false)
      }
    },
    [activeMonth, eventsCache]
  )

  // Expand mobile event sheet automatically when searching globally
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      setMobileSheetExpanded(true)
    }
  }, [searchQuery])

  // Load events for active month
  useEffect(() => {
    if (!debouncedSearchQuery.trim()) {
      loadEvents(activeMonth)
    }
  }, [activeMonthParam, debouncedSearchQuery])

  const activeYear = activeMonth.getFullYear()

  // Search events scoped to the active calendar year when user types in search query
  useEffect(() => {
    const q = debouncedSearchQuery.trim()
    if (!q) {
      const monthParam = formatMonthParam(activeMonth)
      if (eventsCache[monthParam]) {
        setEvents(eventsCache[monthParam])
      } else {
        loadEvents(activeMonth)
      }
      return
    }

    let cancelled = false
    async function searchEvents() {
      try {
        setLoadingEvents(true)
        const data = await api.get<EventListItem[]>(
          `/events?search=${encodeURIComponent(q)}&year=${activeYear}&page=1&limit=50`,
          { schema: EventsResponseSchema }
        )
        if (!cancelled) {
          setEvents(data)
        }
      } catch (err) {
        console.warn("Event search error:", err)
      } finally {
        if (!cancelled) setLoadingEvents(false)
      }
    }
    void searchEvents()
    return () => {
      cancelled = true
    }
  }, [debouncedSearchQuery, activeYear])

  // Attendance records keyed by event id (only fetched on demand for pengurus/admin)
  const [attendances, setAttendances] = useState<
    Record<string, AttendanceRecord[]>
  >({})

  function handleSelectEvent(ev: EventListItem) {
    setSelected(ev)
    setView("detail")
    loadEventAttendances(ev.id)
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href)
      url.searchParams.set("eventId", ev.id)
      window.history.pushState({ eventId: ev.id }, "", url.toString())
    }

    // Lazy load fresh full event detail only when user opens detail
    api
      .get<EventListItem>(`/events/${ev.id}`)
      .then((fullDetail) => {
        if (fullDetail) {
          setSelected(fullDetail)
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch fresh event detail:", err)
      })
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

      // Check if current selected is already this event — don't overwrite if already open!
      setSelected((curr) => {
        if (curr && curr.id === eventIdParam) {
          return curr
        }

        // Fetch detail on demand with noCache to avoid stale memory cache
        api
          .get<EventListItem>(`/events/${eventIdParam}`, { noCache: true })
          .then((directEvent) => {
            if (directEvent) {
              setSelected(directEvent)
              setView("detail")
              loadEventAttendances(directEvent.id)
            }
          })
          .catch((err) => {
            console.warn("Event from eventId param not found:", err)
          })

        return curr
      })
    }

    syncFromUrl()
    window.addEventListener("popstate", syncFromUrl)
    return () => window.removeEventListener("popstate", syncFromUrl)
  }, [isPengurus])

  async function loadEventAttendances(eventId: string) {
    try {
      const data = await api.get<any>(`/events/${eventId}/attendances`)
      const list: AttendanceRecord[] = Array.isArray(data)
        ? data
        : (data?.attendances ?? [])
      setAttendances((prev) => ({ ...prev, [eventId]: list }))
    } catch (err) {
      console.error("Failed to load event attendances:", err)
    }
  }

  function handleRecordAttendance(eventId: string, _record: AttendanceRecord) {
    loadEventAttendances(eventId)
  }

  // Events matching role access, active category filter, and search query (shared by dotMap & listedEvents)
  const matchingEvents = useMemo(() => {
    const q = debouncedSearchQuery.toLowerCase().trim()
    const targetTag = selectedCategoryTag.toLowerCase()

    return events.filter((ev) => {
      const tag = getEventTag(ev).toLowerCase()
      if (!accessibleTagsSet.has(tag)) return false
      if (selectedCategoryTag !== "all" && tag !== targetTag) return false

      if (q) {
        const titleMatch = (ev.title ?? "").toLowerCase().includes(q)
        const locMatch = (ev.location ?? "").toLowerCase().includes(q)
        const descMatch = (ev.description ?? "").toLowerCase().includes(q)
        const tagMatch = (ev.tag ?? "").toLowerCase().includes(q)
        const typeMatch = (
          typeof ev.event_type === "string"
            ? ev.event_type
            : (ev.event_type?.label ?? ev.event_type?.code ?? "")
        )
          .toLowerCase()
          .includes(q)
        if (!(titleMatch || locMatch || descMatch || tagMatch || typeMatch)) {
          return false
        }
      }

      return true
    })
  }, [events, accessibleTagsSet, selectedCategoryTag, debouncedSearchQuery])

  // ── Build dot map for calendar ──
  const dotMap = useMemo<Record<string, EventDotItem[]>>(() => {
    const map: Record<string, EventDotItem[]> = {}
    matchingEvents.forEach((ev) => {
      const key = toDateKey(ev.event_date)
      if (!key) return
      if (!map[key]) map[key] = []

      const colorInfo = getCategoryColor(ev)
      map[key].push({
        colorHex: colorInfo.hex,
      })
    })
    return map
  }, [matchingEvents])

  // Filtered Events
  const listedEvents = useMemo(() => {
    const isSearching = Boolean(debouncedSearchQuery.trim())
    const scoped = isSearching
      ? matchingEvents
      : matchingEvents.filter((ev) => toDateKey(ev.event_date) === selectedDate)

    return sortEventsForDisplay(scoped)
  }, [matchingEvents, selectedDate, debouncedSearchQuery])

  const todayKey = toDateKey(new Date().toISOString())
  const safeCreateInitialDate =
    !editTarget && selectedDate >= todayKey ? selectedDate : todayKey

  const recentLocations = useMemo(() => {
    const cachedEvents = Object.values(eventsCache).flat()
    return extractRecentLocations([...events, ...cachedEvents], 3)
  }, [events, eventsCache])

  const recentTimes = useMemo(() => {
    const cachedEvents = Object.values(eventsCache).flat()
    return extractRecentTimes([...events, ...cachedEvents], 3)
  }, [events, eventsCache])

  const handleMonthChange = useCallback((month: Date) => {
    const normalizedMonth = new Date(month.getFullYear(), month.getMonth(), 1)
    setActiveMonth(normalizedMonth)
    setSelectedDate(getDefaultSelectedDateForMonth(normalizedMonth))
  }, [])

  const handleGoToday = useCallback(() => {
    const now = new Date()
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    setActiveMonth(currentMonth)
    setSelectedDate(toDateKey(now.toISOString()))
  }, [])

  const handleCalendarSelect = useCallback((dateKey: string | null) => {
    if (!dateKey) return
    setSelectedDate(dateKey)
    const [yStr, mStr] = dateKey.split("-")
    const y = Number(yStr)
    const m = Number(mStr)
    if (Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12) {
      setActiveMonth((prev) =>
        prev.getFullYear() === y && prev.getMonth() === m - 1
          ? prev
          : new Date(y, m - 1, 1)
      )
    }
  }, [])

  async function handleFormSubmit(payload: CreateEventPayload) {
    try {
      setFormSubmitting(true)
      setFormError(null)
      const isEditing = Boolean(editTarget)
      const saved = editTarget
        ? await api.put<EventListItem>(`/events/${editTarget.id}`, payload)
        : await api.post<EventListItem>("/events", payload)

      clearApiCache()

      if (isEditing && saved && selected && selected.id === editTarget?.id) {
        setSelected(saved)
      }

      const targetDateKey =
        toDateKey(
          (saved as { event_date?: string } | null | undefined)?.event_date ??
          payload.event_date
        ) || selectedDate
      const [yStr, mStr] = targetDateKey.split("-")
      const y = Number(yStr)
      const m = Number(mStr)
      const targetMonth =
        Number.isFinite(y) && Number.isFinite(m) && m >= 1 && m <= 12
          ? new Date(y, m - 1, 1)
          : activeMonth

      await loadEvents(targetMonth, true)
      setActiveMonth(targetMonth)
      setSelectedDate(targetDateKey)
      setSearchQuery("")
      setEditTarget(null)
      setFormOpen(false)
      showToast(
        isEditing
          ? "Event updated successfully!"
          : "Event created successfully!"
      )
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
                        event_type:
                          typeof ev.event_type === "string"
                            ? (ev.event_type as any)
                            : ev.event_type?.code,
                        event_type_id:
                          typeof ev.event_type === "object"
                            ? ev.event_type?.id
                            : undefined,
                        tag: getEventTag(ev),
                      }
                      const dup = await api.post<EventListItem>(
                        "/events",
                        payload
                      )
                      setEvents((prev) => [dup, ...prev])
                      setSelected(dup)
                      showToast("Event duplicated successfully!")
                    } catch (err) {
                      console.error("Failed to duplicate event:", err)
                      showToast(
                        "Failed to duplicate event. Please try again.",
                        "error"
                      )
                    }
                  }
                  : undefined
              }
              onStatusChange={
                isPengurus
                  ? async (eventId, newStatus, newEventDate) => {
                    try {
                      const updatePayload: {
                        status: string
                        event_date?: string
                      } = {
                        status: newStatus,
                      }
                      if (newEventDate) {
                        updatePayload.event_date = new Date(
                          newEventDate
                        ).toISOString()
                      }

                      // 1. Optimistic update for immediate UI feedback
                      setSelected((prev) =>
                        prev && prev.id === eventId
                          ? {
                            ...prev,
                            status: newStatus,
                            ...(updatePayload.event_date
                              ? { event_date: updatePayload.event_date }
                              : {}),
                          }
                          : prev
                      )
                      setEvents((prev) =>
                        prev.map((e) =>
                          e.id === eventId
                            ? {
                              ...e,
                              status: newStatus,
                              ...(updatePayload.event_date
                                ? { event_date: updatePayload.event_date }
                                : {}),
                            }
                            : e
                        )
                      )
                      setEventsCache((prev) => {
                        const next: Record<string, EventListItem[]> = {}
                        for (const key of Object.keys(prev)) {
                          next[key] = prev[key].map((e) =>
                            e.id === eventId
                              ? {
                                ...e,
                                status: newStatus,
                                ...(updatePayload.event_date
                                  ? { event_date: updatePayload.event_date }
                                  : {}),
                              }
                              : e
                          )
                        }
                        return next
                      })

                      // 2. Call API patch
                      await api.patch(
                        `/events/${eventId}/status`,
                        updatePayload
                      )
                      clearApiCache()

                      // 3. Reload month events to ensure server truth
                      await loadEvents(activeMonth, true)

                      const statusMessages: Record<string, string> = {
                        active: "Event activated and open for check-in!",
                        closed: "Event closed successfully!",
                        cancelled: "Event cancelled.",
                        scheduled: "Event reset to draft.",
                        planned: "Event moved back to planned.",
                      }
                      showToast(
                        statusMessages[newStatus] ??
                        `Event status updated to ${newStatus}.`
                      )
                    } catch (err: any) {
                      console.error("Failed to update event status:", err)
                      showToast(
                        err?.message || "Failed to update event status.",
                        "error"
                      )
                      // In case of error, re-fetch server state
                      try {
                        const fresh = await api.get<EventListItem>(
                          `/events/${eventId}`,
                          { noCache: true }
                        )
                        if (fresh) setSelected(fresh)
                      } catch { }
                      await loadEvents(activeMonth, true)
                    }
                  }
                  : undefined
              }
              attendances={attendances[selected.id] ?? []}
              onRecordAttendance={handleRecordAttendance}
              onRefreshAttendances={() => loadEventAttendances(selected.id)}
              onDeleteAttendance={
                isPengurus
                  ? async (userId) => {
                    try {
                      await api.delete(
                        `/events/${selected.id}/attendances/${userId}`
                      )
                      await loadEventAttendances(selected.id)
                      showToast("Attendance record removed.")
                    } catch (err) {
                      console.error(
                        "Failed to remove attendance record:",
                        err
                      )
                      showToast(
                        "Failed to remove attendance record.",
                        "error"
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
            initialDate={!editTarget ? safeCreateInitialDate : undefined}
            recentLocations={recentLocations}
            recentTimes={recentTimes}
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
          title="Delete This Event?"
          description={
            deleteEventTarget
              ? `Are you sure you want to delete "${deleteEventTarget.title}"? All attendance data and history for this event will be permanently removed.`
              : ""
          }
          confirmLabel={deletingEvent ? "Deleting..." : "Yes, Delete Event"}
          cancelLabel="Cancel"
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
              showToast("Event deleted successfully.")
            } catch (err) {
              console.error("Failed to delete event:", err)
              showToast("Failed to delete event. Please try again.", "error")
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
    <main className="relative flex min-h-dvh flex-col bg-[#fffaf0] pb-0 text-left font-sans lg:block lg:min-h-screen lg:pb-12">
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
        items={[{ label: "Events" }]}
        actions={
          <div className="flex items-center gap-1.5">
            {/* Unified Category Filter Dropdown (Mobile & Desktop) */}
            <div className="relative" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                aria-label={`Filter by category: ${currentCategoryLabel}`}
                aria-expanded={categoryDropdownOpen}
                title={`Filter by category: ${currentCategoryLabel}`}
                className={`flex h-9 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border transition-all active:scale-95 sm:h-10 ${selectedCategoryTag !== "all"
                  ? "border-[#0a0a0a] bg-[#0a0a0a] px-3 text-xs font-semibold text-white shadow-xs"
                  : "w-9 border-[#ded6c2] bg-[#faf5e8]/90 text-[#0a0a0a] shadow-2xs hover:bg-[#f5efe0] sm:w-10"
                  }`}
              >
                {selectedCategoryTag !== "all" && currentCategoryColor ? (
                  <>
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: currentCategoryColor }}
                    />
                    <span className="max-w-[92px] truncate capitalize sm:max-w-[140px]">
                      {currentCategoryLabel}
                    </span>
                  </>
                ) : (
                  <FilterIcon className="size-4" aria-hidden="true" />
                )}
              </button>

              {categoryDropdownOpen && (
                <div className="absolute top-full right-0 z-50 mt-2 w-60 animate-in space-y-0.5 rounded-[22px] border border-[#ded5c0] bg-[#faf5e8]/95 p-2 text-left shadow-[0_16px_40px_rgba(0,0,0,0.14)] ring-1 ring-black/[0.05] backdrop-blur-2xl zoom-in-95 fade-in">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategoryTag("all")
                      setCategoryDropdownOpen(false)
                    }}
                    className={`flex w-full cursor-pointer items-center justify-between rounded-[12px] px-3 py-2 text-xs font-semibold transition-colors ${selectedCategoryTag === "all"
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

                  <div
                    data-testid="events-category-scroll-list"
                    onScroll={handleCategoryScroll}
                    className="max-h-[192px] space-y-0.5 overflow-y-auto overscroll-contain pr-0.5"
                  >
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
                          className={`flex w-full cursor-pointer items-center justify-between rounded-[12px] px-3 py-2 text-xs font-semibold transition-colors ${isSelected
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
                    <InfiniteScrollFooter
                      hasMore={hasMoreCategories}
                      isLoadingMore={loadingMoreCategories}
                      loadedCount={masterCategories.length}
                      totalCount={totalCategories}
                      onLoadMore={loadMoreCategories}
                      itemLabel="categories"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Search Toggle / Close Button */}
            <button
              type="button"
              onClick={() => {
                if (searchOpen || searchQuery.trim()) {
                  setSearchQuery("")
                  setSearchOpen(false)
                } else {
                  setSearchOpen(true)
                }
              }}
              aria-label={
                searchOpen || Boolean(searchQuery.trim())
                  ? "Close search"
                  : "Search events"
              }
              aria-expanded={searchOpen || Boolean(searchQuery.trim())}
              title={
                searchOpen || Boolean(searchQuery.trim())
                  ? "Close search"
                  : "Search events"
              }
              className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border transition-all active:scale-95 sm:size-10 ${searchOpen || searchQuery.trim()
                ? "border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-xs"
                : "border-[#ded6c2] bg-[#faf5e8]/90 text-[#0a0a0a] shadow-2xs hover:bg-[#f5efe0]"
                }`}
            >
              {searchOpen || searchQuery.trim() ? (
                <XIcon className="size-4" aria-hidden="true" />
              ) : (
                <SearchIcon className="size-4" aria-hidden="true" />
              )}
            </button>
          </div>
        }
      />

      {/* Floating Top-Bar Search Bar */}
      {(searchOpen || searchQuery.trim().length > 0) && (
        <div className="pointer-events-none fixed inset-x-0 top-[68px] z-40 px-3.5 sm:top-[76px] sm:px-6 md:px-8 lg:px-12">
          <div className="pointer-events-auto mx-auto max-w-7xl animate-in rounded-[18px] border border-[#ded5c0] bg-[#fffaf0]/95 p-1.5 shadow-[0_14px_34px_rgba(10,10,10,0.12)] ring-1 ring-black/[0.04] backdrop-blur-xl duration-200 fade-in slide-in-from-top-2">
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#7a776a]"
                aria-hidden="true"
              />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    flushEventSearch()
                  }
                }}
                placeholder="Search events..."
                className="h-10 w-full rounded-[13px] border border-[#e5dec9] bg-[#faf5e8] pr-4 pl-10 text-xs text-[#0a0a0a] shadow-2xs transition-all outline-none placeholder:text-[#8a8678] focus:border-[#0a0a0a] focus:bg-[#fffaf0] focus:ring-1 focus:ring-[#0a0a0a] sm:h-11 sm:text-sm"
              />
            </div>
          </div>
        </div>
      )}

      <CollapsibleBottomSheet
        expanded={mobileSheetExpanded}
        onExpandedChange={setMobileSheetExpanded}
        expandLabel="Expand event list"
        collapseLabel="Show calendar"
        drawerTestId="events-list-drawer"
        scrollTestId="events-drawer-scroll"
        topContent={
          <div className="space-y-2.5 px-4 pt-3 pb-3.5 sm:px-6 lg:p-0">
              {/* ── Month & Year Title Header with Unified Controls & Category Filter ── */}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                {/* Top Bar: Month/Year Title & Controls */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <div className="relative min-w-0" ref={monthPickerRef}>
                      <button
                        type="button"
                        onClick={() => {
                          setPickerYear(activeMonth.getFullYear())
                          setMonthPickerOpen(!monthPickerOpen)
                        }}
                        className="group flex min-w-0 cursor-pointer items-center gap-1.5 text-base font-bold tracking-tight text-[#0a0a0a] hover:text-[#c28e20] sm:text-xl md:text-2xl"
                        title="Choose month and year"
                      >
                        <span className="truncate">
                          <span className="hidden sm:inline">
                            {formatSelectedDate(selectedDate)}
                          </span>
                          <span className="sm:hidden">
                            {formatSelectedDate(selectedDate, "short")}
                          </span>
                        </span>
                        <ChevronDownIcon
                          className={`size-4 shrink-0 text-[#6a6a6a] transition-transform duration-200 group-hover:text-[#0a0a0a] sm:size-5 ${monthPickerOpen ? "rotate-180" : ""
                            }`}
                        />
                      </button>

                      {/* Apple HIG Month/Year Picker Popover */}
                      {monthPickerOpen && (
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
                                    handleMonthChange(new Date(pickerYear, idx, 1))
                                    setMonthPickerOpen(false)
                                  }}
                                  className={`cursor-pointer rounded-[14px] py-2 text-center transition-all ${isSelected
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

                    {/* Custom Category Filter Dropdown (Desktop Beside Title) */}
                  </div>

                  {/* Mobile-Only Action: Today */}
                  <div className="flex shrink-0 items-center gap-1 sm:hidden">
                    <Button
                      variant="outlined"
                      size="sm"
                      onClick={handleGoToday}
                      className="h-9 rounded-full border-[#ded6c2] bg-[#faf5e8] px-3.5 text-xs font-semibold shadow-2xs backdrop-blur-md hover:bg-[#f5efe0]"
                      title="Go to Today"
                    >
                      Today
                    </Button>
                  </div>
                </div>

                {/* Desktop-Only Month Controls: Today, Prev, Next */}
                <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
                  <Button
                    variant="outlined"
                    size="sm"
                    onClick={handleGoToday}
                    className="h-9 rounded-full border-[#ded6c2] bg-[#faf5e8] px-3.5 text-xs font-semibold shadow-2xs backdrop-blur-md hover:bg-[#f5efe0]"
                    title="Go to Today"
                  >
                    Today
                  </Button>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleMonthChange(
                          new Date(
                            activeMonth.getFullYear(),
                            activeMonth.getMonth() - 1,
                            1
                          )
                        )
                      }
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-[#ded6c2] bg-[#faf5e8] text-[#0a0a0a] shadow-2xs backdrop-blur-md transition-all hover:bg-[#f5efe0] active:scale-95"
                      title="Previous month"
                      aria-label="Previous month"
                    >
                      <ChevronLeftIcon className="size-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleMonthChange(
                          new Date(
                            activeMonth.getFullYear(),
                            activeMonth.getMonth() + 1,
                            1
                          )
                        )
                      }
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-[#ded6c2] bg-[#faf5e8] text-[#0a0a0a] shadow-2xs backdrop-blur-md transition-all hover:bg-[#f5efe0] active:scale-95"
                      title="Next month"
                      aria-label="Next month"
                    >
                      <ChevronRightIcon className="size-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* ── Mobile-Only: Bordered Full-Month Calendar on Unified Canvas Backdrop ── */}
              <div className="w-full rounded-[22px] border border-[#e5dec9] bg-[#faf5e8] p-2 shadow-2xs lg:hidden">
                <EventCalendar
                  dots={dotMap}
                  selected={selectedDate}
                  allowDeselect={false}
                  onSelect={handleCalendarSelect}
                  month={activeMonth}
                  onMonthChange={handleMonthChange}
                  compact={true}
                  hideHeader={true}
                />
              </div>
          </div>
        }
        header={
          /* Drawer Header: Title + Count + Add (+) Button */
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-black/[0.06] pb-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-white shadow-2xs">
                      <CalendarDaysIcon className="size-4 text-[#e8b94a]" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="truncate text-sm font-bold text-[#0a0a0a] sm:text-base">
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
                      <p className="text-[11px] font-medium text-[#6a6a6a] lg:hidden">
                        {formatSelectedDate(selectedDate, "short")}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">

                    {/* Create button inside drawer header (reference: "+" on top-right of drawer) */}
                    {isPengurus && (
                      <Button
                        variant="filled"
                        onClick={() => {
                          setEditTarget(null)
                          setFormError(null)
                          setFormOpen(true)
                        }}
                        className="size-9 shrink-0 rounded-full p-0 font-bold shadow-xs active:scale-[0.96] sm:h-9 sm:w-auto sm:px-3.5"
                        title="Create New Event"
                        aria-label="Create New Event"
                      >
                        <PlusIcon className="size-4" aria-hidden="true" />
                        <span className="hidden sm:inline">Add Event</span>
                      </Button>
                    )}
                  </div>
                </div>
        }
        subHeader={
          searchQuery.trim() ? (
            <div className="mb-3 flex items-center gap-2 rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-1.5 text-xs text-[#0a0a0a] shadow-2xs">
              <span className="size-1.5 shrink-0 rounded-full bg-amber-600" />
              <span className="font-medium text-[#4a3a10]">
                Searching events in {activeYear} across all months
              </span>
            </div>
          ) : undefined
        }
        sideContent={
          /* ── Right: Mini Calendar Card (Desktop Only lg+) ── */
          <aside className="hidden w-full shrink-0 lg:block lg:w-84 xl:w-92">
            <Card
              variant="soft"
              glass
              className="relative sticky top-16 space-y-3 rounded-[26px] border border-[#e6decb]/80 bg-[#faf5e8]/80 p-4 shadow-xs ring-1 ring-black/[0.04] backdrop-blur-xl sm:rounded-[28px] sm:p-5"
            >
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-2.5">
                <span className="text-xs font-bold tracking-tight text-[#0a0a0a] sm:text-sm">
                  {activeMonth.toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span className="rounded-full bg-black/[0.05] px-2.5 py-0.5 font-mono text-[11px] font-semibold text-[#6a6a6a]">
                  {formatSelectedDate(selectedDate, "short")}
                </span>
              </div>

              <EventCalendar
                dots={dotMap}
                selected={selectedDate}
                allowDeselect={false}
                onSelect={handleCalendarSelect}
                month={activeMonth}
                onMonthChange={handleMonthChange}
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
        }
      >

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
                          : "No events on this date."}
                      </p>

                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {listedEvents.map((ev) => (
                        <EventCard
                          key={ev.id}
                          event={ev}
                          onClick={() => handleSelectEvent(ev)}
                        />
                      ))}
                    </div>
                  )}
      </CollapsibleBottomSheet>

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
          recentLocations={recentLocations}
          recentTimes={recentTimes}
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
