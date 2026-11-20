// feature/events/components/EventForm
// Create / edit event form for pengurus+ with unified categories, masterdata autofill, & optional location.

import { useState, useEffect, useRef } from "react"
import {
  AlertCircleIcon,
  CalendarIcon,
  ChevronDownIcon,
  FileTextIcon,
  LoaderCircleIcon,
  MapPinIcon,
  Maximize2Icon,
  Minimize2Icon,
  ShieldCheckIcon,
  TagIcon,
  CheckIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import {
  parseBoundedInteger,
  sanitizeIntegerInput,
} from "@/lib/numericInput"
import { DateTimePicker } from "@/components/common/DateTimePicker"
import { Switch } from "@/components/ui/switch"
import type { CreateEventPayload, EventListItem } from "../types"
import {
  deriveVisibilityFromRoles,
  getAccessibleCategories,
  getEventTag,
} from "../masterdata"
import { buildDefaultEventDescription } from "../utils/eventDescriptionTemplate"

export { buildDefaultEventDescription }

interface EventFormProps {
  /** If provided, pre-fill the form for editing */
  initial?: Partial<EventListItem>
  /** Pre-fill the date field when creating a new event from calendar selection (YYYY-MM-DD) */
  initialDate?: string
  /** Optional list of up to 3 recently used distinct locations */
  recentLocations?: string[]
  /** Optional list of up to 3 recently used distinct event times (HH:mm) */
  recentTimes?: string[]
  onSubmit: (payload: CreateEventPayload) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
  submissionError?: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Convert a local datetime string to ISO 8601 */
function localToIso(local: string): string {
  if (!local) return ""
  return new Date(local).toISOString()
}

/** Convert ISO 8601 to local datetime string for the input */
function isoToLocal(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function deduplicateLocations(items: string[], maxItems = 3): string[] {
  const cap = Math.min(3, Math.max(0, maxItems))
  if (cap === 0) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of items) {
    const trimmed = raw?.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(trimmed)
    if (result.length >= cap) break
  }
  return result
}

export function extractRecentLocations(
  events: Array<{ location?: string | null; event_date?: string }>,
  maxItems = 3
): string[] {
  const cap = Math.min(3, Math.max(0, maxItems))
  if (cap === 0 || events.length === 0) return []

  const sorted = [...events].sort((a, b) => {
    const tA = a.event_date ? new Date(a.event_date).getTime() : 0
    const tB = b.event_date ? new Date(b.event_date).getTime() : 0
    const safeA = Number.isNaN(tA) ? 0 : tA
    const safeB = Number.isNaN(tB) ? 0 : tB
    return safeB - safeA
  })

  const seen = new Set<string>()
  const result: string[] = []
  for (const ev of sorted) {
    const loc = typeof ev.location === "string" ? ev.location.trim() : ""
    if (!loc) continue
    const key = loc.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(loc)
    if (result.length >= cap) break
  }
  return result
}

function deduplicateTimes(items: string[], maxItems = 3): string[] {
  const cap = Math.min(3, Math.max(0, maxItems))
  if (cap === 0) return []
  const seen = new Set<string>()
  const result: string[] = []
  for (const raw of items) {
    const trimmed = raw?.trim()
    if (!trimmed || !/^([01]\d|2[0-3]):[0-5]\d$/.test(trimmed)) continue
    if (seen.has(trimmed)) continue
    seen.add(trimmed)
    result.push(trimmed)
    if (result.length >= cap) break
  }
  return result
}

export function extractRecentTimes(
  events: Array<{ event_date?: string | null }>,
  maxItems = 3
): string[] {
  const cap = Math.min(3, Math.max(0, maxItems))
  if (cap === 0 || events.length === 0) return []

  const sorted = [...events].sort((a, b) => {
    const tA = a.event_date ? new Date(a.event_date).getTime() : 0
    const tB = b.event_date ? new Date(b.event_date).getTime() : 0
    const safeA = Number.isNaN(tA) ? 0 : tA
    const safeB = Number.isNaN(tB) ? 0 : tB
    return safeB - safeA
  })

  const pad = (n: number) => String(n).padStart(2, "0")
  const seen = new Set<string>()
  const result: string[] = []
  for (const ev of sorted) {
    if (!ev.event_date) continue
    const d = new Date(ev.event_date)
    if (Number.isNaN(d.getTime())) continue
    const hhmm = `${pad(d.getHours())}:${pad(d.getMinutes())}`
    if (seen.has(hhmm)) continue
    seen.add(hhmm)
    result.push(hhmm)
    if (result.length >= cap) break
  }
  return result
}

export interface CategoryOption {
  id: string
  code: string
  label: string
  bg: string
  colorHex?: string
  applyLatePenalty?: boolean
  defaultMaxLateMinutes?: number
  defaultLatePenaltyPoints?: number
  target_roles?: string[]
  visibility?: "all" | "member" | "activist" | "organizer"
  autofill: {
    title: string
    description: string
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EventForm({
  initial,
  initialDate,
  recentLocations,
  recentTimes,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submissionError = null,
}: EventFormProps) {
  const { authState } = useAuth()
  const role = authState.status === "authenticated" ? authState.role : null

  // Dynamic Accessible Master Data category options for logged-in user
  const [categories, setCategories] = useState<CategoryOption[]>(() => {
    return getAccessibleCategories(role, true).map((cat) => ({
      id: cat.id,
      code: cat.tag,
      label: cat.name,
      bg: `${cat.bg} ${cat.text}`,
      colorHex: cat.colorHex,
      applyLatePenalty: cat.applyLatePenalty ?? true,
      defaultMaxLateMinutes: cat.maxLateMinutes ?? 30,
      defaultLatePenaltyPoints: cat.latePenaltyPoints ?? 15,
      target_roles: cat.target_roles,
      visibility: deriveVisibilityFromRoles(cat.target_roles),
      autofill: {
        title: cat.autofillTitle ?? `${cat.name} Activity`,
        description:
          cat.autofillDesc ??
          `${cat.name} session with Sekkha community members.`,
      },
    }))
  })

  // Load latest event types from backend API (noCache so Configure changes reflect immediately)
  useEffect(() => {
    let cancelled = false
    async function loadDynamicCategories() {
      try {
        const types = await api.get<any[]>(
          "/configure/event-types?is_active=true",
          { noCache: true }
        )
        if (cancelled) return
        if (Array.isArray(types) && types.length > 0) {
          const mapped: CategoryOption[] = types.map((t) => {
            const hex = t.color || "#4262FF"
            const applyLatePenalty = t.apply_late_penalty ?? true
            return {
              id: t.id,
              code: t.code,
              label: t.label,
              bg: `bg-[${hex}]/10 text-[${hex}]`,
              colorHex: hex,
              applyLatePenalty,
              defaultMaxLateMinutes: applyLatePenalty
                ? (t.default_max_late_minutes ?? 30)
                : 0,
              defaultLatePenaltyPoints: applyLatePenalty
                ? (t.default_late_penalty_points ?? 15)
                : 0,
              target_roles: t.target_roles,
              visibility: t.visibility ?? deriveVisibilityFromRoles(t.target_roles),
              autofill: {
                title: t.label,
                description:
                  t.description ||
                  `${t.label} session with Sekkha community members.`,
              },
            }
          })
          setCategories(mapped)
          if (!initial?.id && selectedTypeIdRef.current && !isLatePolicyEditedRef.current) {
            const matched = mapped.find((c) => c.id === selectedTypeIdRef.current)
            if (matched) {
              syncCategoryLatePolicy(matched)
            }
          }
        }
      } catch (err) {
        console.warn("Could not load dynamic event types in EventForm:", err)
      }
    }
    loadDynamicCategories()
    return () => {
      cancelled = true
    }
  }, [initial?.id])

  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>(
    () => {
      if (initial?.event_type && typeof initial.event_type === "object") {
        return initial.event_type.id
      }
      return undefined
    }
  )

  // Pre-select category if editing an existing event
  useEffect(() => {
    if (categories.length > 0 && !selectedTypeId && initial) {
      const match = categories.find(
        (c) =>
          c.id ===
          (initial.event_type && typeof initial.event_type === "object"
            ? initial.event_type.id
            : undefined) ||
          c.code.toLowerCase() === getEventTag(initial).toLowerCase() ||
          c.label.toLowerCase() === getEventTag(initial).toLowerCase()
      )
      if (match) {
        setSelectedTypeId(match.id)
      }
    }
  }, [categories, initial, selectedTypeId])

  const [title, setTitle] = useState(initial?.title ?? "")
  const [location, setLocation] = useState(initial?.location ?? "")
  // Pre-fill date: prefer existing event date (edit mode), then initialDate from calendar selection
  const [eventDate, setEventDate] = useState(() => {
    if (initial?.event_date) return isoToLocal(initial.event_date)
    if (initialDate) return `${initialDate}T09:00`
    return ""
  })
  const [isDescriptionEdited, setIsDescriptionEdited] = useState(() =>
    Boolean(initial?.id || initial?.description)
  )
  const [description, setDescription] = useState(
    () =>
      initial?.description ??
      (!initial?.id
        ? buildDefaultEventDescription({
          title: initial?.title,
          eventDate:
            initial?.event_date ??
            (initialDate ? `${initialDate}T09:00` : undefined),
          location: initial?.location,
        })
        : "")
  )
  const [isDescExpanded, setIsDescExpanded] = useState(false)

  // Keep default create template synced with title, date/time, and location until user edits manually
  useEffect(() => {
    if (initial?.id || isDescriptionEdited) return
    setDescription(
      buildDefaultEventDescription({
        title,
        eventDate: eventDate || undefined,
        location,
      })
    )
  }, [initial?.id, isDescriptionEdited, title, eventDate, location])
  const [recentVenueOptions, setRecentVenueOptions] = useState<string[]>(() =>
    deduplicateLocations(recentLocations ?? [], 3)
  )
  const [recentTimeOptions, setRecentTimeOptions] = useState<string[]>(() =>
    deduplicateTimes(recentTimes ?? [], 3)
  )
  const [locationMenuOpen, setLocationMenuOpen] = useState(false)
  const locationWrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        locationWrapperRef.current &&
        !locationWrapperRef.current.contains(e.target as Node)
      ) {
        setLocationMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [])

  useEffect(() => {
    const seededLocations = deduplicateLocations(recentLocations ?? [], 3)
    const seededTimes = deduplicateTimes(recentTimes ?? [], 3)
    if (seededLocations.length > 0) {
      setRecentVenueOptions((prev) =>
        deduplicateLocations([...seededLocations, ...prev], 3)
      )
    }
    if (seededTimes.length > 0) {
      setRecentTimeOptions((prev) =>
        deduplicateTimes([...seededTimes, ...prev], 3)
      )
    }
    if (seededLocations.length >= 3 && seededTimes.length >= 3) return

    let cancelled = false
    async function loadRecentHistory() {
      try {
        const res = await api.get<
          Array<{ location?: string | null; event_date?: string }>
        >("/events?page=1&limit=30")
        if (cancelled || !Array.isArray(res)) return
        const fetchedLocations = extractRecentLocations(res, 3)
        const fetchedTimes = extractRecentTimes(res, 3)
        if (fetchedLocations.length > 0) {
          setRecentVenueOptions(
            deduplicateLocations([...seededLocations, ...fetchedLocations], 3)
          )
        }
        if (fetchedTimes.length > 0) {
          setRecentTimeOptions(
            deduplicateTimes([...seededTimes, ...fetchedTimes], 3)
          )
        }
      } catch {
        // Silently ignore background recent-history lookup failure
      }
    }
    void loadRecentHistory()
    return () => {
      cancelled = true
    }
  }, [recentLocations, recentTimes])

  const [applyLatePenalty, setApplyLatePenalty] = useState<boolean>(() => {
    if (initial?.late_penalty_points !== undefined) {
      return (initial.late_penalty_points ?? 0) > 0
    }
    return true
  })
  const [maxLateMinutes, setMaxLateMinutes] = useState<string>(
    initial?.max_late_minutes && initial.max_late_minutes > 0
      ? String(initial.max_late_minutes)
      : "30"
  )
  const [latePenaltyPoints, setLatePenaltyPoints] = useState<string>(
    initial?.late_penalty_points && initial.late_penalty_points > 0
      ? String(initial.late_penalty_points)
      : "15"
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [internalSubmitting, setInternalSubmitting] = useState(false)
  const submitting = isSubmitting || internalSubmitting
  const selectedTypeIdRef = useRef(selectedTypeId)
  selectedTypeIdRef.current = selectedTypeId
  const isLatePolicyEditedRef = useRef(false)

  function syncCategoryLatePolicy(cat: CategoryOption) {
    const shouldApplyLate =
      cat.applyLatePenalty !== undefined
        ? cat.applyLatePenalty
        : (cat.defaultLatePenaltyPoints ?? 15) > 0
    setApplyLatePenalty(shouldApplyLate)
    if (shouldApplyLate) {
      setMaxLateMinutes(
        cat.defaultMaxLateMinutes !== undefined && cat.defaultMaxLateMinutes >= 0
          ? String(cat.defaultMaxLateMinutes)
          : "30"
      )
      setLatePenaltyPoints(
        cat.defaultLatePenaltyPoints !== undefined && cat.defaultLatePenaltyPoints >= 0
          ? String(cat.defaultLatePenaltyPoints)
          : "15"
      )
    }
  }

  // Handle Category Select (syncs late penalty defaults without overwriting Event name)
  function handleSelectCategory(cat: CategoryOption) {
    setErrors((prev) => {
      if (!prev.tag) return prev
      const next = { ...prev }
      delete next.tag
      return next
    })
    if (selectedTypeId === cat.id) {
      setSelectedTypeId(undefined)
      return
    }
    setSelectedTypeId(cat.id)
    if (!initial?.id) {
      isLatePolicyEditedRef.current = false
      syncCategoryLatePolicy(cat)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errs: Record<string, string> = {}
    if (!selectedTypeId) {
      errs.tag = "Event category is required"
    }
    if (!title.trim()) {
      errs.title = "Event name is required"
    }
    if (!eventDate) {
      errs.event_date = "Event date and time is required"
    } else if (Number.isNaN(new Date(eventDate).getTime())) {
      errs.event_date = "Choose a valid date and time"
    } else if (
      !initial?.id &&
      new Date(eventDate).getTime() < Date.now() - 60000
    ) {
      errs.event_date = "Event date cannot be in the past"
    }

    const parsedGrace = applyLatePenalty
      ? parseBoundedInteger(maxLateMinutes, 0, 180)
      : 0
    const parsedPenalty = applyLatePenalty
      ? parseBoundedInteger(latePenaltyPoints, 1, 100)
      : 0

    if (applyLatePenalty) {
      if (parsedGrace === null) {
        errs.maxLateMinutes = "Grace period must be between 0 and 180 minutes"
      }
      if (parsedPenalty === null) {
        errs.latePenaltyPoints =
          "Penalty deduction must be between 1 and 100 points"
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})
    setInternalSubmitting(true)
    const chosenType = categories.find((c) => c.id === selectedTypeId)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        event_date: localToIso(eventDate),
        location: location.trim() ? location.trim() : "Dharmasala Utama",
        event_type_id: selectedTypeId,
        event_type: chosenType?.code,
        tag: chosenType?.code,
        visibility:
          chosenType?.visibility ??
          deriveVisibilityFromRoles(chosenType?.target_roles) ??
          "all",
        max_late_minutes: parsedGrace ?? 0,
        late_penalty_points: parsedPenalty ?? 0,
      })
    } finally {
      setInternalSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="scrollbar-none space-y-4 text-left font-sans sm:space-y-3.5">
      {(Object.keys(errors).length > 0 || submissionError) && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2.5 rounded-xl border border-rose-300 bg-rose-50/70 p-3 text-xs text-rose-900"
        >
          <AlertCircleIcon
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1">
            <p className="font-bold">
              {submissionError
                ? "We couldn't save this event."
                : "Check the highlighted fields before continuing."}
            </p>
            {submissionError ? (
              <p className="leading-relaxed">{submissionError}</p>
            ) : (
              <ul className="list-disc space-y-0.5 pl-4">
                {Object.values(errors).map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* 1. Category & Template Selection */}
      <section
        aria-labelledby="event-category-heading"
        className={`space-y-2.5 border-b pb-4 sm:space-y-3 sm:rounded-2xl sm:border sm:bg-surface-soft sm:p-4 ${errors.tag ? "border-rose-400" : "border-hairline"
          }`}
      >
        <div className="flex items-center justify-between gap-2">
          <label
            id="event-category-heading"
            className="flex items-center gap-1.5 text-xs font-bold text-ink"
          >
            <TagIcon className="size-3.5 text-ink" />
            <span>
              1. Category <span className="text-rose-500">*</span>
            </span>
          </label>
          <span className="text-[11px] font-medium text-text-muted">
            Sets late policy defaults
          </span>
        </div>

        <div
          role="radiogroup"
          aria-labelledby="event-category-heading"
          aria-required="true"
          aria-invalid={Boolean(errors.tag)}
          aria-describedby={errors.tag ? "ev-category-error" : undefined}
          className="scrollbar-none -mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-0.5 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
        >
          {categories.map((cat) => {
            const isSelected = selectedTypeId === cat.id

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                role="radio"
                aria-checked={isSelected}
                style={
                  isSelected && cat.colorHex
                    ? {
                      backgroundColor: cat.colorHex,
                      borderColor: cat.colorHex,
                      color: "#ffffff",
                    }
                    : !isSelected && cat.colorHex
                      ? {
                        borderColor: `${cat.colorHex}40`,
                        backgroundColor: `${cat.colorHex}0d`,
                        color: "#1a1a1a",
                      }
                      : undefined
                }
                className={`flex min-h-[38px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none sm:min-h-[42px] sm:px-3.5 ${isSelected
                  ? "border-ink bg-ink text-white shadow-xs"
                  : "border-hairline bg-canvas text-text-muted hover:bg-surface-card hover:text-ink"
                  }`}
              >
                {isSelected ? (
                  <CheckIcon className="size-3.5 text-white" />
                ) : (
                  cat.colorHex && (
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: cat.colorHex }}
                    />
                  )
                )}
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
        {errors.tag && (
          <p
            id="ev-category-error"
            className="flex items-center gap-1.5 text-xs font-semibold text-rose-700"
          >
            <AlertCircleIcon className="size-3.5" aria-hidden="true" />
            {errors.tag}
          </p>
        )}
      </section>

      {/* 2. Event Basics, Schedule & Location */}
      <section
        aria-labelledby="event-basics-heading"
        className="space-y-3.5 border-b border-hairline pb-4 sm:space-y-4 sm:rounded-2xl sm:border sm:bg-surface-soft sm:p-4"
      >
        <div>
          <h2
            id="event-basics-heading"
            className="flex items-center gap-2 text-xs font-bold text-ink sm:text-sm"
          >
            <CalendarIcon className="size-4 text-clay-teal" />
            2. Event Details &amp; Schedule
          </h2>
          <p className="mt-0.5 hidden text-xs leading-relaxed text-text-muted sm:block">
            Name the event, pick its date &amp; service time, and set the temple venue.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          {/* Event Name */}
          <div className="space-y-1.5">
            <label
              htmlFor="ev-title"
              className="text-xs font-bold text-ink"
            >
              Event name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <FileTextIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-clay-teal" />
              <input
                id="ev-title"
                type="text"
                required
                value={title}
                autoCapitalize="words"
                autoComplete="off"
                onChange={(e) => {
                  setTitle(e.target.value)
                  if (errors.title) {
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.title
                      return next
                    })
                  }
                }}
                placeholder="e.g. Sunday Youth Fellowship"
                aria-invalid={Boolean(errors.title)}
                aria-describedby={errors.title ? "ev-title-error" : undefined}
                className={`h-11 w-full rounded-xl border bg-canvas pr-4 pl-10 text-xs text-ink shadow-2xs transition-all outline-none placeholder:text-text-muted/70 sm:text-sm ${errors.title
                  ? "border-rose-400 focus:border-rose-500"
                  : "border-hairline focus:border-ink focus:ring-1 focus:ring-ink"
                  }`}
              />
            </div>
            {errors.title && (
              <p
                id="ev-title-error"
                className="animate-in text-[11px] font-semibold text-rose-600 fade-in"
              >
                {errors.title}
              </p>
            )}
          </div>

          {/* Location Input + Recent Dropdown (up to 3 last used; hidden when empty so typed text is treated as new) */}
          <div ref={locationWrapperRef} className="relative flex w-full flex-col gap-1.5">
            <label
              htmlFor="ev-loc"
              className="text-xs font-bold text-ink"
            >
              Location{" "}
              <span className="text-[11px] font-normal text-text-muted">
                (Optional)
              </span>
            </label>
            <div className="relative">
              <MapPinIcon className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink" />
              <input
                id="ev-loc"
                name="sekkha-event-place-custom"
                type="text"
                value={location}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                aria-autocomplete="none"
                aria-expanded={locationMenuOpen && recentVenueOptions.length > 0}
                aria-controls="ev-loc-listbox"
                data-lpignore="true"
                data-1p-ignore="true"
                data-bwignore="true"
                data-form-type="other"
                onFocus={() => {
                  if (recentVenueOptions.length > 0) setLocationMenuOpen(true)
                }}
                onClick={() => {
                  if (recentVenueOptions.length > 0) setLocationMenuOpen(true)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setLocationMenuOpen(false)
                }}
                onChange={(e) => {
                  setLocation(e.target.value)
                  if (recentVenueOptions.length > 0) setLocationMenuOpen(true)
                }}
                placeholder="e.g. Dharmasala Utama"
                className={`h-11 w-full rounded-xl border border-hairline bg-canvas pl-10 text-xs text-ink shadow-2xs transition-all outline-none placeholder:text-text-muted/70 focus:border-ink focus:ring-1 focus:ring-ink sm:text-sm ${recentVenueOptions.length > 0 ? "pr-10" : "pr-4"
                  }`}
              />
              {recentVenueOptions.length > 0 && (
                <button
                  type="button"
                  aria-label="Toggle recent locations"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setLocationMenuOpen((prev) => !prev)}
                  className="absolute top-1/2 right-2 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-surface-soft hover:text-ink"
                >
                  <ChevronDownIcon
                    className={`size-4 transition-transform duration-150 ${locationMenuOpen ? "rotate-180 text-ink" : ""
                      }`}
                  />
                </button>
              )}
            </div>

            {locationMenuOpen && recentVenueOptions.length > 0 && (
              <div
                id="ev-loc-listbox"
                role="listbox"
                aria-label="Recent locations"
                className="absolute top-full right-0 left-0 z-30 mt-1.5 overflow-hidden rounded-xl border border-hairline bg-canvas p-1 shadow-lg"
              >
                <p className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-text-muted uppercase">
                  Recent locations
                </p>
                {recentVenueOptions.slice(0, 3).map((venue) => {
                  const isSelected =
                    location.trim().toLowerCase() === venue.toLowerCase()
                  return (
                    <button
                      key={venue}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setLocation(venue)
                        setLocationMenuOpen(false)
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors sm:text-sm ${isSelected
                        ? "bg-surface-soft font-semibold text-ink"
                        : "text-ink hover:bg-surface-soft"
                        }`}
                    >
                      <span className="truncate">{venue}</span>
                      {isSelected && (
                        <CheckIcon className="size-3.5 shrink-0 text-clay-teal" />
                      )}
                    </button>
                  )
                })}
                {location.trim().length > 0 &&
                  !recentVenueOptions.some(
                    (v) => v.toLowerCase() === location.trim().toLowerCase()
                  ) && (
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => setLocationMenuOpen(false)}
                      className="mt-0.5 flex w-full cursor-pointer items-center gap-1.5 border-t border-hairline px-2.5 py-2 text-left text-xs font-medium text-clay-teal transition-colors hover:bg-surface-soft"
                    >
                      <span className="truncate">
                        Use &ldquo;{location.trim()}&rdquo; as new location
                      </span>
                    </button>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* Date & Time Input (Full width so inline calendar + time controls expand cleanly) */}
        <div className="flex w-full flex-col gap-1.5">
          <label
            htmlFor="ev-date"
            className="text-xs font-bold text-ink"
          >
            Date and time <span className="text-rose-500">*</span>
          </label>
          <DateTimePicker
            id="ev-date"
            value={eventDate}
            disablePastDates={!initial?.id}
            recentTimes={recentTimeOptions}
            onChange={(val) => {
              setEventDate(val)
              if (errors.event_date) {
                setErrors((prev) => {
                  const next = { ...prev }
                  delete next.event_date
                  return next
                })
              }
            }}
            error={errors.event_date}
          />
          {errors.event_date && (
            <p
              id="ev-date-error"
              className="animate-in text-[11px] font-semibold text-rose-600 fade-in"
            >
              {errors.event_date}
            </p>
          )}
        </div>

        {/* Description / Instructions */}
        <div className="flex w-full flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="ev-desc"
              className="text-xs font-bold text-ink"
            >
              Description {" "}
              <span className="text-[11px] font-normal text-text-muted">
                (Optional)
              </span>
            </label>
            <div className="flex items-center gap-1.5">
              {!initial?.id && isDescriptionEdited && (
                <button
                  type="button"
                  onClick={() => {
                    setIsDescriptionEdited(false)
                    setDescription(
                      buildDefaultEventDescription({
                        title,
                        eventDate: eventDate || undefined,
                        location,
                      })
                    )
                  }}
                  className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-hairline bg-canvas px-2 py-1 text-[11px] font-semibold text-text-muted transition-colors hover:bg-surface-card hover:text-ink"
                >
                  Sync template
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsDescExpanded((prev) => !prev)}
                aria-expanded={isDescExpanded}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-hairline bg-canvas px-2 py-1 text-[11px] font-semibold text-ink transition-colors hover:bg-surface-card"
              >
                {isDescExpanded ? (
                  <>
                    <Minimize2Icon className="size-3" aria-hidden="true" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <>
                    <Maximize2Icon className="size-3" aria-hidden="true" />
                    <span>Expand</span>
                  </>
                )}
              </button>
            </div>
          </div>
          <textarea
            id="ev-desc"
            rows={isDescExpanded ? 12 : 4}
            value={description}
            onChange={(e) => {
              setIsDescriptionEdited(true)
              setDescription(e.target.value)
            }}
            placeholder="Write additional details, dress code, or instructions for attendees..."
            className={`w-full resize-y rounded-xl border border-hairline bg-canvas px-3.5 py-2.5 text-xs leading-relaxed text-ink shadow-2xs transition-all outline-none placeholder:text-text-muted/70 focus:border-ink focus:ring-1 focus:ring-ink sm:text-sm ${isDescExpanded ? "min-h-[300px]" : "min-h-[104px] sm:min-h-[132px]"
              }`}
          />
        </div>
      </section>

      {/* 3. Attendance & Late Arrival Policy */}
      <section
        aria-labelledby="event-policy-heading"
        className="space-y-3 pb-1 sm:rounded-2xl sm:border sm:border-hairline sm:bg-surface-soft sm:p-4"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <label
              htmlFor="ev-late-penalty-toggle"
              id="event-policy-heading"
              className="flex cursor-pointer items-center gap-2 text-xs font-bold text-ink sm:text-sm"
            >
              <ShieldCheckIcon className="size-4 text-clay-teal" />
              <span>Apply Late Penalty</span>
            </label>
            <p className="text-[11px] leading-relaxed text-text-muted">
              Deduct karma points if members check in past the arrival grace period.
            </p>
          </div>
          <Switch
            id="ev-late-penalty-toggle"
            checked={applyLatePenalty}
            onCheckedChange={(checked) => {
              isLatePolicyEditedRef.current = true
              setApplyLatePenalty(checked)
            }}
            aria-label="Apply Late Penalty"
          />
        </div>

        {applyLatePenalty && (
          <div className="grid grid-cols-2 gap-2.5 border-t border-hairline pt-3 sm:gap-3">
            <div className="space-y-1">
              <label
                htmlFor="ev-grace-minutes"
                className="text-[11px] font-bold text-text-muted"
              >
                Grace Period (Minutes)
              </label>
              <input
                id="ev-grace-minutes"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={maxLateMinutes}
                onChange={(e) => {
                  isLatePolicyEditedRef.current = true
                  setMaxLateMinutes(sanitizeIntegerInput(e.target.value))
                  if (errors.maxLateMinutes) {
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.maxLateMinutes
                      return next
                    })
                  }
                }}
                placeholder="0 – 180"
                aria-invalid={Boolean(errors.maxLateMinutes)}
                className={`h-10 w-full rounded-xl border bg-canvas px-3 font-mono text-base font-bold text-ink outline-none focus:ring-1 sm:text-sm ${
                  errors.maxLateMinutes
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-400"
                    : "border-hairline focus:border-ink focus:ring-ink"
                }`}
              />
              {errors.maxLateMinutes && (
                <p className="text-[11px] font-medium text-rose-600">
                  {errors.maxLateMinutes}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <label
                htmlFor="ev-penalty-points"
                className="text-[11px] font-bold text-text-muted"
              >
                Penalty Deduction (Points)
              </label>
              <input
                id="ev-penalty-points"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={latePenaltyPoints}
                onChange={(e) => {
                  isLatePolicyEditedRef.current = true
                  setLatePenaltyPoints(sanitizeIntegerInput(e.target.value))
                  if (errors.latePenaltyPoints) {
                    setErrors((prev) => {
                      const next = { ...prev }
                      delete next.latePenaltyPoints
                      return next
                    })
                  }
                }}
                placeholder="1 – 100"
                aria-invalid={Boolean(errors.latePenaltyPoints)}
                className={`h-10 w-full rounded-xl border bg-canvas px-3 font-mono text-base font-bold text-ink outline-none focus:ring-1 sm:text-sm ${
                  errors.latePenaltyPoints
                    ? "border-rose-400 focus:border-rose-500 focus:ring-rose-400"
                    : "border-hairline focus:border-ink focus:ring-ink"
                }`}
              />
              {errors.latePenaltyPoints && (
                <p className="text-[11px] font-medium text-rose-600">
                  {errors.latePenaltyPoints}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 4. Actions */}
      <div className="flex flex-row gap-2.5 border-t border-hairline pt-4 sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="min-h-11 flex-1 cursor-pointer rounded-xl border border-hairline bg-canvas px-4 text-xs font-bold text-ink transition-colors hover:bg-surface-card focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 flex-[2] cursor-pointer items-center justify-center gap-2 rounded-xl bg-ink px-5 text-xs font-bold text-white shadow-xs transition-all hover:bg-ink/90 focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-50 sm:flex-none sm:text-sm"
        >
          {submitting && (
            <LoaderCircleIcon
              className="size-4 animate-spin"
              aria-hidden="true"
            />
          )}
          {submitting
            ? "Saving..."
            : initial?.id
              ? "Save Changes"
              : "Create Event"}
        </button>
      </div>
    </form>
  )
}
