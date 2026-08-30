import { z } from "zod"

// ─── Validation Schemas ──────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  name: z.string().trim().min(1, "Nama wajib diisi"),
})

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
})

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
