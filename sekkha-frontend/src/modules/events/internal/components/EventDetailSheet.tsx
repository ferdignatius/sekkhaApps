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
import { ConfirmDialog } from "@/components/base/AlertDialog"
import type {
  EventListItem,
  UserRole,
  AttendanceRecord,
  EventStatus,
} from "../types"
import { getCategoryColor, getEventTag } from "../masterdata"

export interface EventDetailSheetProps {
  event: EventListItem
  role: UserRole | null
  onClose?: () => void
  onEdit?: (event: EventListItem) => void
  onDelete?: (event: EventListItem) => void
  onDuplicate?: (event: EventListItem) => void
  onStatusChange?: (
    eventId: string,
    status: EventStatus,
    eventDate?: string
  ) => void | Promise<void>
  attendances?: AttendanceRecord[]
  onRecordAttendance?: (eventId: string, record: AttendanceRecord) => void
  onDeleteAttendance?: (userId: string) => void
  onRefreshAttendances?: () => void
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
    `${event.description || "Sekkha Buddhist Community Event"}\n\n(via Sekkha App)`
  )
  const location = encodeURIComponent(event.location || "Vihara Sekkha")
  const startDate = new Date(event.event_date)
  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000) // 2 hours default
  const formatGCalDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, "")
  const dates = `${formatGCalDate(startDate)}/${formatGCalDate(endDate)}`
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`
}

function getGoogleMapsUrl(locationName: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${locationName} Vihara Sekkha`
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
  onRefreshAttendances,
}: EventDetailSheetProps) {
  const navigate = useNavigate()
  const isPengurus = role === "organizer" || role === "admin"
  const [activeTab, setActiveTab] = useState<"overview" | "attendance">(
    "overview"
  )
  const [copiedLink, setCopiedLink] = useState(false)

  // Lifecycle actions
  type LifecycleAction =
    "activate" | "activate-premature" | "close" | "cancel" | null
  const [pendingAction, setPendingAction] = useState<LifecycleAction>(null)
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState("")
  const [rescheduleError, setRescheduleError] = useState<string | null>(null)

  // Status lifecycle
  const currentStatus: EventStatus = event.status ?? "scheduled"
  const isActive = currentStatus === "active"
  const isClosed = currentStatus === "closed"
  const isCancelled = currentStatus === "cancel"
  const canEdit = isPengurus && !isActive && !isClosed && !isCancelled

  const { dayName, monthShort, dayNumber, dateStr, timeStr } =
    formatDateDetails(event.event_date)
  const tag = getEventTag(event)
  const colorInfo = getCategoryColor(event)
  const pointsReward =
    event.point_reward ??
    (typeof event.event_type === "object"
      ? event.event_type?.default_point_reward
      : undefined) ??
    (tag === "special" ? 100 : 50)

  // Start Event action trigger
  function handleActivateClick() {
    const eventTime = new Date(event.event_date).getTime()
    const nowTime = Date.now()
    if (nowTime < eventTime) {
      setPendingAction("activate-premature")
    } else {
      setPendingAction("activate")
    }
  }

  function executeStatusChange(newStatus: EventStatus, newEventDate?: string) {
    if (onStatusChange) {
      onStatusChange(event.id, newStatus, newEventDate)
    } else {
      event.status = newStatus
    }
    setPendingAction(null)
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
        className="relative overflow-hidden rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-xs sm:rounded-[28px] sm:p-6 lg:p-7"
      >
        <div className="relative z-10 space-y-4 sm:space-y-5">
          {/* Top Status & Category Badges Row */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] px-2.5 py-0.5 text-xs font-semibold capitalize shadow-2xs backdrop-blur-md"
                style={{ ...colorInfo.bgStyle, color: "#0a0a0a" }}
              >
                <span
                  className="size-1.5 shrink-0 rounded-full"
                  style={colorInfo.dotStyle}
                />
                {colorInfo.name}
              </span>

              {/* Status Badge */}
              {isActive && (
                <Badge
                  variant="teal"
                  glass
                  className="gap-1.5 rounded-full font-semibold text-[#1a3a3a]"
                >
                  <span className="size-1.5 animate-ping rounded-full bg-[#1a3a3a]" />
                  Active Check-In Open
                </Badge>
              )}

              {isClosed && (
                <Badge
                  variant="slate"
                  glass
                  className="gap-1.5 rounded-full font-semibold text-[#6a6a6a]"
                >
                  <LockIcon className="size-3 text-[#6a6a6a]" />
                  Completed (Read-Only)
                </Badge>
              )}

              {isCancelled && (
                <Badge
                  variant="destructive"
                  glass
                  className="gap-1.5 rounded-full font-semibold"
                >
                  <AlertTriangleIcon className="size-3" />
                  Cancelled
                </Badge>
              )}

              {!isActive && !isClosed && !isCancelled && (
                <Badge
                  variant="default"
                  glass
                  className="gap-1.5 rounded-full font-semibold text-[#6a6a6a]"
                >
                  <ClockIcon className="size-3 text-[#e8b94a]" />
                  Scheduled
                </Badge>
              )}
            </div>

            {/* Quick Share Button */}
            <button
              type="button"
              onClick={handleShare}
              className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] shadow-xs transition-all hover:bg-[#faf5e8] focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
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
                  <ClockIcon className="size-3.5 shrink-0 text-[#6a6a6a] sm:size-4" />
                  <span>
                    {dayName}, {timeStr} WIB
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="size-3.5 shrink-0 text-[#6a6a6a] sm:size-4" />
                  <span className="truncate">{event.location}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Pengurus Lifecycle Action & Secondary Toolbar */}
          <div className="flex flex-col gap-3 border-t border-[#e5e5e5] pt-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Left: Primary Action / Status Trigger */}
            <div className="flex flex-wrap items-center gap-2">
              {isPengurus && !isActive && !isClosed && !isCancelled && (
                <>
                  <button
                    type="button"
                    onClick={handleActivateClick}
                    className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0a0a0a] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] active:scale-[0.98] sm:text-sm"
                    title="Start Event and open attendance check-in"
                  >
                    <PlayIcon className="size-4 fill-[#e8b94a] text-[#e8b94a]" />
                    <span>Start Event</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction("cancel")}
                    className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 shadow-xs transition-all hover:bg-rose-100 active:scale-[0.98]"
                    title="Cancel Event"
                  >
                    <span>Cancel Event</span>
                  </button>
                </>
              )}

              {isPengurus && isActive && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/events/scan",
                        search: { eventId: event.id },
                      })
                    }
                    className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0a0a0a] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] active:scale-[0.98] sm:text-sm"
                    title="Open live QR scanner"
                  >
                    <CameraIcon className="size-4 text-[#e8b94a]" />
                    <span>Open Live Scanner</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction("close")}
                    className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full bg-[#1a3a3a] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#142e2e] active:scale-[0.98] sm:text-sm"
                    title="Close & complete this event"
                  >
                    <LockIcon className="size-4 text-[#e8b94a]" />
                    <span>Close &amp; Finalize Event</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingAction("cancel")}
                    className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 shadow-xs transition-all hover:bg-rose-100 active:scale-[0.98]"
                    title="Cancel Event"
                  >
                    <span>Cancel</span>
                  </button>
                </>
              )}

              {isPengurus && isCancelled && (
                <button
                  type="button"
                  onClick={() => {
                    setRescheduleDate("")
                    setRescheduleError(null)
                    setRescheduleModalOpen(true)
                  }}
                  className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0a0a0a] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] active:scale-[0.98] sm:text-sm"
                  title="Reschedule this event"
                >
                  <CalendarIcon className="size-4 text-[#e8b94a]" />
                  <span>Reschedule Event</span>
                </button>
              )}

              {isPengurus && isClosed && (
                <div className="flex min-h-[44px] items-center gap-2 rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[#6a6a6a]">
                  <CheckCircle2Icon className="size-4 text-[#1a3a3a]" />
                  <span>Event Concluded (Finalized)</span>
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
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0a0a0a] px-6 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] active:scale-[0.98] sm:w-auto sm:text-sm"
                >
                  <CameraIcon className="size-4 text-[#e8b94a]" />
                  <span>Show My Check-in QR</span>
                </button>
              )}

              {!isPengurus && !isActive && (
                <div className="flex min-h-[44px] items-center gap-2 text-xs font-semibold text-[#6a6a6a]">
                  <ShieldCheckIcon className="size-4 text-[#e8b94a]" />
                  <span>
                    Your check-in QR will be available when the organizer
                    activates the event
                  </span>
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
                  className={`flex min-h-[44px] items-center justify-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-semibold shadow-xs transition-all sm:min-h-[44px] sm:gap-1.5 sm:px-3.5 ${
                    canEdit
                      ? "cursor-pointer border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8] active:scale-95"
                      : "cursor-not-allowed border-[#e5e5e5]/50 bg-black/[0.02] text-[#6a6a6a]"
                  }`}
                  title={
                    canEdit ? "Edit Event Details" : "Locked (Cannot edit)"
                  }
                >
                  <PencilIcon className="size-3.5" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDuplicate?.(event)}
                  className="flex min-h-[44px] cursor-pointer items-center justify-center gap-1 rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-2.5 py-1.5 text-xs font-semibold text-[#0a0a0a] shadow-xs transition-all hover:bg-[#faf5e8] active:scale-95 sm:min-h-[44px] sm:gap-1.5 sm:px-3.5"
                  title="Duplicate Event"
                >
                  <CopyIcon className="size-3.5 text-[#e8b94a]" />
                  <span>Duplicate</span>
                </button>

                <button
                  type="button"
                  onClick={() => onDelete?.(event)}
                  className="flex min-h-[44px] cursor-pointer items-center justify-center gap-1 rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-2.5 py-1.5 text-xs font-semibold text-[#6a6a6a] shadow-xs transition-all hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 active:scale-95 sm:min-h-[44px] sm:gap-1.5 sm:px-3.5"
                  title="Delete Event"
                >
                  <Trash2Icon className="size-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            ) : (
              <div className="flex w-full items-center sm:w-auto">
                <a
                  href={getGoogleCalendarUrl(event)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-[#e5e5e5] bg-[#fffaf0] px-4 py-1.5 text-xs font-semibold text-[#0a0a0a] shadow-xs transition-all hover:bg-[#faf5e8] active:scale-95 sm:min-h-[44px] sm:w-auto"
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
          className="grid w-full grid-cols-2 rounded-full border border-[#e5e5e5] bg-[#faf5e8] p-1 shadow-2xs sm:inline-flex sm:w-auto"
        >
          <button
            id="event-overview-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "overview"}
            aria-controls="event-overview-panel"
            tabIndex={activeTab === "overview" ? 0 : -1}
            onClick={() => setActiveTab("overview")}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:outline-none sm:min-w-32 sm:px-5 sm:text-sm ${
              activeTab === "overview"
                ? "bg-[#0a0a0a] text-white shadow-xs"
                : "text-[#6a6a6a] hover:text-[#0a0a0a]"
            }`}
          >
            <InfoIcon className="size-4" />
            <span>Overview</span>
          </button>

          <button
            id="event-attendance-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "attendance"}
            aria-controls="event-attendance-panel"
            tabIndex={activeTab === "attendance" ? 0 : -1}
            onClick={() => setActiveTab("attendance")}
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-[#0a0a0a] focus-visible:ring-offset-2 focus-visible:outline-none sm:min-w-32 sm:px-5 sm:text-sm ${
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
        <div
          id="event-overview-panel"
          role="tabpanel"
          aria-labelledby="event-overview-tab"
          tabIndex={0}
          className="space-y-5 outline-none sm:space-y-6"
        >
          {/* Key Details Bento Grid: Responsive 1 col on mobile, 2 col on tablet, 3 col on desktop */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {/* Schedule Bento Card */}
            <div className="flex flex-col justify-between rounded-[22px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[#0a0a0a] text-[#e8b94a] shadow-xs">
                  <CalendarIcon className="size-5" />
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
                  className="flex items-center justify-between text-xs font-semibold text-[#1a3a3a] transition-colors hover:text-[#0a0a0a] hover:underline"
                >
                  <span>Export to Google Calendar</span>
                  <ExternalLinkIcon className="size-3.5 text-[#6a6a6a]" />
                </a>
              </div>
            </div>

            {/* Location Bento Card */}
            <div className="flex flex-col justify-between rounded-[22px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[#0a0a0a] text-[#e8b94a] shadow-xs">
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
                  className="flex items-center justify-between text-xs font-semibold text-[#1a3a3a] transition-colors hover:text-[#0a0a0a] hover:underline"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLinkIcon className="size-3.5 text-[#6a6a6a]" />
                </a>
              </div>
            </div>

            {/* Merit Points Card (Spans full on tablet, 1 col on desktop) */}
            <div className="flex flex-col justify-between rounded-[22px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-xs sm:col-span-2 lg:col-span-1">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[#0a0a0a] text-[#e8b94a] shadow-xs">
                  <AwardIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-[#6a6a6a] uppercase sm:text-[11px]">
                    Seva Reward
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-[#0a0a0a] sm:text-sm">
                    +{pointsReward} Activity Points
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-[#6a6a6a]">
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
              <div className="space-y-3 rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-xs sm:p-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#0a0a0a] sm:text-base">
                  <SparklesIcon className="size-4 text-[#e8b94a]" />
                  <span>About this Event</span>
                </h3>
                {event.description ? (
                  <p className="text-xs leading-relaxed whitespace-pre-line text-[#3a3a3a] sm:text-sm">
                    {event.description}
                  </p>
                ) : (
                  <p className="text-xs leading-relaxed text-[#6a6a6a] italic sm:text-sm">
                    No description provided for this event. Please arrive on
                    time at the scheduled venue.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Guidelines & Etiquette */}
            <div className="space-y-4 lg:col-span-5">
              <div className="space-y-4 rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-4 shadow-xs sm:p-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-[#0a0a0a] sm:text-base">
                  <ClipboardListIcon className="size-4 text-[#1a3a3a]" />
                  <span>Attendee Guidelines & Etiquette</span>
                </h3>

                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-2xs">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-xs font-bold text-[#e8b94a]">
                      1
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0a0a0a]">
                        Dress Code
                      </p>
                      <p className="mt-0.5 text-xs text-[#6a6a6a]">
                        Dress politely & respectfully (white or neat casual
                        attire).
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-2xs">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-xs font-bold text-[#e8b94a]">
                      2
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0a0a0a]">
                        On-Time Presence
                      </p>
                      <p className="mt-0.5 text-xs text-[#6a6a6a]">
                        Arrive 10 minutes early for peaceful meditation
                        preparation.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3 shadow-2xs">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#0a0a0a] text-xs font-bold text-[#e8b94a]">
                      3
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#0a0a0a]">
                        QR Check-In
                      </p>
                      <p className="mt-0.5 text-xs text-[#6a6a6a]">
                        Present your personal Member QR code to the reception
                        team.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#e5e5e5] pt-3 text-xs text-[#6a6a6a]">
                  <span>
                    Need special accommodations? Please speak with the Vihara
                    seva team.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Attendance Tab ── */}
      {activeTab === "attendance" && (
        <div
          id="event-attendance-panel"
          role="tabpanel"
          aria-labelledby="event-attendance-tab"
          tabIndex={0}
          className="space-y-6 outline-none"
        >
          {/* Active Session Scanner Callout (Pengurus & Aktivis) */}
          {isPengurus && (
            <div>
              {isActive && (
                <div className="flex flex-col items-start justify-between gap-4 rounded-[24px] border border-[#1a3a3a]/20 bg-[#faf5e8] p-4 shadow-xs sm:flex-row sm:items-center sm:p-6">
                  <div className="space-y-1 text-left">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1a3a3a] px-2.5 py-0.5 text-xs font-bold text-[#e8b94a]">
                      <span className="size-2 animate-ping rounded-full bg-[#e8b94a]" />
                      Live Attendance Scanning Active
                    </span>
                    <h3 className="text-base font-bold text-[#0a0a0a] sm:text-lg">
                      Ready to Scan Member QR Codes
                    </h3>
                    <p className="text-xs text-[#6a6a6a]">
                      Point device camera to members&apos; personal attendance
                      QR codes.
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
                    <CameraIcon className="size-4 text-[#e8b94a]" />
                    <span>Open Live QR Scanner</span>
                  </button>
                </div>
              )}

              {!isActive && !isClosed && (
                <div className="flex items-center gap-3 rounded-[20px] border border-[#e5e5e5] bg-[#fffaf0] p-4 text-xs text-[#6a6a6a] shadow-2xs">
                  <AlertTriangleIcon className="size-4 shrink-0 text-[#e8b94a]" />
                  <span>
                    Event check-in is currently idle. Click{" "}
                    <strong className="font-semibold text-[#0a0a0a]">
                      &quot;Activate Event Check-In&quot;
                    </strong>{" "}
                    in the header to begin scanning attendees.
                  </span>
                </div>
              )}

              {isClosed && (
                <div className="flex items-center gap-3 rounded-[20px] border border-[#e5e5e5] bg-[#faf5e8] p-4 text-xs text-[#6a6a6a] shadow-2xs">
                  <LockIcon className="size-4 shrink-0 text-[#6a6a6a]" />
                  <span>
                    Event has concluded. Attendance list is locked for
                    archiving.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Attendance Table Container */}
          <div className="rounded-[24px] border border-[#e5e5e5] bg-[#faf5e8] p-3.5 shadow-xs sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e5e5] pb-3">
              <div className="flex items-center gap-2">
                <ClipboardListIcon className="size-4.5 text-[#1a3a3a]" />
                <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                  Recorded Attendees ({attendances.length})
                </h3>
              </div>
            </div>

            <AttendanceListSheet
              eventId={event.id}
              records={attendances}
              role={role}
              isClosed={isClosed}
              onDeleteRecord={onDeleteAttendance}
              onRefresh={onRefreshAttendances}
            />
          </div>
        </div>
      )}

      {/* ── Lifecycle Confirmation Dialogs (Apple HIG AlertDialog) ── */}
      {/* Activate check-in — normal */}
      <ConfirmDialog
        open={pendingAction === "activate"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        variant="info"
        icon={<PlayIcon className="size-6" />}
        title="Start Event & Open Check-In?"
        description={
          <>
            Members will be able to self check-in via QR for{" "}
            <strong className="font-semibold text-[#0a0a0a]">
              {event.title}
            </strong>{" "}
            once activated. You can close check-in and finalize points when the
            event ends.
          </>
        }
        confirmLabel="Start Event"
        cancelLabel="Cancel"
        onConfirm={() => executeStatusChange("active")}
      />

      {/* Activate check-in — premature warning */}
      <ConfirmDialog
        open={pendingAction === "activate-premature"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        variant="warning"
        icon={<AlertTriangleIcon className="size-6" />}
        title="Early Event Start Warning"
        description={
          <>
            The scheduled date & time for{" "}
            <strong className="font-semibold text-[#0a0a0a]">
              {event.title}
            </strong>{" "}
            is{" "}
            <strong className="font-semibold text-[#0a0a0a]">
              {dayName}, {dateStr} at {timeStr} WIB
            </strong>
            , which has not arrived yet. Are you sure you want to start this
            event and open attendance check-in now?
          </>
        }
        confirmLabel="Start Event Now"
        cancelLabel="Keep Scheduled"
        onConfirm={() =>
          executeStatusChange("active", new Date().toISOString())
        }
      />

      {/* Cancel Event Dialog */}
      <ConfirmDialog
        open={pendingAction === "cancel"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        variant="destructive"
        icon={<AlertTriangleIcon className="size-6" />}
        title="Cancel Event?"
        description={
          <>
            Are you sure you want to cancel{" "}
            <strong className="font-semibold text-[#0a0a0a]">
              {event.title}
            </strong>
            ? The event will be marked as cancelled and will not accept
            attendances. You can reschedule it later if needed.
          </>
        }
        confirmLabel="Yes, Cancel Event"
        cancelLabel="Keep Event"
        onConfirm={() => executeStatusChange("cancel")}
      />

      {/* Complete & close — finalize points */}
      <ConfirmDialog
        open={pendingAction === "close"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        variant="destructive"
        icon={<LockIcon className="size-6" />}
        title="Close & Finalize Event?"
        description={
          <>
            Closing{" "}
            <strong className="font-semibold text-[#0a0a0a]">
              {event.title}
            </strong>{" "}
            will lock the attendance session, finalize attendee records, and
            credit points to all attendees. This action{" "}
            <strong className="font-semibold text-[#0a0a0a]">
              cannot be undone
            </strong>
            .
          </>
        }
        confirmLabel="Close & Finalize Points"
        cancelLabel="Keep Open"
        onConfirm={() => executeStatusChange("closed")}
      />

      {/* Reschedule Event Modal */}
      {rescheduleModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reschedule-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs"
        >
          <div className="w-full max-w-md rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-6 text-left shadow-xl">
            <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-3">
              <h3
                id="reschedule-modal-title"
                className="text-base font-bold text-[#0a0a0a]"
              >
                Reschedule Event
              </h3>
              <button
                type="button"
                onClick={() => {
                  setRescheduleModalOpen(false)
                  setRescheduleError(null)
                }}
                className="cursor-pointer rounded-full p-1 text-[#6a6a6a] hover:bg-[#faf5e8]"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs text-[#6a6a6a]">
              Choose a new future date and time for{" "}
              <strong className="text-[#0a0a0a]">{event.title}</strong>. The
              status will return to Scheduled.
            </p>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-[#0a0a0a]">
                New Event Date & Time (WIB)
              </label>
              <input
                type="datetime-local"
                value={rescheduleDate}
                min={new Date().toISOString().slice(0, 16)}
                onChange={(e) => {
                  setRescheduleDate(e.target.value)
                  setRescheduleError(null)
                }}
                className="w-full rounded-[14px] border border-[#e5e5e5] bg-white px-3.5 py-2.5 text-xs text-[#0a0a0a] outline-none focus:border-[#1a3a3a] focus:ring-2 focus:ring-[#1a3a3a]/15"
              />
              {rescheduleError && (
                <p className="text-[11px] font-medium text-red-600">
                  {rescheduleError}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setRescheduleModalOpen(false)
                  setRescheduleError(null)
                }}
                className="cursor-pointer rounded-full border border-[#e5e5e5] bg-white px-4 py-2 text-xs font-semibold text-[#0a0a0a] transition-colors hover:bg-[#faf5e8]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!rescheduleDate) {
                    setRescheduleError("Please select a new date and time.")
                    return
                  }
                  const chosenTime = new Date(rescheduleDate).getTime()
                  if (isNaN(chosenTime) || chosenTime < Date.now()) {
                    setRescheduleError("New date must be in the future.")
                    return
                  }
                  executeStatusChange("scheduled", rescheduleDate)
                  setRescheduleModalOpen(false)
                }}
                className="cursor-pointer rounded-full bg-[#1a3a3a] px-5 py-2 text-xs font-bold text-[#e8b94a] shadow-xs transition-colors hover:bg-[#254f4f]"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
