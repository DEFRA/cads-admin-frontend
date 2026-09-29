import { tracing } from '@defra/hapi-tracing'

import { getConfig } from '../../../config/config.js'

export function getRequestTracing() {
  const config = getConfig()
  return {
    plugin: tracing.plugin,
    options: { tracingHeader: config.get('tracing.header') }
  }
}

export function getTracingHeaderName() {
  const config = getConfig()
  return config.get('tracing.header')
}
