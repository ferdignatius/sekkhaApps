// modules/landing-page — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { LandingPage } from "./internal/components/LandingPage"

export const landingPageModule: ModuleDefinition = {
  name: "landing-page",
  navItems: [], // Landing page tidak muncul di sidebar
}
