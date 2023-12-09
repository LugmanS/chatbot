import { Express } from "express"
import { WhatsappRouter } from "./whatsapp.js"

export default function webhook(app: Express) {
  app.use("/webhook/v1/whatsapp", WhatsappRouter)
}
