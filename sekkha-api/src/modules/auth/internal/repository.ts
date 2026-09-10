import { prisma } from "../../../lib/prisma"

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
  const now = new Date()
  const yy = now.getFullYear().toString().slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, "0")
  const dd = String(now.getDate()).padStart(2, "0")
  const prefix = `${yy}${mm}${dd}`

  const count = await prisma.user.count({
    where: { userNumber: { startsWith: prefix } },
  })
  const userNumber = `${prefix}${String(count + 1).padStart(2, "0")}`

  const username = data.username || (await generateUniqueUsername(data.name))

  const level1 = await prisma.level.findFirst({ where: { level: 1 } })

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
