import type { Request, Response, NextFunction } from "express"
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  RequestRegisterOtpSchema,
  VerifyRegisterOtpSchema,
  ResendOtpSchema,
  ForgotPasswordRequestSchema,
  ForgotPasswordVerifyOtpSchema,
  ResetPasswordSchema,
} from "./validation"
import * as service from "./service"

// ─── Handlers ────────────────────────────────────────────────────────────────
// Thin request handlers. Parse input → delegate to service → send response.

/** POST /api/auth/register-request (Sends OTP) */
export async function handleRegisterRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const body = RequestRegisterOtpSchema.parse(req.body)
    const result = await service.requestRegisterOtp(body)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/register-verify-otp (Verifies OTP and creates user) */
export async function handleRegisterVerifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = VerifyRegisterOtpSchema.parse(req.body)
    const result = await service.verifyRegisterOtp(body)
    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/resend-otp (Resends fresh OTP) */
export async function handleResendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ResendOtpSchema.parse(req.body)
    const result = await service.resendRegisterOtp(body)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/register (Direct register) */
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

/** POST /api/auth/forgot-password/request (Step 1: sends 6-digit OTP to user email) */
export async function handleForgotPasswordRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ForgotPasswordRequestSchema.parse(req.body)
    const result = await service.forgotPasswordRequest(body)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/forgot-password/verify-otp (Step 2: verifies 6-digit OTP) */
export async function handleForgotPasswordVerifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ForgotPasswordVerifyOtpSchema.parse(req.body)
    const result = await service.forgotPasswordVerifyOtp(body)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/forgot-password/reset (Step 3: resets password with new password) */
export async function handleResetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ResetPasswordSchema.parse(req.body)
    const result = await service.resetPassword(body)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/forgot-password (Legacy fallback) */
export async function handleForgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ForgotPasswordSchema.parse(req.body)
    const result = await service.forgotPassword(body)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

/** GET /api/auth/verify */
export async function handleVerify(req: Request, res: Response) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token not found" })
    return
  }

  try {
    const token = header.slice(7)
    const user = await service.verifyToken(token)
    res.json({ valid: true, user })
  } catch {
    res.status(401).json({ error: "Invalid token" })
  }
}
