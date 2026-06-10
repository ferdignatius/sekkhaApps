import { createFileRoute } from "@tanstack/react-router"
import { LeaderboardPage } from "@/feature/leaderboard"

export const Route = createFileRoute("/_authenticated/leaderboard/")({
  component: LeaderboardPage,
})
