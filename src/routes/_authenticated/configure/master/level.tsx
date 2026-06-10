import { createFileRoute } from "@tanstack/react-router"
import { LevelPage } from "@/feature/configure"

export const Route = createFileRoute("/_authenticated/configure/master/level")({
  component: LevelPage,
})
