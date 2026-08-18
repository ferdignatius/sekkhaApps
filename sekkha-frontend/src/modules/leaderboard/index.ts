// modules/leaderboard — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { LeaderboardPage } from "./internal/components/LeaderboardPage"

export const leaderboardModule: ModuleDefinition = {
  name: "leaderboard",
  navItems: [
    { label: "Leaderboard", to: "/leaderboard", icon: "Trophy" },
  ],
}
