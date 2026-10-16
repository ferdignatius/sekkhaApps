import type { ErrorRequestHandler } from "express"
import { ZodError } from "zod"
import crypto from "crypto"
import { AppError } from "../lib/AppError"

// F-20 Remediation: Strict environment check. Never leak raw database/internal error traces outside development
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isDev = process.env.NODE_ENV === "development"
  const requestId = req.header("x-request-id") || crypto.randomUUID()
  console.error(JSON.stringify({ requestId, path: req.path, status: err.status || 500, error: err.code || "INTERNAL_ERROR" }))

  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(", ")
    res.status(400).json({
      error: message || "Data yang dikirim tidak valid",
      code: "VALIDATION_ERROR",
      ...(isDev ? { details: err.issues } : {}),
      requestId,
    })
    return
  }

  const status = err instanceof AppError
    ? err.status
    : typeof err.status === "number"
      ? err.status
      : err.message === "Refresh token store unavailable"
        ? 503
        : 500
  // In staging/production, 500 errors always return safe generic error message
  const message = status < 500 || isDev ? (err.message ?? "Terjadi kesalahan internal pada server") : "Terjadi kesalahan internal pada server"

  res.status(status).json({
    error: message,
    code: err instanceof AppError ? err.code : err.code || (status === 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST"),
    requestId,
  })
}
