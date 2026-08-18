import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"

dotenv.config()

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Clean existing tables in reverse dependency order
  const p = prisma as any
  if (p.curhatMessage) await p.curhatMessage.deleteMany()
  if (p.curhatThread) await p.curhatThread.deleteMany()
  if (p.comment) await p.comment.deleteMany()
  if (p.post) await p.post.deleteMany()
  if (p.userBadge) await p.userBadge.deleteMany()
  if (p.attendance) await p.attendance.deleteMany()
  if (p.rsvp) await p.rsvp.deleteMany()
  if (p.event) await p.event.deleteMany()
  if (p.badge) await p.badge.deleteMany()
  if (p.level) await p.level.deleteMany()
  if (p.eventType) await p.eventType.deleteMany()
  if (p.notification) await p.notification.deleteMany()
  if (p.roleInvitation) await p.roleInvitation.deleteMany()
  if (p.user) await p.user.deleteMany()

  // ── Credentials from .env with fallback defaults ──────────────────────────
  const umatEmail = process.env.DUMMY_UMAT_EMAIL || "umat@sekkha.com"
  const umatPasswordRaw = process.env.DUMMY_UMAT_PASSWORD || "password123"

  const aktivisEmail = process.env.DUMMY_AKTIVIS_EMAIL || "aktivis@sekkha.com"
  const aktivisPasswordRaw = process.env.DUMMY_AKTIVIS_PASSWORD || "password123"

  const pengurusEmail = process.env.DUMMY_PENGURUS_EMAIL || "pengurus@sekkha.com"
  const pengurusPasswordRaw = process.env.DUMMY_PENGURUS_PASSWORD || "password123"

  const adminEmail = process.env.DUMMY_ADMIN_EMAIL || "admin@sekkha.com"
  const adminPasswordRaw = process.env.DUMMY_ADMIN_PASSWORD || "password123"

  // Hash passwords
  const umatPassword = await bcrypt.hash(umatPasswordRaw, 10)
  const aktivisPassword = await bcrypt.hash(aktivisPasswordRaw, 10)
  const pengurusPassword = await bcrypt.hash(pengurusPasswordRaw, 10)
  const adminPassword = await bcrypt.hash(adminPasswordRaw, 10)

  // ── 1. Create Role Dummy Accounts ──────────────────────────────────────────
  const umatUser = await prisma.user.create({
    data: {
      email: umatEmail,
      password: umatPassword,
      name: "Sari Dewi (Umat)",
      role: "umat",
      school: "SMA Tri Maha Dharma",
      lastActivityAt: new Date(),
    },
  })

  const aktivisUser = await prisma.user.create({
    data: {
      email: aktivisEmail,
      password: aktivisPassword,
      name: "Budi Santoso (Aktivis)",
      role: "aktivis",
      school: "SMA Negeri 1 Jakarta",
      lastActivityAt: new Date(),
    },
  })

  const pengurusUser = await prisma.user.create({
    data: {
      email: pengurusEmail,
      password: pengurusPassword,
      name: "Budi Wijaya (Pengurus)",
      role: "pengurus",
      school: "Universitas Indonesia",
      lastActivityAt: new Date(),
    },
  })

  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      password: adminPassword,
      name: "Admin Sekkha",
      role: "admin",
      school: "Sekkha Headquarter",
      lastActivityAt: new Date(),
    },
  })

  // Also seed legacy hendra for backward compatibility if needed
  const legacyHendra = await prisma.user.create({
    data: {
      email: "hendra@sekkha.local",
      password: await bcrypt.hash("admin", 10),
      name: "Hendra Kusuma",
      role: "umat",
    },
  })

  // ── 2. Master Data: Levels ──────────────────────────────────────────────────
  await prisma.level.createMany({
    data: [
      { level: 1, label: "Pemula", minPoints: 0 },
      { level: 2, label: "Aktif", minPoints: 500 },
      { level: 3, label: "Umat Setia", minPoints: 1000 },
      { level: 4, label: "Teladan", minPoints: 2000 },
      { level: 5, label: "Pembimbing", minPoints: 5000 },
    ],
  })

  // ── 3. Master Data: Event Types ──────────────────────────────────────────────
  await prisma.eventType.createMany({
    data: [
      { code: "rutin", label: "Rutin", color: "#4262ff", isDefault: true },
      { code: "special", label: "Special", color: "#ffd02f", isDefault: false },
      { code: "retreat", label: "Retreat", color: "#ff9999", isDefault: false },
      { code: "meditasi", label: "Meditasi", color: "#0fbcb0", isDefault: false },
      { code: "sosial", label: "Sosial", color: "#fde0f0", isDefault: false },
    ],
  })

  // ── 4. Master Data: Badges ─────────────────────────────────────────────────
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

  // Assign Badges
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

  // ── 5. Role Invitation & Notifications ──────────────────────────────────────
  const inviteHendra = await prisma.roleInvitation.create({
    data: {
      email: legacyHendra.email,
      role: "pengurus",
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

  console.log("✅ Database Seeded Successfully!")
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

