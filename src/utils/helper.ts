import { WhatsappFlowStep } from "../types/flow.js"
import { WebhookMessage } from "../types/whatsapp/webhook.js"

export function generateFallbackText(
  username: string,
  availableIntents: string[]
) {
  return `Hey ${username},\nThanks for contacting us. Unfortunately we couldn't resolve a possible for the your message. Try sending any of the below keys\n${availableIntents.join(
    ", "
  )}`
}

export function populateVariableValue(
  input: string,
  storedVariables: { [key: string]: string }
) {
  Object.keys(storedVariables).forEach(
    (variable) =>
      (input = input.replace(
        new RegExp(`{{${variable}}}`, "g"),
        storedVariables[variable]
      ))
  )
  return input
}

export function validateInput(step: WhatsappFlowStep, message: WebhookMessage) {
  if (step.type !== "ask_question") return true
  const { messageConfig, validations } = step
  switch (messageConfig.messageType) {
    case "text":
      const input = message.text.body
      if (validations.min && input.length < validations.min) return false
      if (validations.max && input.length > validations.max) return false
      if (validations.regex && !new RegExp(validations.regex).test(input))
        return false
      return true
    default:
      return true
  }
}
