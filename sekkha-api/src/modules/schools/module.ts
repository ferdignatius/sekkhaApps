import type { Application } from "express"
import type { AppModule } from "../../core/types"
import { schoolsRouter, configureSchoolsRouter } from "./routes"

export const schoolsModule: AppModule = {
  name: "schools",
  register(app: Application) {
    app.use("/api/schools", schoolsRouter)
    app.use("/api/configure", configureSchoolsRouter)
  },
}
