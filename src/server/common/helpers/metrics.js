/* istanbul ignore file */

import {
  createMetricsLogger,
  Unit,
  StorageResolution
} from 'aws-embedded-metrics'

import { getConfig } from '../../../config/config.js'
import { createLogger } from './logging/logger.js'

/**
 * Aws embedded metrics wrapper
 */
export async function metricsCounter(metricName, value = 1) {
  const config = getConfig()
  const isMetricsEnabled = config.get('isMetricsEnabled')

  if (!isMetricsEnabled) {
    return
  }

  try {
    const metricsLogger = createMetricsLogger()
    metricsLogger.putMetric(
      metricName,
      value,
      Unit.Count,
      StorageResolution.Standard
    )
    await metricsLogger.flush()
  } catch (error) {
    createLogger().error(error, error.message)
  }
}
