import { Router } from "express"
import { requireAuth, requireRole } from "../../middleware/auth"
import { peopleControllers } from "./controllers"

export const peopleRouter: Router = Router()

// 1. List members (member, activist, organizer, admin)
peopleRouter.get("/", requireAuth, requireRole("member", "activist", "organizer", "admin"), peopleControllers.getMembers)
peopleRouter.get("/members", requireAuth, requireRole("member", "activist", "organizer", "admin"), peopleControllers.getMembers)

// 2. Member detail (member, activist, organizer, admin)
peopleRouter.get("/:id", requireAuth, requireRole("member", "activist", "organizer", "admin"), peopleControllers.getMemberDetail)
peopleRouter.get("/members/:id", requireAuth, requireRole("member", "activist", "organizer", "admin"), peopleControllers.getMemberDetail)

// 3. Add new member / Pre-provisioning (organizer, admin)
peopleRouter.post("/", requireAuth, requireRole("organizer", "admin"), peopleControllers.createMember)
peopleRouter.post("/members", requireAuth, requireRole("organizer", "admin"), peopleControllers.createMember)

// 4. Update member (organizer, admin)
peopleRouter.put("/:id", requireAuth, requireRole("organizer", "admin"), peopleControllers.updateMember)
peopleRouter.put("/members/:id", requireAuth, requireRole("organizer", "admin"), peopleControllers.updateMember)

// 5. Delete member (admin only)
peopleRouter.delete("/:id", requireAuth, requireRole("admin"), peopleControllers.deleteMember)
peopleRouter.delete("/members/:id", requireAuth, requireRole("admin"), peopleControllers.deleteMember)

// 6. Reset temporary password (organizer, admin; only for unclaimed accounts)
peopleRouter.post("/:id/reset-temporary-password", requireAuth, requireRole("organizer", "admin"), peopleControllers.resetTemporaryPassword)
peopleRouter.post("/members/:id/reset-temporary-password", requireAuth, requireRole("organizer", "admin"), peopleControllers.resetTemporaryPassword)
peopleRouter.post("/members/:id/reset-password", requireAuth, requireRole("organizer", "admin"), peopleControllers.resetTemporaryPassword)
