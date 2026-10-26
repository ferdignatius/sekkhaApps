import { PrismaClient, Role } from "@prisma/client"
import dotenv from "dotenv"
import { encrypt, generateBlindIndex } from "../src/lib/crypto"
import { hashPassword, DEFAULT_BCRYPT_COST } from "../src/lib/password"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROD_SEED !== "true" && process.env.ALLOW_SEED !== "true") {
    console.error("❌ CRITICAL: Seeding database is strictly prohibited in production environment!")
    console.error("💡 If you are intentionally initializing a fresh production database, pass ALLOW_PROD_SEED=true:")
    console.error("   ALLOW_PROD_SEED=true bun prisma/seed.ts")
    process.exit(1)
  }

  console.log("🌱 Seeding 3NF database...")

  // Clean existing tables in reverse dependency order
  await prisma.pointTransaction.deleteMany().catch(() => { })
  await prisma.attendance.deleteMany().catch(() => { })
  await prisma.badgeActivity.deleteMany().catch(() => { })
  await prisma.event.deleteMany().catch(() => { })
  await prisma.userStats.deleteMany().catch(() => { })
  await prisma.userProfile.deleteMany().catch(() => { })
  await prisma.user.deleteMany().catch(() => { })
  await prisma.pointRule.deleteMany().catch(() => { })
  await prisma.season.deleteMany().catch(() => { })
  await prisma.eventType.deleteMany().catch(() => { })
  await prisma.school.deleteMany().catch(() => { })

  // ── 1. Master Data: Schools ─────────────────────────────────────────────────
  console.log("🏫 Seeding Master Schools...")
  const initialSchools = [
    { name: "SMP Strada Bakti Mulia", type: "SMP" },
    { name: "Universitas Bina Nusantara (BINUS)", type: "Universitas" },
    { name: "SMP Negeri 1", type: "SMP" },
    { name: "SMK Bina Mandiri", type: "SMA/SMK" },
    { name: "Universitas Buddhi Dharma", type: "Universitas" },
    { name: "Universitas Multimedia Nusantara (UMN)", type: "Universitas" },
  ]

  const seededSchools: Record<string, any> = {}
  for (const s of initialSchools) {
    const record = await prisma.school.upsert({
      where: { name: s.name },
      update: { type: s.type, status: "active", isActive: true },
      create: { name: s.name, type: s.type, status: "active", isActive: true },
    })
    seededSchools[s.name] = record
  }

  const schoolBaktiMulia = seededSchools["SMP Strada Bakti Mulia"]
  const schoolBINUS = seededSchools["Universitas Bina Nusantara (BINUS)"]
  const schoolSMPN1 = seededSchools["SMP Negeri 1"]
  const schoolBinaMandiri = seededSchools["SMK Bina Mandiri"]
  const schoolBuddhi = seededSchools["Universitas Buddhi Dharma"]
  const schoolUMN = seededSchools["Universitas Multimedia Nusantara (UMN)"]

  // ── 2. Master Data: Event Types ──────────────────────────────────────────────
  console.log("🎯 Seeding Master Event Types...")
  const eventTypesData = [
    {
      code: "regular-puja",
      label: "Regular Puja",
      color: "#4262FF",
      description: "Kebaktian rutin mingguan pemuda vihara",
      defaultPointReward: 50,
      isActive: true,
    },
    {
      code: "chanting",
      label: "Chanting",
      color: "#0D9488",
      description: "Sesi pelafalan paritta dan sutra kebajikan",
      defaultPointReward: 60,
      isActive: true,
    },
    {
      code: "volunteer",
      label: "Volunteer",
      color: "#EC4899",
      description: "Kegiatan bakti sosial dan aksi kerelawanan pemuda",
      defaultPointReward: 80,
      isActive: true,
    },
  ]

  for (const et of eventTypesData) {
    await prisma.eventType.upsert({
      where: { code: et.code },
      update: {
        label: et.label,
        color: et.color,
        description: et.description,
        defaultPointReward: et.defaultPointReward,
        isActive: et.isActive,
      },
      create: et,
    })
  }

  // ── 3. Master Data: Seasons ──────────────────────────────────────────────────
  console.log("📅 Seeding Master Seasons...")
  const now = new Date()
  const year = now.getFullYear()

  // Default Standard Periods (Semester & Annual)
  await prisma.season.upsert({
    where: { code: `S${year}-SEM1` },
    update: {},
    create: {
      name: `Semester 1 · ${year}`,
      code: `S${year}-SEM1`,
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 5, 30, 23, 59, 59),
      isActive: false,
      targetAttendance: 500,
      description: `Default semester 1 evaluation period for year ${year}`,
    },
  })

  await prisma.season.upsert({
    where: { code: `S${year}-ANNUAL` },
    update: {},
    create: {
      name: `Annual · ${year}`,
      code: `S${year}-ANNUAL`,
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31, 23, 59, 59),
      isActive: false,
      targetAttendance: 1000,
      description: `Full calendar year competition period for ${year}`,
    },
  })

  // Active Custom Season: e.g. Vassa
  await prisma.season.upsert({
    where: { code: `VASSA-${year}` },
    update: { isActive: true },
    create: {
      name: `Vassa ${year}`,
      code: `VASSA-${year}`,
      startDate: new Date(year, 6, 15),
      endDate: new Date(year, 9, 15, 23, 59, 59),
      isActive: true,
      targetAttendance: 350,
      description: `Intensive Vassa retreat and community service season ${year}`,
    },
  })

  // ── 4. Master Data: Point Rules ─────────────────────────────────────────────
  console.log("📜 Seeding Master Point Rules...")
  const pointRulesData = [
    {
      code: "attendance_rutin",
      label: "Weekly Regular Puja",
      points: 50,
      category: "attendance",
      description: "Baseline points for attending standard weekly service, including communal Paritta and Chanting rituals.",
    },
    {
      code: "streak_monthly_bonus",
      label: "Monthly Attendance Consistency",
      points: 50,
      category: "streak",
      description: "Appreciation bonus for maintaining active attendance for 4 consecutive weeks in a month.",
    },
    {
      code: "first_attendance_bonus",
      label: "First Visit Welcome (Claimed Members)",
      points: 50,
      category: "general",
      description: "One-time welcome reward granted upon first verified attendance exclusively for claimed member accounts (isClaimed: true).",
    },
  ]

  for (const pr of pointRulesData) {
    await prisma.pointRule.upsert({
      where: { code: pr.code },
      update: {
        label: pr.label,
        points: pr.points,
        category: pr.category,
        description: pr.description,
      },
      create: pr,
    })
  }

  // ── 5. Master Data: Badge Activities (Service Duties) ─────────────────────
  console.log("🎖️ Seeding Master Badge Activities...")
  const initialBadgeActivities = [
    {
      code: "mc",
      label: "Master of Ceremony (MC)",
      bonusPoints: 30,
      description: "Memandu jalannya susunan acara kebaktian / seminar / gathering.",
    },
    {
      code: "puja-leader",
      label: "Puja Leader",
      bonusPoints: 30,
      description: "Memimpin pembacaan paritta, gatha, sutra, dan persembahan altar.",
    },
    {
      code: "musician",
      label: "Musician",
      bonusPoints: 30,
      description: "Mengiringi lagu Buddhis / meditasi dengan alat musik / keyboard.",
    },
  ]
  for (const ba of initialBadgeActivities) {
    await prisma.badgeActivity.upsert({
      where: { code: ba.code },
      update: { label: ba.label, bonusPoints: ba.bonusPoints, description: ba.description, isActive: true },
      create: { code: ba.code, label: ba.label, bonusPoints: ba.bonusPoints, description: ba.description, isActive: true },
    })
  }

  // ── 6. Seed Accounts (3NF: User + UserProfile + UserStats) ──────────────────
  console.log("👤 Seeding Normalized Users...")
  const umatEmail = process.env.DUMMY_UMAT_EMAIL || "umat@sekkha.com"
  const umatPasswordRaw = process.env.DUMMY_UMAT_PASSWORD || "password123"
  const aktivisEmail = process.env.DUMMY_AKTIVIS_EMAIL || "aktivis@sekkha.com"
  const aktivisPasswordRaw = process.env.DUMMY_AKTIVIS_PASSWORD || "password123"
  const pengurusEmail = process.env.DUMMY_PENGURUS_EMAIL || "pengurus@sekkha.com"
  const pengurusPasswordRaw = process.env.DUMMY_PENGURUS_PASSWORD || "password123"
  const adminEmail = process.env.DUMMY_ADMIN_EMAIL || "admin@sekkha.com"
  const adminPasswordRaw = process.env.DUMMY_ADMIN_PASSWORD || "password123"

  const hash = async (pwd: string) => hashPassword(pwd, DEFAULT_BCRYPT_COST)

  // UMAT
  await prisma.user.create({
    data: {
      email: encrypt(umatEmail),
      emailBindex: generateBlindIndex(umatEmail),
      emailVerifiedAt: new Date(),
      username: "umat",
      password: await hash(umatPasswordRaw),
      role: Role.member,
      userNumber: BigInt(26010101),
      onboardingCompleted: true,
      profile: {
        create: {
          name: "Sari Dewi (Umat)",
          phone: encrypt("081234567890"),
          schoolId: schoolBaktiMulia?.id,
          birthDate: encrypt(new Date("2008-05-15").toISOString()),
          classGrade: encrypt("11"),
        },
      },
      stats: {
        create: {
          points: 0,
          totalAttendances: 0,
          currentStreak: 0,
          lastActivityAt: null,
        },
      },
    },
  })

  // AKTIVIS
  await prisma.user.create({
    data: {
      email: encrypt(aktivisEmail),
      emailBindex: generateBlindIndex(aktivisEmail),
      emailVerifiedAt: new Date(),
      username: "aktivis",
      password: await hash(aktivisPasswordRaw),
      role: Role.activist,
      userNumber: BigInt(26010102),
      onboardingCompleted: true,
      profile: {
        create: {
          name: "Budi Santoso (Aktivis)",
          phone: encrypt("081298765432"),
          schoolId: schoolBinaMandiri?.id,
          birthDate: encrypt(new Date("2006-03-20").toISOString()),
          classGrade: encrypt("12"),
        },
      },
      stats: {
        create: {
          points: 0,
          totalAttendances: 0,
          currentStreak: 0,
          lastActivityAt: null,
        },
      },
    },
  })

  // PENGURUS
  await prisma.user.create({
    data: {
      email: encrypt(pengurusEmail),
      emailBindex: generateBlindIndex(pengurusEmail),
      emailVerifiedAt: new Date(),
      username: "pengurus",
      password: await hash(pengurusPasswordRaw),
      role: Role.organizer,
      userNumber: BigInt(26010103),
      onboardingCompleted: true,
      profile: {
        create: {
          name: "Budi Wijaya (Pengurus)",
          phone: encrypt("081311223344"),
          schoolId: schoolBuddhi?.id,
          birthDate: encrypt(new Date("2001-11-10").toISOString()),
        },
      },
      stats: {
        create: {
          points: 0,
          totalAttendances: 0,
          currentStreak: 0,
          lastActivityAt: null,
        },
      },
    },
  })

  // ADMIN
  await prisma.user.create({
    data: {
      email: encrypt(adminEmail),
      emailBindex: generateBlindIndex(adminEmail),
      emailVerifiedAt: new Date(),
      username: "admin",
      password: await hash(adminPasswordRaw),
      role: Role.admin,
      userNumber: BigInt(26010104),
      onboardingCompleted: true,
      profile: {
        create: {
          name: "Admin Sekkha",
          phone: encrypt("081199887766"),
          schoolId: schoolUMN?.id,
          birthDate: encrypt(new Date("1998-07-01").toISOString()),
        },
      },
      stats: {
        create: {
          points: 0,
          totalAttendances: 0,
          currentStreak: 0,
          lastActivityAt: null,
        },
      },
    },
  })

  console.log("✅ Database Seeded Successfully to 3NF!")
  console.log("----------------------------------------")
  console.log(`📌 [UMAT]     : ${umatEmail} / ${umatPasswordRaw}`)
  console.log(`📌 [AKTIVIS]  : ${aktivisEmail} / ${aktivisPasswordRaw}`)
  console.log(`📌 [PENGURUS] : ${pengurusEmail} / ${pengurusPasswordRaw}`)
  console.log(`📌 [ADMIN]    : ${adminEmail} / ${adminPasswordRaw}`)
  console.log("----------------------------------------")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
