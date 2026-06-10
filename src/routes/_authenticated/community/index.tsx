import { createFileRoute } from "@tanstack/react-router"
import { CommunityPage } from "@/feature/community"

export const Route = createFileRoute("/_authenticated/community/")({
  component: CommunityPage,
})
