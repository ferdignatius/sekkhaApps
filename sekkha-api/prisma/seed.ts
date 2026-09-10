import { PrismaClient, Role } from "@prisma/client"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  if (process.env.NODE_ENV === "production") {
    console.error("❌ CRITICAL: Seeding database is strictly prohibited in production environment!")
    process.exit(1)
  }

  console.log("🌱 Seeding 3NF database...")

  // Clean existing tables in reverse dependency order
  await prisma.notification.deleteMany().catch(() => {})
  await prisma.roleInvitation.deleteMany().catch(() => {})
  await prisma.userBadge.deleteMany().catch(() => {})
  await prisma.pointTransaction.deleteMany().catch(() => {})
  await prisma.attendance.deleteMany().catch(() => {})
  await prisma.event.deleteMany().catch(() => {})
  await prisma.userStats.deleteMany().catch(() => {})
  await prisma.userProfile.deleteMany().catch(() => {})
  await prisma.user.deleteMany().catch(() => {})
  await prisma.badge.deleteMany().catch(() => {})
  await prisma.level.deleteMany().catch(() => {})
  await prisma.pointRule.deleteMany().catch(() => {})
  await prisma.season.deleteMany().catch(() => {})
  await prisma.eventType.deleteMany().catch(() => {})
  await prisma.school.deleteMany().catch(() => {})

  // ── 1. Master Data: Schools ─────────────────────────────────────────────────
  console.log("🏫 Seeding Master Schools...")
  const schoolTMD = await prisma.school.create({
    data: { name: "SMA Tri Maha Dharma", type: "SMA", city: "Jakarta Barat" },
  })
  const schoolSMAN1 = await prisma.school.create({
    data: { name: "SMA Negeri 1 Jakarta", type: "SMA", city: "Jakarta Pusat" },
  })
  const schoolUI = await prisma.school.create({
    data: { name: "Universitas Indonesia", type: "Universitas", city: "Depok" },
  })
  const schoolHQ = await prisma.school.create({
    data: { name: "Sekkha Headquarter", type: "Lainnya", city: "Jakarta Barat" },
  })
  await prisma.school.createMany({
    data: [
      { name: "SMA Dharma Widya", type: "SMA", city: "Tangerang" },
      { name: "SMA Cinta Kasih Tzu Chi", type: "SMA", city: "Jakarta Barat" },
      { name: "Universitas Bina Nusantara (BINUS)", type: "Universitas", city: "Jakarta Barat" },
      { name: "Umum", type: "Lainnya", city: "Nasional" },
    ],
    skipDuplicates: true,
  })

  // ── 2. Master Data: Event Types ──────────────────────────────────────────────
  console.log("🎯 Seeding Master Event Types...")
  const eventTypeRutin = await prisma.eventType.create({
    data: { code: "rutin", label: "Kebaktian Rutin", color: "#4262ff", isDefault: true },
  })
  const eventTypeSpecial = await prisma.eventType.create({
    data: { code: "special", label: "Special Event", color: "#ffd02f", isDefault: false },
  })
  await prisma.eventType.createMany({
    data: [
      { code: "retreat", label: "Retreat", color: "#ff9999", isDefault: false },
      { code: "meditasi", label: "Meditasi", color: "#0fbcb0", isDefault: false },
      { code: "sosial", label: "Bakti Sosial", color: "#fde0f0", isDefault: false },
    ],
    skipDuplicates: true,
  })

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

  // ── 4. Master Data: Levels ──────────────────────────────────────────────────
  console.log("⭐ Seeding Master Levels...")
  const level1 = await prisma.level.create({ data: { level: 1, label: "Pemula", minPoints: 0 } })
  const level2 = await prisma.level.create({ data: { level: 2, label: "Aktif", minPoints: 500 } })
  const level3 = await prisma.level.create({ data: { level: 3, label: "Umat Setia", minPoints: 1000 } })
  const level4 = await prisma.level.create({ data: { level: 4, label: "Teladan", minPoints: 2000 } })
  const level5 = await prisma.level.create({ data: { level: 5, label: "Pembimbing", minPoints: 5000 } })

  // ── 5. Master Data: Point Rules ─────────────────────────────────────────────
  console.log("📜 Seeding Master Point Rules...")
  const ruleRutin = await prisma.pointRule.create({
    data: { code: "attendance_rutin", label: "Hadir Kebaktian Rutin", points: 50, category: "attendance" },
  })
  await prisma.pointRule.createMany({
    data: [
      { code: "attendance_special", label: "Hadir Acara Khusus", points: 100, category: "attendance" },
      { code: "streak_bonus", label: "Bonus Streak 4 Minggu", points: 100, category: "streak" },
      { code: "season_bonus", label: "Bonus Akhir Musim", points: 200, category: "general" },
    ],
    skipDuplicates: true,
  })

  // ── 6. Master Data: Badges ─────────────────────────────────────────────────
  console.log("🎖️ Seeding Master Badges...")
  const badgePertama = await prisma.badge.create({
    data: {
      name: "Pertama Hadir",
      description: "Hadir di kebaktian pertama",
      iconUrl: "🎯",
      conditionType: "attendance",
      conditionValue: 1,
    },
  })
  const badgeStreak = await prisma.badge.create({
    data: {
      name: "Streak 5",
      description: "Hadir 5 minggu berturut-turut",
      iconUrl: "🔥",
      conditionType: "streak",
      conditionValue: 5,
    },
  })
  const badgeLoyal = await prisma.badge.create({
    data: {
      name: "Loyal",
      description: "Aktif 3 bulan tanpa putus",
      iconUrl: "❤️",
      conditionType: "attendance",
      conditionValue: 12,
    },
  })
  const badgePoin = await prisma.badge.create({
    data: {
      name: "100 Poin",
      description: "Kumpulkan 100 poin",
      iconUrl: "⭐",
      conditionType: "points",
      conditionValue: 100,
    },
  })

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

  const hash = async (pwd: string) => bcrypt.hash(pwd, 12)

  // UMAT
  const umatUser = await prisma.user.create({
    data: {
      email: umatEmail,
      username: "umat",
      password: await hash(umatPasswordRaw),
      role: Role.umat,
      userNumber: "26010101",
      profile: {
        create: {
          name: "Sari Dewi (Umat)",
          phone: "081234567890",
          schoolId: schoolTMD.id,
          gender: "wanita",
        },
      },
      stats: {
        create: {
          points: 150,
          totalAttendances: 3,
          currentStreak: 2,
          levelId: level1.id,
          lastActivityAt: new Date(),
        },
      },
    },
  })

  // AKTIVIS
  const aktivisUser = await prisma.user.create({
    data: {
      email: aktivisEmail,
      username: "aktivis",
      password: await hash(aktivisPasswordRaw),
      role: Role.aktivis,
      userNumber: "26010102",
      profile: {
        create: {
          name: "Budi Santoso (Aktivis)",
          phone: "081298765432",
          schoolId: schoolSMAN1.id,
          gender: "pria",
        },
      },
      stats: {
        create: {
          points: 550,
          totalAttendances: 10,
          currentStreak: 5,
          levelId: level2.id,
          lastActivityAt: new Date(),
        },
      },
    },
  })

  // PENGURUS
  const pengurusUser = await prisma.user.create({
    data: {
      email: pengurusEmail,
      username: "pengurus",
      password: await hash(pengurusPasswordRaw),
      role: Role.pengurus,
      userNumber: "26010103",
      profile: {
        create: {
          name: "Budi Wijaya (Pengurus)",
          phone: "081311223344",
          schoolId: schoolUI.id,
          gender: "pria",
        },
      },
      stats: {
        create: {
          points: 1200,
          totalAttendances: 24,
          currentStreak: 12,
          levelId: level3.id,
          lastActivityAt: new Date(),
        },
      },
    },
  })

  // ADMIN
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      username: "admin",
      password: await hash(adminPasswordRaw),
      role: Role.admin,
      userNumber: "26010104",
      profile: {
        create: {
          name: "Admin Sekkha",
          phone: "081199887766",
          schoolId: schoolHQ.id,
          gender: "pria",
        },
      },
      stats: {
        create: {
          points: 5000,
          totalAttendances: 50,
          currentStreak: 20,
          levelId: level5.id,
          lastActivityAt: new Date(),
        },
      },
    },
  })

  // Legacy Hendra
  const legacyHendra = await prisma.user.create({
    data: {
      email: "hendra@sekkha.local",
      username: "hendra",
      password: await hash("admin"),
      role: Role.umat,
      userNumber: "26010105",
      profile: {
        create: {
          name: "Hendra Kusuma",
          schoolId: schoolTMD.id,
        },
      },
      stats: {
        create: {
          points: 50,
          totalAttendances: 1,
          levelId: level1.id,
        },
      },
    },
  })

  // ── 8. Assign Badges ────────────────────────────────────────────────────────
  await prisma.userBadge.createMany({
    data: [
      { userId: umatUser.id, badgeId: badgePertama.id },
      { userId: umatUser.id, badgeId: badgePoin.id },
      { userId: aktivisUser.id, badgeId: badgePertama.id },
      { userId: aktivisUser.id, badgeId: badgeStreak.id },
      { userId: pengurusUser.id, badgeId: badgeLoyal.id },
      { userId: adminUser.id, badgeId: badgePertama.id },
      { userId: adminUser.id, badgeId: badgePoin.id },
    ],
  })

  // ── 9. Seed Sample Events with Master Data Relations ────────────────────────
  console.log("🎉 Seeding Events...")
  const event1 = await prisma.event.create({
    data: {
      title: "Kebaktian Remaja Minggu Pagi",
      description: "Kebaktian rutin remaja Buddhis Sekkha.",
      location: "Dhammasala Utama Vihara",
      eventDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      eventTypeId: eventTypeRutin.id,
      eventType: "rutin",
      seasonId: activeSeason.id,
      tag: "rutin",
      status: "published",
      qrCode: "SEKKHA-EVT-001",
    },
  })

  const event2 = await prisma.event.create({
    data: {
      title: "Workshop Dhamma & Mindfulness",
      description: "Pelatihan meditasi kesadaran penuh untuk generasi muda.",
      location: "Ruang Meditasi Lt. 2",
      eventDate: new Date(Date.now() + 9 * 24 * 60 * 60 * 1000),
      eventTypeId: eventTypeSpecial.id,
      eventType: "special",
      seasonId: activeSeason.id,
      tag: "meditasi",
      status: "published",
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

  // ── 10. Role Invitation & Notifications ─────────────────────────────────────
  const inviteHendra = await prisma.roleInvitation.create({
    data: {
      email: legacyHendra.email!,
      role: Role.pengurus,
      status: "pending",
      invitedById: adminUser.id,
    },
  })

  await prisma.notification.create({
    data: {
      userId: legacyHendra.id,
      title: "Undangan Peran Baru",
      message: "Anda diundang untuk bergabung sebagai Pengurus.",
      type: "role_invitation",
      status: "unread",
      data: { invitationId: inviteHendra.id },
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
