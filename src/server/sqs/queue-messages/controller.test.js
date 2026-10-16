import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import {
  getQueueMessages,
  replayDLQMessages
} from '../../common/clients/requests/sqs-admin.js'

vi.mock('../../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

vi.mock('../../../auth/helpers/extract-scopes.js', () => ({
  hasAnyScope: vi.fn(() => true)
}))

vi.mock('../../common/clients/requests/sqs-admin.js', () => ({
  getQueueMessages: vi.fn(),
  replayDLQMessages: vi.fn()
}))

const sampleMessage = {
  messageId: 'message-1',
  sentTimestamp: '1700000000000',
  attributes: { ApproximateReceiveCount: '3' },
  body: 'test payload'
}

describe('#sqsQueueMessagesController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET SQS Messages page', () => {
    test('Should show SQS Messages page with message rows', async () => {
      getQueueMessages.mockResolvedValue({ messages: [sampleMessage] })

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/messages/messages'
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toEqual(
        expect.stringContaining('SQS Queue Messages |')
      )
      expect(response.result).toEqual(expect.stringContaining('message-1'))
    })

    test('Should show the no messages message when there are none', async () => {
      getQueueMessages.mockResolvedValue({ messages: [] })

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/messages/messages'
      })

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toEqual(
        expect.stringContaining('There are no messages on this queue.')
      )
    })

    test('Should return a bad request response when getQueueMessages fails', async () => {
      getQueueMessages.mockRejectedValue(new Error('Failed to fetch'))

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/messages/messages'
      })

      expect(response.statusCode).toBe(statusCodes.badRequest)
      expect(response.result).toEqual(
        expect.stringContaining('The request you made is invalid')
      )
    })

    test('Should show the replay all button when viewing the dlq with messages', async () => {
      getQueueMessages.mockResolvedValue({ messages: [sampleMessage] })

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/dlq/messages'
      })

      expect(response.result).toEqual(
        expect.stringContaining('data-testid="replay-all-button"')
      )
      expect(response.result).toEqual(
        expect.stringContaining(
          'action="/dashboard/monitoring/sqs/test-client/test-queue/dlq/messages/replay"'
        )
      )
    })

    test('Should not show the replay all button for a non-dlq queue', async () => {
      getQueueMessages.mockResolvedValue({ messages: [sampleMessage] })

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/messages/messages'
      })

      expect(response.result).toEqual(
        expect.not.stringContaining('data-testid="replay-all-button"')
      )
    })

    test('Should not show the replay all button when the dlq is empty', async () => {
      getQueueMessages.mockResolvedValue({ messages: [] })

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/dlq/messages'
      })

      expect(response.result).toEqual(
        expect.not.stringContaining('data-testid="replay-all-button"')
      )
    })

    test('Should show a success replay summary banner after a replay with no failures', async () => {
      getQueueMessages.mockResolvedValue({ messages: [] })

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/dlq/messages?replayed=1&moved=3&failed=0'
      })

      expect(response.result).toEqual(
        expect.stringContaining('data-testid="replay-summary"')
      )
      expect(response.result).toEqual(expect.stringContaining('3'))
      expect(response.result).not.toEqual(
        expect.stringContaining('Check the service logs for failure details.')
      )
    })

    test('Should show a replay summary banner advising to check logs when there are failures', async () => {
      getQueueMessages.mockResolvedValue({ messages: [] })

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/dlq/messages?replayed=1&moved=1&failed=2'
      })

      expect(response.result).toEqual(
        expect.stringContaining('data-testid="replay-summary"')
      )
      expect(response.result).toEqual(
        expect.stringContaining('Check the service logs for failure details.')
      )
    })

    test('Should not show a replay summary banner when replayed query param is absent', async () => {
      getQueueMessages.mockResolvedValue({ messages: [] })

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/dlq/messages'
      })

      expect(response.result).toEqual(
        expect.not.stringContaining('data-testid="replay-summary"')
      )
    })
  })

  describe('POST replay DLQ messages', () => {
    test('Should replay the dlq messages and redirect back to the messages page with a summary', async () => {
      replayDLQMessages.mockResolvedValue({
        queue: 'CadsCds',
        moved: 2,
        failed: 0,
        errors: []
      })

      const response = await server.inject({
        method: 'POST',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/dlq/messages/replay'
      })

      expect(replayDLQMessages).toHaveBeenCalledWith(
        expect.anything(),
        'test-client',
        'test-queue'
      )
      expect(response.statusCode).toBe(statusCodes.found)
      expect(response.headers.location).toBe(
        '/dashboard/monitoring/sqs/test-client/test-queue/dlq/messages?maxMessages=10&replayed=1&moved=2&failed=0'
      )
    })

    test('Should preserve the maxMessages filter on redirect', async () => {
      replayDLQMessages.mockResolvedValue({
        queue: 'CadsCds',
        moved: 0,
        failed: 0,
        errors: []
      })

      const response = await server.inject({
        method: 'POST',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/dlq/messages/replay?maxMessages=5'
      })

      expect(response.headers.location).toBe(
        '/dashboard/monitoring/sqs/test-client/test-queue/dlq/messages?maxMessages=5&replayed=1&moved=0&failed=0'
      )
    })

    test('Should log the replay errors when there are failures', async () => {
      replayDLQMessages.mockResolvedValue({
        queue: 'CadsCds',
        moved: 1,
        failed: 1,
        errors: ['Message abc failed validation']
      })

      const response = await server.inject({
        method: 'POST',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/dlq/messages/replay'
      })

      expect(response.headers.location).toEqual(
        expect.stringContaining('failed=1')
      )
    })

    test('Should return a bad request response when replayDLQMessages fails', async () => {
      replayDLQMessages.mockRejectedValue(new Error('Replay failed'))

      const response = await server.inject({
        method: 'POST',
        url: '/dashboard/monitoring/sqs/test-client/test-queue/dlq/messages/replay'
      })

      expect(response.statusCode).toBe(statusCodes.badRequest)
      expect(response.result).toEqual(
        expect.stringContaining('The request you made is invalid')
      )
    })
  })
})
