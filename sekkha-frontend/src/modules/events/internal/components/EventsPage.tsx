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
import type {
  EventListItem,
  CreateEventPayload,
  AttendanceRecord,
} from "../types"

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
  const [monthPickerOpen, setMonthPickerOpen] = useState(false)
  const [pickerYear, setPickerYear] = useState<number>(new Date().getFullYear())
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
  const [attendances, setAttendances] = useState<
    Record<string, AttendanceRecord[]>
  >({})

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
      <main className="min-h-screen bg-[#fffaf0] text-left font-sans">
        <PageBreadcrumb
          items={[
            {
              label: "Events",
              href: "/events",
              onClick: () => {
                setSelected(null)
                setView("calendar")
              },
            },
            { label: selected.title },
          ]}
          onBack={() => {
            setSelected(null)
            setView("calendar")
          }}
        />
        <div className="px-3 py-4 pb-28 sm:px-6 sm:py-6 md:px-8 md:pb-12 lg:px-12">
          <div className="mx-auto max-w-5xl">
            <div className="rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 shadow-xs sm:rounded-[24px] sm:p-6">
              <EventDetailSheet
                event={selected}
                role={role}
                onClose={() => {
                  setSelected(null)
                  setView("calendar")
                }}
                onEdit={
                  isPengurus
                    ? (ev) => {
                        setEditTarget(ev)
                        setFormOpen(true)
                      }
                    : undefined
                }
                onDelete={
                  isPengurus
                    ? async (ev) => {
                        if (
                          !window.confirm(
                            `Are you sure you want to delete "${ev.title}"?`
                          )
                        )
                          return
                        try {
                          await api.delete(`/events/${ev.id}`)
                          setEvents((prev) =>
                            prev.filter((e) => e.id !== ev.id)
                          )
                          setSelected(null)
                          setView("calendar")
                        } catch (err) {
                          console.error("Failed to delete event:", err)
                          alert("Failed to delete event from server.")
                        }
                      }
                    : undefined
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
            onCancel={() => {
              setEditTarget(null)
              setFormOpen(false)
            }}
          />
        </ResponsiveFormModal>
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
    <main className="min-h-screen bg-[#fffaf0] pb-32 text-left font-sans md:pb-12">
      <PageBreadcrumb items={[{ label: "Events" }]} />

      <div className="px-3.5 py-4 sm:px-6 sm:py-6 md:px-8 lg:px-12">
        <div className="mx-auto max-w-7xl space-y-4 sm:space-y-5">
          {/* ── Month & Year Title Header with Unified Controls & Category Filter ── */}
          <div className="flex items-center justify-between gap-2">
            {/* Left: Month/Year Title & Category Filter */}
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative" ref={monthPickerRef}>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedDate) {
                      setPickerYear(activeMonth.getFullYear())
                      setMonthPickerOpen(!monthPickerOpen)
                    }
                  }}
                  className={`group flex items-center gap-1.5 text-base font-bold tracking-tight text-[#0a0a0a] sm:text-xl md:text-2xl ${
                    !selectedDate ? "cursor-pointer hover:text-[#c28e20]" : ""
                  }`}
                  title={!selectedDate ? "Choose month and year" : undefined}
                >
                  <span className="truncate">
                    {selectedDate
                      ? formatSelectedDate(selectedDate)
                      : formatMonthLabel(activeMonth)}
                  </span>
                  {!selectedDate && (
                    <ChevronDownIcon
                      className={`size-4 text-[#6a6a6a] transition-transform duration-200 group-hover:text-[#0a0a0a] sm:size-5 ${
                        monthPickerOpen ? "rotate-180" : ""
                      }`}
                    />
                  )}
                </button>

                {/* Clay Month/Year Picker Popover */}
                {monthPickerOpen && !selectedDate && (
                  <div className="absolute top-full left-0 z-40 mt-2 w-64 animate-in space-y-2.5 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-xl fade-in-0 zoom-in-95">
                    {/* Year Navigation Bar */}
                    <div className="flex items-center justify-between border-b border-[#e5e5e5] px-1 pb-2">
                      <span className="text-sm font-bold text-[#0a0a0a]">
                        {pickerYear}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setPickerYear((y) => y - 1)}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-2xs transition-colors hover:bg-[#faf5e8]"
                          title="Previous year"
                        >
                          <ChevronLeftIcon className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setPickerYear((y) => y + 1)}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-[8px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-2xs transition-colors hover:bg-[#faf5e8]"
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
                            className={`cursor-pointer rounded-[10px] py-2 text-center transition-all ${
                              isSelected
                                ? "bg-[#0a0a0a] font-bold text-white shadow-xs"
                                : "text-[#3a3a3a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
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
                <button
                  type="button"
                  onClick={() => setSelectedDate(null)}
                  className="shrink-0 cursor-pointer rounded-[8px] border border-[#e5e5e5] bg-[#faf5e8] px-2 py-0.5 text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0]"
                  title="View full month"
                >
                  Full Month
                </button>
              )}

              {/* Custom Clay Category Filter Dropdown (Beside Title) */}
              <div className="relative shrink-0" ref={categoryDropdownRef}>
                <button
                  type="button"
                  onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  className={`h-8 rounded-[10px] border ${
                    selectedCategoryTag !== "all"
                      ? "border-[#0a0a0a] bg-[#faf5e8]"
                      : "border-[#e5e5e5] bg-[#fffaf0] hover:bg-[#faf5e8]"
                  } relative flex cursor-pointer items-center justify-center gap-1 px-2 text-xs font-semibold text-[#0a0a0a] shadow-xs transition-all outline-none sm:h-8.5 sm:gap-1.5 sm:px-2.5`}
                  title={`Filter by category: ${currentCategoryLabel}`}
                  aria-label={`Filter by category: ${currentCategoryLabel}`}
                >
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <div className="relative flex items-center justify-center">
                      <FilterIcon className="size-3.5 text-[#6a6a6a]" />
                      {selectedCategoryTag !== "all" && (
                        <span
                          className="absolute -top-1 -right-1 h-2 w-2 rounded-full ring-1 ring-white sm:hidden"
                          style={{
                            backgroundColor: currentCategoryColor ?? "#e8b94a",
                          }}
                        />
                      )}
                    </div>
                    {selectedCategoryTag !== "all" && currentCategoryColor && (
                      <span
                        className="hidden h-2 w-2 shrink-0 rounded-full shadow-2xs sm:inline-block"
                        style={{ backgroundColor: currentCategoryColor }}
                      />
                    )}
                    <span className="hidden max-w-[90px] truncate capitalize sm:inline sm:max-w-[120px]">
                      {currentCategoryLabel}
                    </span>
                  </div>
                  <ChevronDownIcon className="size-3 shrink-0 text-[#6a6a6a]" />
                </button>

                {/* Popover Menu */}
                {categoryDropdownOpen && (
                  <div className="absolute top-full left-0 z-40 mt-1.5 w-52 animate-in space-y-0.5 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-1.5 text-left shadow-xl zoom-in-95 fade-in">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategoryTag("all")
                        setCategoryDropdownOpen(false)
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-xs font-semibold transition-colors ${
                        selectedCategoryTag === "all"
                          ? "bg-[#faf5e8] font-bold text-[#0a0a0a]"
                          : "text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
                      }`}
                    >
                      <span>All Categories</span>
                      {selectedCategoryTag === "all" && (
                        <CheckIcon className="size-3.5 text-[#0a0a0a]" />
                      )}
                    </button>

                    <div className="my-1 h-px bg-[#e5e5e5]" />

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
                          className={`flex w-full cursor-pointer items-center justify-between rounded-[8px] px-3 py-2 text-xs font-semibold transition-colors ${
                            isSelected
                              ? "bg-[#faf5e8] font-bold text-[#0a0a0a]"
                              : "text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
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

            {/* Right: Unified Month Controls: Today, Prev, Next */}
            <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const now = new Date()
                  setActiveMonth(now)
                  setSelectedDate(toDateKey(now.toISOString()))
                }}
                className="h-8 cursor-pointer rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-2.5 text-xs font-bold text-[#0a0a0a] shadow-xs transition-all hover:bg-[#faf5e8] sm:h-8.5 sm:px-3"
                title="Go to Today"
              >
                Today
              </button>

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
                  className="flex size-8 cursor-pointer items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-xs transition-all hover:bg-[#faf5e8] active:scale-95 sm:size-8.5"
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
                  className="flex size-8 cursor-pointer items-center justify-center rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-xs transition-all hover:bg-[#faf5e8] active:scale-95 sm:size-8.5"
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
          </div>

          {/* ── Search Bar + Create Button Controls Row ── */}
          <div className="relative z-20 flex w-full flex-row items-center gap-2 sm:gap-2.5">
            {/* Search Input */}
            <div className="relative min-w-0 flex-1">
              <SearchIcon
                className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-4 -translate-y-1/2 text-[#6a6a6a]"
                aria-hidden="true"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events..."
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pr-9 pl-10 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute top-1/2 right-3 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-[#e5e5e5] text-[#6a6a6a] transition-colors hover:bg-[#0a0a0a] hover:text-white"
                  title="Clear search"
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>

            {/* Create button for Pengurus */}
            {isPengurus && (
              <button
                type="button"
                onClick={() => {
                  setEditTarget(null)
                  setFormOpen(true)
                }}
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[12px] bg-[#0a0a0a] px-0 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] active:scale-[0.98] sm:w-auto sm:px-4 sm:text-sm"
                title="Create New Event"
                aria-label="Create New Event"
              >
                <PlusIcon className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Create Event</span>
              </button>
            )}
          </div>

          {/* ── Two-column layout: Integrated Event List (2/3) | Calendar Mini (1/3 Desktop) ── */}
          <div className="flex flex-col items-start gap-4 sm:gap-5 lg:flex-row">
            {/* ── Left: Event List Container ── */}
            <div className="w-full flex-1 lg:min-w-0">
              <div className="relative rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs sm:rounded-[24px] sm:p-5">
                {/* Card Sub-header */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e5e5] pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-[8px] bg-[#0a0a0a] text-white shadow-xs">
                      <CalendarDaysIcon className="size-4 text-[#e8b94a]" />
                    </span>
                    <h2 className="text-sm font-bold text-[#0a0a0a]">
                      {searchQuery.trim()
                        ? `Search: "${searchQuery}"`
                        : "Community Events"}
                    </h2>
                    <span className="rounded-full border border-[#e5e5e5] bg-[#f5f0e0] px-2.5 py-0.5 text-xs font-bold text-[#0a0a0a]">
                      {listedEvents.length}{" "}
                      {listedEvents.length === 1 ? "Event" : "Events"}
                    </span>
                  </div>
                  {(selectedDate || searchQuery.trim()) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDate(null)
                        setSearchQuery("")
                      }}
                      className="cursor-pointer text-xs font-bold text-[#0a0a0a] hover:underline"
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
                        className="flex items-center gap-3.5 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3"
                      >
                        <Skeleton className="size-11 shrink-0 rounded-[12px]" />
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
                        className="cursor-pointer rounded-[8px] border border-[#e5e5e5] bg-[#faf5e8] px-3 py-1.5 text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#f5f0e0]"
                      >
                        Clear Search Filter
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-[#f0f0f0]">
                    {listedEvents.map((ev) => (
                      <EventCard
                        key={ev.id}
                        event={ev}
                        onClick={() => {
                          setSelected(ev)
                          setView("detail")
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Mini Calendar Card (Desktop Only lg+) ── */}
            <aside className="hidden w-full shrink-0 lg:block lg:w-80 xl:w-96">
              <div className="relative sticky top-16 space-y-3 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs sm:rounded-[24px]">
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
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1.5 border-t border-[#e5e5e5] pt-3 text-xs">
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
          onCancel={() => {
            setEditTarget(null)
            setFormOpen(false)
          }}
        />
      </ResponsiveFormModal>
    </main>
  )
}
