import { createFileRoute } from "@tanstack/react-router"
import { LandingPage } from "@/modules/landing-page"

export const Route = createFileRoute("/")({ component: LandingPage })
