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
import type { EventListItem, UserRole, AttendanceRecord, EventStatus } from "../types"
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
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
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
      
      {/* ── 1. Header Banner ── */}
      <div className="relative rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-2 min-w-0 flex-1">
            {/* Tag Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize border shadow-2xs"
                style={colorInfo.bgStyle}
              >
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={colorInfo.dotStyle} />
                {colorInfo.name}
              </span>

              {/* Status Badge */}
              {isActive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 animate-pulse">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                  Active Session
                </span>
              )}

              {isClosed && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#faf5e8] border border-[#e5e5e5] px-2.5 py-0.5 text-xs font-semibold text-[#6a6a6a]">
                  <LockIcon className="size-3 text-[#6a6a6a]" />
                  Completed (Read-Only)
                </span>
              )}
            </div>

            {/* Title */}
            <h2 id="event-detail-title" className="text-base sm:text-xl font-bold text-[#0a0a0a] tracking-tight leading-snug">
              {event.title}
            </h2>
          </div>

          {/* Pengurus Lifecycle Action Button */}
          {isPengurus && (
            <div className="w-full sm:w-auto shrink-0">
              {!isActive && !isClosed && (
                <button
                  type="button"
                  onClick={handleActivateClick}
                  className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-[12px] bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold transition-all shadow-xs active:scale-[0.98] cursor-pointer"
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
                  className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-[12px] bg-[#d97706] hover:bg-[#b45309] text-white px-4 py-2.5 text-xs font-bold transition-all shadow-xs active:scale-[0.98] cursor-pointer"
                  title="Close & complete this event"
                >
                  <LockIcon className="size-3.5" />
                  <span>Complete & Close Event</span>
                </button>
              )}

              {isClosed && (
                <div className="flex w-full sm:w-auto items-center justify-center gap-1.5 rounded-[12px] bg-[#faf5e8] border border-[#e5e5e5] px-3.5 py-2 text-xs font-semibold text-[#6a6a6a]">
                  <CheckCircle2Icon className="size-4 text-emerald-600" />
                  <span>Event Completed</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top Management Toolbar (Edit, Duplicate, Delete) */}
        {isPengurus && (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pt-2 border-t border-[#e5e5e5]">
            {/* Edit Button — Disabled if active or closed */}
            <button
              type="button"
              disabled={!canEdit}
              onClick={() => canEdit && onEdit?.(event)}
              className={`flex items-center justify-center gap-1.5 rounded-[10px] border py-2 px-1.5 text-xs font-semibold transition-all shadow-2xs ${
                canEdit
                  ? "border-[#e5e5e5] bg-[#fffaf0] text-[#0a0a0a] hover:bg-[#faf5e8] active:scale-[0.98] cursor-pointer"
                  : "border-[#e5e5e5] bg-[#faf5e8] text-[#9a9a9a] cursor-not-allowed"
              }`}
              title={canEdit ? "Edit Event" : "Active or completed events cannot be edited"}
            >
              <PencilIcon className={`size-3.5 shrink-0 ${canEdit ? "text-[#0a0a0a]" : "text-[#9a9a9a]"}`} />
              <span className="truncate">Edit {isActive ? "(Locked)" : isClosed ? "(Closed)" : ""}</span>
            </button>

            {/* Duplicate Button */}
            <button
              type="button"
              onClick={() => onDuplicate?.(event)}
              className="flex items-center justify-center gap-1.5 rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] py-2 px-1.5 text-xs font-semibold text-[#0a0a0a] hover:bg-[#faf5e8] transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
              title="Duplicate Event"
            >
              <CopyIcon className="size-3.5 shrink-0 text-[#e8b94a]" />
              <span className="truncate">Duplicate</span>
            </button>

            {/* Delete Button */}
            <button
              type="button"
              onClick={() => onDelete?.(event)}
              className="flex items-center justify-center gap-1.5 rounded-[10px] border border-rose-200 bg-rose-50/90 py-2 px-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-all shadow-2xs active:scale-[0.98] cursor-pointer"
              title="Delete Event"
            >
              <Trash2Icon className="size-3.5 shrink-0 text-rose-600" />
              <span className="truncate">Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* ── 2. Informative Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 shadow-xs">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#1a3a3a]/10 text-[#1a3a3a]">
            <CalendarIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a]">Date & Time</p>
            <p className="text-xs font-bold text-[#0a0a0a] mt-0.5">{dayName}, {dateStr}</p>
            <p className="flex items-center gap-1 text-xs font-semibold text-[#1a3a3a] mt-0.5">
              <ClockIcon className="size-3" />
              <span>{timeStr}</span>
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 shadow-xs">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-rose-100 text-rose-700">
            <MapPinIcon className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a]">Location</p>
            <p className="text-xs font-bold text-[#0a0a0a] mt-0.5 truncate">{event.location}</p>
            <p className="text-xs font-medium text-[#6a6a6a] mt-0.5">Vihara Sekkha</p>
          </div>
        </div>

        {/* Card 3: Total Attended */}
        <div className="flex items-start gap-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-3.5 shadow-xs sm:col-span-1">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#e8b94a]/20 text-[#0a0a0a]">
            <UsersIcon className="size-4 text-[#e8b94a]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#6a6a6a]">Total Attendance</p>
            <p className="text-xs font-bold text-[#0a0a0a] mt-0.5">
              {attendances.length} Attendees
            </p>
            <p className="text-xs font-medium text-emerald-600 mt-0.5">Recorded</p>
          </div>
        </div>
      </div>

      {/* ── 3. Event Description ── */}
      {event.description && (
        <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs space-y-1.5">
          <h4 className="text-xs font-bold text-[#0a0a0a] flex items-center gap-1.5">
            <SparklesIcon className="size-3.5 text-[#e8b94a]" />
            <span>Event Description</span>
          </h4>
          <p className="text-xs text-[#3a3a3a] leading-relaxed">
            {event.description}
          </p>
        </div>
      )}

      {/* ── 4. Guidelines & Attendee Notes ── */}
      <div className="rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs space-y-3">
        <div>
          <h4 className="text-xs font-bold text-[#0a0a0a] flex items-center gap-1.5 mb-2">
            <GiftIcon className="size-3.5 text-[#1a3a3a]" />
            <span>Attendee Guidelines & Notes</span>
          </h4>
          <ul className="space-y-2 text-xs text-[#3a3a3a]">
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a] mt-1.5 shrink-0" />
              <span>Dress politely and respectfully (white / neat casual preferred).</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a] mt-1.5 shrink-0" />
              <span>Present your Member QR Code to the Event Organizer for check-in.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0a0a0a] mt-1.5 shrink-0" />
              <span>Check in on time to earn <strong>+50 Activity Points</strong>.</span>
            </li>
          </ul>
        </div>

        <div className="pt-2 border-t border-[#e5e5e5]">
          <p className="text-xs font-medium text-[#6a6a6a]">
            ℹ️ Need assistance? Contact the Sekkha community organizers.
          </p>
        </div>
      </div>

      {/* ── 5. Attendance & Participants ── */}
      <div className="space-y-3 rounded-[16px] border border-[#e5e5e5] bg-[#fffaf0] p-4 shadow-xs">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-[#0a0a0a] flex items-center gap-1.5">
            <ClipboardListIcon className="size-4 text-[#1a3a3a]" />
            <span>Event Attendance</span>
          </h4>
        </div>

        {/* Condition Check for Adding Attendance */}
        {isPengurus && (
          <div>
            {!isActive && !isClosed && (
              <div className="rounded-[12px] border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 flex items-center gap-2 shadow-2xs">
                <AlertTriangleIcon className="size-4 text-amber-600 shrink-0" />
                <span>Click <strong>"Activate Event"</strong> above first to open attendance check-in.</span>
              </div>
            )}

            {isClosed && (
              <div className="rounded-[12px] border border-[#e5e5e5] bg-[#faf5e8] p-3 text-xs text-[#6a6a6a] flex items-center gap-2 shadow-2xs">
                <LockIcon className="size-4 text-[#6a6a6a] shrink-0" />
                <span>Attendance for this event is closed (Read-Only).</span>
              </div>
            )}

            {isActive && (
              <button
                type="button"
                onClick={() => navigate({ to: "/events/scan", search: { eventId: event.id } })}
                className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#0a0a0a] py-2.5 text-xs font-bold text-white shadow-xs hover:bg-[#1f1f1f] transition-all active:scale-[0.99] cursor-pointer"
              >
                <CameraIcon className="size-4" /> 📷 Open Attendance Scanner (QRIS)
              </button>
            )}
          </div>
        )}

        {!isPengurus && isActive && (
          <button
            type="button"
            onClick={() => navigate({ to: "/events/scan", search: { eventId: event.id } })}
            className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-emerald-600 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition-all active:scale-[0.99] cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a0a0a]/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-[24px] border border-[#e5e5e5] bg-[#fffaf0] p-5 sm:p-6 shadow-2xl space-y-4 text-left font-sans animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-amber-100 text-amber-700 shrink-0">
                <AlertTriangleIcon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#0a0a0a]">Early Activation Warning</h3>
                <p className="text-xs text-[#6a6a6a]">Event schedule has not arrived yet</p>
              </div>
            </div>

            <p className="text-xs text-[#3a3a3a] leading-relaxed">
              The scheduled time for this event is <strong>{dayName}, {dateStr} ({timeStr})</strong>. Current time is before the scheduled date.
              <br /><br />
              Are you sure you want to <strong>Activate Attendance Check-In</strong> now?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#e5e5e5]">
              <button
                type="button"
                onClick={() => setWarningModalOpen(false)}
                className="rounded-[10px] border border-[#e5e5e5] bg-[#fffaf0] px-4 py-2 text-xs font-semibold text-[#6a6a6a] hover:bg-[#faf5e8] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeStatusChange("active")}
                className="rounded-[10px] bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-xs cursor-pointer"
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
