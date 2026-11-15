import type { PrismaClient } from "@prisma/client"
import { prisma as defaultPrisma } from "./prisma"
import { AppError } from "./AppError"

/**
 * Generates a concurrency-safe unique 10-digit userNumber in the standard format YYYYMMDDnn.
 * - YYYY: 4-digit year (e.g. 2026)
 * - MM: 2-digit month (01-12)
 * - DD: 2-digit day (01-31)
 * - nn: 2-digit sequence for that date (01-99)
 */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

export async function generateUniqueUserNumber(
  client: PrismaClient | any = defaultPrisma,
  date: Date = new Date()
): Promise<bigint> {
  const wibDate = new Date(date.getTime() + WIB_OFFSET_MS)
  const yyyy = wibDate.getUTCFullYear()
  const mm = String(wibDate.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(wibDate.getUTCDate()).padStart(2, "0")
  const basePrefix = BigInt(`${yyyy}${mm}${dd}`)
  const startOfDay = basePrefix * 100n + 1n
  const endOfDay = basePrefix * 100n + 99n

  // Find the record with the highest 10-digit userNumber matching today's range (YYYYMMDD01..YYYYMMDD99)
  const highest = await client.user.findFirst({
    where: {
      userNumber: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { userNumber: "desc" },
    select: { userNumber: true },
  })

  let nextSeq = 1n
  if (highest?.userNumber && highest.userNumber >= startOfDay) {
    const currentSeq = highest.userNumber % 100n
    nextSeq = currentSeq + 1n
  }

  if (nextSeq > 99n) {
    throw new AppError(
      "Kuota pembuatan nomor anggota harian (maksimal 99/hari) telah tercapai.",
      429,
      "DAILY_USER_NUMBER_LIMIT_REACHED"
    )
  }

  return basePrefix * 100n + nextSeq
}

