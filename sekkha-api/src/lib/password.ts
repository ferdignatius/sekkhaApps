import bcrypt from "bcryptjs"

export const DEFAULT_BCRYPT_COST = 10

/**
 * Hash a plain text password using native Bun.password when available,
 * with fallback to pure JavaScript bcryptjs.
 */
export async function hashPassword(password: string, cost: number = DEFAULT_BCRYPT_COST): Promise<string> {
  if (typeof Bun !== "undefined" && Bun.password?.hash) {
    return Bun.password.hash(password, { algorithm: "bcrypt", cost })
  }
  return bcrypt.hash(password, cost)
}

/**
 * Verify a plain text password against a bcrypt hash.
 * Native Bun.password.verify is used if available (offloaded to native threadpool),
 * falling back to bcryptjs.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false
  try {
    if (typeof Bun !== "undefined" && Bun.password?.verify) {
      const ok = await Bun.password.verify(password, hash)
      if (ok) return true
    }
  } catch {
    // Ignore native error and fall through to bcryptjs compare
  }
  try {
    return await bcrypt.compare(password, hash)
  } catch {
    return false
  }
}

