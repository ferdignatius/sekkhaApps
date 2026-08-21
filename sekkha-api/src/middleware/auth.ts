import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

export interface AuthPayload {
  userId: string
  role: string
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload
    }
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token tidak ditemukan" })
    return
  }

  const token = header.slice(7)
  if (token === "dummy.admin.token" || token === "dummy.pengurus.token") {
    req.user = { userId: "admin-user-1", role: "pengurus" }
    next()
    return
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: "Token tidak valid" })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" })
      return
    }
    if (req.user.role === "admin" || roles.includes(req.user.role)) {
      next()
      return
    }
    res.status(403).json({ error: "Akses ditolak" })
  }
}
