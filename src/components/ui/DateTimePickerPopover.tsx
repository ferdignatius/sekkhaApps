// components/ui/DateTimePickerPopover
// Pop-up Sub-Modal Dialog for Date & Time Selection.
// Renders as a dedicated centered modal overlay so it NEVER affects form modal dimensions or triggers scrollbars.

import { useState } from "react"
import { CalendarIcon, ClockIcon, XIcon, CheckIcon, SparklesIcon, CalendarDaysIcon } from "lucide-react"
import { EventCalendar } from "./EventCalendar"

interface DateTimePickerPopoverProps {
  value: string // ISO string "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void
  error?: string
}

// Quick preset time slots for Vihara events
const QUICK_TIMES = [
  { label: "08:00 WIB (Puja Pagi)", time: "08:00" },
  { label: "14:00 WIB (Kebaktian Siang)", time: "14:00" },
  { label: "18:30 WIB (Puja Malam)", time: "18:30" },
  { label: "19:00 WIB (Diskusi Dhamma)", time: "19:00" },
]

function parseValue(isoStr: string) {
  if (!isoStr) {
    const now = new Date()
    const datePart = now.toISOString().split("T")[0]
    return { datePart, timePart: "08:00", dateObj: now }
  }
  const parts = isoStr.split("T")
  const datePart = parts[0]
  const timePart = parts[1] ? parts[1].slice(0, 5) : "08:00"
  const dateObj = new Date(isoStr)
  return { datePart, timePart, dateObj: isNaN(dateObj.getTime()) ? new Date() : dateObj }
}

function formatDisplayDate(datePart: string, timePart: string) {
  if (!datePart) return "Pilih Tanggal & Waktu..."
  const [y, m, d] = datePart.split("-").map(Number)
  const date = new Date(y, m - 1, d)
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ]

  const dayName = days[date.getDay()]
  const dateStr = `${d} ${months[m - 1]} ${y}`
  return `${dayName}, ${dateStr} · ${timePart} WIB`
}

