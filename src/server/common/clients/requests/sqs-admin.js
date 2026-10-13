import { createApiClient } from '../api-client.js'
import { getConfig } from '../../../../config/config.js'
import {statusCodes} from "../../constants/status-codes.js";

// Read-only queue management endpoints in cads-data-service and cads-bridge
const basePath = '/api/v1/systemadmin/sqs'

function cadsCdsClient(request) {
  return createApiClient(request, getConfig().get('cadsCdsBackendUrl'))
}

function cadsBridgeClient(request) {
  return createApiClient(request, getConfig().get('cadsBridgeBackendUrl'))
}

export async function listQueues(request) {
  const cadsCdsQueues = await getQueueDetails(
    cadsCdsClient(request),
    'CADS Data Service',
    `${basePath}/queues`
  )
  const cadsBridgeQueues = await getQueueDetails(
    cadsBridgeClient(request),
    'CADS Bridge',
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
