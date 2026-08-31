import { z } from "zod"

// ─── Validation Schemas ──────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().trim().min(1, "Nama wajib diisi"),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username minimal 3 karakter")
    .max(30, "Username maksimal 30 karakter")
    .regex(/^[a-zA-Z0-9_.]+$/, "Username hanya boleh berisi huruf, angka, titik, atau underscore")
    .optional(),
})

export const LoginSchema = z.object({
  identifier: z.string().trim().min(1, "Email atau username wajib diisi").optional(),
  email: z.string().trim().min(1, "Email atau username wajib diisi").optional(),
  username: z.string().trim().min(1).optional(),
  password: z.string().min(1, "Password wajib diisi"),
}).refine((data) => Boolean(data.identifier || data.email || data.username), {
  message: "Email atau username wajib diisi",
  path: ["email"],
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>

