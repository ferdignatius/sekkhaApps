// lib/auditLogger — Durable structured audit log for security-sensitive operations
// F-19 Remediation: Attributable security audit trail

export interface AuditLogEntry {
  actorId: string
  actorRole?: string
  action:
    | "AUTH_LOGIN_SUCCESS"
    | "AUTH_LOGIN_FAILED"
    | "AUTH_LOGOUT"
    | "AUTH_PASSWORD_RESET"
    | "AUTH_PASSWORD_CHANGED"
    | "USER_PASSWORD_RESET"
    | "USER_ROLE_CHANGED"
    | "USER_CLAIM_PIN_GENERATED"
    | "USER_ACCOUNT_LINKED"
    | "USER_DELETED"
    | "ATTENDANCE_RECORDED"
    | "ATTENDANCE_DELETED"
    | "EVENT_CREATED"
    | "EVENT_UPDATED"
    | "EVENT_STATUS_CHANGED"
    | "EVENT_DELETED"
    | "PEOPLE_CREATED"
    | "TEMPORARY_PASSWORD_RESET"
    | "SYSTEM_SECURITY_ALERT"
  targetId?: string | null
  status: "SUCCESS" | "FAILURE"
  ip?: string | null
  details?: Record<string, unknown>
}

export const auditLogger = {
  log(entry: AuditLogEntry): void {
    const details = entry.details ? { ...entry.details } : undefined
    if (details && "identifier" in details) {
      details.identifier = typeof details.identifier === "string"
        ? `${details.identifier.slice(0, 2)}***`
        : "[redacted]"
    }
    const logRecord = {
      timestamp: new Date().toISOString(),
      type: "SECURITY_AUDIT",
      ...entry,
      ...(details ? { details } : {}),
    }
    // Output single-line structured JSON for log aggregators (ELK, CloudWatch, Datadog)
    console.info(`🛡️ [AUDIT] ${JSON.stringify(logRecord)}`)
  },
}
