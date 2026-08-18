import type { Request, Response, NextFunction } from "express"
import { RegisterSchema, LoginSchema } from "./validation"
import * as service from "./service"

// ─── Handlers ────────────────────────────────────────────────────────────────
// Thin request handlers. Parse input → delegate to service → send response.

/** POST /api/auth/register */
export async function handleRegister(req: Request, res: Response, next: NextFunction) {
  try {
    const body = RegisterSchema.parse(req.body)
    const result = await service.registerUser(body)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/login */
export async function handleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const body = LoginSchema.parse(req.body)
    const result = await service.loginUser(body)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/** GET /api/auth/verify */
export async function handleVerify(req: Request, res: Response) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token tidak ditemukan" })
    return
  }

  try {
    const token = header.slice(7)
    const user = await service.verifyToken(token)
    res.json({ valid: true, user })
  } catch {
    res.status(401).json({ error: "Token tidak valid" })
  }
}
