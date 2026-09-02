import { prisma } from "../../../lib/prisma"

// ─── Repository ──────────────────────────────────────────────────────────────
// Pure database operations — no business logic here.

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })
}

export async function findUserByUsername(username: string) {
  return prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } })
}

export async function findUserByIdentifier(identifier: string) {
  const clean = identifier.trim().toLowerCase()
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: clean },
        { username: clean },
      ],
    },
  })
}

export async function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true, name: true, role: true },
  })
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

  return prisma.user.create({
    data: {
      email: data.email ? data.email.toLowerCase().trim() : null,
      username,
      password: data.password,
      name: data.name,
      userNumber,
    },
  })
}

export async function updateUserPassword(userId: string, passwordHash: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { password: passwordHash },
  })
}

