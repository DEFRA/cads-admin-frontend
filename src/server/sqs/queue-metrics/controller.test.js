import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { getQueueMetrics } from '../../common/clients/requests/sqs-admin.js'

vi.mock('../../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

vi.mock('../../../auth/helpers/extract-scopes.js', () => ({
  hasAnyScope: vi.fn(() => true)
}))

vi.mock('../../common/clients/requests/sqs-admin.js', () => ({
  getQueueMetrics: vi.fn()
}))

getQueueMetrics.mockResolvedValue([
  {
    queue: 'test-queue',
    metrics: {
      approximateNumberOfMessages: 0,
      approximateNumberOfMessagesNotVisible: 0,
      approximateNumberOfMessagesDelayed: 0,
      oldestMessageAgeSeconds: 0
    }
  },
  {
    queue: 'test-queue',
    metrics: {
      approximateNumberOfMessages: 0,
      approximateNumberOfMessagesNotVisible: 0,
      approximateNumberOfMessagesDelayed: 0,
      oldestMessageAgeSeconds: 0
    }
  }
])

describe('#sqsQueueMetricsController', () => {
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

  describe('GET SQS Metrics page', async () => {
    let response = null

    beforeAll(async () => {
      response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs/test-client/test-queue'
      })
    })

    test('Should show SQS Metrics page', async () => {
      expect(response.result).toEqual(expect.stringContaining('SQS Metrics |'))
      expect(response.statusCode).toBe(statusCodes.ok)
    })
  })

  describe('GET SQS Metrics page when getQueueMetrics fails', () => {
    test('Should return a bad request response', async () => {
      getQueueMetrics.mockRejectedValueOnce(new Error('Failed to fetch'))

      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs/test-client/test-queue'
      })

      expect(response.statusCode).toBe(statusCodes.badRequest)
      expect(response.result).toEqual(
        expect.stringContaining('The request you made is invalid')
      )
    })
  })
})
