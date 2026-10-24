import { PrismaClient, Role } from "@prisma/client"
import dotenv from "dotenv"
import { encrypt, generateBlindIndex } from "../src/lib/crypto"
import { hashPassword, DEFAULT_BCRYPT_COST } from "../src/lib/password"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ CRITICAL: Seeding database is strictly prohibited in production environment!")
    process.exit(1)
  }

  console.log("🌱 Seeding 3NF database...")

  // Clean existing tables in reverse dependency order
  await prisma.userBadge.deleteMany().catch(() => {})
  await prisma.pointTransaction.deleteMany().catch(() => {})
  await prisma.attendance.deleteMany().catch(() => {})
  await prisma.event.deleteMany().catch(() => {})
  await prisma.userStats.deleteMany().catch(() => {})
  await prisma.userProfile.deleteMany().catch(() => {})
  await prisma.user.deleteMany().catch(() => {})
  await prisma.pointRule.deleteMany().catch(() => {})
  await prisma.season.deleteMany().catch(() => {})
  await prisma.eventType.deleteMany().catch(() => {})
  await prisma.school.deleteMany().catch(() => {})

  // ── 1. Master Data: Schools ─────────────────────────────────────────────────
  console.log("🏫 Seeding Master Schools...")
  const schoolTMD = await prisma.school.create({
    data: { name: "SMA/SMK Tri Maha Dharma", type: "SMA/SMK" },
  })
  const schoolSMAN1 = await prisma.school.create({
    data: { name: "SMA/SMK Negeri 1 Jakarta", type: "SMA/SMK" },
  })
  const schoolUI = await prisma.school.create({
    data: { name: "Universitas Indonesia", type: "Universitas" },
  })
  const schoolHQ = await prisma.school.create({
    data: { name: "Sekkha Headquarter", type: "Umum" },
  })
  await prisma.school.createMany({
    data: [
      { name: "SMA/SMK Dharma Widya", type: "SMA/SMK" },
      { name: "SMA/SMK Cinta Kasih Tzu Chi", type: "SMA/SMK" },
      { name: "SMA/SMK Tri Ratna", type: "SMA/SMK" },
      { name: "SMP Tri Maha Dharma", type: "SMP" },
      { name: "SMP Dharma Widya", type: "SMP" },
      { name: "SMP Cinta Kasih Tzu Chi", type: "SMP" },
      { name: "Universitas Bina Nusantara (BINUS)", type: "Universitas" },
      { name: "Universitas Tarumanagara (UNTAR)", type: "Universitas" },
      { name: "Universitas Multimedia Nusantara (UMN)", type: "Universitas" },
      { name: "STAB Kertarajasa", type: "Universitas" },
      { name: "Umum", type: "Umum" },
    ],
    skipDuplicates: true,
  })

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

  const seededEventTypes: Record<string, any> = {}
  for (const et of eventTypesData) {
    const record = await prisma.eventType.upsert({
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
    seededEventTypes[et.code] = record
  }

  // ── 3. Master Data: Seasons ──────────────────────────────────────────────────
  console.log("📅 Seeding Master Season...")
  const now = new Date()
  const year = now.getFullYear()
  const q = Math.floor(now.getMonth() / 3) + 1
  const qStart = new Date(year, (q - 1) * 3, 1)
  const qEnd = new Date(year, q * 3, 0, 23, 59, 59)

  const activeSeason = await prisma.season.create({
    data: {
      name: `Season ${q} · ${year}`,
      code: `S${year}-Q${q}`,
      startDate: qStart,
      endDate: qEnd,
      isActive: true,
      targetAttendance: 500,
      bonusPoints: 100,
      description: `Musim kompetisi kuartal ${q} tahun ${year}`,
    },
  })


  // ── 5. Master Data: Point Rules ─────────────────────────────────────────────
  console.log("📜 Seeding Master Point Rules...")
  const ruleRutin = await prisma.pointRule.create({
    data: { code: "attendance_rutin", label: "Hadir Kebaktian Rutin", points: 50, category: "attendance" },
  })
  await prisma.pointRule.createMany({
    data: [
      { code: "attendance_special", label: "Hadir Acara Khusus", points: 100, category: "attendance" },
      { code: "streak_bonus", label: "Bonus Streak 4 Minggu", points: 100, category: "streak" },
    ],
    skipDuplicates: true,
  })


  // ── 6. Master Data: Schools ─────────────────────────────────────────────────
  console.log("🏫 Seeding Master Schools...")
  const initialSchools = [
    { name: "SMP Strada Bakti Mulia", type: "SMP" },
    { name: "SMP Negeri 1", type: "SMP" },
    { name: "SMK Bina Mandiri", type: "SMA/SMK" },
    { name: "Umum", type: "Umum" },
    { name: "Universitas Bunda Mulia", type: "Universitas" },
    { name: "Universitas Bina Nusantara", type: "Universitas" },
    { name: "Universitas Buddhi Dharma", type: "Universitas" },
  ]
  for (const s of initialSchools) {
    await prisma.school.upsert({
      where: { name: s.name },
      update: { type: s.type, status: "active", isActive: true },
      create: { name: s.name, type: s.type, status: "active", isActive: true },
    })
  }

  // ── 6b. Master Data: Badge Activities (Service Duties) ─────────────────────
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

  // ── 7. Seed Accounts (3NF: User + UserProfile + UserStats) ──────────────────
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
  const umatUser = await prisma.user.create({
    data: {
      email: encrypt(umatEmail),
      emailBindex: generateBlindIndex(umatEmail),
      username: "umat",
      password: await hash(umatPasswordRaw),
      role: Role.member,
      userNumber: "26010101",
      onboardingCompleted: true,
      profile: {
        create: {
          name: "Sari Dewi (Umat)",
          phone: encrypt("081234567890"),
          schoolId: schoolTMD.id,
          gender: encrypt("wanita"),
          birthDate: encrypt(new Date("2008-05-15").toISOString()),
          classGrade: encrypt("11"),
        },
      },
      stats: {
        create: {
          points: 150,
          totalAttendances: 3,
          currentStreak: 2,
          lastActivityAt: new Date(),
        },
      },
    },
  })

  // AKTIVIS
  const aktivisUser = await prisma.user.create({
    data: {
      email: encrypt(aktivisEmail),
      emailBindex: generateBlindIndex(aktivisEmail),
      username: "aktivis",
      password: await hash(aktivisPasswordRaw),
      role: Role.activist,
      userNumber: "26010102",
      onboardingCompleted: true,
      profile: {
        create: {
          name: "Budi Santoso (Aktivis)",
          phone: encrypt("081298765432"),
          schoolId: schoolSMAN1.id,
          gender: encrypt("pria"),
          birthDate: encrypt(new Date("2006-03-20").toISOString()),
          classGrade: encrypt("12"),
        },
      },
      stats: {
        create: {
          points: 550,
          totalAttendances: 10,
          currentStreak: 5,
          lastActivityAt: new Date(),
        },
      },
    },
  })

  // PENGURUS
  const pengurusUser = await prisma.user.create({
    data: {
      email: encrypt(pengurusEmail),
      emailBindex: generateBlindIndex(pengurusEmail),
      username: "pengurus",
      password: await hash(pengurusPasswordRaw),
      role: Role.organizer,
      userNumber: "26010103",
      onboardingCompleted: true,
      profile: {
        create: {
          name: "Budi Wijaya (Pengurus)",
          phone: encrypt("081311223344"),
          schoolId: schoolUI.id,
          gender: encrypt("pria"),
          birthDate: encrypt(new Date("2001-11-10").toISOString()),
        },
      },
      stats: {
        create: {
          points: 1200,
          totalAttendances: 24,
          currentStreak: 12,
          lastActivityAt: new Date(),
        },
      },
    },
  })

  // ADMIN
  const adminUser = await prisma.user.create({
    data: {
      email: encrypt(adminEmail),
      emailBindex: generateBlindIndex(adminEmail),
      username: "admin",
      password: await hash(adminPasswordRaw),
      role: Role.admin,
      userNumber: "26010104",
      onboardingCompleted: true,
      profile: {
        create: {
          name: "Admin Sekkha",
          phone: encrypt("081199887766"),
          schoolId: schoolHQ.id,
          gender: encrypt("pria"),
          birthDate: encrypt(new Date("1998-07-01").toISOString()),
        },
      },
      stats: {
        create: {
          points: 5000,
          totalAttendances: 50,
          currentStreak: 20,
          lastActivityAt: new Date(),
        },
      },
    },
  })

  // Legacy Hendra
  const legacyHendra = await prisma.user.create({
    data: {
      email: encrypt("hendra@sekkha.local"),
      emailBindex: generateBlindIndex("hendra@sekkha.local"),
      username: "hendra",
      password: await hash("admin"),
      role: Role.member,
      userNumber: "26010105",
      isClaimed: false,
      onboardingCompleted: true,
      profile: {
        create: {
          name: "Hendra Kusuma",
          schoolId: schoolTMD.id,
          phone: encrypt("081566778899"),
          gender: encrypt("pria"),
        },
      },
      stats: {
        create: {
          points: 50,
          totalAttendances: 1,
        },
      },
    },
  })



  // ── 9. Seed Sample Events with Master Data Relations ────────────────────────
  console.log("🎉 Seeding Events...")
  const event1 = await prisma.event.create({
    data: {
      title: "Kebaktian Remaja Minggu Pagi",
      description: "Kebaktian rutin remaja Buddhis Sekkha.",
      location: "Dhammasala Utama Vihara",
      eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      eventTypeId: seededEventTypes["regular-puja"].id,
      seasonId: activeSeason.id,
      tag: "Regular Puja",
      status: "scheduled",
      qrCode: "SEKKHA-EVT-001",
    },
  })

  const event2 = await prisma.event.create({
    data: {
      title: "Workshop Dhamma & Mindfulness",
      description: "Pelatihan meditasi kesadaran penuh untuk generasi muda.",
      location: "Ruang Meditasi Lt. 2",
      eventDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      eventTypeId: seededEventTypes["chanting"].id,
      seasonId: activeSeason.id,
      tag: "Chanting",
      status: "scheduled",
      qrCode: "SEKKHA-EVT-002",
    },
  })

  // Seed sample attendances & point transactions
  await prisma.attendance.create({
    data: {
      userId: umatUser.id,
      eventId: event1.id,
      method: "qr",
      pointsEarned: 50,
    },
  })

  await prisma.pointTransaction.create({
    data: {
      userId: umatUser.id,
      ruleId: ruleRutin.id,
      amount: 50,
      type: "attendance",
      description: `Kehadiran: ${event1.title}`,
      referenceId: event1.id,
    },
  })

  console.log("✅ Database Seeded Successfully to 3NF!")
  console.log("----------------------------------------")
  console.log(`📌 [UMAT]     : ${umatEmail} / [CONFIGURED IN ENV]`)
  console.log(`📌 [AKTIVIS]  : ${aktivisEmail} / [CONFIGURED IN ENV]`)
  console.log(`📌 [PENGURUS] : ${pengurusEmail} / [CONFIGURED IN ENV]`)
  console.log(`📌 [ADMIN]    : ${adminEmail} / [CONFIGURED IN ENV]`)
  console.log("----------------------------------------")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
