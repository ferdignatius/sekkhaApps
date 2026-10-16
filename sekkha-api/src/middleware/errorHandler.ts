import type { ErrorRequestHandler } from "express"
import { ZodError } from "zod"

// F-20 Remediation: Strict environment check. Never leak raw database/internal error traces outside development
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const isDev = process.env.NODE_ENV === "development"
  console.error("❌ [API Error]:", err.message || err)

  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(", ")
    res.status(400).json({
      error: message || "Data yang dikirim tidak valid",
      code: "VALIDATION_ERROR",
      ...(isDev ? { details: err.issues } : {}),
    })
    return
  }

  const status = typeof err.status === "number" ? err.status : 500
  // In staging/production, 500 errors always return safe generic error message
  const message = status < 500 || isDev ? (err.message ?? "Terjadi kesalahan internal pada server") : "Terjadi kesalahan internal pada server"

  res.status(status).json({
    error: message,
    code: err.code || (status === 500 ? "INTERNAL_SERVER_ERROR" : "BAD_REQUEST"),
  })
}
