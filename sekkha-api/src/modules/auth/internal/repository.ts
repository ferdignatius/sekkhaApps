import { prisma } from "../../../lib/prisma"
import type { RegisterInput } from "./validation"

// ─── Repository ──────────────────────────────────────────────────────────────
// Pure database operations — no business logic here.

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } })
}

export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, role: true },
  })
}

export async function createUser(data: { email: string; name: string; password: string }) {
  const now = new Date()
  const yy = now.getFullYear().toString().slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const prefix = `${yy}${mm}${dd}`

  const count = await prisma.user.count({
    where: { userNumber: { startsWith: prefix } },
  })
  const userNumber = `${prefix}${String(count + 1).padStart(2, "0")}`

  return prisma.user.create({
    data: {
      email: data.email,
      password: data.password,
      name: data.name,
      userNumber,
    },
  })
}
