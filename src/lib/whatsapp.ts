import axios from "axios"
import { Webhook } from "../types/whatsapp/webhook.js"
import { SendMessageConfig, WhatsappFlowStep } from "../types/flow.js"
import { populateVariableValue } from "../utils/helper.js"
import logger from "../logger.js"

export async function sendWhatsappMessage(
  phoneNumberId: string,
  phoneNumber: string,
  config: SendMessageConfig,
  storageVariables: { [key: string]: string }
) {
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phoneNumber,
    type: config.messageType,
  }

  switch (config.messageType) {
    case "text":
      payload["text"] = {
        body: populateVariableValue(config.text, storageVariables),
      }
      break
    case "interactive":
      payload["interactive"] = {
        type: config.interactionType,
        body: { text: config.text },
        ...(config.headerText && {
          header: { type: "text", text: config.headerText },
        }),
        ...(config.footerText && {
          footer: { text: config.footerText },
        }),
        action: {
          button: "View options",
          sections: [
            {
              rows: config.options,
            },
          ],
        },
      }
      break
    default:
      payload[config.messageType] = {
        link: config.link,
        ...(config.caption && {
          caption: populateVariableValue(config.caption, storageVariables),
        }),
      }
      break
  }
  try {
    const response = await axios.post(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      payload,
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        },
      }
    )
    return { status: "success", response: response.data }
  } catch (error) {
    console.log(error)
    return { status: "fail" }
  }
}

export function whatsappWebhookPayloadParser(payload: Webhook) {
  return {
    accountId: payload.entry[0].id,
    phoneNumberId: payload.entry[0].changes[0].value.metadata.phone_number_id,
    userProfileName: payload.entry[0].changes[0].value.contacts[0].profile.name,
    userPhoneNumber: payload.entry[0].changes[0].value.contacts[0].wa_id,
    message: payload.entry[0].changes[0].value.messages[0],
  }
}

export async function validateAndUpdateVariables(
  step: WhatsappFlowStep,
  eventData: ReturnType<typeof whatsappWebhookPayloadParser>,
  storageVariables: { [key: string]: string }
) {
  if (step.type !== "ask_question") return true
  if (step.messageConfig.messageType !== eventData.message.type) {
    await sendWhatsappMessage(
      eventData.phoneNumberId,
      eventData.userPhoneNumber,
      step.messageConfig,
      {}
    )
    logger.info(
      `Message type missmatch for: ${eventData.userPhoneNumber}, resending lastStep message`
    )
    return false
  }
  const { messageConfig, validations } = step
  switch (messageConfig.messageType) {
    case "text":
      let isValid = true
      const input = eventData.message.text.body
      if (validations.min && input.length < validations.min) isValid = false
      if (validations.max && input.length > validations.max) isValid = false
      if (validations.regex && !new RegExp(validations.regex).test(input))
        isValid = false
      if (!isValid) {
        await sendWhatsappMessage(
          eventData.phoneNumberId,
          eventData.userPhoneNumber,
          {
            messageType: "text",
            text: step.invalidInputErrorText ?? step.messageConfig.text,
          },
          storageVariables
        )
        logger.info(
          `Invalid input for type text for stepId: ${step.id} from: ${eventData.userPhoneNumber}, sent error message`
        )
        return false
      }
      storageVariables[step.storageVariable] = input
      return true
    case "interactive":
      storageVariables[step.storageVariable] =
        eventData.message.interactive[eventData.message.interactive.type].title
      return true
    default:
      return true
  }
}

export async function whatsappBotFlowStepHandler(
  step: WhatsappFlowStep,
  eventData: ReturnType<typeof whatsappWebhookPayloadParser>,
  storageVariables: { [key: string]: string }
) {
  if (step.type === "send_message" || step.type === "ask_question") {
    await sendWhatsappMessage(
      eventData.phoneNumberId,
      eventData.userPhoneNumber,
      step.messageConfig,
      storageVariables
    )
  }

  if (step.type === "api_call") {
    try {
      step.body.payload = populateVariableValue(
        step.body.payload,
        storageVariables
      )
      const response = await axios({
        method: step.method,
        url: step.url,
        headers: step.headers,
        data: step.body.payload,
      })
      if (step.storageVariable) {
        storageVariables[step.storageVariable] = response.data
      }
    } catch (error) {
      console.log(`api_call step error:`, error)
    }
  }
}
