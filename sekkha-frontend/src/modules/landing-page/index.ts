// modules/landing-page — Public API
import type { ModuleDefinition } from "@/shell/registry"

export { LandingPage } from "./internal/components/LandingPage"
export { PrivacyPolicyPage } from "./internal/components/PrivacyPolicyPage"
export { PrivacyPolicyDocument } from "./internal/components/PrivacyPolicyDocument"
export { privacyPolicyData } from "./internal/data/privacyContent"

export const landingPageModule: ModuleDefinition = {
  name: "landing-page",
  navItems: [], // Landing page tidak muncul di sidebar
}
