import { createFileRoute } from "@tanstack/react-router"
import { InsightPage } from "@/feature/pengurus"

export const Route = createFileRoute("/_authenticated/insight")({
  component: InsightPage,
})
