import {
  getQueueMessages,
  replayDLQMessages,
  replayDLQMessage
} from '../../common/clients/requests/sqs-admin.js'
import Boom from '@hapi/boom'
import { format } from 'date-fns'
import { escapeHtml } from '../../common/helpers/html-utils.js'

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

function buildTableHead(queueType) {
  const head = [
    { text: 'Message ID' },
    { text: 'Sent timestamp' },
    { text: 'Approximate receive count', format: 'numeric' },
    { text: 'Payload preview' }
  ]

  if (queueType === 'dlq') {
    head.push({ text: 'Actions' })
  }

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

function getMaxMessages(request) {
  return request.query.maxMessages || request.payload?.maxMessages || 10
}


function buildReplayMessageActionHtml(
  client,
  queueName,
  maxMessages,
  messageId
) {
  const replayUrl = `/dashboard/monitoring/sqs/${client}/${queueName}/dlq/messages/replay/${encodeURIComponent(messageId)}`
  const safeMessageId = escapeHtml(messageId)

  return `<form method="post" action="${replayUrl}" novalidate class="govuk-!-margin-bottom-0" data-testid="replay-message-form-${safeMessageId}">
  <input type="hidden" name="maxMessages" value="${escapeHtml(maxMessages)}">
  <button type="submit" class="govuk-button govuk-!-margin-bottom-0" data-module="govuk-button" data-prevent-double-click="true" data-testid="replay-message-button-${safeMessageId}">Replay</button>
</form>`
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

function buildTableRows(messages, queueType, client, queueName, maxMessages) {
  return messages.map((message) => {
    const row = [
      { text: message.messageId },
      { text: formatSentTimestamp(message) },
      { text: getApproximateReceiveCount(message), format: 'numeric' },
      { text: getPayloadPreview(message.body) }
    ]

    if (queueType === 'dlq') {
      row.push({
        html: buildReplayMessageActionHtml(
          client,
          queueName,
          maxMessages,
          message.messageId
        )
      })
    }

    return row
  })
}

export const sqsQueueMessagesController = {
  async handler(request, h) {
    const { client, queueName, queueType } = request.params
    const maxMessages = getMaxMessages(request)
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
        head: buildTableHead(queueType),
        rows: buildTableRows(
          messages,
          queueType,
          client,
          queueName,
          maxMessages
        ),
        maxMessagesItems: buildMaxMessagesItems(maxMessages),
        showReplayAllButton: queueType === 'dlq' && messages.length > 0,
        replayUrl: `/dashboard/monitoring/sqs/${client}/${queueName}/dlq/messages/replay`,
        maxMessages,
        replaySummary: buildReplaySummary(request.query)
      }
    })
  }
}

async function handleReplayRequest(request, h, replayAction) {
  const { client, queueName } = request.params
  const maxMessages = getMaxMessages(request)
  let moved = 0
  let failed = 0

  try {
    const result = await replayAction()
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

export const sqsReplayDLQMessagesController = {
  async handler(request, h) {
    const { client, queueName } = request.params
    return handleReplayRequest(request, h, () =>
      replayDLQMessages(request, client, queueName)
    )
  }
}

export const sqsReplayDLQMessageController = {
  async handler(request, h) {
    const { client, queueName, messageId } = request.params
    return handleReplayRequest(request, h, () =>
      replayDLQMessage(request, client, queueName, messageId)
    )
  }
}
