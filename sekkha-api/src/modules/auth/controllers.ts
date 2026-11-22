import type { Request, Response, NextFunction } from "express"
import {
  LoginSchema,
  ForgotPasswordSchema,
  RequestRegisterOtpSchema,
  VerifyRegisterOtpSchema,
  ResendOtpSchema,
  ForgotPasswordRequestSchema,
  ForgotPasswordVerifyOtpSchema,
  ResetPasswordSchema,
} from "./internal/validation"
import * as service from "./services"
import { apiSuccess, apiFailure } from "../../lib/apiResponse"
import { AppError } from "../../lib/AppError"

function publicAuthResult(result: service.AuthResult) {
  const { refreshToken: _refreshToken, ...publicResult } = result
  return publicResult
}

// ─── Handlers ────────────────────────────────────────────────────────────────
// Thin request handlers. Parse input → delegate to service → send response.

function getRefreshCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production"
  const rawSameSite = process.env.COOKIE_SAME_SITE?.trim().toLowerCase()
  const sameSite: "lax" | "strict" | "none" =
    rawSameSite === "none" || rawSameSite === "strict" || rawSameSite === "lax"
      ? rawSameSite
      : "lax"
  const secureEnv = process.env.COOKIE_SECURE?.trim().toLowerCase()
  const secure =
    secureEnv === "true"
      ? true
      : secureEnv === "false"
        ? false
        : sameSite === "none" || isProduction
  const rawDomain = process.env.COOKIE_DOMAIN?.trim()
  return {
    httpOnly: true,
    secure,
    sameSite,
    path: "/api/auth",
    ...(rawDomain ? { domain: rawDomain } : {}),
  }
}

function setRefreshCookie(res: Response, refreshToken?: string) {
  if (!refreshToken) return
  res.cookie("sekkha_refresh_token", refreshToken, {
    ...getRefreshCookieOptions(),
    maxAge: service.getRefreshTokenTtlSeconds() * 1000,
  })
}

function clearRefreshCookie(res: Response) {
  res.clearCookie("sekkha_refresh_token", getRefreshCookieOptions())
}

/** POST /api/auth/register-request (Step 1: sends 6-digit OTP to user email) */
export async function handleRegisterRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const body = RequestRegisterOtpSchema.parse(req.body)
    const result = await service.requestRegisterOtp(body)
    apiSuccess(res, 200, "Registration OTP sent", { expires_in_seconds: 600 })
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/register-verify-otp (Step 2: verifies OTP and creates account) */
export async function handleRegisterVerifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = VerifyRegisterOtpSchema.parse(req.body)
    const result = await service.verifyRegisterOtp(body)
    setRefreshCookie(res, result.refreshToken)
    apiSuccess(res, 201, "Registration successful", publicAuthResult(result))
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/resend-otp (Resends fresh OTP) */
export async function handleResendOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ResendOtpSchema.parse(req.body)
    const result = await service.resendRegisterOtp(body)
    apiSuccess(res, 200, "Registration OTP resent", { expires_in_seconds: 600 })
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/register (Disabled: direct registration without OTP violates email verification) */
export async function handleRegister(_req: Request, _res: Response, next: NextFunction) {
  next(
    new AppError(
      "Direct registration without email OTP verification is disabled. Please use /api/auth/register-request.",
      403,
      "OTP_VERIFICATION_REQUIRED"
    )
  )
}

/** POST /api/auth/login */
export async function handleLogin(req: Request, res: Response, next: NextFunction) {
  try {
    const body = LoginSchema.parse(req.body)
    const result = await service.loginUser(body)
    setRefreshCookie(res, result.refreshToken)
    apiSuccess(res, 200, "Login successful", publicAuthResult(result))
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/refresh (Refreshes session via refresh token rotation) */
export async function handleRefreshSession(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?.sekkha_refresh_token

    if (!refreshToken) {
      apiFailure(res, 401, "Refresh token not found", { error_code: "INVALID_REFRESH_TOKEN" })
      return
    }

    const result = await service.refreshSession(refreshToken)
    setRefreshCookie(res, result.refreshToken)
    apiSuccess(res, 200, "Session refreshed", publicAuthResult(result))
  } catch (err) {
    if (err instanceof AppError) {
      if (err.code === "REFRESH_CONCURRENT" || err.status === 409) {
        // Never clear the browser's refresh cookie on concurrent contention: Tab 1's fresh cookie must survive.
        apiFailure(res, 409, err.message, { error_code: "REFRESH_CONCURRENT" })
        return
      }
      if (err.status === 401 || err.status === 403) {
        clearRefreshCookie(res)
        apiFailure(res, err.status, err.message, { error_code: err.code })
        return
      }
    }
    next(err)
  }
}

/** POST /api/auth/forgot-password/request (Step 1: sends 6-digit OTP to user email) */
export async function handleForgotPasswordRequest(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ForgotPasswordRequestSchema.parse(req.body)
    const result = await service.forgotPasswordRequest(body)
    apiSuccess(res, 200, "Password reset OTP sent", result)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/forgot-password/verify-otp (Step 2: verifies 6-digit OTP) */
export async function handleForgotPasswordVerifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ForgotPasswordVerifyOtpSchema.parse(req.body)
    const result = await service.forgotPasswordVerifyOtp(body)
    apiSuccess(res, 200, "Password reset OTP verified", result)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/forgot-password/reset (Step 3: resets password with new password) */
export async function handleResetPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ResetPasswordSchema.parse(req.body)
    const result = await service.resetPassword(body)
    apiSuccess(res, 200, "Password reset successfully", result)
  } catch (err) {
    next(err)
  }
}

/** POST /api/auth/forgot-password (Legacy fallback) */
export async function handleForgotPassword(req: Request, res: Response, next: NextFunction) {
  try {
    const body = ForgotPasswordSchema.parse(req.body)
    const result = await service.forgotPassword(body)
    apiSuccess(res, 200, "Password recovery request processed", result)
  } catch (err) {
    next(err)
  }
}

/** GET /api/auth/verify */
export async function handleVerify(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith("Bearer ")) {
    apiFailure(res, 401, "Token not found", null)
    return
  }

  try {
    const token = header.slice(7)
    const user = await service.verifyToken(token)
    apiSuccess(res, 200, "Token valid", user)
  } catch (err: any) {
    if (
      (err instanceof AppError && err.status === 401) ||
      err?.name === "JsonWebTokenError" ||
      err?.name === "TokenExpiredError" ||
      err?.name === "NotBeforeError"
    ) {
      apiFailure(res, 401, "Invalid token", null)
      return
    }
    next(err)
  }
}

/** POST /api/auth/logout */
export async function handleLogout(req: Request, res: Response, next: NextFunction) {
  // Always clear browser refresh cookie even if Redis revocation fails downstream.
  clearRefreshCookie(res)

  try {
    const header = req.headers.authorization
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined
    const refreshToken = req.cookies?.sekkha_refresh_token

    if (token || refreshToken) {
      await service.logoutUser(token, req.user?.userId, refreshToken)
    }
    apiSuccess(res, 200, "Logout successful", null)
  } catch (err) {
    next(err)
  }
}
