import type { Response } from "express"

// FE-10 Remediation: Lightweight Server-Sent Events (SSE) manager for live attendance feedback
export interface AttendanceScanEvent {
  eventId: string
  attendanceId: string
  userId: string
  name: string
  userNumber: string
  pointsEarned: number
  method: string
  scannedAt: string
}

const eventClients = new Map<string, Set<Response>>()

/**
 * Registers an active SSE client response for a specific eventId.
 */
export function registerSseClient(eventId: string, res: Response): () => void {
  let clients = eventClients.get(eventId)
  if (!clients) {
    clients = new Set()
    eventClients.set(eventId, clients)
  }
  clients.add(res)

  return () => {
    clients?.delete(res)
    if (clients?.size === 0) {
      eventClients.delete(eventId)
    }
  }
}

/**
 * Broadcasts an attendance scan event to all organizers connected to this event stream.
 */
export function broadcastAttendanceScan(event: AttendanceScanEvent): void {
  const clients = eventClients.get(event.eventId)
  if (!clients || clients.size === 0) return

  const payload = `data: ${JSON.stringify(event)}\n\n`
  for (const client of clients) {
    try {
      client.write(payload)
    } catch {
      clients.delete(client)
    }
  }
}
