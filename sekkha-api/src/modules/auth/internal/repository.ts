import { prisma } from "../../../lib/prisma"
import { generateUniqueUserNumber } from "../../../lib/userNumber"


// ─── Repository ──────────────────────────────────────────────────────────────
// Pure database operations — no business logic here.

export async function findUserByEmail(email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { profile: true, stats: true },
  })
  if (!user) return null
  return {
    ...user,
    name: user.profile?.name ?? "",
  }
}

export async function findUserByUsername(username: string) {
  const user = await prisma.user.findUnique({
    where: { username: username.toLowerCase().trim() },
    include: { profile: true, stats: true },
  })
  if (!user) return null
  return {
    ...user,
    name: user.profile?.name ?? "",
  }
}

export async function findUserByIdentifier(identifier: string) {
  const clean = identifier.trim().toLowerCase()
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: clean },
        { username: clean },
      ],
    },
    include: { profile: true, stats: true },
  })
  if (!user) return null
  return {
    ...user,
    name: user.profile?.name ?? "",
  }
}

export async function findUserById(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      passwordChangedAt: true,
      profile: {
        select: { name: true },
      },
    },
  })
  if (!user) return null
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    name: user.profile?.name ?? "",
    role: user.role,
    passwordChangedAt: user.passwordChangedAt,
  }
}

export async function generateUniqueUsername(baseName: string): Promise<string> {
  const clean = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 15) || "umat"

  let username = clean
  let counter = 1

  while (true) {
    const existing = await prisma.user.findUnique({ where: { username } })
    if (!existing) {
      return username
    }
    counter++
    username = `${clean}${counter}`
  }
}

export async function createUser(data: {
  email: string
  name: string
  password?: string
  username?: string
}) {
  const username = data.username || (await generateUniqueUsername(data.name))
  const level1 = await prisma.level.findFirst({ where: { level: 1 } })

  // Concurrency-safe insertion with retry on unique constraint collision
  let attempts = 0
  while (attempts < 5) {
    attempts++
    const userNumber = await generateUniqueUserNumber(prisma)
    try {
      const user = await prisma.user.create({
        data: {
          email: data.email ? data.email.toLowerCase().trim() : null,
          username,
          password: data.password,
          passwordChangedAt: new Date(),
          userNumber,
          profile: {
            create: {
              name: data.name,
            },
          },
          stats: {
            create: {
              points: 0,
              levelId: level1?.id,
            },
          },
        },
        include: {
          profile: true,
          stats: true,
        },
      })

      return {
        ...user,
        name: user.profile?.name ?? data.name,
      }
    } catch (err: any) {
      if (err.code === "P2002" && err.meta?.target?.includes("user_number") && attempts < 5) {
        continue // Retry with newly computed next sequence
      }
      throw err
    }
  }

  throw new Error("Gagal membuat akun karena kepadatan pendaftaran, silakan coba lagi.")
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      password: passwordHash,
      passwordChangedByUser: true,
      passwordChangedAt: new Date(),
    },
  })
}
