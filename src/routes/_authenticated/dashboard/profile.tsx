import { createFileRoute } from "@tanstack/react-router"
import { ProfilePage } from "@/feature/profile"

export const Route = createFileRoute("/_authenticated/dashboard/profile")({
  component: ProfilePage,
})
