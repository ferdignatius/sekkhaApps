import type { ErrorRequestHandler } from "express"
import { ZodError } from "zod"
import crypto from "crypto"
import { AppError } from "../lib/AppError"

// F-20 Remediation: Strict environment check. Never leak raw database/internal error traces outside development
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isDev = process.env.NODE_ENV === "development"
  const requestId = req.header("x-request-id") || crypto.randomUUID()
  const resolvedStatus =
    err instanceof AppError
      ? err.status
      : typeof err.status === "number"
        ? err.status
        : typeof err.statusCode === "number"
          ? err.statusCode
          : err.message === "Refresh token store unavailable"
            ? 503
            : 500
  console.error(JSON.stringify({ requestId, path: req.path, status: resolvedStatus, error: err.code || "INTERNAL_ERROR" }))

  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(", ")
    res.status(400).json({
      status: "fail",
      code: 400,
      message: message || "Invalid request data",
      data: isDev ? { details: err.issues, requestId } : null,
    })
    return
  }

  const status = resolvedStatus
  // In staging/production, 500 errors always return safe generic error message
  const message = status < 500 || isDev ? (err.message ?? "Terjadi kesalahan internal pada server") : "Terjadi kesalahan internal pada server"

  res.status(status).json({
    status: "fail",
    code: status,
    message,
    data: isDev && status >= 500 ? { requestId } : null,
  })
}
