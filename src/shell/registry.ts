// ─── Shell Registry ──────────────────────────────────────────────────────────
// Definisi kontrak yang harus dipenuhi setiap modul frontend.
// Shell (App, Sidebar) hanya membaca registry ini untuk menentukan
// rute dan menu apa saja yang harus dimuat — tanpa tahu implementasi modul.

export interface ModuleDefinition {
  /** Identifier unik modul */
  name: string

  /** Menu items yang muncul di sidebar utama */
  navItems: NavItem[]

  /** Menu items khusus pengurus/admin (opsional) */
  pengurusNavItems?: NavItem[]

  /** Configure sub-sections (opsional, untuk modul configure) */
  configureSections?: ConfigureSection[]
}

export interface NavItem {
  label: string
  to: string
  /** Nama icon dari lucide-react (string key, bukan komponen langsung) */
  icon: string
}

export interface ConfigureSection {
  label: string
  icon: string
  items: ConfigureItem[]
}

export interface ConfigureItem {
  label: string
  to: string
  icon: string
  /** Apakah route ini sudah diimplementasikan */
  hasRoute: boolean
}

// ─── Module Registration ─────────────────────────────────────────────────────
// Import definisi publik dari setiap modul.
// Menambah modul baru = buat folder + import di sini.

import { dashboardModule } from "@/modules/dashboard"
import { eventsModule } from "@/modules/events"
import { leaderboardModule } from "@/modules/leaderboard"
import { communityModule } from "@/modules/community"
import { profileModule } from "@/modules/profile"
import { configureModule } from "@/modules/configure"
import { pengurusModule } from "@/modules/pengurus"
import { teamsModule } from "@/modules/teams"
import { notificationsModule } from "@/modules/notifications"

/**
 * Daftar semua modul frontend yang aktif.
 * Shell membaca array ini untuk build sidebar dan routing.
 * Urutan = urutan tampil di sidebar.
 */
export const activeModules: ModuleDefinition[] = [
  dashboardModule,
  eventsModule,
  leaderboardModule,
  communityModule,
  profileModule,
  notificationsModule,
  configureModule,
  teamsModule,
  pengurusModule,
]
