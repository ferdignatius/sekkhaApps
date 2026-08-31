import { z } from "zod"

// ─── Validation Schemas ──────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
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

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>

