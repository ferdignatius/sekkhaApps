import { Application } from "express"
import type { AppModule } from "../../core/types"
import { schoolsRouter, ensureMasterSchoolsSeeded } from "./internal/router"

export const schoolsModule: AppModule = {
  name: "schools",
  register(app: Application) {
    app.use("/api/schools", schoolsRouter)
    // Seed master schools asynchronously on boot
    void ensureMasterSchoolsSeeded()
  },
}
