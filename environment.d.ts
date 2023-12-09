declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PORT?: string
      DATABASE_URL: string
      DIRECT_URL: string
      WHATSAPP_WEBHOOK_VERIFICATION_TOKEN: string
      WHATSAPP_ACCESS_TOKEN: string
    }
  }
}

export {}
