import { createFileRoute } from "@tanstack/react-router"
import { DashboardPage } from "@/feature/dashboard"

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
})
