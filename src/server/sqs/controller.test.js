import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { listQueues } from '../common/clients/requests/sqs-admin.js'

vi.mock('../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

vi.mock('../common/clients/requests/sqs-admin.js', () => ({
  listQueues: vi.fn()
}))

listQueues.mockResolvedValue([
  {
    name: 'test-queue',
    adminEnabled: true,
    queues: [
      {
        name: 'test-queue',
        queueUrl: 'test-queue',
        dlqQueueUrl: 'test-queue-dlq'
      }
    ]
  },
  {
    name: 'test-queue-2',
    adminEnabled: false,
    queues: []
  }
])

describe('#sqsMonitoringDashboardController', () => {
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

  describe('GET SQS Monitoring page', async () => {
    let response = null

    beforeAll(async () => {
      response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring/sqs'
      })
    })

    test('Should show SQS Monitoring page', async () => {
      expect(response.result).toEqual(
        expect.stringContaining('SQS Monitoring |')
      )
      expect(response.statusCode).toBe(statusCodes.ok)
    })
  })
})
