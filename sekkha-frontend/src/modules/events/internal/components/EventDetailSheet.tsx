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
  QrCodeIcon,
  RotateCcwIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AttendanceListSheet } from "./AttendanceListSheet"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { DateTimePicker } from "@/components/common/DateTimePicker"
import { Button } from "@/components/base"
import { Badge } from "@/components/base/Badge"
import { ConfirmDialog } from "@/components/base/AlertDialog"
import type {
  EventListItem,
  UserRole,
  AttendanceRecord,
  EventStatus,
} from "../types"
import { getCategoryColor, getEventTag } from "../masterdata"
import { buildEventShareMessage } from "../utils/eventDescriptionTemplate"

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
  const { authState } = useAuth()
  const currentUserId =
    authState.status === "authenticated" ? authState.userId : null
  const isPengurus = role === "organizer" || role === "admin"
  const isAdmin = role === "admin"
  const myRecord =
    attendances.find((a) => a.user_id === currentUserId) ??
    attendances[0] ??
    null
  const [activeTab, setActiveTab] = useState<"overview" | "attendance">(
    "overview"
  )
  const [copiedLink, setCopiedLink] = useState(false)

  // Lifecycle actions
  type LifecycleAction =
    "activate" | "activate-premature" | "close" | "cancel" | "reset-draft" | null
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
    const shareText = buildEventShareMessage(event, window.location.href)
    const shareData = {
      title: event.title,
      text: shareText,
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
      await navigator.clipboard.writeText(shareText)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2000)
    }
  }

  return (
    <div className="space-y-4 pb-24 text-left font-sans sm:space-y-6 sm:pb-6">
      {/* ── 1. Hero Header Container ── */}
      <section
        aria-labelledby="event-hero-heading"
        className="relative overflow-hidden rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs sm:p-6 lg:p-7"
      >
        <div className="relative z-10 space-y-4 sm:space-y-5">
          {/* Top Status & Category Badges Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="scrollbar-none flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-hairline px-2.5 py-0.5 text-[11px] font-semibold text-ink capitalize shadow-2xs backdrop-blur-md sm:text-xs"
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
                  className="shrink-0 gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 sm:text-xs"
                >
                  <span className="relative flex size-2 shrink-0" aria-hidden="true">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
                  </span>
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

            {/* Top-Right Action Group: Share + More Options (44pt HIG touch targets) */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleShare}
                className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-hairline bg-canvas px-3 text-ink shadow-xs transition-all hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
                title={copiedLink ? "Event details & link copied" : "Share event details & link"}
                aria-label={copiedLink ? "Event details & link copied" : "Share event"}
              >
                {copiedLink ? (
                  <>
                    <CheckIcon className="size-4 text-emerald-600" />
                    <span className="text-[11px] font-bold text-emerald-700">
                      Copied
                    </span>
                  </>
                ) : (
                  <Share2Icon className="size-4" />
                )}
              </button>

              {isPengurus && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex size-11 cursor-pointer items-center justify-center rounded-full border border-hairline bg-canvas text-ink shadow-xs transition-all hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
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
                    {isClosed && isAdmin && (
                      <>
                        <DropdownMenuSeparator className="my-1 border-t border-hairline" />
                        <DropdownMenuItem
                          onClick={() => setPendingAction("reset-draft")}
                          className="flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-50"
                        >
                          <RotateCcwIcon className="size-3.5 text-amber-600" />
                          <span>Reset to Draft</span>
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

      {/* ── 2. Segmented Control Tabs (Overview & Attendance available to all roles) ── */}
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
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none sm:min-w-32 sm:px-5 sm:text-sm ${
              activeTab === "overview"
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
            className={`flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none sm:min-w-32 sm:px-5 sm:text-sm ${
              activeTab === "attendance"
                ? "bg-ink text-canvas shadow-xs"
                : "text-text-muted hover:text-ink"
            }`}
          >
            <UsersIcon className="size-4" />
            <span>{isPengurus ? "Attendance" : "My Attendance"}</span>
            {isPengurus && (
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  activeTab === "attendance"
                    ? "bg-canvas/20 text-canvas"
                    : "bg-ink/[0.08] text-ink"
                }`}
              >
                {attendances.length > 0
                  ? attendances.length
                  : (event.total_attendees ?? 0)}
              </span>
            )}
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
          {/* Mobile Apple HIG Inset Grouped List (compact so Description sits above the fold) */}
          <div
            data-testid="event-overview-grouped-list"
            className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-surface-soft shadow-xs sm:hidden"
          >
            {/* Schedule Row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink text-canvas">
                <CalendarIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                  Schedule
                </p>
                <p className="truncate text-xs font-bold text-ink">
                  {dayName}, {dateStr} · {timeStr} WIB
                </p>
              </div>
            </div>

            {/* Venue Row */}
            {locationContext.mapsUrl ? (
              <a
                href={locationContext.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-3 px-4 py-3 transition-colors active:bg-surface-card"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink text-canvas">
                  <MapPinIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    Venue &amp; Maps
                  </p>
                  <p className="truncate text-xs font-bold text-ink">
                    {locationContext.displayLocation}
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-text-muted">
                  <span>{locationContext.isExternalUrl ? "Join" : "Maps"}</span>
                  <ExternalLinkIcon className="size-3.5" />
                </span>
              </a>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink text-canvas">
                  <MapPinIcon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    Venue
                  </p>
                  <p className="truncate text-xs font-bold text-ink">
                    {locationContext.displayLocation}
                  </p>
                </div>
              </div>
            )}

            {/* Seva Reward Row */}
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-ink text-canvas">
                <AwardIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                  Seva Reward
                </p>
                <p className="text-xs font-bold text-ink">
                  +{pointsReward} Karma Points
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-ink/[0.06] px-2.5 py-1 text-[10px] font-semibold text-text-muted">
                Streak Eligible
              </span>
            </div>
          </div>

          {/* Desktop/Tablet Key Details Bento Grid */}
          <div className="hidden gap-3.5 sm:grid sm:grid-cols-3">
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
                    +{pointsReward} Karma Points
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
              <div className="space-y-2.5 rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs sm:space-y-3 sm:p-6">
                <h3 className="flex items-center gap-2 text-sm font-bold text-ink sm:text-base">
                  <SparklesIcon className="size-4 text-ink" />
                  <span>About this Event</span>
                </h3>
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
                  <button
                    type="button"
                    onClick={() => setActiveTab("attendance")}
                    className="flex min-h-[42px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-ink bg-surface-card px-4 py-2 text-xs font-bold text-ink shadow-xs transition-all hover:bg-surface-soft active:scale-95"
                  >
                    <span>View My Attendance</span>
                    <ChevronRightIcon className="size-4 text-ink" />
                  </button>
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
          {/* Session Status Notice (Organizer & Admin Only — when idle or locked) */}
          {isPengurus && !isActive && (
            <div>
              {!isClosed && (
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

          {/* Organizer / Admin Full Attendance Table */}
          {isPengurus && (
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
          )}

          {/* Member / Activist Personal Attendance Record View */}
          {!isPengurus && (
            <div className="space-y-4">
              {myRecord ? (
                <div className="rounded-2xl border border-hairline bg-surface-card p-5 shadow-xs sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="flex size-9 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2Icon className="size-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-ink sm:text-base">
                          Attendance Recorded
                        </h3>
                        <p className="text-xs text-text-muted">
                          Logged at{" "}
                          {new Date(myRecord.scanned_at).toLocaleTimeString(
                            "en-US",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/80 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                      <CheckCircle2Icon className="size-3.5" />
                      <span>Present</span>
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-hairline bg-surface-soft p-3.5">
                      <span className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
                        Check-In Method
                      </span>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-ink sm:text-sm">
                        <QrCodeIcon className="size-4 text-text-muted" />
                        <span>
                          {myRecord.method === "manual"
                            ? "Manual Registration"
                            : "Member QR Scan"}
                        </span>
                      </p>
                    </div>

                    <div className="rounded-xl border border-hairline bg-surface-soft p-3.5">
                      <span className="text-[11px] font-semibold tracking-wider text-text-muted uppercase">
                        Karma Points Earned
                      </span>
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-bold text-emerald-700 sm:text-sm">
                        <SparklesIcon className="size-4 text-emerald-600" />
                        <span>+{myRecord.points_earned} Pts</span>
                        {myRecord.is_late && (
                          <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                            Late (-{myRecord.late_penalty_applied} Pts)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {myRecord.badge_activity && (
                    <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-indigo-200/80 bg-indigo-50/70 p-3 text-xs text-indigo-900">
                      <AwardIcon className="size-4 shrink-0 text-indigo-600" />
                      <span>
                        <strong>Service Duty:</strong> {myRecord.badge_activity} (+{myRecord.badge_bonus_points} bonus points)
                      </span>
                    </div>
                  )}

                  <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-hairline bg-canvas p-3.5 text-xs text-text-muted">
                    <InfoIcon className="mt-0.5 size-4 shrink-0 text-text-muted" />
                    <span>
                      {myRecord.is_finalized || isClosed
                        ? "This event has concluded. Your karma points and attendance streak have been credited to your profile."
                        : "Check-in recorded in draft. Official karma points and streaks will be credited once organizers conclude the event."}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-hairline bg-surface-card p-6 text-center shadow-xs">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-surface-soft text-text-muted">
                    <ClockIcon className="size-6 text-text-muted" />
                  </div>
                  <h3 className="mt-3 text-base font-bold text-ink">
                    Not Checked In Yet
                  </h3>
                  <p className="mx-auto mt-1.5 max-w-sm text-xs text-text-muted">
                    {isActive
                      ? "Check-in is currently open at the venue! Please show your personal Member QR code to an organizer at the registration desk."
                      : isClosed
                        ? "You were not recorded as present for this concluded event."
                        : isCancelled
                          ? "This event was cancelled."
                          : "Check-in will open when the event begins. Prepare your Member QR code beforehand from your Profile."}
                  </p>

                  {!isClosed && !isCancelled && (
                    <div className="mt-5 flex justify-center">
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/people" })}
                        className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5 py-2 text-xs font-bold text-canvas shadow-xs transition-all hover:bg-ink/90 active:scale-95"
                      >
                        <QrCodeIcon className="size-4" />
                        <span>Show My Member QR</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
            Attendance check-in will be opened for organizers to scan members for{" "}
            <strong className="font-semibold text-ink">
              {event.title}
            </strong>
            . You can close check-in and finalize points when the event ends.
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
        confirmLabel="Close & Finalize Karma Points"
        cancelLabel="Keep Open"
        onConfirm={() => executeStatusChange("closed")}
      />

      {/* Reset closed event to draft (Admin only) */}
      <ConfirmDialog
        open={pendingAction === "reset-draft"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        variant="warning"
        icon={<RotateCcwIcon className="size-6" />}
        title="Reset Event to Draft?"
        description={
          <>
            Resetting{" "}
            <strong className="font-semibold text-ink">
              {event.title}
            </strong>{" "}
            to draft (scheduled) will unlock attendance editing and roll back
            points distributed from this closure. Existing attendance records,
            late statuses, and service roles will be preserved.
          </>
        }
        confirmLabel="Reset to Draft"
        cancelLabel="Keep Closed"
        onConfirm={() => executeStatusChange("scheduled")}
      />

      {/* Reschedule Event Modal (ResponsiveFormModal + DateTimePicker + Sekkha Button) */}
      <ResponsiveFormModal
        open={rescheduleModalOpen}
        onOpenChange={(open) => {
          setRescheduleModalOpen(open)
          if (!open) setRescheduleError(null)
        }}
        title="Reschedule Event"
        description={`Choose a new future date and time for ${event.title}. Status will return to Scheduled.`}
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-left">
          <div className="space-y-1.5">
            <label
              htmlFor="reschedule-event-datetime"
              className="block text-xs font-bold text-ink"
            >
              New Event Date &amp; Time (WIB)
            </label>
            <DateTimePicker
              id="reschedule-event-datetime"
              value={rescheduleDate}
              onChange={(val) => {
                setRescheduleDate(val)
                setRescheduleError(null)
              }}
              error={rescheduleError ?? undefined}
              disablePastDates={true}
            />
            {rescheduleError && (
              <p
                id="reschedule-event-datetime-error"
                className="text-[11px] font-medium text-rose-600"
              >
                {rescheduleError}
              </p>
            )}
          </div>

          <div className="flex flex-row gap-2.5 border-t border-hairline pt-4 sm:justify-end">
            <Button
              type="button"
              variant="outlined"
              onClick={() => {
                setRescheduleModalOpen(false)
                setRescheduleError(null)
              }}
              className="flex-1 rounded-xl sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
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
              className="flex-[2] rounded-xl sm:flex-none"
            >
              Confirm Reschedule
            </Button>
          </div>
        </div>
      </ResponsiveFormModal>
    </div>
  )
}
