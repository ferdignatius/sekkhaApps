import { getLeaderboardSnapshot, filterAndRankLeaderboardEntries } from "./src/modules/leaderboard/services"
import { prisma } from "./src/lib/prisma"

function safeJson(obj: any) {
  return JSON.stringify(
    obj,
    (key, value) => (typeof value === "bigint" ? value.toString() : value),
    2
  )
}

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: "admin" },
  })

  // Test Semester 2 (since November is Month 11, Sem 2)
  for (const period of ["semester", "annual", "custom"] as const) {
    const snapshot = await getLeaderboardSnapshot("points", period, true)
    const { visibleEntries, myRank } = filterAndRankLeaderboardEntries(
      snapshot.entries,
      undefined,
      10,
      admin?.id
    )
    console.log(`\n=== PERIOD: ${period} (${snapshot.active_period.name}) ===`)
    console.log("DATES:", snapshot.active_period.start_date, "to", snapshot.active_period.end_date)
    console.log("MY RANK:", safeJson(myRank))
  }
}

main().catch(console.error).finally(() => process.exit(0))
