import { createServer } from '../../server.js'
import { statusCodes } from '../../common/constants/status-codes.js'
import { getQueueMetrics } from '../../common/clients/requests/sqs-admin.js'
import { sqsQueueMetricsController } from './controller.js'

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
})
