import { Router } from "express"
import { requireAuth, requireRole } from "../../middleware/auth"
import { peopleControllers } from "./controllers"

export const peopleRouter: Router = Router()

// 1. List members (organizer/admin only)
peopleRouter.get("/members", requireAuth, requireRole("organizer", "admin"), peopleControllers.getMembers)

// 2. Member detail (organizer/admin only)
peopleRouter.get("/members/:id", requireAuth, requireRole("organizer", "admin"), peopleControllers.getMemberDetail)

// 3. Add new member (admin only)
peopleRouter.post("/members", requireAuth, requireRole("admin"), peopleControllers.createMember)

// 4. Update member (organizer/admin only; role change requires admin handled in service)
peopleRouter.put("/members/:id", requireAuth, requireRole("organizer", "admin"), peopleControllers.updateMember)

// 5. Delete member (admin only)
peopleRouter.delete("/members/:id", requireAuth, requireRole("admin"), peopleControllers.deleteMember)

// 6. Reset password (admin only)
peopleRouter.post("/members/:id/reset-password", requireAuth, requireRole("admin"), peopleControllers.resetPassword)

// 7. Generate claim PIN (organizer/admin only)
peopleRouter.post("/members/:id/generate-claim-pin", requireAuth, requireRole("organizer", "admin"), peopleControllers.generateClaimPin)

// 8. Link legacy account (authenticated user)
peopleRouter.post("/link-legacy-account", requireAuth, peopleControllers.linkLegacyAccount)
