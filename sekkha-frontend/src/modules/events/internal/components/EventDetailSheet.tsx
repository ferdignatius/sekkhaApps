import { useState, useEffect, useRef } from "react"
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
  InfoIcon,
  ShieldCheckIcon,
  AwardIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  MoreHorizontalIcon,
  QrCodeIcon,
  RotateCcwIcon,
  ArrowLeftIcon,
} from "lucide-react"
import { useAuth } from "@/modules/auth"
import { api } from "@/lib/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { AttendanceListSheet } from "./AttendanceListSheet"
import { ResponsiveFormModal } from "@/components/common/ResponsiveFormModal"
import { formatAudienceRolesLabel } from "@/lib/eventAudience"
import { DateTimePicker } from "@/components/common/DateTimePicker"
import { MemberQrModal } from "@/components/common/MemberQrModal"
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
  onOpenLiveScanner?: (eventId: string) => void
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
  const year = d.getFullYear()
  const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${year}`
  const hours = String(d.getHours()).padStart(2, "0")
  const mins = String(d.getMinutes()).padStart(2, "0")
  const timeStr = `${hours}:${mins}`

  return { dayName, monthShort, dayNumber, year, dateStr, timeStr }
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
  subtitle?: string
  joinUrl: string | null
} {
  const cleanLocation = locationName?.trim() || "Main Hall"
  const isUrl = /^https?:\/\//i.test(cleanLocation)
  if (isOnlineLocation(cleanLocation) || isUrl) {
    return {
      displayLocation: cleanLocation,
      subtitle: "Online Virtual Session",
      joinUrl: isUrl ? cleanLocation : null,
    }
  }
  return {
    displayLocation: cleanLocation,
    joinUrl: null,
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

function useIsDesktopLayout(breakpoint = 1024) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= breakpoint : false
  )

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleResize = () => {
      setIsDesktop(window.innerWidth >= breakpoint)
    }
    window.addEventListener("resize", handleResize)

    if (typeof window.matchMedia !== "function") {
      return () => window.removeEventListener("resize", handleResize)
    }
    const mq = window.matchMedia(`(min-width: ${breakpoint}px)`)
    const handleMediaChange = (e: MediaQueryListEvent) => setIsDesktop(e.matches)
    mq.addEventListener?.("change", handleMediaChange)
    return () => {
      window.removeEventListener("resize", handleResize)
      mq.removeEventListener?.("change", handleMediaChange)
    }
  }, [breakpoint])

  return isDesktop
}

export function EventDetailSheet({
  event,
  role,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
  attendances = [],
  onDeleteAttendance,
  onRefreshAttendances,
}: EventDetailSheetProps) {
  const navigate = useNavigate()
  const isDesktopLayout = useIsDesktopLayout(1024)
  const { authState } = useAuth()
  const currentUserId =
    authState.status === "authenticated" ? authState.userId : null
  const currentUserName =
    authState.status === "authenticated" ? authState.name : null
  const isPengurus = role === "organizer" || role === "admin"
  const isAdmin = role === "admin"
  const myRecord =
    attendances.find((a) => a.user_id === currentUserId) ??
    attendances[0] ??
    null

  const [activeTab, setActiveTab] = useState<"overview" | "attendance">(
    "overview"
  )
  const [mobileSheetExpanded, setMobileSheetExpanded] = useState(false)
  const dragStartYRef = useRef<number | null>(null)
  const dragStartTimeRef = useRef<number>(0)
  const dragDeltaYRef = useRef<number>(0)
  const [copiedLink, setCopiedLink] = useState(false)
  const [qrModalOpen, setQrModalOpen] = useState(false)
  const [memberUserNumber, setMemberUserNumber] = useState<
    string | number | null
  >(() => myRecord?.user_number ?? null)

  // Lifecycle actions
  type LifecycleAction =
    | "activate"
    | "activate-premature"
    | "close"
    | "cancel"
    | "reset-draft"
    | null
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
  const totalAttendeeCount =
    attendances.length > 0 ? attendances.length : (event.total_attendees ?? 0)
  const previewAttendees = attendances.slice(0, 4)
  const remainingAttendees = Math.max(
    0,
    totalAttendeeCount - previewAttendees.length
  )

  useEffect(() => {
    if (activeTab === "attendance" || mobileSheetExpanded) {
      onRefreshAttendances?.()
    }
  }, [activeTab, mobileSheetExpanded, event.id])

  useEffect(() => {
    if (myRecord?.user_number) {
      setMemberUserNumber(myRecord.user_number)
    }
  }, [myRecord?.user_number])

  function handlePeekBarTouchStart(e: React.TouchEvent<HTMLDivElement>) {
    const startY = e.touches[0]?.clientY
    if (typeof startY !== "number") return
    dragStartYRef.current = startY
    dragStartTimeRef.current =
      typeof performance !== "undefined" ? performance.now() : Date.now()
    dragDeltaYRef.current = 0
  }

  function handlePeekBarTouchMove(e: React.TouchEvent<HTMLDivElement>) {
    if (dragStartYRef.current === null) return
    const currentY = e.touches[0]?.clientY
    if (typeof currentY !== "number") return
    const deltaY = currentY - dragStartYRef.current
    if (deltaY < 0) {
      dragDeltaYRef.current = deltaY
    }
  }

  function handlePeekBarTouchEnd() {
    if (dragStartYRef.current === null) return
    const deltaY = dragDeltaYRef.current
    const now = typeof performance !== "undefined" ? performance.now() : Date.now()
    const elapsedMs = Math.max(1, now - dragStartTimeRef.current)
    const velocity = deltaY / elapsedMs
    dragStartYRef.current = null
    dragDeltaYRef.current = 0
    if (deltaY < -20 || velocity < -0.3) {
      setMobileSheetExpanded(true)
    }
  }

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

  async function handleOpenMemberQr() {
    setQrModalOpen(true)
    if (memberUserNumber || myRecord?.user_number) {
      return
    }
    try {
      const res = await api.get<{
        user_number?: string | number | null
        data?: { user_number?: string | number | null }
      }>("/users/me")
      const resolved = res?.data?.user_number ?? res?.user_number ?? null
      if (resolved) {
        setMemberUserNumber(resolved)
      }
    } catch {
      // Non-blocking fallback when profile lookup is unavailable
    }
  }

  function openRescheduleModal() {
    setRescheduleDate("")
    setRescheduleError(null)
    setRescheduleModalOpen(true)
  }

  function renderPrimaryActions(compactMobile = false) {
    if (isPengurus) {
      if (!isActive && !isClosed && !isCancelled) {
        return isPastScheduledDate ? (
          <button
            type="button"
            onClick={openRescheduleModal}
            className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-bold text-canvas shadow-xs transition-all hover:bg-ink/90 active:scale-[0.98] sm:text-sm"
            title="Reschedule this event to a future date"
          >
            <CalendarIcon className="size-4 text-canvas" />
            <span>Reschedule Event</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleActivateClick}
            className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-6 py-2.5 text-xs font-bold text-canvas shadow-xs transition-all hover:bg-ink/90 active:scale-[0.98] sm:text-sm"
            title="Start Event and open attendance check-in"
          >
            <PlayIcon className="size-4 fill-canvas text-canvas" />
            <span>Start Event</span>
          </button>
        )
      }

      if (isActive) {
        return (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/events/scan",
                  search: { eventId: event.id },
                })
              }
              className="flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-xs font-bold text-canvas shadow-xs transition-all hover:bg-ink/90 active:scale-[0.98] sm:text-sm"
              title="Open live QR scanner"
            >
              <CameraIcon className="size-4 text-canvas" />
              <span>Live Scanner</span>
            </button>

            <button
              type="button"
              onClick={() => setPendingAction("close")}
              className="flex min-h-[46px] cursor-pointer items-center justify-center gap-2 rounded-full border border-ink bg-surface-card px-4 py-2.5 text-xs font-bold text-ink shadow-xs transition-all hover:bg-surface-soft active:scale-[0.98] sm:text-sm"
              title="Close & complete this event"
            >
              <LockIcon className="size-4 text-ink" />
              <span>Finalize Event</span>
            </button>
          </div>
        )
      }

      if (isCancelled) {
        return (
          <button
            type="button"
            onClick={openRescheduleModal}
            className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-6 py-2.5 text-xs font-bold text-canvas shadow-xs transition-all hover:bg-ink/90 active:scale-[0.98] sm:text-sm"
            title="Reschedule this event"
          >
            <CalendarIcon className="size-4 text-canvas" />
            <span>Reschedule Event</span>
          </button>
        )
      }

      return (
        <div className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-hairline bg-canvas px-4 py-2 text-xs font-semibold text-text-muted">
          <CheckCircle2Icon className="size-4 text-ink" />
          <span>Event Concluded (Finalized)</span>
        </div>
      )
    }

    // Non-pengurus member CTA
    if (myRecord) {
      return (
        <button
          type="button"
          onClick={() => {
            if (compactMobile) {
              setMobileSheetExpanded(true)
            } else {
              setActiveTab("attendance")
            }
          }}
          className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-full border border-emerald-300/80 bg-emerald-50 px-5 py-2.5 text-xs font-bold text-emerald-800 shadow-2xs transition-all hover:bg-emerald-100/70 active:scale-[0.98] sm:text-sm"
        >
          <CheckCircle2Icon className="size-4 text-emerald-600" />
          <span>Checked In · +{myRecord.points_earned} Pts</span>
        </button>
      )
    }

    if (!isClosed && !isCancelled) {
      return (
        <button
          type="button"
          onClick={handleOpenMemberQr}
          className="flex min-h-[46px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5 py-2.5 text-xs font-bold text-canvas shadow-xs transition-all hover:bg-ink/90 active:scale-[0.98] sm:text-sm"
        >
          <QrCodeIcon className="size-4 text-canvas" />
          <span>{compactMobile ? "Show My Member QR" : "Check-in QR Code"}</span>
        </button>
      )
    }

    return (
      <div className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-hairline bg-surface-soft px-4 py-2 text-xs font-semibold text-text-muted">
        <InfoIcon className="size-4 text-text-muted" />
        <span>
          {isCancelled ? "This event was cancelled" : "Event has concluded"}
        </span>
      </div>
    )
  }

  function renderAboutSection() {
    return (
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
            No description provided for this event. Please arrive on time at the
            scheduled venue.
          </p>
        )}
      </div>
    )
  }

  function renderRulesSection() {
    return (
      <div className="space-y-3 rounded-2xl border border-hairline bg-surface-soft p-4 shadow-xs sm:p-6">
        <h3 className="flex items-center gap-2 text-sm font-bold text-ink sm:text-base">
          <ShieldCheckIcon className="size-4 text-ink" />
          <span>Event Guidelines</span>
        </h3>

        <div className="divide-y divide-hairline rounded-xl border border-hairline bg-canvas text-xs shadow-2xs">
          <div className="flex items-center justify-between gap-3 p-3">
            <span className="font-medium text-text-muted">Reward</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-ink">
                +{pointsReward} Karma Points
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  event.counts_toward_streak === false
                    ? "bg-surface-soft text-text-muted"
                    : "bg-[#faf5e8] text-[#9a6e14]"
                }`}
              >
                {event.counts_toward_streak === false
                  ? "Optional · No Streak"
                  : "Mandatory · Streak"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 p-3">
            <span className="font-medium text-text-muted">Late Policy</span>
            <span className="text-right font-bold text-ink">
              {event.max_late_minutes ?? 15}m grace ·{" "}
              {latePenaltyPoints <= 0 ? (
                <span className="text-text-muted">No penalty</span>
              ) : (
                <span className="text-rose-700">
                  -{latePenaltyPoints} Pts after
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3 p-3">
            <span className="font-medium text-text-muted">Access Right</span>
            <span className="text-right font-bold text-ink">
              {formatAudienceRolesLabel(event.target_roles, event.visibility)}
            </span>
          </div>
        </div>
      </div>
    )
  }

  function renderAttendanceStatusNotices() {
    if (!isPengurus || isActive) return null
    return (
      <div>
        {!isClosed && (
          <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-canvas p-3.5 text-xs text-text-muted shadow-2xs">
            <AlertTriangleIcon className="size-4 shrink-0 text-amber-600" />
            <span>
              Event check-in is currently idle. Click{" "}
              <strong className="font-semibold text-ink">
                &quot;Start Event&quot;
              </strong>{" "}
              to begin scanning attendees.
            </span>
          </div>
        )}

        {isClosed && (
          <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-soft p-3.5 text-xs text-text-muted shadow-2xs">
            <LockIcon className="size-4 shrink-0 text-text-muted" />
            <span>
              Event has concluded. Attendance list is locked for archiving.
            </span>
          </div>
        )}
      </div>
    )
  }

  function renderMemberAttendanceCard() {
    if (myRecord) {
      return (
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
                  {new Date(myRecord.scanned_at).toLocaleTimeString("en-US", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
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
                <strong>Service Duty:</strong> {myRecord.badge_activity} (+
                {myRecord.badge_bonus_points} bonus points)
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
      )
    }

    return (
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
                : "Check-in will open when the event begins. Prepare your Member QR code beforehand."}
        </p>

        {isDesktopLayout && !isClosed && !isCancelled && (
          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={handleOpenMemberQr}
              className="inline-flex min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-full bg-ink px-5 py-2 text-xs font-bold text-canvas shadow-xs transition-all hover:bg-ink/90 active:scale-95"
            >
              <QrCodeIcon className="size-4" />
              <span>Show My Member QR</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4 text-left font-sans sm:space-y-6">
      {/* ── 1. Unified Warm Sekkha Hero Header (matches reference hierarchy in DESIGN.md palette) ── */}
      <section
        aria-labelledby="event-hero-heading"
        className="relative overflow-hidden rounded-[24px] border border-hairline bg-gradient-to-br from-[#faf5e8] via-[#fffaf0] to-[#f5f0e0] p-4 shadow-xs sm:rounded-[28px] sm:p-6 lg:p-7"
      >
        {/* Subtle Category Accent Glow */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-12 size-52 rounded-full opacity-[0.09] blur-3xl"
          style={{ backgroundColor: colorInfo.hex }}
        />

        <div className="relative z-10 space-y-4 sm:space-y-5">
          {/* Unified Top Action Row (Back on mobile + Status + Share + More) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Back to events"
                  className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-hairline bg-canvas text-ink shadow-xs transition-all hover:bg-surface-soft active:scale-95 sm:hidden"
                >
                  <ArrowLeftIcon className="size-4" />
                </button>
              )}

              <div className="scrollbar-none flex min-w-0 flex-wrap items-center gap-1.5">
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

                {isActive && (
                  <Badge
                    variant="emerald"
                    glass
                    className="shrink-0 gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 sm:text-xs"
                  >
                    <span
                      className="relative flex size-2 shrink-0"
                      aria-hidden="true"
                    >
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex size-2 rounded-full bg-emerald-600" />
                    </span>
                    Active
                  </Badge>
                )}

                {isClosed && (
                  <Badge
                    variant="slate"
                    glass
                    className="gap-1.5 rounded-full font-semibold text-text-muted"
                  >
                    <LockIcon className="size-3 text-text-muted" />
                    Closed
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
            </div>

            {/* Top-Right Action Group: Share + More Options (44pt HIG targets) */}
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={handleShare}
                className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-hairline bg-canvas px-3 text-ink shadow-xs transition-all hover:bg-surface-soft focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none active:scale-95"
                title={
                  copiedLink
                    ? "Event details & link copied"
                    : "Share event details & link"
                }
                aria-label={
                  copiedLink ? "Event details & link copied" : "Share event"
                }
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

          {/* Title with Revived Calendar Date Squircle & Single Clean Karma Highlight */}
          <div className="flex items-start gap-3.5 sm:items-center sm:gap-5">
            <div
              data-testid="event-calendar-squircle"
              className="flex size-16 shrink-0 flex-col items-center justify-between overflow-hidden rounded-xl border border-hairline bg-canvas shadow-xs sm:size-20 sm:rounded-2xl"
            >
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

            <div className="min-w-0 flex-1 space-y-2">
              <h1
                id="event-hero-heading"
                title={event.title}
                className="truncate text-xl leading-tight font-extrabold tracking-tight text-ink sm:text-3xl"
              >
                {event.title}
              </h1>

              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8b94a]/50 bg-[#fffaf0] px-2.5 py-0.5 text-[11px] font-bold text-ink shadow-2xs sm:text-xs">
                  <AwardIcon className="size-3.5 text-[#c28e20]" />
                  <span>+{pointsReward} Karma Pts</span>
                </span>
              </div>
            </div>
          </div>

          {/* 1-Column Responsive Date, Time & Location Info */}
          <div
            data-testid="event-metadata-list"
            className="divide-y divide-hairline overflow-hidden rounded-2xl border border-hairline bg-canvas/85 shadow-2xs"
          >
            <div className="flex items-center gap-3 px-3.5 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-ink text-canvas shadow-2xs">
                <CalendarIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                  Date
                </p>
                <p className="text-xs leading-snug font-bold text-ink sm:text-sm">
                  {dayName}, {dateStr}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 px-3.5 py-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-ink text-canvas shadow-2xs">
                <ClockIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                  Time
                </p>
                <p className="font-mono text-xs leading-snug font-bold text-ink tabular-nums sm:text-sm">
                  {timeStr} WIB
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 px-3.5 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-ink text-canvas shadow-2xs">
                  <MapPinIcon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-text-muted uppercase">
                    Location
                  </p>
                  <p className="truncate text-xs leading-snug font-bold text-ink sm:text-sm">
                    {locationContext.displayLocation}
                  </p>
                  {locationContext.subtitle && (
                    <p className="truncate text-[11px] font-medium text-text-muted">
                      {locationContext.subtitle}
                    </p>
                  )}
                </div>
              </div>

              {locationContext.joinUrl && (
                <a
                  href={locationContext.joinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-surface-soft px-3.5 py-1.5 text-xs font-bold text-ink shadow-2xs transition-colors hover:bg-surface-card active:scale-95"
                >
                  <span>Join</span>
                </a>
              )}
            </div>
          </div>

          {/* Past Date Warning Banner */}
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

          {/* Desktop Primary Action Bar inside Hero */}
          {isDesktopLayout && (
            <div className="border-t border-hairline pt-4">
              {renderPrimaryActions(false)}
            </div>
          )}
        </div>
      </section>

      {!isDesktopLayout ? (
        <>
          {/* ── 2. Mobile Overview Section (< lg): About + Event Guidelines ── */}
          <div className="space-y-4 pb-48">
            {renderAboutSection()}
            {renderRulesSection()}
          </div>

          {/* ── 3. Sticky Bottom Peek Bar + CTA (auto-hides when Vaul Drawer opens so only 1 layer is visible) ── */}
          <div
            data-testid="event-mobile-peek-sheet"
            data-expanded={mobileSheetExpanded ? "true" : "false"}
            onTouchStart={handlePeekBarTouchStart}
            onTouchMove={handlePeekBarTouchMove}
            onTouchEnd={handlePeekBarTouchEnd}
            onTouchCancel={handlePeekBarTouchEnd}
            className={`fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-[28px] border-t border-[#e5dec9] bg-[#fffaf0] shadow-[0_-12px_32px_rgba(10,10,10,0.14)] transition-opacity duration-150 ${mobileSheetExpanded
              ? "pointer-events-none opacity-0"
              : "pointer-events-auto opacity-100"
              }`}
          >
            {/* Touch-locked Peek Zone (tap or swipe up launches Vaul Drawer) */}
            <div className="touch-none select-none">
              <div className="flex justify-center pt-2.5 pb-1">
                <button
                  type="button"
                  onClick={() => setMobileSheetExpanded(true)}
                  aria-expanded={mobileSheetExpanded}
                  aria-label="Expand attendance list"
                  className="flex cursor-pointer flex-col items-center rounded-full px-8 py-1.5 transition-colors hover:bg-black/[0.04] active:scale-95"
                >
                  <span className="h-1 w-11 rounded-full bg-[#6a6a6a]/35" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3 px-4 pt-1 pb-2.5">
                <button
                  type="button"
                  onClick={() => setMobileSheetExpanded(true)}
                  className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 text-left"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-[#e8b94a] bg-[#faf5e8] text-xs font-black text-ink tabular-nums">
                      {totalAttendeeCount}
                    </span>

                    {isPengurus ? (
                      previewAttendees.length > 0 ? (
                        <div className="flex -space-x-2">
                          {previewAttendees.map((rec) => (
                            <span
                              key={rec.attendance_id || rec.user_id}
                              className="flex size-7 items-center justify-center rounded-full border-2 border-[#fffaf0] bg-[#f5f0e0] text-[10px] font-bold text-ink"
                            >
                              {getInitials(rec.name)}
                            </span>
                          ))}
                          {remainingAttendees > 0 && (
                            <span className="flex size-7 items-center justify-center rounded-full border-2 border-[#fffaf0] bg-[#ff4d8b] text-[10px] font-bold text-white">
                              +{remainingAttendees}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="truncate text-xs font-bold text-ink">
                          Attendees
                        </span>
                      )
                    ) : (
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-ink">
                          {myRecord ? "Checked In" : "My Attendance"}
                        </p>
                        <p className="truncate text-[11px] font-medium text-text-muted">
                          {myRecord
                            ? `Present · +${myRecord.points_earned} Pts`
                            : "Tap or swipe up for status"}
                        </p>
                      </div>
                    )}
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-text-muted">
                    <span>
                      {isPengurus
                        ? totalAttendeeCount === 1
                          ? "1 attendee"
                          : `${totalAttendeeCount} attendees`
                        : "My Status"}
                    </span>
                    <ChevronUpIcon className="size-3.5 text-text-muted" />
                  </span>
                </button>
              </div>
            </div>

            {/* Sticky Primary CTA Footer */}
            <div className="shrink-0 border-t border-hairline/70 bg-[#fffaf0] px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {renderPrimaryActions(true)}
            </div>
          </div>

          {/* ── 4. Standard Vaul Drawer (ResponsiveFormModal) — identical smoothness across the app ── */}
          <ResponsiveFormModal
            open={mobileSheetExpanded}
            onOpenChange={setMobileSheetExpanded}
            title={
              isPengurus
                ? `Attendees (${totalAttendeeCount})`
                : "My Attendance"
            }
            description={event.title}
            footer={renderPrimaryActions(true)}
          >
            <div className="space-y-4">
              {renderAttendanceStatusNotices()}
              {isPengurus ? (
                <AttendanceListSheet
                  eventId={event.id}
                  records={attendances}
                  role={role}
                  isClosed={isClosed}
                  onDeleteRecord={onDeleteAttendance}
                  onRefresh={onRefreshAttendances}
                />
              ) : (
                renderMemberAttendanceCard()
              )}
            </div>
          </ResponsiveFormModal>
        </>
      ) : (
        /* ── 4. Desktop / Large Tablet Segmented Tabs & 2-Column View ── */
        <div className="space-y-5">
          <div className="flex justify-start">
            <div
              role="tablist"
              aria-label="Event detail sections"
              className="inline-flex rounded-full border border-hairline bg-surface-soft p-1 shadow-2xs"
            >
              <button
                id="event-overview-tab"
                type="button"
                role="tab"
                aria-selected={activeTab === "overview"}
                aria-controls="event-overview-panel"
                tabIndex={activeTab === "overview" ? 0 : -1}
                onClick={() => setActiveTab("overview")}
                className={`flex min-h-[44px] min-w-32 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none ${activeTab === "overview"
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
                className={`flex min-h-[44px] min-w-32 items-center justify-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition-all focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 focus-visible:outline-none ${activeTab === "attendance"
                  ? "bg-ink text-canvas shadow-xs"
                  : "text-text-muted hover:text-ink"
                  }`}
              >
                <UsersIcon className="size-4" />
                <span>{isPengurus ? "Attendance" : "My Attendance"}</span>
                {isPengurus && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${activeTab === "attendance"
                      ? "bg-canvas/20 text-canvas"
                      : "bg-ink/[0.08] text-ink"
                      }`}
                  >
                    {totalAttendeeCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {activeTab === "overview" && (
            <div
              id="event-overview-panel"
              role="tabpanel"
              aria-labelledby="event-overview-tab"
              tabIndex={0}
              className="grid grid-cols-12 items-start gap-5 outline-none"
            >
              <div className="col-span-7 space-y-5">{renderAboutSection()}</div>

              <div className="col-span-5 space-y-5">
                {renderRulesSection()}

                <div className="space-y-3 rounded-2xl border border-hairline bg-surface-soft p-6 shadow-xs">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-base font-bold text-ink">
                      <UsersIcon className="size-4 text-ink" />
                      <span>Attendance Snapshot</span>
                    </h3>
                    <Badge
                      variant={
                        isActive ? "emerald" : isClosed ? "slate" : "default"
                      }
                      glass
                      size="sm"
                      className="text-[11px] font-semibold"
                    >
                      {isActive
                        ? "Active Now"
                        : isClosed
                          ? "Concluded"
                          : "Scheduled"}
                    </Badge>
                  </div>

                  <div className="rounded-xl border border-hairline bg-canvas p-4 text-center shadow-2xs">
                    <p className="text-[11px] font-bold tracking-wider text-text-muted uppercase">
                      Recorded Attendees
                    </p>
                    <p className="mt-1 text-3xl font-black text-ink">
                      {totalAttendeeCount}
                    </p>
                    <p className="mt-1 text-xs text-text-muted">
                      {isActive
                        ? "Members actively checked in today"
                        : isClosed
                          ? "Total finalized member check-ins"
                          : "Ready to accept check-ins once started"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setActiveTab("attendance")}
                    className="flex min-h-[42px] w-full cursor-pointer items-center justify-center gap-1.5 rounded-full border border-ink bg-surface-card px-4 py-2 text-xs font-bold text-ink shadow-xs transition-all hover:bg-surface-soft active:scale-95"
                  >
                    <span>
                      {isPengurus
                        ? "Manage Attendance List"
                        : "View My Attendance"}
                    </span>
                    <ChevronRightIcon className="size-4 text-ink" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "attendance" && (
            <div
              id="event-attendance-panel"
              role="tabpanel"
              aria-labelledby="event-attendance-tab"
              tabIndex={0}
              className="space-y-6 outline-none"
            >
              {renderAttendanceStatusNotices()}

              {isPengurus ? (
                <div className="rounded-2xl border border-hairline bg-surface-soft p-6 shadow-xs">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-hairline pb-3">
                    <div className="flex items-center gap-2">
                      <ClipboardListIcon className="size-4.5 text-ink" />
                      <h3 className="text-base font-bold text-ink">
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
              ) : (
                renderMemberAttendanceCard()
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Member Check-In QR Modal ── */}
      <MemberQrModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        userNumber={memberUserNumber ?? myRecord?.user_number ?? currentUserId}
        name={currentUserName ?? myRecord?.name}
      />

      {/* ── Lifecycle Confirmation Dialogs ── */}
      <ConfirmDialog
        open={pendingAction === "activate"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        variant="info"
        icon={<PlayIcon className="size-6" />}
        title="Start Event & Open Check-In?"
        description={
          <>
            Attendance check-in will be opened for organizers to scan members
            for <strong className="font-semibold text-ink">{event.title}</strong>
            . You can close check-in and finalize points when the event ends.
          </>
        }
        confirmLabel="Start Event"
        cancelLabel="Cancel"
        onConfirm={() => executeStatusChange("active")}
      />

      <ConfirmDialog
        open={pendingAction === "activate-premature"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        variant="warning"
        icon={<AlertTriangleIcon className="size-6" />}
        title="Early Event Start Warning"
        description={
          <>
            The scheduled date & time for{" "}
            <strong className="font-semibold text-ink">{event.title}</strong> is{" "}
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

      <ConfirmDialog
        open={pendingAction === "cancel"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        variant="destructive"
        icon={<AlertTriangleIcon className="size-6" />}
        title="Cancel Event?"
        description={
          <>
            Are you sure you want to cancel{" "}
            <strong className="font-semibold text-ink">{event.title}</strong>?
            The event will be marked as cancelled and will not accept
            attendances. You can reschedule it later if needed.
          </>
        }
        confirmLabel="Yes, Cancel Event"
        cancelLabel="Keep Event"
        onConfirm={() => executeStatusChange("cancel")}
      />

      <ConfirmDialog
        open={pendingAction === "close"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        variant="destructive"
        icon={<LockIcon className="size-6" />}
        title="Close & Finalize Event?"
        description={
          <>
            Closing{" "}
            <strong className="font-semibold text-ink">{event.title}</strong>{" "}
            will lock the attendance session, finalize attendee records, and
            credit points to all attendees. This action{" "}
            <strong className="font-semibold text-ink">cannot be undone</strong>.
          </>
        }
        confirmLabel="Close & Finalize Karma Points"
        cancelLabel="Keep Open"
        onConfirm={() => executeStatusChange("closed")}
      />

      <ConfirmDialog
        open={pendingAction === "reset-draft"}
        onOpenChange={(open) => !open && setPendingAction(null)}
        variant="warning"
        icon={<RotateCcwIcon className="size-6" />}
        title="Reset Event to Draft?"
        description={
          <>
            Resetting{" "}
            <strong className="font-semibold text-ink">{event.title}</strong> to
            draft (scheduled) will unlock attendance editing and roll back
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
