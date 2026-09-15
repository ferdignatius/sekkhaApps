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
    | "USER_ROLE_CHANGED"
    | "USER_CLAIM_PIN_GENERATED"
    | "USER_ACCOUNT_LINKED"
    | "USER_DELETED"
    | "ATTENDANCE_RECORDED"
    | "ATTENDANCE_DELETED"
    | "EVENT_CREATED"
    | "EVENT_STATUS_CHANGED"
    | "EVENT_DELETED"
    | "SYSTEM_SECURITY_ALERT"
  targetId?: string | null
  status: "SUCCESS" | "FAILURE"
  ip?: string | null
  details?: Record<string, unknown>
}

export const auditLogger = {
  log(entry: AuditLogEntry): void {
    const logRecord = {
      timestamp: new Date().toISOString(),
      type: "SECURITY_AUDIT",
      ...entry,
    }
    // Output single-line structured JSON for log aggregators (ELK, CloudWatch, Datadog)
    console.info(`🛡️ [AUDIT] ${JSON.stringify(logRecord)}`)
  },
}
