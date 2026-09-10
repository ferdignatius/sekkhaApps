import type { Request, Response, NextFunction } from "express"

// ANSI Color Codes for clean, modern terminal logging
const colors = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  gray: "\x1b[90m",
}

function getMethodColor(method: string): string {
  switch (method) {
    case "GET":
      return colors.cyan
    case "POST":
      return colors.green
    case "PUT":
    case "PATCH":
      return colors.yellow
    case "DELETE":
      return colors.red
    default:
      return colors.magenta
  }
}

function getStatusColor(status: number): string {
  if (status >= 500) return colors.red
  if (status >= 400) return colors.yellow
  if (status >= 300) return colors.cyan
  if (status >= 200) return colors.green
  return colors.reset
}

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  // Exclude noisy health checks if needed, or log with dim
  if (req.originalUrl === "/health") {
    return next()
  }

  const startTime = process.hrtime()
  const timestamp = new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  // Capture response finish
  res.on("finish", () => {
    const [seconds, nanoseconds] = process.hrtime(startTime)
    const durationMs = (seconds * 1000 + nanoseconds / 1e6).toFixed(1)

    const methodColor = getMethodColor(req.method)
    const statusColor = getStatusColor(res.statusCode)

    const userTag = (req as any).user
      ? ` ${colors.gray}[${(req as any).user.role || (req as any).user.userId}]${colors.reset}`
      : ""

    const statusBadge = `${statusColor}${colors.bold}${res.statusCode}${colors.reset}`
    const methodBadge = `${methodColor}${colors.bold}${req.method.padEnd(6)}${colors.reset}`
    const cleanPath = req.baseUrl ? `${req.baseUrl}${req.path}` : (req.originalUrl?.split("?")[0] || req.path || req.url)
    const pathText = `${colors.bold}${cleanPath}${colors.reset}`
    const timeText = `${colors.dim}${durationMs}ms${colors.reset}`

    console.log(
      `${colors.gray}[${timestamp}]${colors.reset} ${methodBadge} ${pathText} ${statusBadge} ${timeText}${userTag}`
    )
  })

  next()
}
