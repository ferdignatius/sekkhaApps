import { Application } from "express"
import type { AppModule } from "../../core/types"
import { schoolsRouter } from "./routes"

export const schoolsModule: AppModule = {
  name: "schools",
  register(app: Application) {
    app.use("/api/schools", schoolsRouter)
  },
}
