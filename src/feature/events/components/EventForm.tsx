// feature/events/components/EventForm
// Create / edit event form for pengurus+.
// Matches POST /events and PATCH /events/:id payloads.

import { useState } from "react"
import type { CreateEventPayload, EventListItem, EventType } from "../types"

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
  // <input type="datetime-local"> gives "YYYY-MM-DDTHH:MM" → add :00Z approximation
  return new Date(local).toISOString()
}

/** Convert ISO 8601 to local datetime string for the input */
function isoToLocal(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EventForm({
  initial,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: EventFormProps) {
  const [title, setTitle] = useState(initial?.title ?? "")
  const [description, setDescription] = useState(initial?.description ?? "")
  const [location, setLocation] = useState(initial?.location ?? "")
  const [eventDate, setEventDate] = useState(
    initial?.event_date ? isoToLocal(initial.event_date) : "",
  )
  const [eventType, setEventType] = useState<EventType>(
    initial?.event_type ?? "rutin",
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  function validate() {
    const e: Record<string, string> = {}
    if (!title.trim()) e.title = "Judul wajib diisi"
    if (!location.trim()) e.location = "Lokasi wajib diisi"
    if (!eventDate) e.event_date = "Tanggal wajib diisi"
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
      event_type: eventType,
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* Title */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ev-title" className="text-body-sm-medium text-sekkha-ink">
          Nama Event <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="ev-title"
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Kebaktian Minggu"
          className="rounded-lg border border-sekkha-hairline-strong bg-sekkha-canvas px-3 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-2 focus:border-sekkha-brand-blue"
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "ev-title-err" : undefined}
        />
        {errors.title && (
          <p id="ev-title-err" className="text-caption text-red-500">{errors.title}</p>
        )}
      </div>

      {/* Event type */}
      <div className="flex flex-col gap-1.5">
        <p className="text-body-sm-medium text-sekkha-ink">Tipe Event</p>
        <div className="flex gap-2">
          {(["rutin", "special"] as EventType[]).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setEventType(t)}
              className={`flex-1 rounded-full py-2 text-body-sm-medium transition-colors ${
                eventType === t
                  ? "bg-sekkha-brand-blue text-white"
                  : "border border-sekkha-hairline-strong bg-sekkha-canvas text-sekkha-ink hover:bg-sekkha-surface"
              }`}
            >
              {t === "rutin" ? "Rutin" : "Spesial"}
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ev-date" className="text-body-sm-medium text-sekkha-ink">
          Tanggal & Waktu <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="ev-date"
          type="datetime-local"
          value={eventDate}
          onChange={e => setEventDate(e.target.value)}
          className="rounded-lg border border-sekkha-hairline-strong bg-sekkha-canvas px-3 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-2 focus:border-sekkha-brand-blue"
          aria-invalid={!!errors.event_date}
          aria-describedby={errors.event_date ? "ev-date-err" : undefined}
        />
        {errors.event_date && (
          <p id="ev-date-err" className="text-caption text-red-500">{errors.event_date}</p>
        )}
      </div>

      {/* Location */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ev-loc" className="text-body-sm-medium text-sekkha-ink">
          Lokasi <span aria-hidden="true" className="text-red-500">*</span>
        </label>
        <input
          id="ev-loc"
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          placeholder="Vihara Dharma Bhakti"
          className="rounded-lg border border-sekkha-hairline-strong bg-sekkha-canvas px-3 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-2 focus:border-sekkha-brand-blue"
          aria-invalid={!!errors.location}
          aria-describedby={errors.location ? "ev-loc-err" : undefined}
        />
        {errors.location && (
          <p id="ev-loc-err" className="text-caption text-red-500">{errors.location}</p>
        )}
      </div>

      {/* Description */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="ev-desc" className="text-body-sm-medium text-sekkha-ink">
          Deskripsi
        </label>
        <textarea
          id="ev-desc"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Keterangan singkat tentang event..."
          className="resize-none rounded-lg border border-sekkha-hairline-strong bg-sekkha-canvas px-3 py-2.5 text-body-sm text-sekkha-ink outline-none focus:border-2 focus:border-sekkha-brand-blue"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-full border border-sekkha-hairline-strong py-2.5 text-body-sm-medium text-sekkha-ink transition-colors hover:bg-sekkha-surface"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 rounded-full bg-sekkha-primary py-2.5 text-body-sm-medium text-white transition-opacity disabled:opacity-50"
        >
          {isSubmitting ? "Menyimpan..." : initial?.id ? "Simpan Perubahan" : "Buat Event"}
        </button>
      </div>
    </form>
  )
}
