import type { PrismaClient } from "@prisma/client"
import { prisma as defaultPrisma } from "./prisma"

/**
 * Generates a concurrency-safe unique userNumber in the format YYMMDD##.
 * Inspects the highest existing sequence number for today's prefix,
 * preventing race-condition collisions during concurrent user registrations.
 */
export async function generateUniqueUserNumber(
  client: PrismaClient | any = defaultPrisma,
  date: Date = new Date()
): Promise<string> {
  const yy = date.getFullYear().toString().slice(2)
  const mm = String(date.getMonth() + 1).padStart(2, "0")
  const dd = String(date.getDate()).padStart(2, "0")
  const prefix = `${yy}${mm}${dd}`

  // Find the record with the highest userNumber matching today's prefix
  const highest = await client.user.findFirst({
    where: { userNumber: { startsWith: prefix } },
    orderBy: { userNumber: "desc" },
    select: { userNumber: true },
  })

  let nextSeq = 1
  if (highest?.userNumber && highest.userNumber.length > prefix.length) {
    const rawSeq = parseInt(highest.userNumber.slice(prefix.length), 10)
    if (!isNaN(rawSeq)) {
      nextSeq = rawSeq + 1
    }
  }

  const paddedSeq = String(nextSeq).padStart(2, "0")
  return `${prefix}${paddedSeq}`
}
