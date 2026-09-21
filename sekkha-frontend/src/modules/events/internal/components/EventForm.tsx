// feature/events/components/EventForm
// Create / edit event form for pengurus+ with unified categories, masterdata autofill, & optional location.

import { useState } from "react"
import {
  AlertCircleIcon,
  CalendarIcon,
  FileTextIcon,
  LoaderCircleIcon,
  MapPinIcon,
  TagIcon,
  CheckIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { DateTimePickerPopover } from "@/components/ui/DateTimePickerPopover"
import type {
  CreateEventPayload,
  EventListItem,
  EventTag,
  EventType,
} from "../types"
import { getAccessibleCategories } from "../masterdata"

interface EventFormProps {
  /** If provided, pre-fill the form for editing */
  initial?: Partial<EventListItem>
  /** Pre-fill the date field when creating a new event from calendar selection (YYYY-MM-DD) */
  initialDate?: string
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

export interface CategoryOption {
  id: EventTag
  label: string
  bg: string
  colorHex?: string
  autofill: {
    title: string
    location: string
    description: string
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EventForm({
  initial,
  initialDate,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submissionError = null,
}: EventFormProps) {
  const { authState } = useAuth()
  const role = authState.status === "authenticated" ? authState.role : null

  // Dynamic Accessible Master Data category options for logged-in user
  const categoryOptions: CategoryOption[] = getAccessibleCategories(
    role,
    true
  ).map((cat) => ({
    id: cat.tag as EventTag,
    label: cat.name,
    bg: `${cat.bg} ${cat.text}`,
    colorHex: cat.colorHex,
    autofill: {
      title: cat.autofillTitle ?? `${cat.name} Activity`,
      location: cat.autofillLocation ?? "Vihara Sekkha",
      description:
        cat.autofillDesc ??
        `${cat.name} session with Sekkha community members.`,
    },
  }))

  const [tag, setTag] = useState<EventTag | undefined>(initial?.tag)
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [location, setLocation] = useState(initial?.location ?? "")
  // Pre-fill date: prefer existing event date (edit mode), then initialDate from calendar selection
  const [eventDate, setEventDate] = useState(() => {
    if (initial?.event_date) return isoToLocal(initial.event_date)
    if (initialDate) return `${initialDate}T08:00`
    return ""
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [internalSubmitting, setInternalSubmitting] = useState(false)
  const submitting = isSubmitting || internalSubmitting

  // Handle Category Select with Masterdata Autofill (title, location, description, time)
  function handleSelectCategory(cat: CategoryOption) {
    setErrors((prev) => {
      if (!prev.tag) return prev
      const next = { ...prev }
      delete next.tag
      return next
    })
    if (tag === cat.id) {
      setTag(undefined)
      return
    }
    setTag(cat.id)
    if (
      !title.trim() ||
      categoryOptions.some((c) => c.autofill.title === title)
    ) {
      setTitle(cat.autofill.title)
    }
    if (
      !location.trim() ||
      categoryOptions.some((c) => c.autofill.location === location)
    ) {
      setLocation(cat.autofill.location)
    }
    if (
      !description.trim() ||
      categoryOptions.some((c) => c.autofill.description === description)
    ) {
      setDescription(cat.autofill.description)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errs: Record<string, string> = {}
    if (!tag) {
      errs.tag = "Event category is required"
    }
    if (!title.trim()) {
      errs.title = "Event name is required"
    }
    if (!eventDate) {
      errs.event_date = "Event date and time is required"
    } else if (Number.isNaN(new Date(eventDate).getTime())) {
      errs.event_date = "Choose a valid date and time"
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})
    setInternalSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: initial?.id ? description.trim() : "",
        event_date: localToIso(eventDate),
        location: location.trim() ? location.trim() : "Vihara Sekkha",
        tag,
        event_type: (tag === "special" ? "special" : "rutin") as EventType,
      })
    } finally {
      setInternalSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 text-left font-sans">
      {(Object.keys(errors).length > 0 || submissionError) && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2.5 rounded-[12px] border border-[#ef4444]/30 bg-[#ef4444]/5 p-3 text-xs text-[#991b1b]"
        >
          <AlertCircleIcon
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <div className="min-w-0 space-y-1">
            <p className="font-bold">
              {submissionError
                ? "We couldn&apos;t save this event."
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
      {/* 1. Category Selection Badges */}
      <section
        aria-labelledby="event-category-heading"
        className={`space-y-3 rounded-[16px] border bg-[#faf5e8] p-3.5 sm:p-4 ${
          errors.tag ? "border-[#ef4444]" : "border-[#e5e5e5]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <label
            id="event-category-heading"
            className="flex items-center gap-1.5 text-xs font-bold text-[#0a0a0a]"
          >
            <TagIcon className="size-3.5 text-[#0a0a0a]" />
            <span>
              Event Category <span className="text-rose-500">*</span>
            </span>
          </label>
        </div>

        <div
          role="radiogroup"
          aria-labelledby="event-category-heading"
          aria-required="true"
          aria-invalid={Boolean(errors.tag)}
          aria-describedby={errors.tag ? "ev-category-error" : undefined}
          className="flex flex-wrap gap-2"
        >
          {categoryOptions.map((cat) => {
            const isSelected = tag === cat.id

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                role="radio"
                aria-checked={isSelected}
                className={`flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-[12px] border px-3.5 py-1.5 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:outline-none ${
                  isSelected
                    ? "border-[#0a0a0a] bg-[#0a0a0a] text-white shadow-xs"
                    : "border-[#e5e5e5] bg-[#fffaf0] text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
                }`}
              >
                {isSelected && <CheckIcon className="size-3.5 text-white" />}
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
        {errors.tag && (
          <p
            id="ev-category-error"
            className="flex items-center gap-1.5 text-xs font-semibold text-[#b42318]"
          >
            <AlertCircleIcon className="size-3.5" aria-hidden="true" />
            {errors.tag}
          </p>
        )}
      </section>
      {/* 2. Event Basics */}
      <section
        aria-labelledby="event-basics-heading"
        className="space-y-4 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 sm:p-4"
      >
        <div>
          <h2
            id="event-basics-heading"
            className="flex items-center gap-2 text-sm font-bold text-[#0a0a0a]"
          >
            <FileTextIcon className="size-4 text-[#1a3a3a]" />
            Event basics
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#6a6a6a]">
            Give attendees a clear name and enough context to decide if they
            want to join.
          </p>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="ev-title"
            className="text-xs font-bold text-[#0a0a0a]"
          >
            Event name <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <FileTextIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#1a3a3a]" />
            <input
              id="ev-title"
              type="text"
              required
              value={title}
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
              className={`h-11 w-full rounded-[12px] border bg-[#fffaf0] pr-4 pl-10 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#767676] sm:text-sm ${
                errors.title
                  ? "border-rose-400 focus:border-rose-500"
                  : "border-[#e5e5e5] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
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
      </section>

      {/* 3. Schedule & Location */}
      <section
        aria-labelledby="event-schedule-heading"
        className="space-y-4 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 sm:p-4"
      >
        <div>
          <h2
            id="event-schedule-heading"
            className="flex items-center gap-2 text-sm font-bold text-[#0a0a0a]"
          >
            <CalendarIcon className="size-4 text-[#1a3a3a]" />
            When and where
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-[#6a6a6a]">
            Set the event time first. Location is optional and defaults to
            Vihara Sekkha when left blank.
          </p>
        </div>
        <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2">
          {/* Date & Time Input (Mandatory) */}
          <div className="flex w-full flex-col gap-1.5">
            <label
              htmlFor="ev-date"
              className="text-xs font-bold text-[#0a0a0a]"
            >
              Date and time <span className="text-rose-500">*</span>
            </label>
            <DateTimePickerPopover
              id="ev-date"
              value={eventDate}
              categoryTag={tag}
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

          {/* Location Input (OPTIONAL) */}
          <div className="flex w-full flex-col gap-1.5">
            <label
              htmlFor="ev-loc"
              className="text-xs font-bold text-[#0a0a0a]"
            >
              Location{" "}
              <span className="text-[11px] font-normal text-[#6a6a6a]">
                (Optional)
              </span>
            </label>
            <div className="relative">
              <MapPinIcon className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-[#0a0a0a]" />
              <input
                id="ev-loc"
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Main Hall"
                className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pr-4 pl-10 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {initial?.id && (
        <>
          {/* 4. Additional Details */}
          <section
            aria-labelledby="event-details-heading"
            className="space-y-3 rounded-[16px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 sm:p-4"
          >
            <div>
              <h2
                id="event-details-heading"
                className="flex items-center gap-2 text-sm font-bold text-[#0a0a0a]"
              >
                <FileTextIcon className="size-4 text-[#1a3a3a]" />
                Additional details
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-[#6a6a6a]">
                Add instructions, dress code, or anything attendees should know.
              </p>
            </div>
            <div className="flex w-full flex-col gap-1.5">
              <label
                htmlFor="ev-desc"
                className="text-xs font-bold text-[#0a0a0a]"
              >
                Description and instructions{" "}
                <span className="text-[11px] font-normal text-[#6a6a6a]">
                  (Optional)
                </span>
              </label>
              <textarea
                id="ev-desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write additional details or instructions for attendees..."
                className="w-full rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2.5 text-xs text-[#0a0a0a] shadow-xs transition-all outline-none placeholder:text-[#6a6a6a] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] sm:text-sm"
              />
            </div>
          </section>
        </>
      )}

      {/* 5. Actions */}
      <div className="flex flex-col-reverse gap-2.5 border-t border-[#e5e5e5] pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="min-h-11 flex-1 cursor-pointer rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] px-4 text-xs font-bold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8] focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] px-5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-wait disabled:opacity-50 sm:flex-none sm:text-sm"
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
