import { createFileRoute } from "@tanstack/react-router"
import { AchievementsPage } from "@/feature/profile"

export const Route = createFileRoute("/_authenticated/home/achievements")({
  component: AchievementsPage,
})
