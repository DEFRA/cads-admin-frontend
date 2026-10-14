import { createApiClient } from '../api-client.js'
import { getConfig } from '../../../../config/config.js'
import { statusCodes } from '../../constants/status-codes.js'
import Boom from '@hapi/boom'

// Read-only queue management endpoints in cads-data-service and cads-bridge
const basePath = '/api/v1/systemadmin/sqs'
const cadsBridgeClientName = 'CADS Bridge'
const cadsCdsClientName = 'CADS Data Service'

function cadsCdsClient(request) {
  return createApiClient(request, getConfig().get('cadsCdsBackendUrl'))
}

function cadsBridgeClient(request) {
  return createApiClient(request, getConfig().get('cadsBridgeBackendUrl'))
}

export async function listQueues(request) {
  const cadsCdsQueues = await getQueueDetails(
    cadsCdsClient(request),
    cadsCdsClientName,
    `${basePath}/queues`
  )
  const cadsBridgeQueues = await getQueueDetails(
    cadsBridgeClient(request),
    cadsBridgeClientName,
    `${basePath}/queues`
  )
  return [cadsCdsQueues, cadsBridgeQueues]
}

async function getQueueDetails(client, clientName, requestPath) {
  try {
    const result = await client.get(requestPath)
    return {
      name: clientName,
      adminEnabled: true,
      queues: result.queues.map((queue) => ({
        name: queue.name,
        queueName: queue.queueUrl.split('/').pop(),
        dlqName: queue.dlqQueueUrl.split('/').pop()
      }))
    }
  } catch (error) {
    if (error.output.statusCode === statusCodes.notFound) {
      return {
        name: clientName,
        adminEnabled: false,
        queues: []
      }
    }
    throw error
  }
}

export async function queueMetrics(request, clientName, queueName) {
  const client =
    clientName === cadsCdsClientName
      ? cadsCdsClient(request)
      : cadsBridgeClient(request)
  return await getQueueMetrics(client, clientName, queueName)
}

async function getQueueMetrics(client, clientName, queueName) {
  const queuePath = `${basePath}/queues/${queueName}/metrics`
  const dqlPath = `${basePath}/queues/${queueName}/dlq/metrics`
  try {
    const queueMetrics = await client.get(queuePath)
    const dlqMetrics = await client.get(dqlPath)
    return [queueMetrics, dlqMetrics]
  } catch (error) {
    throw Boom.badRequest(error.message)
  }
}
