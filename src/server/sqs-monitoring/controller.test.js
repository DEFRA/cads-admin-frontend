import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'

vi.mock('../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

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
        url: '/sqs-monitoring'
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
