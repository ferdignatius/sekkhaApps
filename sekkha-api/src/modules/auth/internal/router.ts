import { Router } from "express"
import {
  handleRegisterRequest,
  handleRegisterVerifyOtp,
  handleResendOtp,
  handleRegister,
  handleLogin,
  handleVerify,
  handleForgotPassword,
  handleForgotPasswordRequest,
  handleForgotPasswordVerifyOtp,
  handleResetPassword,
} from "./handler"

// ─── Auth Router ─────────────────────────────────────────────────────────────
// Mounted at /api/auth by auth/module.ts

export const authRouter: Router = Router()

// OTP Registration Flow
authRouter.post("/register-request", handleRegisterRequest)
authRouter.post("/register-verify-otp", handleRegisterVerifyOtp)
authRouter.post("/resend-otp", handleResendOtp)

// 3-Step Forgot Password & Reset Flow
authRouter.post("/forgot-password/request", handleForgotPasswordRequest)
authRouter.post("/forgot-password/verify-otp", handleForgotPasswordVerifyOtp)
authRouter.post("/forgot-password/reset", handleResetPassword)

// Legacy / Direct endpoints
authRouter.post("/register", handleRegister)
authRouter.post("/login", handleLogin)
authRouter.post("/forgot-password", handleForgotPassword)
authRouter.get("/verify", handleVerify)

// authRouter.get("/google", handleGoogleRedirect)
// authRouter.get("/google/callback-mock", handleGoogleMockCallback)

