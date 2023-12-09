import { Router } from "express"
import { generateFallbackText } from "../utils/helper.js"
import prisma from "../prisma.js"
import { Webhook } from "../types/whatsapp/webhook.js"
import { FlowSteps } from "../types/flow.js"
import {
  sendWhatsappMessage,
  validateAndUpdateVariables,
  whatsappBotFlowStepHandler,
  whatsappWebhookPayloadParser,
} from "../lib/whatsapp.js"
const router = Router()

//Verification endpoint
router.get("/", (req, res) => {
  const { "hub.verify_token": verifyToken, "hub.challenge": challenge } =
    req.query
  if (verifyToken !== process.env.WHATSAPP_WEBHOOK_VERIFICATION_TOKEN) {
    return res.sendStatus(400)
  }
  res.send(challenge)
})

//Whatsapp event handler
router.post("/", async (req, res) => {
  const body: Webhook = req.body
  res.sendStatus(200) //Acknowledge as event received

  if (!body.entry[0].changes[0].value.messages) {
    return
  }

  const eventData = whatsappWebhookPayloadParser(req.body)
  try {
    const session = await prisma.flowSession.findFirst({
      where: {
        userPhoneNumber: eventData.userPhoneNumber,
        isActive: true,
      },
    })

    if (!session) {
      const bot = await prisma.bot.findFirst({
        where: {
          whatsappAccountId: eventData.accountId,
          isPublished: true,
        },
        include: {
          flows: {
            select: {
              id: true,
              intent: true,
            },
          },
        },
      })
      const flowIntents = bot.flows.map((flow) => flow.intent)
      // init message can only be text
      if (eventData.message.type !== "text") {
        await sendWhatsappMessage(
          eventData.phoneNumberId,
          eventData.userPhoneNumber,
          {
            messageType: "text",
            text: generateFallbackText(eventData.userProfileName, flowIntents),
          },
          {}
        )
        return
      }

      const userMessage = eventData.message.text.body
      const matchingIntentIndex = flowIntents.indexOf(userMessage)
      const wildcardIntentIndex = flowIntents.indexOf("*")

      //no matching intent and no wildcard
      if (matchingIntentIndex === -1 && wildcardIntentIndex === -1) {
        await sendWhatsappMessage(
          eventData.phoneNumberId,
          eventData.userPhoneNumber,
          {
            messageType: "text",
            text: generateFallbackText(eventData.userProfileName, flowIntents),
          },
          {}
        )
        return
      }

      const matchingFlowId =
        bot.flows[
          matchingIntentIndex > -1 ? matchingIntentIndex : wildcardIntentIndex
        ].id

      const flow = await prisma.flow.findUnique({
        where: {
          id: matchingFlowId,
        },
      })

      const steps = flow.steps as FlowSteps
      const storageVariables = {}

      let currentStep = steps[0]
      while (currentStep) {
        console.log("Processing no session steps:", currentStep.type)
        await whatsappBotFlowStepHandler(
          currentStep,
          eventData,
          storageVariables
        )
        if (currentStep.isBlocking || !currentStep.nextId) {
          await prisma.flowSession.create({
            data: {
              flowId: flow.id,
              userPhoneNumber: eventData.userPhoneNumber,
              lastStepId: currentStep.id,
              variables: storageVariables,
              isActive: currentStep.nextId ? true : false,
            },
          })
          break
        }
        const nextStep = steps.find((step) => step.id === currentStep.nextId)
        currentStep = nextStep
      }
    }
    if (session) {
      const flow = await prisma.flow.findUnique({
        where: {
          id: session.flowId,
        },
      })
      const steps = flow.steps as FlowSteps
      const storageVariables = JSON.parse(JSON.stringify(session.variables))
      let lastStep = steps.find((step) => step.id === session.lastStepId)

      //Validate webhook message
      const isValidResponse = await validateAndUpdateVariables(
        lastStep,
        eventData,
        storageVariables
      )
      if (lastStep.type === "ask_question" && !isValidResponse) {
        return await prisma.flowSession.update({
          where: {
            id: session.id,
          },
          data: {
            lastStepAttempts: (session.lastStepAttempts += 1),
          },
        })
      }

      if (lastStep.nextId) {
        let currentStep = steps.find((step) => step.id === lastStep.nextId)
        while (currentStep) {
          console.log("Processing step:", currentStep.type)
          await whatsappBotFlowStepHandler(
            currentStep,
            eventData,
            storageVariables
          )
          if (currentStep.isBlocking || !currentStep.nextId) {
            await prisma.flowSession.update({
              where: {
                id: session.id,
              },
              data: {
                variables: storageVariables,
                lastStepId: currentStep.id,
                isActive: currentStep.nextId ? true : false,
              },
            })
            break
          }
          const nextStep = steps.find((step) => step.id === currentStep.nextId)
          currentStep = nextStep
        }
        lastStep = currentStep
      } else {
        await prisma.flowSession.update({
          where: {
            id: session.id,
          },
          data: {
            variables: storageVariables,
            isActive: false,
          },
        })
      }
    }
  } catch (error) {
    console.log("Error:", error)
  }
})

export { router as WhatsappRouter }
