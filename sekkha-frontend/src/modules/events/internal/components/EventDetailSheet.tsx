import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  CalendarIcon,
  MapPinIcon,
  UsersIcon,
  ClipboardListIcon,
  GiftIcon,
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

interface EventDetailSheetProps {
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

function formatFullDate(iso: string) {
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

  const dayName = days[d.getDay()]
  const dateStr = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
  const hours = String(d.getHours()).padStart(2, "0")
  const mins = String(d.getMinutes()).padStart(2, "0")
  const timeStr = `${hours}:${mins}`

  return { dayName, dateStr, timeStr }
}

export function EventDetailSheet({
  event,
  role,
  onEdit,
  onDelete,
  onDuplicate,
  onStatusChange,
  attendances = [],
  onRecordAttendance: _onRecordAttendance,
  onDeleteAttendance,
}: EventDetailSheetProps) {
  const navigate = useNavigate()
  const isPengurus = role === "pengurus" || role === "admin"
  const [warningModalOpen, setWarningModalOpen] = useState(false)

  // Status lifecycle
  const currentStatus: EventStatus = event.status ?? "published"
  const isActive = currentStatus === "active"
  const isClosed = currentStatus === "closed" || currentStatus === "done"
  const canEdit = isPengurus && !isActive && !isClosed

  const { dayName, dateStr, timeStr } = formatFullDate(event.event_date)
  const tag = event.tag ?? event.event_type ?? "rutin"
  const colorInfo = getCategoryColor(tag)

  // Handle Activation Trigger
  function handleActivateClick() {
    const eventTime = new Date(event.event_date).getTime()
    const nowTime = Date.now()

    // Condition 1: Check if current time >= start date/time
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

  return (
    <div className="space-y-4 text-left font-sans">
      {/* ── 1. Header Banner (Frosted Glass Card) ── */}
      <div className="relative space-y-4 rounded-[22px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-4 shadow-xs ring-1 ring-black/[0.03] backdrop-blur-md sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0 flex-1 space-y-2.5">
            {/* Tag Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.06] px-2.5 py-0.5 text-xs font-semibold capitalize shadow-2xs backdrop-blur-md"
                style={colorInfo.bgStyle}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={colorInfo.dotStyle}
                />
                {colorInfo.name}
              </span>

              {/* Status Badge */}
              {isActive && (
                <Badge
                  variant="emerald"
                  glass
                  className="animate-pulse font-semibold"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Active Session
                </Badge>
              )}

              {isClosed && (
                <Badge
                  variant="secondary"
                  glass
                  className="font-semibold text-[#6a6a6a]"
                >
                  <LockIcon className="size-3 text-[#6a6a6a]" />
                  Completed (Read-Only)
                </Badge>
              )}
            </div>

            {/* Title */}
            <h2
              id="event-detail-title"
              className="text-base leading-snug font-bold tracking-tight text-[#0a0a0a] sm:text-2xl"
            >
              {event.title}
            </h2>
          </div>

          {/* Pengurus Lifecycle Action Button */}
          {isPengurus && (
            <div className="w-full shrink-0 sm:w-auto">
              {!isActive && !isClosed && (
                <button
                  type="button"
                  onClick={handleActivateClick}
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-[0.98] sm:w-auto sm:text-sm"
                  title="Activate attendance for this event"
                >
                  <PlayIcon className="size-3.5 fill-white" />
                  <span>Activate Event</span>
                </button>
              )}

              {isActive && (
                <button
                  type="button"
                  onClick={() => executeStatusChange("closed")}
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#d97706] px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#b45309] active:scale-[0.98] sm:w-auto sm:text-sm"
                  title="Close & complete this event"
                >
                  <LockIcon className="size-3.5" />
                  <span>Complete & Close Event</span>
                </button>
              )}

              {isClosed && (
                <div className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-[#ded6c2] bg-[#faf5e8] px-4 py-2 text-xs font-semibold text-[#6a6a6a] shadow-2xs backdrop-blur-md sm:w-auto">
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                  <span>Event Completed</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top Management Toolbar (Edit, Duplicate, Delete) */}
        {isPengurus && (
          <div className="grid grid-cols-3 gap-2 border-t border-black/[0.06] pt-3">
            {/* Edit Button — Disabled if active or closed */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && onEdit?.(event)}
              className={`flex min-h-[40px] items-center justify-center gap-1.5 rounded-[14px] border px-2 py-2 text-xs font-semibold shadow-2xs backdrop-blur-md transition-all ${
                canEdit
                  ? "cursor-pointer border-[#ded6c2] bg-[#faf5e8] text-[#0a0a0a] hover:bg-[#f5efe0] active:scale-[0.98]"
                  : "cursor-not-allowed border-black/[0.04] bg-black/[0.02] text-[#9a9a9a]"
              }`}
              title={
                canEdit
                  ? "Edit Event"
                  : "Active or completed events cannot be edited"
              }
            >
              <PencilIcon
                className={`size-3.5 shrink-0 ${canEdit ? "text-[#0a0a0a]" : "text-[#9a9a9a]"}`}
              />
              <span className="truncate">
                Edit {isActive ? "(Locked)" : isClosed ? "(Closed)" : ""}
              </span>
            </button>

            {/* Duplicate Button */}
            <button
              type="button"
              onClick={() => onDuplicate?.(event)}
              className="flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-[14px] border border-[#ded6c2] bg-[#faf5e8] px-2 py-2 text-xs font-semibold text-[#0a0a0a] shadow-2xs backdrop-blur-md transition-all hover:bg-[#f5efe0] active:scale-[0.98]"
              title="Duplicate Event"
            >
              <CopyIcon className="size-3.5 shrink-0 text-[#e8b94a]" />
              <span className="truncate">Duplicate</span>
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => onDelete?.(event)}
              className="flex min-h-[40px] cursor-pointer items-center justify-center gap-1.5 rounded-[14px] border border-rose-200/80 bg-rose-50/80 px-2 py-2 text-xs font-semibold text-rose-700 shadow-2xs backdrop-blur-md transition-all hover:bg-rose-100 active:scale-[0.98]"
              title="Delete Event"
            >
              <Trash2Icon className="size-3.5 shrink-0 text-rose-600" />
              <span className="truncate">Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 2. Informative Cards Grid (Apple HIG Frosted Glass Tiles) ── */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <div className="flex items-start gap-3 rounded-[18px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-3.5 shadow-2xs ring-1 ring-black/[0.03] backdrop-blur-md sm:p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[#1a3a3a]/10 text-[#1a3a3a] shadow-2xs">
            <CalendarIcon className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-wider text-[#8a8678] uppercase sm:text-[11px]">
              Date & Time
            </p>
            <p className="mt-0.5 text-xs font-bold text-[#0a0a0a] sm:text-sm">
              {dayName}, {dateStr}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-[#1a3a3a]">
              <ClockIcon className="size-3" />
              <span>{timeStr}</span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-[18px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-3.5 shadow-2xs ring-1 ring-black/[0.03] backdrop-blur-md sm:p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-rose-100 text-rose-700 shadow-2xs">
            <MapPinIcon className="size-4.5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-wider text-[#8a8678] uppercase sm:text-[11px]">
              Location
            </p>
            <p className="mt-0.5 truncate text-xs font-bold text-[#0a0a0a] sm:text-sm">
              {event.location}
            </p>
            <p className="mt-0.5 text-xs font-medium text-[#7a776a]">
              Vihara Sekkha
            </p>
          </div>
        </div>

        {/* Card 3: Total Attended */}
        <div className="flex items-start gap-3 rounded-[18px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-3.5 shadow-2xs ring-1 ring-black/[0.03] backdrop-blur-md sm:col-span-1 sm:p-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-[#e8b94a]/20 text-[#0a0a0a] shadow-2xs">
            <UsersIcon className="size-4.5 text-[#0a0a0a]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold tracking-wider text-[#8a8678] uppercase sm:text-[11px]">
              Total Attendance
            </p>
            <p className="mt-0.5 text-xs font-bold text-[#0a0a0a] sm:text-sm">
              {attendances.length} Attendees
            </p>
            <p className="mt-0.5 text-xs font-medium text-emerald-600">
              Recorded
            </p>
          </div>
        </div>
      </div>

      {/* ── 3. Event Description ── */}
      {event.description && (
        <div className="space-y-2 rounded-[20px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-4 shadow-2xs ring-1 ring-black/[0.03] backdrop-blur-md sm:p-5">
          <h4 className="flex items-center gap-2 text-xs font-bold text-[#0a0a0a] sm:text-sm">
            <SparklesIcon className="size-4 text-[#e8b94a]" />
            <span>Event Description</span>
          </h4>
          <p className="text-xs leading-relaxed text-[#3a3a3a] sm:text-sm">
            {event.description}
          </p>
        </div>
      )}

      {/* ── 4. Guidelines & Attendee Notes ── */}
      <div className="space-y-3 rounded-[20px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-4 shadow-2xs ring-1 ring-black/[0.03] backdrop-blur-md sm:p-5">
        <div>
          <h4 className="mb-2.5 flex items-center gap-2 text-xs font-bold text-[#0a0a0a] sm:text-sm">
            <GiftIcon className="size-4 text-[#1a3a3a]" />
            <span>Attendee Guidelines & Notes</span>
          </h4>
          <ul className="space-y-2.5 text-xs text-[#3a3a3a] sm:text-sm">
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#0a0a0a]" />
              <span>
                Dress politely and respectfully (white / neat casual preferred).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#0a0a0a]" />
              <span>
                Present your Member QR Code to the Event Organizer for check-in.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[#0a0a0a]" />
              <span>
                Check in on time to earn <strong>+50 Activity Points</strong>.
              </span>
            </li>
          </ul>
        </div>

        <div className="border-t border-black/[0.06] pt-2.5">
          <p className="text-xs font-medium text-[#7a776a]">
            ℹ️ Need assistance? Contact the Sekkha community organizers.
          </p>
        </div>
      </div>

      {/* ── 5. Attendance & Participants ── */}
      <div className="space-y-3.5 rounded-[20px] border border-[#e6decb]/80 bg-[#fffaf0]/90 p-4 shadow-2xs ring-1 ring-black/[0.03] backdrop-blur-md sm:p-5">
        <div className="flex items-center justify-between">
          <h4 className="flex items-center gap-2 text-xs font-bold text-[#0a0a0a] sm:text-sm">
            <ClipboardListIcon className="size-4.5 text-[#1a3a3a]" />
            <span>Event Attendance</span>
          </h4>
        </div>

        {/* Condition Check for Adding Attendance */}
        {isPengurus && (
          <div>
            {!isActive && !isClosed && (
              <div className="flex items-center gap-2.5 rounded-[16px] border border-amber-200/80 bg-amber-50/80 p-3.5 text-xs text-amber-900 shadow-2xs backdrop-blur-md">
                <AlertTriangleIcon className="size-4 shrink-0 text-amber-600" />
                <span>
                  Click <strong>"Activate Event"</strong> above first to open
                  attendance check-in.
                </span>
              </div>
            )}

            {isClosed && (
              <div className="flex items-center gap-2.5 rounded-[16px] border border-[#ded6c2] bg-[#faf5e8] p-3.5 text-xs text-[#6a6a6a] shadow-2xs backdrop-blur-md">
                <LockIcon className="size-4 shrink-0 text-[#6a6a6a]" />
                <span>Attendance for this event is closed (Read-Only).</span>
              </div>
            )}

            {isActive && (
              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/events/scan",
                    search: { eventId: event.id },
                  })
                }
                className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-[#0a0a0a] py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-[#1f1f1f] active:scale-[0.99] sm:text-sm"
              >
                <CameraIcon className="size-4" /> 📷 Open Attendance Scanner
                (QRIS)
              </button>
            )}
          </div>
        )}

        {!isPengurus && isActive && (
          <button
            type="button"
            onClick={() =>
              navigate({ to: "/events/scan", search: { eventId: event.id } })
            }
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-[0.99] sm:text-sm"
          >
            <CameraIcon className="size-4" /> 📷 Self-Check-in via QR
          </button>
        )}

        {/* Attendance Table */}
        <AttendanceListSheet
          records={attendances}
          role={role}
          isClosed={isClosed}
          onDeleteRecord={onDeleteAttendance}
        />
      </div>

      {/* ── Warning Modal Alert (When Activating Before Event Date) ── */}
      {warningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md animate-in space-y-4 rounded-[26px] border border-[#ded5c0] bg-[#faf5e8]/95 p-5 text-left font-sans shadow-[0_20px_60px_rgba(0,0,0,0.18)] ring-1 ring-black/[0.05] backdrop-blur-2xl zoom-in-95 fade-in sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[16px] bg-amber-100 text-amber-700 shadow-2xs">
                <AlertTriangleIcon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0a0a0a] sm:text-base">
                  Early Activation Warning
                </h3>
                <p className="text-xs text-[#7a776a]">
                  Event schedule has not arrived yet
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-[#3a3a3a] sm:text-sm">
              The scheduled time for this event is{" "}
              <strong>
                {dayName}, {dateStr} ({timeStr})
              </strong>
              . Current time is before the scheduled date.
              <br />
              <br />
              Are you sure you want to{" "}
              <strong>Activate Attendance Check-In</strong> now?
            </p>

            <div className="flex items-center justify-end gap-2 border-t border-black/[0.06] pt-3">
              <button
                type="button"
                onClick={() => setWarningModalOpen(false)}
                className="min-h-[40px] cursor-pointer rounded-full border border-[#ded6c2] bg-[#faf5e8] px-4 py-2 text-xs font-semibold text-[#6a6a6a] shadow-2xs backdrop-blur-md transition-all hover:bg-[#f5efe0]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeStatusChange("active")}
                className="min-h-[40px] cursor-pointer rounded-full bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-[0.98]"
              >
                Yes, Activate Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
