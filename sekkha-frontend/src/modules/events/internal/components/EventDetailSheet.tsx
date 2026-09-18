import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  ClipboardListIcon,
  SparklesIcon,
  PencilIcon,
  ClockIcon,
  CopyIcon,
  Trash2Icon,
  PlayIcon,
  LockIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  CameraIcon,
  Share2Icon,
  CheckIcon,
  ExternalLinkIcon,
  InfoIcon,
  ShieldCheckIcon,
  AwardIcon,
} from "lucide-react"
import { AttendanceListSheet } from "./AttendanceListSheet"
import { Badge } from "@/components/base/Badge"
import type {
  EventListItem,
  UserRole,
  AttendanceRecord,
  EventStatus,
} from "../types"
import { getCategoryColor } from "../masterdata"

export interface EventDetailSheetProps {
  event: EventListItem
  role: UserRole | null
  onClose?: () => void
  onEdit?: (event: EventListItem) => void
  onDelete?: (event: EventListItem) => void
  onDuplicate?: (event: EventListItem) => void
  onStatusChange?: (eventId: string, status: EventStatus) => void
  attendances?: AttendanceRecord[]
  onRecordAttendance?: (eventId: string, record: AttendanceRecord) => void
  onDeleteAttendance?: (userId: string) => void
}

function formatDateDetails(iso: string) {
  const d = new Date(iso)
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ]
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ]
  const monthsShort = [
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

  const dayName = days[d.getDay()]
  const monthShort = monthsShort[d.getMonth()]
  const dayNumber = String(d.getDate()).padStart(2, "0")
  const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  const hours = String(d.getHours()).padStart(2, "0")
  const mins = String(d.getMinutes()).padStart(2, "0")
  const timeStr = `${hours}:${mins}`

  return { dayName, monthShort, dayNumber, dateStr, timeStr }
}

