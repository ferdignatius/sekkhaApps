import type { PrismaClient } from "@prisma/client"
import { prisma as defaultPrisma } from "./prisma"

/**
 * Generates a concurrency-safe unique userNumber as a 10-digit integer in the format YYYYMMDDnn.
 * - YYYY: 4-digit year (e.g. 2026)
 * - MM: 2-digit month (01-12)
 * - DD: 2-digit day (01-31)
 * - nn: 2-digit sequence for that date (01-99)
 * Fits safely within 32-bit signed Integer (max 2,147,483,647).
 */
export async function generateUniqueUserNumber(
  client: PrismaClient | any = defaultPrisma,
  date: Date = new Date()
): Promise<bigint> {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const basePrefix = BigInt(`${yyyy}${mm}${dd}`)
  const startOfDay = basePrefix * 100n + 1n
  const endOfDay = basePrefix * 100n + 99n

  // Find the record with the highest userNumber matching today's range
  const highest = await client.user.findFirst({
    where: {
      userNumber: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    orderBy: { userNumber: "desc" },
    select: { userNumber: true },
  })

  let nextSeq = 1n
  if (highest?.userNumber && highest.userNumber >= startOfDay) {
    const currentSeq = highest.userNumber % 100n
    nextSeq = currentSeq + 1n
  }

  return basePrefix * 100n + nextSeq
}

