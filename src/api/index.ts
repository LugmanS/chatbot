import { Express } from "express"
import { BotRouter } from "./bot.js"

export default function api(app: Express) {
  app.use("/api/v1/bot", BotRouter)
}
