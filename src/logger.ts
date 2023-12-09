import { createLogger, format, transports } from "winston"
const { combine, timestamp, printf } = format

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}] ${message}`
})

const logger = createLogger({
  level: "debug",
  format: combine(timestamp({ format: "HH:mm:ss" }), logFormat),
  transports: [new transports.Console()],
})

export default logger
