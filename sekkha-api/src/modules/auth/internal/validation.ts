import { z } from "zod"

// ─── Validation Schemas ──────────────────────────────────────────────────────
// F-15 Remediation: Meaningful max length bounds on all fields

export const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format").max(255, "Email maximum 255 characters"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password maximum 128 characters"),
  name: z.string().trim().min(1, "Name is required").max(100, "Name maximum 100 characters"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username maximum 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, dots, or underscores")
    .optional(),
})

export const LoginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required").max(255),
  password: z.string().min(1, "Password is required").max(128, "Password maximum 128 characters"),
})

export const ForgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required").max(255),
})

export const RequestRegisterOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password maximum 128 characters"),
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name maximum 100 characters"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username maximum 30 characters")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username may only contain letters, numbers, dots, or underscores")
    .optional(),
})

export const VerifyRegisterOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format").max(255),
  otp: z.string().trim().regex(/^\d{6}$/, "OTP must be 6 digits"),
})

export const ResendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format").max(255),
})

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format").max(255),
})

export const ForgotPasswordVerifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format").max(255),
  otp: z.string().trim().length(6, "OTP must be 6 digits"),
})

export const ResetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format").max(255),
  reset_token: z.string().trim().min(10).max(200).optional(),
  otp: z.string().trim().length(6, "OTP must be 6 digits").optional(),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(128, "New password maximum 128 characters"),
}).refine((data) => Boolean(data.reset_token || data.otp), {
  message: "Reset token or OTP is required",
  path: ["reset_token"],
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>
export type RequestRegisterOtpInput = z.infer<typeof RequestRegisterOtpSchema>
export type VerifyRegisterOtpInput = z.infer<typeof VerifyRegisterOtpSchema>
export type ResendOtpInput = z.infer<typeof ResendOtpSchema>
export type ForgotPasswordRequestInput = z.infer<typeof ForgotPasswordRequestSchema>
export type ForgotPasswordVerifyOtpInput = z.infer<typeof ForgotPasswordVerifyOtpSchema>
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>
