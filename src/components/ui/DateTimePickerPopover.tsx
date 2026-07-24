// components/ui/DateTimePickerPopover
// Pop-up Sub-Modal Dialog for Date & Time Selection.
// Redesigned with Mobile Bottom Sheet layout, inline Wheel Time Picker, & 1-click Quick Time Chips.

import { useState } from "react"
import { CalendarIcon, ClockIcon, XIcon, CheckIcon, SparklesIcon, CalendarDaysIcon } from "lucide-react"
import { EventCalendar } from "./EventCalendar"
import { WheelTimePicker } from "./WheelTimePicker"
import { getMasterTimePresets, getNextDateForDayOfWeek, DAY_NAMES, type EventTimePresetItem } from "@/modules/events/internal/masterdata"

interface DateTimePickerPopoverProps {
  value: string // ISO string "YYYY-MM-DDTHH:mm" or ""
  onChange: (value: string) => void
  error?: string
}

const QUICK_HOURS_LIST = ["07:00", "08:00", "09:00", "10:00", "13:00", "15:00", "18:00", "19:00"]

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
  const [quickTimes, setQuickTimes] = useState<EventTimePresetItem[]>([])

  function handleOpenModal() {
    setQuickTimes(getMasterTimePresets(true))
    setDraftDate(datePart || new Date().toISOString().split("T")[0])
    setDraftTime(timePart || "08:00")
    setActiveTab("date")
    setOpen(true)
  }

  function handleSelectDate(newDateStr: string | null) {
    if (!newDateStr) return
    setDraftDate(newDateStr)
  }

  function handleSelectPreset(qt: EventTimePresetItem) {
    setDraftTime(qt.time)
    if (qt.day_of_week !== undefined && qt.day_of_week >= 0) {
      const nextDate = getNextDateForDayOfWeek(qt.day_of_week, qt.time)
      setDraftDate(nextDate)
      const [y, m, d] = nextDate.split("-").map(Number)
      setCalendarMonth(new Date(y, m - 1, d))
    }
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
          <span className="truncate font-bold text-sekkha-ink text-caption sm:text-caption-bold">
            {formatDisplayDate(datePart, timePart)}
          </span>
        </div>

        <span className="rounded-lg bg-sekkha-brand-blue/10 px-2.5 py-1 text-micro-bold text-sekkha-brand-blue hover:bg-sekkha-brand-blue hover:text-white transition-all shrink-0 ml-1">
          Ubah
        </span>
      </button>

      {/* ── Dedicated Mobile Bottom Sheet / Centered Pop-up Sub-Modal ─── */}
      {open && (
        <div
          className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in-0"
          onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-full sm:max-w-md max-h-[92vh] sm:max-h-[90vh] rounded-t-[28px] sm:rounded-3xl border-t sm:border border-sekkha-hairline bg-white p-4 sm:p-5 shadow-2xl flex flex-col font-sans animate-in slide-in-from-bottom-full sm:zoom-in-95 duration-200">
            
            {/* Mobile Sticky Drag Indicator Handle with Backdrop Blur */}
            <div className="sticky top-0 z-20 flex items-center justify-center py-2.5 bg-white/80 backdrop-blur-md border-b border-sekkha-hairline-soft/30 sm:hidden shrink-0 -mx-4 -mt-4 px-4 mb-2 rounded-t-[28px]">
              <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
            </div>

            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-sekkha-hairline-soft shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-sekkha-brand-blue shrink-0">
                  <CalendarDaysIcon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-body-sm-medium sm:text-body-base font-extrabold text-sekkha-ink truncate">Atur Tanggal & Waktu Event</h3>
                  <p className="text-micro text-sekkha-slate truncate">Preset waktu, kalender, & jam presisi</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-2 text-sekkha-slate hover:bg-sekkha-surface hover:text-sekkha-ink transition-colors cursor-pointer shrink-0 ml-2"
              >
                <XIcon className="size-4" />
              </button>
            </div>

            {/* Segmented Control Tabs */}
            <div className="grid grid-cols-2 gap-1 bg-sekkha-canvas p-1 rounded-2xl border border-sekkha-hairline my-3 shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab("date")}
                className={`flex items-center justify-center gap-1.5 py-2 text-micro-bold sm:text-caption-bold rounded-xl transition-all ${
                  activeTab === "date"
                    ? "bg-white text-sekkha-brand-blue shadow-xs font-black"
                    : "text-sekkha-slate hover:text-sekkha-ink"
                }`}
              >
                <CalendarIcon className="size-3.5" />
                <span>📅 Tanggal & Preset</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("time")}
                className={`flex items-center justify-center gap-1.5 py-2 text-micro-bold sm:text-caption-bold rounded-xl transition-all ${
                  activeTab === "time"
                    ? "bg-white text-sekkha-brand-blue shadow-xs font-black"
                    : "text-sekkha-slate hover:text-sekkha-ink"
                }`}
              >
                <ClockIcon className="size-3.5" />
                <span>⏰ Jam: <span className="font-extrabold">{draftTime}</span></span>
              </button>
            </div>

            {/* Tab Body Container */}
            <div className="flex-1 overflow-y-auto scrollbar-none space-y-3.5 py-1 px-0.5">
              
              {/* TAB 1: Date & Presets */}
              {activeTab === "date" && (
                <div className="space-y-3 animate-in fade-in-50 duration-150">
                  {/* 1. Quick Masterdata Presets */}
                  {quickTimes.length > 0 && (
                    <div className="space-y-2 rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/60 p-3">
                      <p className="text-micro-bold uppercase tracking-wider text-sekkha-slate flex items-center gap-1.5">
                        <SparklesIcon className="size-3.5 text-sekkha-brand-blue" />
                        <span>Preset Waktu Vihara (1-Click Auto Date):</span>
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {quickTimes.map(qt => {
                          const isSelected = draftTime === qt.time
                          return (
                            <button
                              key={qt.id || qt.time}
                              type="button"
                              onClick={() => handleSelectPreset(qt)}
                              className={`flex items-center justify-between rounded-xl px-3 py-2 text-micro font-semibold transition-all border cursor-pointer text-left ${
                                isSelected
                                  ? "bg-sekkha-brand-blue/10 border-sekkha-brand-blue text-sekkha-brand-blue font-bold shadow-2xs"
                                  : "bg-white border-sekkha-hairline hover:bg-sekkha-surface text-sekkha-ink"
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-bold">{qt.label}</p>
                                {qt.day_of_week !== undefined && qt.day_of_week >= 0 && (
                                  <span className="mt-0.5 text-[10px] font-bold text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded-md inline-block">
                                    📅 Hari {DAY_NAMES[qt.day_of_week]} (Auto)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 shrink-0 ml-2">
                                <span className="font-extrabold text-caption text-sekkha-brand-blue">{qt.time}</span>
                                {isSelected && <CheckIcon className="size-4 text-sekkha-brand-blue" />}
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* 2. Interactive Calendar */}
                  <div className="space-y-1.5">
                    <p className="text-micro-bold uppercase tracking-wider text-sekkha-slate flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="size-3.5 text-sekkha-brand-blue" />
                        <span>Pilih Tanggal Pelaksanaan:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("time")}
                        className="text-micro-bold text-sekkha-brand-blue hover:underline cursor-pointer"
                      >
                        Lanjut ke Jam ➔
                      </button>
                    </p>
                    <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/40 p-2">
                      <EventCalendar
                        month={calendarMonth}
                        onMonthChange={setCalendarMonth}
                        selected={draftDate}
                        onSelect={handleSelectDate}
                        compact={true}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Time Wheel & Fast Time Chips */}
              {activeTab === "time" && (
                <div className="space-y-4 animate-in fade-in-50 duration-150 py-1">
                  
                  {/* Quick Time Chips */}
                  <div className="space-y-2">
                    <p className="text-micro-bold uppercase tracking-wider text-sekkha-slate flex items-center gap-1.5">
                      <SparklesIcon className="size-3.5 text-sekkha-brand-blue" />
                      <span>Pilihan Jam Instan (1-Click):</span>
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {QUICK_HOURS_LIST.map(t => {
                        const isSelected = draftTime === t
                        return (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setDraftTime(t)}
                            className={`rounded-xl px-3 py-1.5 text-micro-bold border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-sekkha-brand-blue text-white border-sekkha-brand-blue shadow-xs font-black scale-105"
                                : "bg-sekkha-canvas border-sekkha-hairline text-sekkha-ink hover:bg-white"
                            }`}
                          >
                            {t} WIB
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Inline Wheel Time Picker */}
                  <div className="rounded-2xl border border-sekkha-hairline bg-sekkha-canvas/50 p-4 space-y-3 flex flex-col items-center">
                    <div className="flex items-center justify-between w-full px-1">
                      <span className="text-micro-bold uppercase tracking-wider text-sekkha-slate flex items-center gap-1.5">
                        <ClockIcon className="size-3.5 text-sekkha-brand-blue" />
                        <span>Putar Jam & Menit Presisi:</span>
                      </span>
                      <span className="text-body-sm-medium font-black text-sekkha-brand-blue">{draftTime} WIB</span>
                    </div>

                    <div className="py-2 flex justify-center w-full bg-white rounded-2xl border border-sekkha-hairline shadow-2xs">
                      <WheelTimePicker
                        value={draftTime || "08:00"}
                        onChange={setDraftTime}
                        itemHeight={38}
                        visibleCount={5}
                      />
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer Actions Bar */}
            <div className="pt-3 border-t border-sekkha-hairline-soft flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 mt-2">
              <div className="min-w-0 flex-1 bg-sekkha-canvas/80 p-2.5 sm:p-0 rounded-xl sm:bg-transparent border sm:border-none border-sekkha-hairline">
                <p className="text-micro text-sekkha-slate uppercase font-bold tracking-wider">Hasil Pilihan:</p>
                <p className="text-caption-bold sm:text-caption-bold text-sekkha-brand-blue truncate mt-0.5">
                  {formatDisplayDate(draftDate, draftTime)}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex-1 sm:flex-initial rounded-xl border border-sekkha-hairline bg-sekkha-surface px-4 py-2.5 text-micro-bold text-sekkha-slate hover:bg-slate-200/70 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex-1 sm:flex-initial rounded-xl bg-sekkha-brand-blue px-5 py-2.5 text-micro-bold text-white shadow-2xs hover:bg-blue-700 transition-all active:scale-95 cursor-pointer font-extrabold"
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

