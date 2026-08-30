import type { ErrorRequestHandler } from "express"
import { ZodError } from "zod"

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error("❌", err.message)

  if (err instanceof ZodError) {
    const message = err.issues.map((i) => i.message).join(", ")
    res.status(400).json({ error: message || "Data yang dikirim tidak valid", details: err.issues })
    return
  }

  const status = err.status ?? 500
  const message = err.message ?? "Internal Server Error"

  res.status(status).json({ error: message })
}
