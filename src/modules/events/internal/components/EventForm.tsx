// feature/events/components/EventForm
// Create / edit event form for pengurus+ with unified categories, masterdata autofill, & optional location.

import { useState } from "react"
import { CalendarIcon, MapPinIcon, SparklesIcon, TagIcon, FileTextIcon, AlertCircleIcon, CheckIcon, Wand2Icon } from "lucide-react"
import { DateTimePickerPopover } from "@/components/ui/DateTimePickerPopover"
import type { CreateEventPayload, EventListItem, EventTag } from "../types"

interface EventFormProps {
  /** If provided, pre-fill the form for editing */
  initial?: Partial<EventListItem>
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
  autofill: {
    title: string
    location: string
    description: string
  }
}

// Master data category options with 'basic' as default
const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: "basic",
    label: "Basic",
    bg: "bg-slate-100 text-slate-800 border-slate-300",
    autofill: {
      title: "Kegiatan Pemuda Sekkha",
      location: "Vihara Sekkha",
      description: "Kegiatan kebersamaan dan pembinaan pemuda vihara."
    }
  },
  {
    id: "rutin",
    label: "Rutin",
    bg: "bg-sky-100 text-sky-800 border-sky-300",
    autofill: {
      title: "Kebaktian Minggu Remaja",
      location: "Dhammasala Utama",
      description: "Kebaktian rutin mingguan pemuda, pembacaan paritta, dan Dhammadesana."
    }
  },
  {
    id: "special",
    label: "Special",
    bg: "bg-amber-100 text-amber-800 border-amber-300",
    autofill: {
      title: "Perayaan Hari Besar Vihara",
      location: "Gedung Utama Vihara",
      description: "Acara perayaan hari besar agama Buddha bersama Umat."
    }
  },
  {
    id: "retreat",
    label: "Retreat",
    bg: "bg-purple-100 text-purple-800 border-purple-300",
    autofill: {
      title: "Retreat Meditasi Pemuda",
      location: "Pusat Meditasi",
      description: "Retreat pembinaan diri dan sesi meditasi intensif."
    }
  },
  {
    id: "meditasi",
    label: "Meditasi",
    bg: "bg-emerald-100 text-emerald-800 border-emerald-300",
    autofill: {
      title: "Sesi Meditasi & Chanting",
      location: "Ruang Meditasi",
      description: "Sesi latihan meditasi pernapasan dan olah ketenangan jiwa."
    }
  },
  {
    id: "sosial",
    label: "Sosial",
    bg: "bg-rose-100 text-rose-800 border-rose-300",
    autofill: {
      title: "Bakti Sosial & Aksi Kasih",
      location: "Area Luar Vihara",
      description: "Kegiatan bakti sosial dan penyaluran bantuan kepada masyarakat."
    }
  },
]

// ─── Component ───────────────────────────────────────────────────────────────

