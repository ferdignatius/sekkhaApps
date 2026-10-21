import type { AppModule } from "../../core/types"
import { homeRouter } from "./routes"

export const homeModule: AppModule = {
  name: "home",
  register(app) {
    app.use("/api/home", homeRouter)
  },
}