function getGoogleCalendarUrl(event: EventListItem): string {
  const title = encodeURIComponent(event.title)
  const details = encodeURIComponent(
    `${event.description || "Acara Komunitas Vihara Tri Maha Dharma"}\n\n(via Sekkha App)`
  )
  const location = encodeURIComponent(event.location || "Vihara Tri Maha Dharma")
  const startDate = new Date(event.event_date)
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours default
  const formatGCalDate = (d: Date) =>
    d.toISOString().replace(/-|:|\.\d+/g, "")
  const dates = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`
}

function getGoogleMapsUrl(locationName: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${locationName} Vihara Tri Maha Dharma`
  )}`
}

export function EventDetailSheet({
  event,
  role,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
  attendances = [],
  onDeleteAttendance,
}: EventDetailSheetProps) {
  const navigate = useNavigate()
  const isPengurus = role === "pengurus" || role === "admin"
  const [activeTab, setActiveTab] = useState<"overview" | "attendance">("overview")
  const [warningModalOpen, setWarningModalOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Status lifecycle
  const currentStatus: EventStatus = event.status ?? "published"
  const isActive = currentStatus === "active"
  const isClosed = currentStatus === "closed" || currentStatus === "done"
  const canEdit = isPengurus && !isActive && !isClosed

  const { dayName, monthShort, dayNumber, dateStr, timeStr } = formatDateDetails(
    event.event_date
  )
  const tag = event.tag ?? event.event_type ?? "rutin"
  const colorInfo = getCategoryColor(tag)
  const pointsReward = event.event_type === "special" ? 100 : 50

  // Handle Activation Trigger
  function handleActivateClick() {
    const eventTime = new Date(event.event_date).getTime()
    const nowTime = Date.now()

    if (nowTime < eventTime) {
      setWarningModalOpen(true)
    } else {
      executeStatusChange("active")
    }
  }

  function executeStatusChange(newStatus: EventStatus) {
    if (onStatusChange) {
      onStatusChange(event.id, newStatus)
    } else {
      event.status = newStatus
    }
    setWarningModalOpen(false)
  }

  async function handleShare() {
    const shareData = {
      title: event.title,
      text: `${event.title} — ${dayName}, ${dateStr} at ${timeStr} (${event.location})`,
      url: window.location.href,
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData)
        return
      } catch {
        // Fallback to clipboard if share cancelled
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  return (
    <div className="space-y-6 text-left font-sans">
      {/* ── 1. Apple HIG Hero Header Container ── */}
      <section
        aria-labelledby="event-hero-heading"
        className="relative overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs backdrop-blur-md sm:rounded-[28px] sm:p-6 lg:p-7"
      >
        {/* Subtle Ambient Radial Accents */}
        <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-[#e8b94a]/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 size-56 rounded-full bg-[#1a3a3a]/10 blur-3xl" />

        <div className="relative z-10 space-y-4 sm:space-y-5">
          {/* Top Status & Category Badges Row */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] px-3 py-1 text-xs font-semibold capitalize shadow-2xs backdrop-blur-md"
                style={colorInfo.bgStyle}
              >
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={colorInfo.dotStyle}
                />
                {colorInfo.name}
              </span>

              {/* Status Badge */}
              {isActive && (
                <Badge
                  variant="emerald"
                  className="gap-1.5 rounded-full border border-emerald-300 bg-emerald-100/90 px-3 py-1 font-semibold text-emerald-900 shadow-2xs"
                >
                  <span className="size-2 animate-ping rounded-full bg-emerald-600" />
                  Active Check-In Open
                </Badge>
              )}

              {isClosed && (
                <Badge
                  variant="secondary"
                  className="gap-1.5 rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-3 py-1 font-semibold text-[#6a6a6a]"
                >
                  <LockIcon className="size-3 text-[#6a6a6a]" />
                  Completed (Read-Only)
                </Badge>
              )}

              {!isActive && !isClosed && (
                <Badge
                  variant="outline"
                  className="gap-1.5 rounded-full border border-[#e5e5e5] bg-[#fffaf0]/80 px-3 py-1 font-semibold text-[#6a6a6a]"
                >
                  <ClockIcon className="size-3 text-[#e8b94a]" />
                  Upcoming Event
                </Badge>
              )}
            </div>

            {/* Quick Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-xs transition-all hover:bg-[#f5f0e0] active:scale-95"
              title="Share event"
              aria-label="Share event"
            >
              {copiedLink ? (
                <CheckIcon className="size-4 text-emerald-600" />
              ) : (
                <Share2Icon className="size-4" />
              )}
            </button>
          </div>

          {/* Main Title with Calendar Date Squircle */}
          <div className="flex items-start gap-3.5 sm:items-center sm:gap-6">
            {/* Apple HIG Calendar Date Squircle */}
            <div className="flex size-16 shrink-0 flex-col items-center justify-between overflow-hidden rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] shadow-xs ring-1 ring-black/[0.04] sm:size-24 sm:rounded-[22px]">
              <div className="w-full bg-[#0a0a0a] py-0.5 text-center text-[9px] font-bold tracking-wider text-white uppercase sm:py-1 sm:text-[11px]">
                {monthShort}
              </div>
              <div className="my-auto text-xl leading-none font-black tracking-tight text-[#0a0a0a] sm:text-3xl">
                {dayNumber}
              </div>
              <div className="w-full pb-1 text-center text-[9px] font-semibold text-[#6a6a6a] uppercase sm:pb-1.5 sm:text-[11px]">
                {dayName.slice(0, 3)}
              </div>
            </div>

            {/* Title & Metadata */}
            <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2">
              <h1
                id="event-hero-heading"
                className="text-lg leading-snug font-bold tracking-tight text-[#0a0a0a] sm:text-2xl lg:text-3xl"
              >
                {event.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6a6a6a] sm:text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 shrink-0 text-[#1a3a3a] sm:size-4" />
                  <span>
                    {dayName}, {timeStr} WIB
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="size-3.5 shrink-0 text-rose-600 sm:size-4" />
                  <span className="truncate">{event.location}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Pengurus Lifecycle Action & Secondary Toolbar */}
          <div className="flex flex-col gap-3 border-t border-[#e5e5e5] pt-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Primary Action / Status Trigger */}
            <div className="w-full sm:w-auto">
              {isPengurus && !isActive && !isClosed && (
                <button
                  type="button"
                  onClick={handleActivateClick}
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-[0.98] sm:w-auto sm:text-sm"
                  title="Activate attendance check-in"
                >
                  <PlayIcon className="size-4 fill-white" />
                  <span>Activate Event Check-In</span>
                </button>
              )}

              {isPengurus && isActive && (
                <button
                  type="button"
                  onClick={() => executeStatusChange("closed")}
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-amber-700 active:scale-[0.98] sm:w-auto sm:text-sm"
                  title="Close & complete this event"
                >
                  <LockIcon className="size-4" />
                  <span>Complete & Close Event</span>
                </button>
              )}

              {isPengurus && isClosed && (
                <div className="flex min-h-[44px] items-center gap-2 rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[#6a6a6a]">
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                  <span>Event Concluded</span>
                </div>
              )}

              {!isPengurus && isActive && (
                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/events/scan",
                      search: { eventId: event.id },
                    })
                  }
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-[0.98] sm:w-auto sm:text-sm"
                >
                  <CameraIcon className="size-4" />
                  <span>Self Check-in via QR</span>
                </button>
              )}

              {!isPengurus && !isActive && (
                <div className="flex min-h-[44px] items-center gap-2 text-xs font-semibold text-[#6a6a6a]">
                  <ShieldCheckIcon className="size-4 text-[#e8b94a]" />
                  <span>Check-in will open when the organizer activates the event</span>
                </div>
              )}
            </div>

            {/* Right: Management Toolbar (Pengurus) / Action Links */}
            {isPengurus ? (
              <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:items-center">
                <button
                  type="button"
                  disabled={!canEdit}
                  onClick={() => canEdit && onEdit?.(event)}
                  className={`flex min-h-[40px] items-center justify-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold shadow-xs transition-all sm:min-h-[38px] sm:gap-1.5 sm:px-3.5 ${
                    canEdit
                      ? "cursor-pointer border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8] active:scale-95"
                      : "cursor-not-allowed border-[#e5e5e5]/50 bg-black/[0.02] text-[#9a9a9a]"
                  }`}
                  title={canEdit ? "Edit Event Details" : "Locked (Cannot edit)"}
                >
                  <PencilIcon className="size-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDuplicate?.(event)}
                  className="flex min-h-[40px] cursor-pointer items-center justify-center gap-1 rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-2.5 py-1.5 text-xs font-semibold text-[#0a0a0a] shadow-xs transition-all hover:bg-[#faf5e8] active:scale-95 sm:min-h-[38px] sm:gap-1.5 sm:px-3.5"
                  title="Duplicate Event"
                >
                  <CopyIcon className="size-3.5 text-[#e8b94a]" />
                  <span>Duplicate</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDelete?.(event)}
                  className="flex min-h-[40px] cursor-pointer items-center justify-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 shadow-xs transition-all hover:bg-rose-100 active:scale-95 sm:min-h-[38px] sm:gap-1.5 sm:px-3.5"
                  title="Delete Event"
                >
                  <Trash2Icon className="size-3.5 text-rose-600" />
                  <span>Delete</span>
                </button>
              </div>
            ) : (
              <div className="flex w-full items-center sm:w-auto">
                <a
                  href={getGoogleCalendarUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[40px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-4 py-1.5 text-xs font-semibold text-[#0a0a0a] shadow-xs transition-all hover:bg-[#faf5e8] active:scale-95 sm:min-h-[38px] sm:w-auto"
                >
                  <CalendarIcon className="size-3.5 text-[#e8b94a]" />
                  <span>Add to Google Calendar</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── 2. Apple HIG Segmented Control Tabs ── */}
      <div className="flex w-full justify-center sm:w-auto sm:justify-start">
        <div
          role="tablist"
          aria-label="Event detail sections"
          className="grid w-full grid-cols-2 rounded-full border border-[#e5e5e5] bg-[#f5f0e0] p-1 shadow-2xs sm:inline-flex sm:w-auto"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "overview"}
            onClick={() => setActiveTab("overview")}
            className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all sm:px-5 sm:text-sm ${
              activeTab === "overview"
                ? "bg-[#0a0a0a] text-white shadow-xs"
                : "text-[#6a6a6a] hover:text-[#0a0a0a]"
            }`}
          >
            <InfoIcon className="size-4" />
            <span>Overview</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "attendance"}
            onClick={() => setActiveTab("attendance")}
            className={`flex items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all sm:px-5 sm:text-sm ${
              activeTab === "attendance"
                ? "bg-[#0a0a0a] text-white shadow-xs"
                : "text-[#6a6a6a] hover:text-[#0a0a0a]"
            }`}
          >
            <UsersIcon className="size-4" />
            <span>Attendance</span>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                activeTab === "attendance"
                  ? "bg-white/20 text-white"
                  : "bg-black/[0.08] text-[#0a0a0a]"
              }`}
            >
              {attendances.length}
            </span>
          </button>
        </div>
      </div>

      {/* ── 3. Tab Contents ── */}
      {activeTab === "overview" && (
        <div className="space-y-5 sm:space-y-6">
          {/* Key Details Bento Grid: Responsive 1 col on mobile, 2 col on tablet, 3 col on desktop */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Schedule Bento Card */}
            <div className="flex flex-col justify-between rounded-[22px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs backdrop-blur-md">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[#1a3a3a] text-white shadow-2xs">
                  <CalendarIcon className="size-5 text-[#e8b94a]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-[11px]">
                    Date & Time
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-[#0a0a0a] sm:text-sm">
                    {dayName}, {dateStr}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-[#6a6a6a]">
                    Pukul {timeStr} WIB
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-[#e5e5e5] pt-3">
                <a
                  href={getGoogleCalendarUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-xs font-semibold text-[#1a3a3a] hover:underline"
                >
                  <span>Export to Google Calendar</span>
                  <ExternalLinkIcon className="size-3.5" />
                </a>
              </div>
            </div>

            {/* Location Bento Card */}
            <div className="flex flex-col justify-between rounded-[22px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs backdrop-blur-md">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-rose-100 text-rose-700 shadow-2xs">
                  <MapPinIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-[11px]">
                    Venue & Location
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-[#0a0a0a] sm:text-sm">
                    {event.location}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-[#6a6a6a]">
                    Vihara Tri Maha Dharma
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-[#e5e5e5] pt-3">
                <a
                  href={getGoogleMapsUrl(event.location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between text-xs font-semibold text-rose-700 hover:underline"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLinkIcon className="size-3.5" />
                </a>
              </div>
            </div>

            {/* Merit Points Card (Spans full on tablet, 1 col on desktop) */}
            <div className="flex flex-col justify-between rounded-[22px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs backdrop-blur-md sm:col-span-2 lg:col-span-1">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[#e8b94a]/20 text-[#0a0a0a] shadow-2xs">
                  <AwardIcon className="size-5 text-[#b88015]" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-[11px]">
                    Seva Reward
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-[#0a0a0a] sm:text-sm">
                    +{pointsReward} Activity Points
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-emerald-700">
                    Auto-credited upon check-in
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-[#e5e5e5] pt-3">
                <span className="flex items-center gap-1 text-xs font-semibold text-[#6a6a6a]">
                  <SparklesIcon className="size-3.5 text-[#e8b94a]" />
                  <span>Counts toward streak tier</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column Responsive Layout for max-w-7xl: About (Col 7) + Guidelines (Col 5) */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Left Column: Event Description */}
            <div className="space-y-4 lg:col-span-7">
              <div className="space-y-3 rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs backdrop-blur-md sm:p-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#0a0a0a] sm:text-base">
                  <SparklesIcon className="size-4 text-[#e8b94a]" />
                  <span>About this Event</span>
                </h3>
                {event.description ? (
                  <p className="text-xs leading-relaxed text-[#3a3a3a] whitespace-pre-line sm:text-sm">
                    {event.description}
                  </p>
                ) : (
                  <p className="text-xs leading-relaxed text-[#6a6a6a] italic sm:text-sm">
                    No description provided for this event. Please arrive on time at the scheduled venue.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Guidelines & Etiquette */}
            <div className="space-y-4 lg:col-span-5">
              <div className="space-y-4 rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-4 shadow-xs backdrop-blur-md sm:p-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#0a0a0a] sm:text-base">
                  <ClipboardListIcon className="size-4 text-[#1a3a3a]" />
                  <span>Attendee Guidelines & Etiquette</span>
                </h3>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0]/90 p-3 shadow-2xs">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1a3a3a] text-xs font-bold text-white">
                      1
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0a0a0a]">Dress Code</p>
                      <p className="mt-0.5 text-xs text-[#6a6a6a]">
                        Dress politely & respectfully (white or neat casual attire).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0]/90 p-3 shadow-2xs">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1a3a3a] text-xs font-bold text-white">
                      2
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0a0a0a]">On-Time Presence</p>
                      <p className="mt-0.5 text-xs text-[#6a6a6a]">
                        Arrive 10 minutes early for peaceful meditation preparation.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0]/90 p-3 shadow-2xs">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#1a3a3a] text-xs font-bold text-white">
                      3
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0a0a0a]">QR Check-In</p>
                      <p className="mt-0.5 text-xs text-[#6a6a6a]">
                        Present your personal Member QR code to the reception team.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#e5e5e5] pt-3 text-xs text-[#6a6a6a]">
                  <span>Need special accommodations? Please speak with the Vihara seva team.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance Tab ── */}
      {activeTab === "attendance" && (
        <div className="space-y-6">
          {/* Active Session Scanner Callout (Pengurus & Aktivis) */}
          {isPengurus && (
            <div>
              {isActive && (
                <div className="flex flex-col items-start justify-between gap-4 rounded-[24px] border border-emerald-300 bg-emerald-50/90 p-4 shadow-xs sm:flex-row sm:items-center sm:p-6">
                  <div className="space-y-1 text-left">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-200/80 px-2.5 py-0.5 text-xs font-bold text-emerald-900">
                      <span className="size-2 animate-ping rounded-full bg-emerald-600" />
                      Live Attendance Scanning Active
                    </span>
                    <h3 className="text-base font-bold text-emerald-950 sm:text-lg">
                      Ready to Scan Member QR Codes
                    </h3>
                    <p className="text-xs text-emerald-800">
                      Point device camera to members&apos; personal attendance QR codes.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/events/scan",
                        search: { eventId: event.id },
                      })
                    }
                    className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0a0a0a] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] active:scale-95 sm:w-auto sm:text-sm"
                  >
                    <CameraIcon className="size-4" />
                    <span>Open Live QR Scanner</span>
                  </button>
                </div>
              )}

              {!isActive && !isClosed && (
                <div className="flex items-center gap-3 rounded-[20px] border border-amber-200 bg-amber-50/90 p-4 text-xs text-amber-900 shadow-2xs">
                  <AlertTriangleIcon className="size-4 shrink-0 text-amber-600" />
                  <span>
                    Event check-in is currently idle. Click{" "}
                    <strong>&quot;Activate Event Check-In&quot;</strong> in the header
                    to begin scanning attendees.
                  </span>
                </div>
              )}

              {isClosed && (
                <div className="flex items-center gap-3 rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-4 text-xs text-[#6a6a6a] shadow-2xs">
                  <LockIcon className="size-4 shrink-0 text-[#6a6a6a]" />
                  <span>Event has concluded. Attendance list is locked for archiving.</span>
                </div>
              )}
            </div>
          )}

          {/* Attendance Table Container */}
          <div className="rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8]/85 p-3.5 shadow-xs backdrop-blur-md sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2">
                <ClipboardListIcon className="size-4.5 text-[#1a3a3a]" />
                <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                  Recorded Attendees ({attendances.length})
                </h3>
              </div>
            </div>

            <AttendanceListSheet
              records={attendances}
              role={role}
              isClosed={isClosed}
              onDeleteRecord={onDeleteAttendance}
            />
          </div>
        </div>
      )}

      {/* ── Warning Modal Alert (Early Activation Trigger) ── */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in space-y-4 rounded-[28px] border border-[#e5e5e5] bg-[#faf5e8] p-6 text-left font-sans shadow-2xl zoom-in-95 fade-in">
            <div className="flex items-center gap-3">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-[16px] bg-amber-100 text-amber-700 shadow-2xs">
                <AlertTriangleIcon className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0a0a0a]">
                  Early Activation Warning
                </h3>
                <p className="text-xs text-[#6a6a6a]">
                  Scheduled event time has not arrived yet
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-[#3a3a3a] sm:text-sm">
              The scheduled time for <strong>{event.title}</strong> is{" "}
              <strong>
                {dayName}, {dateStr} at {timeStr} WIB
              </strong>
              .
              <br />
              <br />
              Are you sure you want to open attendance check-in now?
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-[#e5e5e5] pt-4">
              <button
                type="button"
                onClick={() => setWarningModalOpen(false)}
                className="min-h-[40px] flex-1 sm:flex-initial cursor-pointer rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[#6a6a6a] shadow-xs hover:bg-[#faf5e8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeStatusChange("active")}
                className="min-h-[40px] flex-1 sm:flex-initial cursor-pointer rounded-full bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95"
              >
                Yes, Open Check-In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
