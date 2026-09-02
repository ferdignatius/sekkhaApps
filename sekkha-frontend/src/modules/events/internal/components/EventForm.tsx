// feature/events/components/EventForm
// Create / edit event form for pengurus+ with unified categories, masterdata autofill, & optional location.

import { useState } from "react"
import { MapPinIcon, SparklesIcon, TagIcon, CheckIcon, Wand2Icon } from "lucide-react"
import { useAuth } from "@/modules/auth"
import { DateTimePickerPopover } from "@/components/ui/DateTimePickerPopover"
import type { CreateEventPayload, EventListItem, EventTag, EventType } from "../types"
import { getAccessibleCategories } from "../masterdata"

interface EventFormProps {
  /** If provided, pre-fill the form for editing */
  initial?: Partial<EventListItem>
  /** Pre-fill the date field when creating a new event from calendar selection (YYYY-MM-DD) */
  initialDate?: string
  onSubmit: (payload: CreateEventPayload) => void
  onCancel: () => void
  isSubmitting?: boolean
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
}: EventFormProps) {
  const { authState } = useAuth()
  const role = authState.status === "authenticated" ? authState.role : null

  // Dynamic Accessible Master Data category options for logged-in user
  const categoryOptions: CategoryOption[] = getAccessibleCategories(role, true).map(cat => ({
    id: cat.tag as EventTag,
    label: cat.name,
    bg: `${cat.bg} ${cat.text}`,
    colorHex: cat.colorHex,
    autofill: {
      title: cat.autofillTitle ?? `${cat.name} Activity`,
      location: cat.autofillLocation ?? "Vihara Sekkha",
      description: cat.autofillDesc ?? `${cat.name} session with Sekkha community members.`,
    },
  }))

  // Default category is 'basic' if not provided
  const [tag, setTag] = useState<EventTag>(initial?.tag ?? "basic")
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

  // Handle Category Select with Masterdata Autofill (title, location, description, time)
  function handleSelectCategory(cat: CategoryOption) {
    setTag(cat.id)
    if (!title.trim() || categoryOptions.some(c => c.autofill.title === title)) {
      setTitle(cat.autofill.title)
    }
    if (!location.trim() || categoryOptions.some(c => c.autofill.location === location)) {
      setLocation(cat.autofill.location)
    }
    if (!description.trim() || categoryOptions.some(c => c.autofill.description === description)) {
      setDescription(cat.autofill.description)
    }
  }

  // Form Submission
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    const errs: Record<string, string> = {}
    if (!title.trim()) {
      errs.title = "Event name is required"
    }
    if (!eventDate) {
      errs.event_date = "Event date and time is required"
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})
    onSubmit({
      title: title.trim(),
      description: description.trim() || "",
      event_date: localToIso(eventDate),
      location: location.trim() ? location.trim() : "Vihara Sekkha",
      tag,
      event_type: (tag === "special" ? "special" : "rutin") as EventType,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sans text-left">
      {/* 1. Category Selection Badges */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-bold text-[#0a0a0a]">
            <TagIcon className="size-3.5 text-[#0a0a0a]" />
            <span>Event Category</span>
          </label>
          <span className="flex items-center gap-1 text-[11px] font-semibold text-[#6a6a6a]">
            <Wand2Icon className="size-3 text-[#e8b94a]" />
            Auto-fill active
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-0.5">
          {categoryOptions.map(cat => {
            const isSelected = tag === cat.id

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={`flex items-center gap-1.5 rounded-[10px] px-3.5 py-1.5 text-xs font-bold transition-all border cursor-pointer ${
                  isSelected
                    ? "bg-[#0a0a0a] text-white border-[#0a0a0a] shadow-xs"
                    : "bg-[#fffaf0] border-[#e5e5e5] text-[#6a6a6a] hover:bg-[#faf5e8] hover:text-[#0a0a0a]"
                }`}
              >
                {isSelected && <CheckIcon className="size-3.5 text-white" />}
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Event Title Field */}
      <div className="space-y-1.5">
        <label htmlFor="ev-title" className="text-xs font-bold text-[#0a0a0a]">
          Event Name <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <SparklesIcon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#e8b94a]" />
          <input
            id="ev-title"
            type="text"
            required
            value={title}
            onChange={e => {
              setTitle(e.target.value)
              if (errors.title) {
                setErrors(prev => {
                  const next = { ...prev }
                  delete next.title
                  return next
                })
              }
            }}
            placeholder="e.g. Sunday Youth Fellowship"
            className={`h-11 w-full rounded-[12px] border bg-[#fffaf0] pl-10 pr-4 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs transition-all ${
              errors.title
                ? "border-rose-400 focus:border-rose-500"
                : "border-[#e5e5e5] focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a]"
            }`}
          />
        </div>
        {errors.title && (
          <p className="text-[11px] font-semibold text-rose-600 animate-in fade-in">
            {errors.title}
          </p>
        )}
      </div>

      {/* 3. Date & Location Fields (Location is OPTIONAL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
        {/* Date & Time Input (Mandatory) */}
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="ev-date" className="text-xs font-bold text-[#0a0a0a]">
            Event Date & Time <span className="text-rose-500">*</span>
          </label>
          <DateTimePickerPopover
            value={eventDate}
            categoryTag={tag}
            onChange={val => {
              setEventDate(val)
              if (errors.event_date) {
                setErrors(prev => {
                  const next = { ...prev }
                  delete next.event_date
                  return next
                })
              }
            }}
            error={errors.event_date}
          />
          {errors.event_date && (
            <p className="text-[11px] font-semibold text-rose-600 animate-in fade-in">
              {errors.event_date}
            </p>
          )}
        </div>

        {/* Location Input (OPTIONAL) */}
        <div className="flex flex-col gap-1.5 w-full">
          <label htmlFor="ev-loc" className="text-xs font-bold text-[#0a0a0a]">
            Location <span className="text-[11px] text-[#6a6a6a] font-normal">(Optional)</span>
          </label>
          <div className="relative">
            <MapPinIcon className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#0a0a0a]" />
            <input
              id="ev-loc"
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Main Hall"
              className="h-11 w-full rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] pl-10 pr-4 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
            />
          </div>
        </div>
      </div>

      {/* 4. Description Field */}
      <div className="flex flex-col gap-1.5 w-full">
        <label htmlFor="ev-desc" className="text-xs font-bold text-[#0a0a0a]">
          Description / Instructions <span className="text-[11px] text-[#6a6a6a] font-normal">(Optional)</span>
        </label>
        <textarea
          id="ev-desc"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Write additional details or instructions for attendees..."
          className="w-full rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] px-3.5 py-2.5 text-xs sm:text-sm text-[#0a0a0a] placeholder:text-[#6a6a6a] outline-none shadow-xs focus:border-[#0a0a0a] focus:ring-1 focus:ring-[#0a0a0a] transition-all"
        />
      </div>

      {/* 5. Action Form Buttons */}
      <div className="flex items-center gap-2.5 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 rounded-[12px] border border-[#e5e5e5] bg-[#fffaf0] text-xs sm:text-sm font-bold text-[#0a0a0a] hover:bg-[#faf5e8] transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-11 flex-1 rounded-[12px] bg-[#0a0a0a] text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#1f1f1f] disabled:opacity-50 transition-all cursor-pointer"
        >
          {isSubmitting ? "Saving..." : initial?.id ? "Save Changes" : "Create Event"}
        </button>
      </div>

    </form>
  )
}
