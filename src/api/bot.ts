import { Router } from "express"
import prisma from "../prisma.js"
const router = Router()

router.get("/", (req, res) => {
  res.send("Hello world")
})

//Create new Bot
router.post("/", async (req, res) => {
  const {
    name,
    accountId,
    whatsappAccountId,
    sessionTTL,
    sessionTimeoutMessage,
  } = req.body

  try {
    const bot = await prisma.bot.create({
      data: {
        name,
        accountId,
        sessionTTL,
        sessionTimeoutMessage,
        whatsappAccountId,
      },
    })
    console.log("Bot created successfully", bot)
    res.status(200).json(bot)
  } catch (error) {
    console.log("Bot creation error", error)
    res.sendStatus(500)
  }
})

router.put("/:botId/publish", async (req, res) => {
  const { botId } = req.params
  try {
    const bot = await prisma.bot.update({
      where: { id: botId },
      data: {
        isPublished: true,
      },
    })
    console.log("Published bot", bot)
    res.status(200).json(bot)
  } catch (error) {
    console.log("Error while publishing botId:", botId, error)
    res.sendStatus(500)
  }
})

//Get all flows mapped to a bot
router.get("/:botId/flows", async (req, res) => {
  const { botId } = req.params
  try {
    const flows = await prisma.flow.findMany({
      where: {
        botId,
      },
      select: {
        id: true,
        name: true,
        intent: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    console.log("Flow fetched successfully for botId:", botId)
    res.status(200).json(flows)
  } catch (error) {
    console.log("Error while fetching flows", error)
    res.sendStatus(500)
  }
})

//Get specific flow data
router.get("/:botId/flows/:flowId", async (req, res) => {
  const { flowId } = req.params

  try {
    const flow = await prisma.flow.findUnique({
      where: {
        id: flowId,
      },
    })
    res.status(200).json(flow)
  } catch (error) {
    console.log("Error fetching flow data for flowId:", flowId)
    res.sendStatus(500)
  }
})

//Add new flow for a bot
router.post("/:botId/flow", async (req, res) => {
  const { botId } = req.params
  const { name, intent, steps } = req.body

  try {
    const flow = await prisma.flow.create({
      data: {
        name,
        intent,
        steps,
        botId,
      },
    })
    console.log("Flow created successfully", flow)
    res.status(200).json(flow)
  } catch (error) {
    console.log("Flow creation error", error)
    res.sendStatus(500)
  }
})

router.patch("/:botId/flows/:flowId", async (req, res) => {
  const { botId, flowId } = req.params
  const { name, intent, steps } = req.body
  try {
    const flow = await prisma.flow.update({
      where: {
        id: flowId,
      },
      data: {
        name,
        intent,
        steps,
      },
    })
    res.status(200).json(flow)
  } catch (error) {
    console.log("Error updating flow:", flowId, error)
    res.sendStatus(500)
  }
})

export { router as BotRouter }
