import type { Request, Response } from "express"
import { eventbus, DomainEvents } from "../../../core/eventbus"
import type { AttendanceRecordedPayload } from "../../../core/eventbus"
import { canUseRedisStore, redis } from "../../../lib/redis"

export interface AttendanceNotification {
  eventId: string
  eventTitle: string
  method: string
  isLate: boolean
  pointsEarned: number
  scannedAt: string
}

const LATEST_TTL_SECONDS = 60
const HEARTBEAT_INTERVAL_MS = 25_000

const sseClientsByUser = new Map<string, Set<Response>>()
const latestMemoryByUser = new Map<string, { data: AttendanceNotification; expiresAt: number }>()
let subscribedToBus = false

function latestRedisKey(userId: string): string {
  return `attendance:latest:${userId}`
}

function toNotification(payload: AttendanceRecordedPayload): AttendanceNotification {
  return {
    eventId: payload.eventId,
    eventTitle: payload.eventTitle || "Temple Gathering",
    method: payload.method || "qr",
    isLate: Boolean(payload.isLate),
    pointsEarned: Number(payload.pointsEarned ?? 0),
    scannedAt: payload.scannedAt || new Date().toISOString(),
  }
}

export async function persistLatestAttendance(payload: AttendanceRecordedPayload): Promise<void> {
  const notification = toNotification(payload)
  latestMemoryByUser.set(payload.userId, {
    data: notification,
    expiresAt: Date.now() + LATEST_TTL_SECONDS * 1000,
  })

  if (canUseRedisStore()) {
    await redis
      .set(latestRedisKey(payload.userId), JSON.stringify(notification), "EX", LATEST_TTL_SECONDS)
      .catch(() => {})
  }
}

export async function getLatestAttendanceNotification(
  userId: string
): Promise<AttendanceNotification | null> {
  if (canUseRedisStore()) {
    try {
      const raw = await redis.get(latestRedisKey(userId))
      if (raw) {
        return JSON.parse(raw) as AttendanceNotification
      }
    } catch {
      // Fall back to process memory when Redis read fails
    }
  }

  const cached = latestMemoryByUser.get(userId)
  if (!cached) return null
  if (cached.expiresAt <= Date.now()) {
    latestMemoryByUser.delete(userId)
    return null
  }
  return cached.data
}

function pushToConnectedClients(userId: string, notification: AttendanceNotification): void {
  const clients = sseClientsByUser.get(userId)
  if (!clients || clients.size === 0) return

  const frame = `event: attendance_recorded\ndata: ${JSON.stringify(notification)}\n\n`
  for (const res of clients) {
    try {
      res.write(frame)
    } catch {
      clients.delete(res)
    }
  }
}

export function ensureAttendanceStreamSubscribed(): void {
  if (subscribedToBus) return
  subscribedToBus = true

  eventbus.subscribe<AttendanceRecordedPayload>(DomainEvents.ATTENDANCE_RECORDED, (payload) => {
    if (!payload?.userId) return
    const notification = toNotification(payload)
    void persistLatestAttendance(payload)
    pushToConnectedClients(payload.userId, notification)
  })
}

/**
 * Registers an SSE stream for the authenticated user so their open QR pass
 * receives instant push notifications whenever an organizer records their attendance.
 */
export function registerAttendanceSseClient(userId: string, req: Request, res: Response): void {
  ensureAttendanceStreamSubscribed()

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8")
  res.setHeader("Cache-Control", "no-cache, no-transform")
  res.setHeader("Connection", "keep-alive")
  res.setHeader("X-Accel-Buffering", "no")
  res.flushHeaders?.()

  res.write(`: connected\n\n`)

  let set = sseClientsByUser.get(userId)
  if (!set) {
    set = new Set<Response>()
    sseClientsByUser.set(userId, set)
  }
  set.add(res)

  const heartbeat = setInterval(() => {
    try {
      res.write(`: ping\n\n`)
    } catch {
      cleanup()
    }
  }, HEARTBEAT_INTERVAL_MS)

  let cleaned = false
  function cleanup() {
    if (cleaned) return
    cleaned = true
    clearInterval(heartbeat)
    const userSet = sseClientsByUser.get(userId)
    if (userSet) {
      userSet.delete(res)
      if (userSet.size === 0) {
        sseClientsByUser.delete(userId)
      }
    }
  }

  req.on("close", cleanup)
  res.on("close", cleanup)
}
