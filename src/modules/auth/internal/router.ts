import { Router } from "express"
import { handleRegister, handleLogin, handleVerify } from "./handler"
import { handleGoogleRedirect, handleGoogleMockCallback } from "./oauth"

// ─── Auth Router ─────────────────────────────────────────────────────────────
// Mounted at /api/auth by auth/module.ts

export const authRouter = Router()

authRouter.post("/register", handleRegister)
authRouter.post("/login", handleLogin)
authRouter.get("/verify", handleVerify)
authRouter.get("/google", handleGoogleRedirect)
authRouter.get("/google/callback-mock", handleGoogleMockCallback)
