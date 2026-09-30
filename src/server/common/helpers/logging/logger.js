import { pino } from 'pino'

import { getLoggerOptions } from './logger-options.js'

const logger = pino(getLoggerOptions())

function createLogger() {
  return logger
}

export { createLogger }
