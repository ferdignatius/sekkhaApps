import type { ErrorRequestHandler } from "express"
import { ZodError } from "zod"

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const isDev = process.env.NODE_ENV !== "production"
  console.error("❌ [API Error]:", err.message || err)

  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(", ")
    res.status(400).json({ error: message || "Data yang dikirim tidak valid", details: err.issues })
    return
  }

  const status = typeof err.status === "number" ? err.status : 500
  // In production, do not leak raw database/internal exceptions on 500 errors
  const message = status < 500 || isDev ? (err.message ?? "Terjadi kesalahan pada server") : "Terjadi kesalahan internal pada server"

  res.status(status).json({ error: message })
}

