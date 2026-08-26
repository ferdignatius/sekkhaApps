// feature/events/components/EventForm
// Create / edit event form for pengurus+ with unified categories, masterdata autofill, & optional location.

import { useState } from "react"
import { CalendarIcon, MapPinIcon, SparklesIcon, TagIcon, FileTextIcon, AlertCircleIcon, CheckIcon, Wand2Icon } from "lucide-react"
import { useAuth } from "@/modules/auth"
import { DateTimePickerPopover } from "@/components/ui/DateTimePickerPopover"
import { Button, Input } from "@/components/base"
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
    bg: `${cat.bg} ${cat.text} border-current/30`,
    colorHex: cat.colorHex,
    autofill: {
      title: cat.autofillTitle ?? `Kegiatan ${cat.name} Vihara`,
      location: cat.autofillLocation ?? "Vihara Sekkha",
      description: cat.autofillDesc ?? `Kegiatan ${cat.name.toLowerCase()} bersama Umat Vihara Sekkha.`,
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
      errs.title = "Nama event wajib diisi"
    }
    if (!eventDate) {
      errs.event_date = "Tanggal dan waktu event wajib diisi"
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
      {/* 1. Category Selection Pill Badges */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-caption font-bold text-sekkha-ink">
            <TagIcon className="size-4 text-sekkha-brand-blue" />
            <span>Kategori Event</span>
          </label>
          <span className="flex items-center gap-1 text-micro text-sekkha-slate">
            <Wand2Icon className="size-3 text-sekkha-brand-blue" />
            Auto-fill aktif
          </span>
        </div>

        <div className="flex flex-wrap gap-2 pt-0.5">
          {categoryOptions.map(cat => {
            const isSelected = tag === cat.id
            const hex = cat.colorHex
            const customStyle = hex
              ? {
                  backgroundColor: isSelected ? `${hex}15` : undefined,
                  borderColor: isSelected ? hex : undefined,
                  color: isSelected ? hex : undefined,
                }
              : undefined

            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                style={customStyle}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-caption-bold transition-all border cursor-pointer ${
                  isSelected
                    ? hex ? "shadow-xs ring-2 ring-sekkha-brand-blue/20" : `${cat.bg} shadow-xs ring-2 ring-sekkha-brand-blue/20`
                    : "bg-sekkha-canvas border-sekkha-hairline text-sekkha-slate hover:bg-white"
                }`}
              >
                {isSelected && <CheckIcon className="size-3.5 text-current" />}
                <span>{cat.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 2. Event Title Field */}
      <Input
        id="ev-title"
        label="Nama Event Vihara"
        required
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Contoh: Kebaktian Minggu Remaja"
        startIcon={<SparklesIcon className="size-4 text-sekkha-brand-blue" />}
        error={errors.title}
      />

      {/* 3. Date & Location Fields (Location is OPTIONAL) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Date & Time Input (Mandatory) */}
        <div className="space-y-1.5">
          <label htmlFor="ev-date" className="flex items-center justify-between text-caption font-bold text-sekkha-ink">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="size-4 text-sekkha-brand-blue" />
              <span>Tanggal & Waktu</span>
            </span>
            <span className="text-micro text-red-500 font-semibold">* Wajib</span>
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
            <p className="flex items-center gap-1.5 text-micro-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
              <AlertCircleIcon className="size-3.5 shrink-0" />
              <span>{errors.event_date}</span>
            </p>
          )}
        </div>

        {/* Location Input (OPTIONAL) */}
        <Input
          id="ev-loc"
          label="Lokasi Tempat (Opsional)"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Misal: Dhammasala Utama"
          startIcon={<MapPinIcon className="size-4 text-sekkha-brand-blue" />}
        />
      </div>

      {/* 4. Description Field */}
      <div className="flex flex-col gap-1.5 w-full">
        <label htmlFor="ev-desc" className="flex items-center justify-between text-caption font-bold text-sekkha-ink">
          <span className="flex items-center gap-1.5">
            <FileTextIcon className="size-4 text-sekkha-slate" />
            <span>Deskripsi Keterangan Event</span>
          </span>
          <span className="text-micro text-sekkha-slate font-medium">(Opsional)</span>
        </label>
        <textarea
          id="ev-desc"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Tuliskan keterangan detail atau instruksi bagi peserta yang akan hadir..."
          className="w-full rounded-2xl bg-slate-50/70 border border-sekkha-hairline-strong px-3.5 py-2.5 text-caption font-medium text-sekkha-ink placeholder:text-slate-400 outline-none focus:border-sekkha-brand-blue focus:bg-white focus:ring-2 focus:ring-blue-500/10 transition-all"
        />
      </div>

      {/* 5. Action Form Buttons */}
      <div className="flex items-center gap-2.5 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="flex-1"
        >
          Batal
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? "Menyimpan..." : initial?.id ? "Simpan Perubahan" : "Buat Event Sekarang"}
        </Button>
      </div>

    </form>
  )
}