export function EventForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EventFormProps) {
  // Default category is 'basic' if not provided
  const [tag, setTag] = useState<EventTag>(initial?.tag ?? "basic")
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [location, setLocation] = useState(initial?.location ?? "")
  const [eventDate, setEventDate] = useState(
    initial?.event_date ? isoToLocal(initial.event_date) : "",
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Handle Category Select with Masterdata Autofill
  function handleSelectCategory(cat: CategoryOption) {
    setTag(cat.id)
    // Autofill fields if currently empty or matches previous default
    if (!title.trim() || CATEGORY_OPTIONS.some(c => c.autofill.title === title)) {
      setTitle(cat.autofill.title)
    }
    if (!location.trim() || CATEGORY_OPTIONS.some(c => c.autofill.location === location)) {
      setLocation(cat.autofill.location)
    }
    if (!description.trim() || CATEGORY_OPTIONS.some(c => c.autofill.description === description)) {
      setDescription(cat.autofill.description)
    }
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Nama event wajib diisi"
    if (!eventDate) e.event_date = "Tanggal & waktu wajib diisi"
    return e
  }

  function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate()
    if (Object.keys(e).length > 0) { setErrors(e); return }
    setErrors({})
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      event_date: localToIso(eventDate),
      event_type: tag === "special" ? "special" : "rutin",
      tag: tag,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
      
      {/* 1. TOP POSITION: Unified Event Category Pills (Default: Basic + Masterdata Autofill) */}
      <div className="space-y-1.5 rounded-2xl border border-sekkha-hairline bg-sekkha-surface/60 p-3">
        <div className="flex items-center justify-between">
          <label className="text-caption font-bold text-sekkha-ink flex items-center gap-1.5">
            <TagIcon className="size-4 text-sekkha-brand-blue" />
            <span>Kategori Event</span>
          </label>
          <span className="flex items-center gap-1 text-micro font-medium text-sekkha-slate">
            <Wand2Icon className="size-3 text-amber-500" />
            <span>Autofill dari Masterdata</span>
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {CATEGORY_OPTIONS.map(cat => {
            const isSelected = tag === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-caption-bold transition-all border ${
                  isSelected
                    ? `${cat.bg} shadow-xs ring-2 ring-sekkha-brand-blue/20`
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
      <div className="space-y-1.5">
        <label htmlFor="ev-title" className="flex items-center justify-between text-caption font-bold text-sekkha-ink">
          <span className="flex items-center gap-1.5">
            <SparklesIcon className="size-4 text-sekkha-brand-blue" />
            <span>Nama Event Vihara</span>
          </span>
          <span className="text-micro text-red-500 font-semibold">* Wajib</span>
        </label>
        <input
          id="ev-title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Contoh: Kebaktian Minggu Remaja"
          className="w-full h-11 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink placeholder:text-sekkha-slate/60 outline-none focus:border-sekkha-brand-blue focus:ring-2 focus:ring-sekkha-brand-blue/20 transition-all shadow-xs"
          aria-invalid={!!errors.title}
        />
        {errors.title && (
          <p className="flex items-center gap-1.5 text-micro-bold text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
            <AlertCircleIcon className="size-3.5 shrink-0" />
            <span>{errors.title}</span>
          </p>
        )}
      </div>

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
        <div className="space-y-1.5">
          <label htmlFor="ev-loc" className="flex items-center justify-between text-caption font-bold text-sekkha-ink">
            <span className="flex items-center gap-1.5">
              <MapPinIcon className="size-4 text-sekkha-brand-blue" />
              <span>Lokasi Tempat</span>
            </span>
            <span className="text-micro text-sekkha-slate font-medium">(Opsional)</span>
          </label>
          <input
            id="ev-loc"
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="Misal: Dhammasala Utama (opsional)"
            className="w-full h-11 rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink placeholder:text-sekkha-slate/60 outline-none focus:border-sekkha-brand-blue focus:ring-2 focus:ring-sekkha-brand-blue/20 transition-all shadow-xs"
          />
        </div>
      </div>

      {/* 4. Description Field */}
      <div className="space-y-1.5">
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
          className="w-full resize-none rounded-xl border border-sekkha-hairline bg-sekkha-canvas px-3.5 py-2.5 text-caption font-medium text-sekkha-ink placeholder:text-sekkha-slate/60 outline-none focus:border-sekkha-brand-blue focus:ring-2 focus:ring-sekkha-brand-blue/20 transition-all shadow-xs"
        />
      </div>

      {/* 5. Action Form Buttons */}
      <div className="flex items-center gap-2.5 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-xl border border-sekkha-hairline bg-sekkha-surface py-2.5 text-caption-bold text-sekkha-slate hover:bg-slate-200/60 hover:text-sekkha-ink transition-all active:scale-[0.99]"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-xl bg-sekkha-brand-blue py-2.5 text-caption-bold text-white shadow-xs hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-[0.99]"
        >
          {isSubmitting ? "Menyimpan..." : initial?.id ? "Simpan Perubahan" : "Buat Event Sekarang"}
        </button>
      </div>

    </form>
  )
}
