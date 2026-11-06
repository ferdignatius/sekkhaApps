import { prisma } from "../../lib/prisma"
import { generateUniqueUserNumber } from "../../lib/userNumber"
import { encrypt, decrypt, generateBlindIndex } from "../../lib/crypto"

function safeDecrypt(val: string | null | undefined): string | null {
  if (!val) return null
  const decrypted = decrypt(val)
  if (!decrypted || /^[0-9a-fA-F]+:[0-9a-fA-F]+:[0-9a-fA-F]+$/.test(decrypted)) {
    return null
  }
  return decrypted
}

// ─── Models / Repository ─────────────────────────────────────────────────────
// Pure database operations — no business logic here.

export const authModels = {
  async findUserByEmail(email: string) {
    const clean = email.toLowerCase().trim()
    const bindex = generateBlindIndex(clean)
    const user = await prisma.user.findUnique({
      where: { emailBindex: bindex || undefined },
      include: { profile: true, stats: true },
    })
    if (!user) return null
    return {
      ...user,
      email: safeDecrypt(user.email),
      name: user.profile?.name ?? "",
    }
  },

  async findUserByUsername(username: string) {
    const user = await prisma.user.findUnique({
      where: { username: username.toLowerCase().trim() },
      include: { profile: true, stats: true },
    })
    if (!user) return null
    return {
      ...user,
      email: safeDecrypt(user.email),
      name: user.profile?.name ?? "",
    }
  },

  async findUserByIdentifier(identifier: string) {
    const clean = identifier.trim().toLowerCase()
    const isNumericId = /^\d{8,12}$/.test(clean)
    const bindex = generateBlindIndex(clean)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(isNumericId ? [{ userNumber: BigInt(clean) }] : []),
          ...(bindex ? [{ emailBindex: bindex, emailVerifiedAt: { not: null } }] : []),
          { username: clean },
        ],
      },
      include: { profile: { select: { name: true } }, stats: true },
    })
    if (!user) return null
    return {
      ...user,
      email: safeDecrypt(user.email),
      name: user.profile?.name ?? "",
    }
  },

  async findUserById(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        userNumber: true,
        username: true,
        email: true,
        role: true,
        passwordChangedAt: true,
        onboardingCompleted: true,
        profile: {
          select: { name: true },
        },
      },
    })
    if (!user) return null
    return {
      id: user.id,
      userNumber: user.userNumber,
      username: user.username,
      email: safeDecrypt(user.email),
      name: user.profile?.name ?? "",
      role: user.role,
      passwordChangedAt: user.passwordChangedAt,
      onboardingCompleted: user.onboardingCompleted,
    }
  },

  async generateUniqueUsername(baseName: string): Promise<string> {
    const clean =
      baseName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .slice(0, 15) || "member"

    const existingUsers = await prisma.user.findMany({
      where: {
        username: {
          startsWith: clean,
        },
      },
      select: { username: true },
    })

    if (existingUsers.length === 0) {
      return clean
    }

    const taken = new Set(existingUsers.map((u) => u.username?.toLowerCase()))
    if (!taken.has(clean)) {
      return clean
    }

    let counter = 1
    while (taken.has(`${clean}${counter}`)) {
      counter++
    }
    return `${clean}${counter}`
  },

  async createUser(data: {
    email: string
    name: string
    password?: string
    username?: string
  }) {
    let username = data.username || (await this.generateUniqueUsername(data.name))
    let attempts = 0
    while (attempts < 5) {
      attempts++
      const userNumber = await generateUniqueUserNumber(prisma)
      const cleanEmail = data.email ? data.email.toLowerCase().trim() : null
      const encryptedEmail = cleanEmail ? encrypt(cleanEmail) : null
      const emailBindex = cleanEmail ? generateBlindIndex(cleanEmail) : null

      try {
        const user = await prisma.user.create({
          data: {
            email: encryptedEmail,
            emailBindex,
            username,
            password: data.password,
            passwordChangedAt: new Date(),
            userNumber,
            isClaimed: true,
            emailVerifiedAt: new Date(),
            onboardingCompleted: false,
            profile: {
              create: {
                name: data.name,
              },
            },
            stats: {
              create: {
                points: 0,
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
          email: cleanEmail,
          name: user.profile?.name ?? data.name,
        }
      } catch (err: any) {
        const target = Array.isArray(err?.meta?.target)
          ? err.meta.target.join(",")
          : String(err?.meta?.target || "")
        if (
          err?.code === "P2002" &&
          (target.includes("user_number") || target.includes("userNumber") || target.includes("username")) &&
          attempts < 5
        ) {
          if (!data.username) {
            const candidate = await this.generateUniqueUsername(data.name)
            username = candidate === username ? `${candidate}${attempts}` : candidate
          }
          continue
        }
        throw err
      }
    }

    throw new Error("Gagal membuat akun karena kepadatan pendaftaran, silakan coba lagi.")
  },

  async updateUserPassword(userId: string, passwordHash: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        password: passwordHash,
        passwordChangedByUser: true,
        passwordChangedAt: new Date(),
      },
    })
  },
}

// Named exports for direct backward compatibility
export const findUserByEmail = authModels.findUserByEmail.bind(authModels)
export const findUserByUsername = authModels.findUserByUsername.bind(authModels)
export const findUserByIdentifier = authModels.findUserByIdentifier.bind(authModels)
export const findUserById = authModels.findUserById.bind(authModels)
export const generateUniqueUsername = authModels.generateUniqueUsername.bind(authModels)
export const createUser = authModels.createUser.bind(authModels)
export const updateUserPassword = authModels.updateUserPassword.bind(authModels)
