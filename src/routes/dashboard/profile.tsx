import { createFileRoute } from "@tanstack/react-router"
import { ProfilePage } from "@/feature/profile"

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
})
