import { createFileRoute } from "@tanstack/react-router"
import { AchievementPage } from "@/feature/configure"

export const Route = createFileRoute("/_authenticated/configure/master/achievement")({
  component: AchievementPage,
})
