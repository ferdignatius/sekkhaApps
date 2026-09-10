import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"
import { prisma } from "../lib/prisma"
import { isTokenRevoked } from "../modules/auth/internal/tokenRevocation"

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

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token not found" })
    return
  }

  const token = header.slice(7)
  const secret = process.env.JWT_SECRET
  if (!secret) {
    console.error("❌ JWT_SECRET is not configured in environment variables")
    res.status(500).json({ error: "Server security configuration is incomplete" })
    return
  }

  try {
    // 1. Check if token was revoked (logged out)
    const revoked = await isTokenRevoked(token)
    if (revoked) {
      res.status(401).json({ error: "Session has been terminated. Please log in again." })
      return
    }

    // 2. Verify JWT signature & expiration
    const payload = jwt.verify(token, secret) as {
      userId: string
      role: string
      passwordChangedAt?: number
    }

    // 3. Fetch fresh user role & status directly from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        role: true,
        passwordChangedAt: true,
      },
    })

    if (!user) {
      res.status(401).json({ error: "User not found or account deactivated" })
      return
    }

    // 4. Invalidate session if password was changed/reset after token issuance
    if (user.passwordChangedAt) {
      const dbTimeSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000)
      if (!payload.passwordChangedAt || dbTimeSeconds > payload.passwordChangedAt) {
        res.status(401).json({ error: "Password was changed. Please log in again." })
        return
      }
    }

    // 5. Attach user with FRESH role from DB (not stale JWT role)
    req.user = {
      userId: user.id,
      role: user.role,
    }

    next()
  } catch {
    res.status(401).json({ error: "Token is invalid or has expired" })
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
    res.status(403).json({ error: "Access denied" })
  }
}
