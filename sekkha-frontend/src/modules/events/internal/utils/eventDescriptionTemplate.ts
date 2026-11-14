// Event description template and share message formatter helpers.

const ID_DAYS = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
] as const

const ID_MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const

export interface EventTemplateInput {
  title?: string | null
  eventDate?: string | null
  location?: string | null
}

function parseTemplateDate(eventDate?: string | null): {
  dateLabel: string
  timeLabel: string
} {
  const pad = (n: number) => String(n).padStart(2, "0")
  if (eventDate) {
    const parsed = new Date(eventDate)
    if (!Number.isNaN(parsed.getTime())) {
      const dayName = ID_DAYS[parsed.getDay()] ?? "Sabtu"
      const dayNum = parsed.getDate()
      const monthName = ID_MONTHS[parsed.getMonth()] ?? "November"
      const year = parsed.getFullYear()
      const timeLabel = `${pad(parsed.getHours())}.${pad(parsed.getMinutes())}`
      return {
        dateLabel: `${dayName}, ${dayNum} ${monthName} ${year}`,
        timeLabel,
      }
    }
  }

  const now = new Date()
  const dayName = ID_DAYS[now.getDay()] ?? "Sabtu"
  const dayNum = now.getDate()
  const monthName = ID_MONTHS[now.getMonth()] ?? "November"
  const year = now.getFullYear()
  return {
    dateLabel: `${dayName}, ${dayNum} ${monthName} ${year}`,
    timeLabel: "19.00",
  }
}

export function buildDefaultEventDescription(
  params?: EventTemplateInput
): string {
  const { dateLabel, timeLabel } = parseTemplateDate(params?.eventDate)
  const acara = params?.title?.trim() || "Chanting"
  const tempat = params?.location?.trim() || "Vihara Tri Maha Dharma"

  return [
    `✨ Acara: ${acara}`,
    `📅 Tanggal: ${dateLabel}`,
    `🕖 Waktu: ${timeLabel} WIB – selesai`,
    `📍 Tempat: ${tempat}`,
    "",
    "Ditunggu kehadirannya ",
    "Terima Kasih",
  ].join("\n")
}

export function buildEventShareMessage(
  event: {
    title?: string | null
    description?: string | null
    event_date?: string | null
    location?: string | null
  },
  eventUrl: string
): string {
  const body =
    event.description && event.description.trim().length > 0
      ? event.description.trim()
      : buildDefaultEventDescription({
          title: event.title,
          eventDate: event.event_date,
          location: event.location,
        })

  const trimmedUrl = eventUrl.trim()
  return trimmedUrl ? `${body}\n\n${trimmedUrl}` : body
}
