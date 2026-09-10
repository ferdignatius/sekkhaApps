import { z } from "zod"

// ─── Validation Schemas ──────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().trim().min(1, "Name is required"),
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
  identifier: z.string().trim().min(1, "Email or username is required").optional(),
  email: z.string().trim().min(1, "Email or username is required").optional(),
  username: z.string().trim().min(1).optional(),
  password: z.string().min(1, "Password is required"),
}).refine((data) => Boolean(data.identifier || data.email || data.username), {
  message: "Email or username is required",
  path: ["email"],
})

export const ForgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1, "Email atau username wajib diisi"),
})

export const RequestRegisterOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
  name: z.string().trim().min(1).optional(),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username minimal 3 karakter")
    .max(30, "Username maksimal 30 karakter")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username hanya boleh berisi huruf, angka, titik, atau garis bawah")
    .optional(),
})

export const VerifyRegisterOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  otp: z.string().trim().min(6, "Kode OTP harus 6 digit").max(6, "Kode OTP harus 6 digit"),
})

export const ResendOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
})

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
})

export const ForgotPasswordVerifyOtpSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  otp: z.string().trim().length(6, "Kode OTP harus 6 digit"),
})

export const ResetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  otp: z.string().trim().length(6, "Kode OTP harus 6 digit"),
  newPassword: z.string().min(8, "Password baru minimal 8 karakter"),
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

