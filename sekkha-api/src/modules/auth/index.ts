export { authModule } from "./module"
export * from "./routes"
export * from "./controllers"
export * from "./services"
export * from "./models"

// Public auth infrastructure exported for auth middleware and cross-tier testing
export {
  revokeToken,
  isTokenRevoked,
} from "./internal/tokenRevocation"

export {
  saveRefreshToken,
  verifyAndRotateRefreshToken,
  verifyAndRotateRefreshTokenRecord,
  revokeRefreshToken,
  revokeAllUserRefreshTokens,
  type RefreshTokenRecord,
} from "./internal/refreshTokenStore"

export {
  savePasswordResetToken,
  verifyAndConsumePasswordResetToken,
  timingSafeEqualOtpHash,
  hashOtp,
} from "./internal/otpStore"
