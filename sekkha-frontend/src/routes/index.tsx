import { createFileRoute } from "@tanstack/react-router"
import { rootBeforeLoad } from "@/modules/auth"
import type { RouterContext } from "@/modules/auth"
import { IndexRouteComponent } from "@/shell/IndexRouteComponent"

export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    await rootBeforeLoad(context as RouterContext)
  },
  component: IndexRouteComponent,
})
