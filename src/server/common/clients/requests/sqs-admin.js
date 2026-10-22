import { createApiClient } from '../api-client.js'
import { getConfig } from '../../../../config/config.js'
import { statusCodes } from '../../constants/status-codes.js'
import Boom from '@hapi/boom'

// Read-only queue management endpoints in cads-data-service and cads-bridge
const basePath = '/api/v1/systemadmin/sqs'
const cadsBridgeClientName = 'CADS Bridge'
const cadsBridgeClientSlug = 'cads-bridge'
const cadsCdsClientName = 'CADS Data Service'
const cadsCdsClientSlug = 'cads-cds'

function cadsCdsClient(request) {
  return createApiClient(request, getConfig().get('cadsCdsBackendUrl'))
}

function cadsBridgeClient(request) {
  return createApiClient(request, getConfig().get('cadsBridgeBackendUrl'), 'bridge')
}

function resolveClient(request, clientName) {
  return clientName === cadsCdsClientSlug
    ? cadsCdsClient(request)
    : cadsBridgeClient(request)
}

export async function listQueues(request) {
  const cadsCdsQueues = await getQueueDetails(
    cadsCdsClient(request),
    request,
    cadsCdsClientName,
    `${basePath}/queues`
  )
  const cadsBridgeQueues = await getQueueDetails(
    cadsBridgeClient(request),
    request,
    cadsBridgeClientName,
    `${basePath}/queues`
  )
  return [cadsCdsQueues, cadsBridgeQueues]
}

async function getQueueDetails(client, request, clientName, requestPath) {
  try {
    const result = await client.get(requestPath)
    return {
      name: clientName,
      slug:
        clientName === cadsCdsClientName
          ? cadsCdsClientSlug
          : cadsBridgeClientSlug,
      adminEnabled: true,
      queues: result.queues.map((queue) => ({
        name: queue.name,
        queueName: queue.queueUrl.split('/').pop(),
        dlqName: queue.dlqQueueUrl.split('/').pop()
      }))
    }
  } catch (error) {
    request.logger.error(
      {
        err: error,
        causeCode: error.cause?.code,
        causeMessage: error.cause?.message
      },
      error.message
    )
    if (error.output?.statusCode === statusCodes.notFound) {
      return {
        name: clientName,
        slug:
          clientName === cadsCdsClientName
            ? cadsCdsClientSlug
            : cadsBridgeClientSlug,
        adminEnabled: false,
        queues: []
      }
    }
    throw error
  }
}

export async function getQueueMetrics(request, clientName, queueName) {
  const client = resolveClient(request, clientName)
  const queuePath = `${basePath}/queues/${queueName}/metrics`
  const dqlPath = `${basePath}/queues/${queueName}/dlq/metrics`
  try {
    const queueMetrics = await client.get(queuePath)
    const dlqMetrics = await client.get(dqlPath)
    return [queueMetrics, dlqMetrics]
  } catch (error) {
    request.logger.error(
      {
        err: error,
        causeCode: error.cause?.code,
        causeMessage: error.cause?.message
      },
      error.message
    )
    throw Boom.badRequest(error.message)
  }
}

export async function getQueueMessages(
  request,
  clientName,
  queueName,
  queueType,
  maxMessages
) {
  const client = resolveClient(request, clientName)
  const queuePath =
    queueType === 'dlq'
      ? `${basePath}/queues/${queueName}/dlq/messages?maxMessages=${maxMessages}`
      : `${basePath}/queues/${queueName}/messages?maxMessages=${maxMessages}`
  try {
    return await client.get(queuePath)
  } catch (error) {
    request.logger.error(
      {
        err: error,
        causeCode: error.cause?.code,
        causeMessage: error.cause?.message
      },
      error.message
    )
    throw Boom.badRequest(error.message)
  }
}

export async function replayDLQMessages(request, clientName, queueName) {
  const client = resolveClient(request, clientName)
  const queuePath = `${basePath}/queues/${queueName}/dlq/replay`
  const body = {
    BatchSize: 10
  }
  try {
    return await client.post(queuePath, body)
  } catch (error) {
    request.logger.error(
      {
        err: error,
        causeCode: error.cause?.code,
        causeMessage: error.cause?.message
      },
      error.message
    )
    throw Boom.badRequest(error.message)
  }
}

export async function replayDLQMessage(
  request,
  clientName,
  queueName,
  messageId
) {
  const client = resolveClient(request, clientName)
  const queuePath = `${basePath}/queues/${queueName}/dlq/replay/${messageId}`
  try {
    return await client.post(queuePath)
  } catch (error) {
    request.logger.error(
      {
        err: error,
        causeCode: error.cause?.code,
        causeMessage: error.cause?.message
      },
      error.message
    )
    throw Boom.badRequest(error.message)
  }
}
