import {
  getQueueMessages,
  replayDLQMessages
} from '../../common/clients/requests/sqs-admin.js'
import Boom from '@hapi/boom'
import { format } from 'date-fns'

const payloadPreviewMaxLength = 200
const NOT_AVAILABLE = 'Not available'

function formatSentTimestamp(message) {
  const rawTimestamp =
    message.sentTimestamp ?? message.attributes?.SentTimestamp
  if (!rawTimestamp) {
    return NOT_AVAILABLE
  }

  const date = new Date(Number(rawTimestamp))
  if (Number.isNaN(date.getTime())) {
    return NOT_AVAILABLE
  }

  return format(date, 'd MMM yyyy, HH:mm:ss')
}

function getApproximateReceiveCount(message) {
  return message.attributes?.ApproximateReceiveCount ?? NOT_AVAILABLE
}

function getPayloadPreview(body) {
  if (!body) {
    return ''
  }

  return body.length > payloadPreviewMaxLength
    ? `${body.slice(0, payloadPreviewMaxLength)}…`
    : body
}

function buildTableHead() {
  const head = [
    { text: 'Message ID' },
    { text: 'Sent timestamp' },
    { text: 'Approximate receive count', format: 'numeric' },
    { text: 'Payload preview' }
  ]

  return head
}

function buildMessagesUrl(client, queueName, queueType, params = {}) {
  const basePath = `/dashboard/monitoring/sqs/${client}/${queueName}/${queueType}/messages`
  const query = new URLSearchParams()
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.set(name, String(value))
    }
  }
  const queryString = query.toString()
  return queryString ? `${basePath}?${queryString}` : basePath
}

function buildReplaySummary(query) {
  if (query.replayed !== '1') {
    return null
  }

  const moved = Number(query.moved ?? 0)
  const failed = Number(query.failed ?? 0)

  return {
    moved,
    failed,
    checkLogsForFailures: failed > 0
  }
}

function buildMaxMessagesItems(maxMessages) {
  const items = [
    { value: '2', text: '2' },
    { value: '5', text: '5' },
    { value: '10', text: '10' }
  ]
  items.find((item) => item.value === String(maxMessages)).selected = true
  return items
}

function buildTableRows(messages) {
  return messages.map((message) => {
    const row = [
      { text: message.messageId },
      { text: formatSentTimestamp(message) },
      { text: getApproximateReceiveCount(message), format: 'numeric' },
      { text: getPayloadPreview(message.body) }
    ]

    return row
  })
}

export const sqsQueueMessagesController = {
  async handler(request, h) {
    const { client, queueName, queueType } = request.params
    const maxMessages = request.query.maxMessages || 10
    const messages = []
    try {
      const result = await getQueueMessages(
        request,
        client,
        queueName,
        queueType,
        maxMessages
      )
      messages.push(...result.messages)
    } catch (error) {
      return Boom.badRequest(error.message)
    }
    return h.view('sqs/queue-messages/index', {
      pageTitle: 'SQS Queue Messages',
      heading: 'Message queue and DLQ monitoring',
      breadcrumbs: [
        {
          text: 'Dashboard',
          href: '/dashboard'
        },
        {
          text: 'Monitoring',
          href: '/dashboard/monitoring'
        },
        {
          text: 'SQS',
          href: '/dashboard/monitoring/sqs'
        },
        {
          text: 'Messages'
        }
      ],
      viewModel: {
        messages,
        queueType,
        head: buildTableHead(),
        rows: buildTableRows(messages),
        maxMessagesItems: buildMaxMessagesItems(maxMessages),
        showReplayAllButton: queueType === 'dlq' && messages.length > 0,
        replayUrl: `/dashboard/monitoring/sqs/${client}/${queueName}/dlq/messages/replay`,
        maxMessages,
        replaySummary: buildReplaySummary(request.query)
      }
    })
  }
}

export const sqsReplayDLQMessagesController = {
  async handler(request, h) {
    const { client, queueName } = request.params
    const maxMessages = request.query.maxMessages || 10
    let moved = 0
    let failed = 0

    try {
      const result = await replayDLQMessages(request, client, queueName)
      moved = result?.moved ?? 0
      failed = result?.failed ?? 0
      if (failed > 0 && result?.errors?.length) {
        request.logger?.error(
          { queue: result.queue, errors: result.errors },
          'SQS DLQ replay reported failures'
        )
      }
    } catch (error) {
      return Boom.badRequest(error.message)
    }

    return h.redirect(
      buildMessagesUrl(client, queueName, 'dlq', {
        maxMessages,
        replayed: 1,
        moved,
        failed
      })
    )
  }
}