export function DateTimePickerPopover({
  value,
  onChange,
  error,
}: DateTimePickerPopoverProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"date" | "time">("date")

  const { datePart, timePart, dateObj } = parseValue(value)
  const [calendarMonth, setCalendarMonth] = useState<Date>(dateObj)

  // Local draft state when modal is open
  const [draftDate, setDraftDate] = useState<string>(datePart)
  const [draftTime, setDraftTime] = useState<string>(timePart)

  function handleOpenModal() {
    setDraftDate(datePart || new Date().toISOString().split("T")[0])
    setDraftTime(timePart || "08:00")
    setActiveTab("date")
    setOpen(true)
  }

  function handleSelectDate(newDateStr: string | null) {
    if (!newDateStr) return
    setDraftDate(newDateStr)
    setActiveTab("time") // Auto switch tab to time picker for smooth flow
  }

  function handleApply() {
    const finalDate = draftDate || new Date().toISOString().split("T")[0]
    const finalTime = draftTime || "08:00"
    onChange(`${finalDate}T${finalTime}`)
    setOpen(false)
  }

  return (
    <div className="relative text-left font-sans">
      
      {/* ── Trigger Bar Button ────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={handleOpenModal}
        className={`flex h-11 w-full items-center justify-between rounded-xl border bg-sekkha-canvas px-3.5 text-caption font-bold text-sekkha-ink transition-all shadow-xs ${
          error
            ? "border-rose-300 ring-2 ring-rose-100"
            : open
              ? "border-sekkha-brand-blue ring-2 ring-sekkha-brand-blue/20 bg-white"
              : "border-sekkha-hairline hover:border-sekkha-hairline-strong hover:bg-white"
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <CalendarIcon className="size-4 text-sekkha-brand-blue shrink-0" />
          <span className="truncate font-bold text-sekkha-ink">
            {formatDisplayDate(datePart, timePart)}
          </span>
        </div>

        <span className="rounded-lg bg-sekkha-brand-blue/10 px-2.5 py-1 text-micro-bold text-sekkha-brand-blue hover:bg-sekkha-brand-blue hover:text-white transition-all shrink-0">
          Ubah
        </span>
      </button>

      {/* ── Dedicated Pop-up Sub-Modal Dialog ─────────────────────────────── */}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in-0">
          <div className="w-full max-w-md rounded-2xl border border-sekkha-hairline bg-white p-5 shadow-2xl space-y-4 text-left font-sans animate-in zoom-in-95">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-sekkha-hairline-soft">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-sekkha-brand-blue shrink-0">
                  <CalendarDaysIcon className="size-5" />
                </div>
                <div>
                  <h3 className="text-body-base font-extrabold text-sekkha-ink">Atur Tanggal & Waktu Event</h3>
                  <p className="text-micro text-sekkha-slate">Pilih tanggal dan waktu pelaksanaan kegiatan</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink transition-colors cursor-pointer"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Tab Switcher: 1. Tanggal vs 2. Waktu */}
            <div className="flex items-center gap-1 rounded-xl bg-sekkha-surface p-1 border border-sekkha-hairline-soft">
              <button
                type="button"
                onClick={() => setActiveTab("date")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-micro-bold transition-all ${
                  activeTab === "date"
                    ? "bg-sekkha-brand-blue text-white shadow-2xs"
                    : "text-sekkha-slate hover:text-sekkha-ink"
                }`}
              >
                <CalendarIcon className="size-3.5" />
                <span>1. Tanggal</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("time")}
                className={`flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-micro-bold transition-all ${
                  activeTab === "time"
                    ? "bg-sekkha-brand-blue text-white shadow-2xs"
                    : "text-sekkha-slate hover:text-sekkha-ink"
                }`}
              >
                <ClockIcon className="size-3.5" />
                <span>2. Jam ({draftTime})</span>
              </button>
            </div>

            {/* Tab 1: Interactive Date Calendar */}
            {activeTab === "date" && (
              <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/60 p-2">
                <EventCalendar
                  month={calendarMonth}
                  onMonthChange={setCalendarMonth}
                  selected={draftDate}
                  onSelect={handleSelectDate}
                  compact={true}
                />
              </div>
            )}

            {/* Tab 2: Time Selection & Quick Vihara Presets */}
            {activeTab === "time" && (
              <div className="space-y-4 p-2 rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/60">
                <div className="space-y-2">
                  <p className="text-micro-bold uppercase tracking-wider text-sekkha-slate flex items-center gap-1">
                    <SparklesIcon className="size-3.5 text-sekkha-brand-blue" />
                    <span>Preset Jam Umum Vihara:</span>
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {QUICK_TIMES.map(qt => {
                      const isSelected = draftTime === qt.time
                      return (
                        <button
                          key={qt.time}
                          type="button"
                          onClick={() => setDraftTime(qt.time)}
                          className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-micro font-semibold transition-all border ${
                            isSelected
                              ? "bg-sekkha-brand-blue/10 border-sekkha-brand-blue text-sekkha-brand-blue font-bold shadow-2xs"
                              : "bg-white border-sekkha-hairline hover:bg-sekkha-surface text-sekkha-ink"
                          }`}
                        >
                          <span className="truncate">{qt.label}</span>
                          {isSelected && <CheckIcon className="size-4 text-sekkha-brand-blue shrink-0 ml-1" />}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-sekkha-hairline-soft">
                  <span className="text-caption font-bold text-sekkha-ink">Atur Jam Presisi:</span>
                  <input
                    type="time"
                    value={draftTime}
                    onChange={e => setDraftTime(e.target.value)}
                    className="rounded-xl border border-sekkha-hairline bg-white px-3.5 py-1.5 text-caption-bold text-sekkha-ink outline-none focus:border-sekkha-brand-blue shadow-2xs"
                  />
                </div>
              </div>
            )}

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-sekkha-hairline-soft flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-micro text-sekkha-slate uppercase font-bold tracking-wider">Hasil Pilihan:</p>
                <p className="text-caption-bold text-sekkha-brand-blue truncate mt-0.5">
                  {formatDisplayDate(draftDate, draftTime)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-sekkha-hairline bg-sekkha-surface px-3.5 py-2 text-micro-bold text-sekkha-slate hover:bg-slate-200/70 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="rounded-xl bg-sekkha-brand-blue px-4 py-2 text-micro-bold text-white shadow-2xs hover:bg-blue-700 transition-all active:scale-95"
                >
                  Terapkan
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
