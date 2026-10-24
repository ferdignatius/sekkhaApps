import { prisma } from "../../lib/prisma"
import { generateUniqueUserNumber } from "../../lib/userNumber"
import { encrypt, decrypt, generateBlindIndex } from "../../lib/crypto"

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
      email: decrypt(user.email) || user.email,
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
      email: decrypt(user.email) || user.email,
      name: user.profile?.name ?? "",
    }
  },

  async findUserByIdentifier(identifier: string) {
    const clean = identifier.trim().toLowerCase()
    const bindex = generateBlindIndex(clean)
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(bindex ? [{ emailBindex: bindex, emailVerifiedAt: { not: null } }] : []),
          { username: clean },
        ],
      },
      include: { profile: { select: { name: true } }, stats: true },
    })
    if (!user) return null
    return {
      ...user,
      email: decrypt(user.email) || user.email,
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
      email: decrypt(user.email) || user.email,
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
  },

  async createUser(data: {
    email: string
    name: string
    password?: string
    username?: string
  }) {
    const username = data.username || (await this.generateUniqueUsername(data.name))
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
        if (err.code === "P2002" && err.meta?.target?.includes("user_number") && attempts < 5) {
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
