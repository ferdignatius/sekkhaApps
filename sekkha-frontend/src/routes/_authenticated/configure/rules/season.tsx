import { createFileRoute, redirect } from "@tanstack/react-router"
import { safeStorage } from "@/lib/storage"

export const Route = createFileRoute("/_authenticated/configure/rules/season")({
  beforeLoad: ({ context }) => {
    const authState = (context as any)?.authState
    const role = authState?.role
    const token = safeStorage.getItem("sekkha_access_token")
    if (
      authState?.status !== "loading" &&
      !(token && !role) &&
      role !== "organizer" &&
      role !== "pengurus" &&
      role !== "admin"
    ) {
      throw redirect({ to: "/home" })
    }
    throw redirect({ to: "/configure/master/season" })
  },
  component: () => null,
})
