// ─── Icon Map ────────────────────────────────────────────────────────────────
// Mapping dari string icon name → React component (lucide-react).
// Diperlukan karena ModuleDefinition hanya bisa expose string (serializable),
// bukan React component langsung. Shell resolve icon di sini.

import {
  LayoutDashboardIcon,
  CalendarDaysIcon,
  TrophyIcon,
  MessageCircleIcon,
  UserIcon,
  BarChart3Icon,
  TrendingDownIcon,
  LayersIcon,
  AwardIcon,
  ZapIcon,
  TagIcon,
  ActivityIcon,
  BellIcon,
  BuildingIcon,
  UsersIcon,
  SparklesIcon,
  AlertTriangleIcon,
  ClockIcon,
  ShieldCheckIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard: LayoutDashboardIcon,
  CalendarDays: CalendarDaysIcon,
  Trophy: TrophyIcon,
  MessageCircle: MessageCircleIcon,
  User: UserIcon,
  BarChart3: BarChart3Icon,
  TrendingDown: TrendingDownIcon,
  Layers: LayersIcon,
  Award: AwardIcon,
  Zap: ZapIcon,
  Tag: TagIcon,
  Activity: ActivityIcon,
  Bell: BellIcon,
  Building: BuildingIcon,
  Users: UsersIcon,
  Sparkles: SparklesIcon,
  AlertTriangle: AlertTriangleIcon,
  Clock: ClockIcon,
  ShieldCheck: ShieldCheckIcon,
}
