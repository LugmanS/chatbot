export type FlowSteps = WhatsappFlowStep[]

export enum ResponseMessageType {
  "ask_text" = "text",
  "ask_file" = "document",
}

type OnInvalidUserResponse = "end_flow" | "skip_step" | "fallback"

export type WhatsappFlowStep = {
  id: string
  storageVariable?: string
  nextId?: string
} & (SendMessage | AskQuestion | ApiCall)

export type SendMessage = {
  type: "send_message"
  isBlocking: false
  messageConfig: SendMessageConfig
}

export type SendMessageConfig = TextMessage | MediaMessage | InteractiveMessage

export type TextMessage = {
  messageType: "text"
  text: string
}

export type MediaMessage = {
  messageType: "document" | "audio" | "image"
  link: string
  caption?: string
}

export type InteractiveMessage = {
  messageType: "interactive"
} & ListInteraction

export type ListInteraction = {
  interactionType: "list"
  headerText?: string
  text: string
  footerText?: string
  buttonText?: string
  options: { id: string; title: string; description: string }[]
}

export type ValidationConfig = {
  min?: number
  max?: number
  regex?: RegExp
}

export type AskQuestion = {
  type: "ask_question"
  maxAttempts: number
  validations?: ValidationConfig
  onInvalidResponse: OnInvalidUserResponse
  invalidInputErrorText?: string
  nextIdOnFailure?: string
  isBlocking: true
  messageConfig: TextMessage | InteractiveMessage
}

export type ApiCall = {
  type: "api_call"
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  url: string
  headers?: {
    [key: string]: string
  }
  body?: {
    contentType: "JSON" | "URLEncoded"
    payload: string
  }
  nextIdOnFailure?: string
  isBlocking: false
}
