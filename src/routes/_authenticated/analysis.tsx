import { createFileRoute } from "@tanstack/react-router"
import { AnalysisPage } from "@/feature/pengurus"

export const Route = createFileRoute("/_authenticated/analysis")({
  component: AnalysisPage,
})
