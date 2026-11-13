import { useState, useEffect } from "react"
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
  ChevronRightIcon,
  MoreHorizontalIcon,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

function toWibDateKey(date: Date): string {
  if (isNaN(date.getTime())) return ""
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function isEventDatePassed(eventIso: string): boolean {
  const eventDayKey = toWibDateKey(new Date(eventIso))
  const todayKey = toWibDateKey(new Date())
  if (!eventDayKey || !todayKey) return false
  return todayKey > eventDayKey
}

function isOnlineLocation(locationName?: string | null): boolean {
  if (!locationName) return false
  return /zoom|online|google\s*meet|teams|discord|virtual|webinar/i.test(
    locationName
  )
}

function getLocationContext(locationName?: string | null): {
  displayLocation: string
  subtitle: string
  mapsUrl: string | null
  isExternalUrl: boolean
} {
  const cleanLocation = locationName?.trim() || "Main Hall"
  const isUrl = /^https?:\/\//i.test(cleanLocation)
  if (isOnlineLocation(cleanLocation) || isUrl) {
    return {
      displayLocation: cleanLocation,
      subtitle: "Online Virtual Session",
      mapsUrl: isUrl ? cleanLocation : null,
      isExternalUrl: isUrl,
    }
  }
  return {
    displayLocation: cleanLocation,
    subtitle: "Vihara Sekkha Community Center",
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `Vihara Sekkha ${cleanLocation}`
    )}`,
    isExternalUrl: false,
  }
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

  const isPastScheduledDate = isEventDatePassed(event.event_date)
  const locationContext = getLocationContext(event.location)
  const latePenaltyPoints = event.late_penalty_points ?? 0

  useEffect(() => {
    if (activeTab === "attendance") {
      onRefreshAttendances?.()
    }
  }, [activeTab, event.id])

  // Start Event action trigger
  function handleActivateClick() {
    if (isPastScheduledDate) {
      return
    }
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
      void onStatusChange(event.id, newStatus, newEventDate)
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
      {/* ── 1. Hero Header Container ── */}
      <section
        aria-labelledby="event-hero-heading"
        className="relative overflow-hidden rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs sm:p-6 lg:p-7"
      >
        <div className="relative z-10 space-y-4 sm:space-y-5">
          {/* Top Status & Category Badges Row */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-0.5 text-xs font-semibold text-ink capitalize shadow-2xs backdrop-blur-md"
                style={colorInfo.bgStyle}
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
                  variant="emerald"
                  glass
                  className="gap-1.5 rounded-full font-semibold text-emerald-700"
                >
                  <span className="size-1.5 animate-ping rounded-full bg-emerald-600" />
                  Active Check-In Open
                </Badge>
              )}

              {isClosed && (
                <Badge
                  variant="slate"
                  glass
                  className="gap-1.5 rounded-full font-semibold text-text-muted"
                >
                  <LockIcon className="size-3 text-text-muted" />
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
                  className="gap-1.5 rounded-full font-semibold text-text-muted"
                >
                  <ClockIcon className="size-3 text-text-muted" />
                  Scheduled
                </Badge>
              )}
            </div>

            {/* Top-Right Action Group: Share + More Options */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleShare}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-hairline bg-canvas text-ink shadow-xs transition-all hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
                title="Share event"
                aria-label="Share event"
              >
                {copiedLink ? (
                  <CheckIcon className="size-4 text-emerald-600" />
                ) : (
                  <Share2Icon className="size-4" />
                )}
              </button>

              {isPengurus && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-hairline bg-canvas text-ink shadow-xs transition-all hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
                      title="More actions"
                      aria-label="More actions"
                    >
                      <MoreHorizontalIcon className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 rounded-2xl border border-hairline bg-canvas p-1.5 shadow-lg"
                  >
                    {canEdit && (
                      <DropdownMenuItem
                        onClick={() => onEdit?.(event)}
                        className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-soft"
                      >
                        <PencilIcon className="size-3.5" />
                        <span>Edit Event</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onDuplicate?.(event)}
                      className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ink hover:bg-surface-soft"
                    >
                      <CopyIcon className="size-3.5" />
                      <span>Duplicate Event</span>
                    </DropdownMenuItem>
                    {(isActive || (!isClosed && !isCancelled)) && (
                      <>
                        <DropdownMenuSeparator className="my-1 border-t border-hairline" />
                        <DropdownMenuItem
                          onClick={() => setPendingAction("cancel")}
                          className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          <AlertTriangleIcon className="size-3.5 text-rose-600" />
                          <span>Cancel Event</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    {onDelete && !isClosed && (
                      <DropdownMenuItem
                        onClick={() => onDelete?.(event)}
                        className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        <Trash2Icon className="size-3.5 text-rose-600" />
                        <span>Delete Event</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Main Title with Calendar Date Squircle */}
          <div className="flex items-start gap-3.5 sm:items-center sm:gap-6">
            {/* Calendar Date Squircle */}
            <div className="flex size-16 shrink-0 flex-col items-center justify-between overflow-hidden rounded-xl border border-hairline bg-canvas shadow-xs sm:size-20 sm:rounded-2xl">
              <div className="w-full bg-ink py-0.5 text-center text-[9px] font-bold tracking-wider text-canvas uppercase sm:py-1 sm:text-[10px]">
                {monthShort}
              </div>
              <div className="my-auto text-xl leading-none font-black tracking-tight text-ink sm:text-2xl">
                {dayNumber}
              </div>
              <div className="w-full pb-1 text-center text-[9px] font-semibold text-text-muted uppercase sm:pb-1 sm:text-[10px]">
                {dayName.slice(0, 3)}
              </div>
            </div>

            {/* Title & Metadata */}
            <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
              <h1
                id="event-hero-heading"
                className="text-lg leading-snug font-bold tracking-tight text-ink sm:text-2xl"
              >
                {event.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted sm:text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <ClockIcon className="size-3.5 shrink-0 text-text-muted sm:size-4" />
                  <span>
                    {dayName}, {timeStr} WIB
                  </span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <MapPinIcon className="size-3.5 shrink-0 text-text-muted sm:size-4" />
                  <span className="truncate">{locationContext.displayLocation}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Primary Action Row */}
          {isPengurus && (
            <div className="border-t border-hairline pt-3.5">
              {/* Scheduled State */}
              {!isActive && !isClosed && !isCancelled && (
                <div className="flex w-full items-center gap-2">
                  {isPastScheduledDate ? (
                    <button
                      type="button"
                      onClick={() => {
                        setRescheduleDate("")
                        setRescheduleError(null)
                        setRescheduleModalOpen(true)
                      }}
                      className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-bold text-canvas shadow-xs transition-all hover:bg-ink/90 active:scale-[0.98] sm:text-sm"
                      title="Reschedule this event to a future date"
                    >
                      <CalendarIcon className="size-4 text-canvas" />
                      <span>Reschedule Event</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleActivateClick}
                      className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-6 py-2.5 text-xs font-bold text-canvas shadow-xs transition-all hover:bg-ink/90 active:scale-[0.98] sm:text-sm"
                      title="Start Event and open attendance check-in"
                    >
                      <PlayIcon className="size-4 fill-canvas text-canvas" />
                      <span>Start Event</span>
                    </button>
                  )}
                </div>
              )}

              {/* Active State: Balanced 2-column grid */}
              {isActive && (
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/events/scan",
                        search: { eventId: event.id },
                      })
                    }
                    className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-canvas shadow-xs transition-all hover:bg-ink/90 active:scale-[0.98] sm:text-sm"
                    title="Open live QR scanner"
                  >
                    <CameraIcon className="size-4 text-canvas" />
                    <span>Live Scanner</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPendingAction("close")}
                    className="flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-full border border-ink bg-surface-card px-4 py-2.5 text-xs font-bold text-ink shadow-xs transition-all hover:bg-surface-soft active:scale-[0.98] sm:text-sm"
                    title="Close & complete this event"
                  >
                    <LockIcon className="size-4 text-ink" />
                    <span>Finalize Event</span>
                  </button>
                </div>
              )}

              {/* Cancelled State */}
              {isCancelled && (
                <button
                  type="button"
                  onClick={() => {
                    setRescheduleDate("")
                    setRescheduleError(null)
                    setRescheduleModalOpen(true)
                  }}
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-6 py-2.5 text-xs font-bold text-canvas shadow-xs transition-all hover:bg-ink/90 active:scale-[0.98] sm:text-sm"
                  title="Reschedule this event"
                >
                  <CalendarIcon className="size-4 text-canvas" />
                  <span>Reschedule Event</span>
                </button>
              )}

              {/* Closed State */}
              {isClosed && (
                <div className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-hairline bg-canvas px-4 py-2 text-xs font-semibold text-text-muted">
                  <CheckCircle2Icon className="size-4 text-ink" />
                  <span>Event Concluded (Finalized)</span>
                </div>
              )}
            </div>
          )}

          {/* Non-Pengurus Action Row */}
          {!isPengurus && (
            <div className="flex items-center justify-between gap-2.5 border-t border-hairline pt-3.5">
              <div className="flex items-center gap-2 text-xs font-medium text-text-muted">
                <ShieldCheckIcon className="size-3.5 text-ink" />
                <span>Show your Member QR on Profile for check-in</span>
              </div>
            </div>
          )}

          {isPengurus &&
            !isActive &&
            !isClosed &&
            !isCancelled &&
            isPastScheduledDate && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-amber-300/80 bg-amber-50/90 px-4 py-3 text-xs text-amber-900 shadow-2xs"
              >
                <AlertTriangleIcon className="mt-0.5 size-4 shrink-0 text-amber-600" />
                <span>
                  <strong className="font-bold">
                    Scheduled event date has passed ({dateStr}).
                  </strong>{" "}
                  Event activation is disabled for past dates. Please reschedule
                  this event to a current or future date, or cancel it.
                </span>
              </div>
            )}
        </div>
      </section>

      {/* ── 2. Segmented Control Tabs (Attendance tab restricted to organizer & admin per PRD AC-EVT-01) ── */}
      {isPengurus && (
        <div className="flex w-full justify-center sm:w-auto sm:justify-start">
          <div
            role="tablist"
            aria-label="Event detail sections"
            className="grid w-full grid-cols-2 rounded-full border border-hairline bg-surface-soft p-1 shadow-2xs sm:inline-flex sm:w-auto"
          >
            <button
              id="event-overview-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === "overview"}
              aria-controls="event-overview-panel"
              tabIndex={activeTab === "overview" ? 0 : -1}
              onClick={() => setActiveTab("overview")}
              className={`flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none sm:min-w-32 sm:px-5 sm:text-sm ${activeTab === "overview"
                ? "bg-ink text-canvas shadow-xs"
                : "text-text-muted hover:text-ink"
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
              className={`flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none sm:min-w-32 sm:px-5 sm:text-sm ${activeTab === "attendance"
                ? "bg-ink text-canvas shadow-xs"
                : "text-text-muted hover:text-ink"
                }`}
            >
              <UsersIcon className="size-4" />
              <span>Attendance</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${activeTab === "attendance"
                  ? "bg-canvas/20 text-canvas"
                  : "bg-ink/[0.08] text-ink"
                  }`}
              >
                {attendances.length > 0
                  ? attendances.length
                  : (event.total_attendees ?? 0)}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── 3. Tab Contents ── */}
      {activeTab === "overview" && (
        <div
          id="event-overview-panel"
          role="tabpanel"
          aria-labelledby="event-overview-tab"
          tabIndex={0}
          className="space-y-5 outline-none sm:space-y-6"
        >
          {/* Key Details Bento Grid: 3 balanced cards across tablet & desktop */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
            {/* Schedule Bento Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-canvas shadow-xs">
                  <CalendarIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-text-muted uppercase sm:text-[11px]">
                    Date &amp; Time
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-ink sm:text-sm">
                    {dayName}, {dateStr}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-text-muted">
                    {timeStr} WIB
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-hairline pt-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-text-muted">
                  <ClockIcon className="size-3.5 text-ink" />
                  <span>Western Indonesia Time (WIB · UTC+7)</span>
                </span>
              </div>
            </div>

            {/* Location Bento Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-canvas shadow-xs">
                  <MapPinIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-text-muted uppercase sm:text-[11px]">
                    Venue &amp; Location
                  </p>
                  <p className="mt-0.5 truncate text-xs font-bold text-ink sm:text-sm">
                    {locationContext.displayLocation}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-text-muted">
                    {locationContext.subtitle}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-hairline pt-3">
                {locationContext.mapsUrl ? (
                  <a
                    href={locationContext.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between text-xs font-semibold text-ink transition-colors hover:underline"
                  >
                    <span>
                      {locationContext.isExternalUrl
                        ? "Join Virtual Session"
                        : "Open in Google Maps"}
                    </span>
                    <ExternalLinkIcon className="size-3.5 text-text-muted" />
                  </a>
                ) : (
                  <span className="text-xs font-medium text-text-muted">
                    Link shared by event organizers
                  </span>
                )}
              </div>
            </div>

            {/* Merit Points Card */}
            <div className="flex flex-col justify-between rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-ink text-canvas shadow-xs">
                  <AwardIcon className="size-5" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-text-muted uppercase sm:text-[11px]">
                    Seva Reward
                  </p>
                  <p className="mt-0.5 text-xs font-bold text-ink sm:text-sm">
                    +{pointsReward} Activity Points
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-text-muted">
                    Auto-credited upon check-in
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-hairline pt-3">
                <span className="flex items-center gap-1 text-xs font-semibold text-text-muted">
                  <SparklesIcon className="size-3.5 text-ink" />
                  <span>Counts toward streak tier</span>
                </span>
              </div>
            </div>
          </div>

          {/* 2-Column Responsive Proportional Layout: Content (Col 7) + Rules & Snapshot (Col 5) */}
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
            {/* Left Column: Event Description + Guidelines */}
            <div className="space-y-5 lg:col-span-7">
              {/* About this Event */}
              <div className="space-y-3 rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-ink sm:text-base">
                    <SparklesIcon className="size-4 text-ink" />
                    <span>About this Event</span>
                  </h3>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full border border-hairline px-2.5 py-0.5 text-[11px] font-semibold text-ink"
                    style={colorInfo.bgStyle}
                  >
                    <span
                      className="size-1.5 rounded-full"
                      style={colorInfo.dotStyle}
                    />
                    {colorInfo.name}
                  </span>
                </div>
                {event.description ? (
                  <p className="text-xs leading-relaxed whitespace-pre-line text-body sm:text-sm">
                    {event.description}
                  </p>
                ) : (
                  <p className="text-xs leading-relaxed text-text-muted italic sm:text-sm">
                    No description provided for this event. Please arrive on
                    time at the scheduled venue.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Event Policies & Community Snapshot */}
            <div className="space-y-5 lg:col-span-5">
              {/* Event Rules & Attendance Policies */}
              <div className="space-y-4 rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs sm:p-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-ink sm:text-base">
                  <ShieldCheckIcon className="size-4 text-ink" />
                  <span>Event Rules &amp; Attendance Policy</span>
                </h3>

                <div className="divide-y divide-hairline rounded-xl border border-hairline bg-canvas text-xs shadow-2xs">
                  {/* Target Audience */}
                  <div className="flex items-center justify-between p-3">
                    <span className="font-medium text-text-muted">Target Audience</span>
                    <span className="font-bold text-ink capitalize">
                      {event.visibility === "all"
                        ? "All Members"
                        : event.visibility === "activist"
                          ? "Activists & Organizers"
                          : event.visibility === "organizer"
                            ? "Organizers Only"
                            : "Community Members"}
                    </span>
                  </div>

                  {/* Late Arrival Policy */}
                  <div className="flex items-center justify-between p-3">
                    <span className="font-medium text-text-muted">Late Arrival Grace</span>
                    <span className="font-bold text-ink">
                      {event.max_late_minutes ?? 15} Minutes
                    </span>
                  </div>

                  {/* Late Penalty */}
                  <div className="flex items-center justify-between p-3">
                    <span className="font-medium text-text-muted">Late Penalty</span>
                    {latePenaltyPoints <= 0 ? (
                      <span className="font-bold text-text-muted">
                        No Penalty (0 Pts)
                      </span>
                    ) : (
                      <span className="font-bold text-rose-700">
                        -{latePenaltyPoints} Pts
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Attendance Community Snapshot */}
              <div className="space-y-3 rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs sm:p-6">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-ink sm:text-base">
                    <UsersIcon className="size-4 text-ink" />
                    <span>Attendance Snapshot</span>
                  </h3>
                  <Badge
                    variant={isActive ? "emerald" : isClosed ? "slate" : "default"}
                    glass
                    size="sm"
                    className="text-[11px] font-semibold"
                  >
                    {isActive ? "Active Now" : isClosed ? "Concluded" : "Scheduled"}
                  </Badge>
                </div>

                <div className="rounded-xl border border-hairline bg-canvas p-4 text-center shadow-2xs">
                  <p className="text-[11px] font-bold tracking-wider text-text-muted uppercase">
                    Recorded Attendees
                  </p>
                  <p className="mt-1 text-2xl font-black text-ink sm:text-3xl">
                    {attendances.length > 0
                      ? attendances.length
                      : (event.total_attendees ?? 0)}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    {isActive
                      ? "Members actively checked in today"
                      : isClosed
                        ? "Total finalized member check-ins"
                        : "Ready to accept check-ins once started"}
                  </p>
                </div>

                {isPengurus ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("attendance")}
                    className="flex min-h-[42px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-ink bg-surface-card px-4 py-2 text-xs font-bold text-ink shadow-xs transition-all hover:bg-surface-soft active:scale-95"
                  >
                    <span>Manage Attendance List</span>
                    <ChevronRightIcon className="size-4 text-ink" />
                  </button>
                ) : (
                  <p className="text-center text-xs text-text-muted">
                    Check-in is managed by event organizers.
                  </p>
                )}
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
          {/* Active Session Status Bar (Pengurus & Aktivis) */}
          {isPengurus && (
            <div>
              {isActive && (
                <div className="flex items-center justify-between gap-3 rounded-[20px] border border-emerald-200 bg-emerald-50/80 px-4 py-2.5 text-xs text-emerald-900 shadow-2xs">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="relative flex size-2.5 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600" />
                    </span>
                    <span className="truncate font-semibold text-emerald-900">
                      Live Check-In Active
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate({
                        to: "/events/scan",
                        search: { eventId: event.id },
                      })
                    }
                    className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-ink px-3.5 py-1.5 text-xs font-bold text-canvas shadow-2xs transition-all hover:bg-ink/90 active:scale-95"
                  >
                    <CameraIcon className="size-3.5 text-canvas" />
                    <span>Launch Scanner</span>
                  </button>
                </div>
              )}

              {!isActive && !isClosed && (
                <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-canvas p-3.5 text-xs text-text-muted shadow-2xs">
                  <AlertTriangleIcon className="size-4 shrink-0 text-amber-600" />
                  <span>
                    Event check-in is currently idle. Click{" "}
                    <strong className="font-semibold text-ink">
                      &quot;Start Event&quot;
                    </strong>{" "}
                    above to begin scanning attendees.
                  </span>
                </div>
              )}

              {isClosed && (
                <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-soft p-3.5 text-xs text-text-muted shadow-2xs">
                  <LockIcon className="size-4 shrink-0 text-text-muted" />
                  <span>
                    Event has concluded. Attendance list is locked for
                    archiving.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Attendance Table Container */}
          <div className="rounded-2xl border border-hairline bg-surface-soft p-3.5 shadow-xs sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
              <div className="flex items-center gap-2">
                <ClipboardListIcon className="size-4.5 text-ink" />
                <h3 className="text-sm font-bold text-ink sm:text-base">
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

      {/* ── Lifecycle Confirmation Dialogs ── */}
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
            <strong className="font-semibold text-ink">
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
            <strong className="font-semibold text-ink">
              {event.title}
            </strong>{" "}
            is{" "}
            <strong className="font-semibold text-ink">
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
            <strong className="font-semibold text-ink">
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
            <strong className="font-semibold text-ink">
              {event.title}
            </strong>{" "}
            will lock the attendance session, finalize attendee records, and
            credit points to all attendees. This action{" "}
            <strong className="font-semibold text-ink">
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
          <div className="w-full max-w-md rounded-2xl border border-hairline bg-canvas p-6 text-left shadow-xl">
            <div className="flex items-center justify-between border-b border-hairline pb-3">
              <h3
                id="reschedule-modal-title"
                className="text-base font-bold text-ink"
              >
                Reschedule Event
              </h3>
              <button
                type="button"
                onClick={() => {
                  setRescheduleModalOpen(false)
                  setRescheduleError(null)
                }}
                className="cursor-pointer rounded-full p-1 text-text-muted hover:bg-surface-soft"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-xs text-text-muted">
              Choose a new future date and time for{" "}
              <strong className="text-ink">{event.title}</strong>. The
              status will return to Scheduled.
            </p>

            <div className="mt-4 space-y-2">
              <label className="block text-xs font-semibold text-ink">
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
                className="w-full rounded-xl border border-hairline bg-surface-card px-3.5 py-2.5 text-xs text-ink outline-none focus:border-ink focus:ring-2 focus:ring-ink/10"
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
                className="cursor-pointer rounded-full border border-hairline bg-surface-card px-4 py-2 text-xs font-semibold text-ink transition-colors hover:bg-surface-soft"
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
                className="cursor-pointer rounded-full bg-ink px-5 py-2 text-xs font-bold text-canvas shadow-xs transition-colors hover:bg-ink/90"
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
