import { Router } from "express"
import { requireAuth } from "../../middleware/auth"
import { homeControllers } from "./controllers"

export const homeRouter: Router = Router()

homeRouter.get("/", requireAuth, homeControllers.getDashboard)
