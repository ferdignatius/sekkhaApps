import crypto from "crypto"

// Default stable fallback keys (strictly 32 bytes) for development and test environments
const DEV_ENCRYPTION_KEY = crypto.createHash("sha256").update("sekkha_dev_aes_256_encryption_key").digest() // 32 bytes
const DEV_BLIND_INDEX_KEY = crypto.createHash("sha256").update("sekkha_dev_hmac_blind_index_key").digest() // 32 bytes

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY
  if (!envKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: ENCRYPTION_KEY environment variable is required in production!")
    }
    return DEV_ENCRYPTION_KEY
  }
  // If hex string (64 chars = 32 bytes)
  if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
    return Buffer.from(envKey, "hex")
  }
  const buf = Buffer.from(envKey, "utf-8")
  if (buf.length === 32) return buf
  return crypto.createHash("sha256").update(buf).digest()
}

function getBlindIndexKey(): Buffer {
  const envKey = process.env.BLIND_INDEX_KEY
  if (!envKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL: BLIND_INDEX_KEY environment variable is required in production!")
    }
    return DEV_BLIND_INDEX_KEY
  }
  if (envKey.length === 64 && /^[0-9a-fA-F]+$/.test(envKey)) {
    return Buffer.from(envKey, "hex")
  }
  const buf = Buffer.from(envKey, "utf-8")
  if (buf.length === 32) return buf
  return crypto.createHash("sha256").update(buf).digest()
}

/**
 * Encrypts a plaintext string using AES-256-GCM with a random 12-byte IV.
 * Format: `iv_hex:auth_tag_hex:ciphertext_hex`
 */
export function encrypt(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === "") {
    return null
  }

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12) // 96 bits for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv)

  let encrypted = cipher.update(plaintext, "utf-8", "hex")
  encrypted += cipher.final("hex")
  const authTag = cipher.getAuthTag()

  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

/**
 * Decrypts an AES-256-GCM ciphertext formatted as `iv_hex:auth_tag_hex:ciphertext_hex`.
 * If the input is not encrypted or malformed, returns the input safely (graceful fallback).
 */
export function decrypt(ciphertext: string | null | undefined): string | null {
  if (ciphertext === null || ciphertext === undefined || ciphertext === "") {
    return null
  }

  const parts = ciphertext.split(":")
  // Format must be iv(24 hex):authTag(32 hex):encryptedData
  if (parts.length !== 3 || parts[0].length !== 24 || parts[1].length !== 32) {
    // Graceful return for legacy unencrypted records
    return ciphertext
  }

  try {
    const [ivHex, authTagHex, encryptedHex] = parts
    const key = getEncryptionKey()
    const iv = Buffer.from(ivHex, "hex")
    const authTag = Buffer.from(authTagHex, "hex")

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedHex, "hex", "utf-8")
    decrypted += decipher.final("utf-8")
    return decrypted
  } catch (err) {
    // If decryption fails (e.g. tampered data or wrong key), return null or throw
    console.error("AES-256-GCM decryption failed:", err)
    return null
  }
}

/**
 * Generates an HMAC-SHA256 blind index for exact match search on encrypted columns.
 */
export function generateBlindIndex(text: string | null | undefined): string | null {
  if (text === null || text === undefined || text.trim() === "") {
    return null
  }

  const normalized = text.trim().toLowerCase()
  const key = getBlindIndexKey()
  return crypto.createHmac("sha256", key).update(normalized).digest("hex")
}
