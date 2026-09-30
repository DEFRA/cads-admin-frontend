import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'

vi.mock('../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

describe('#s3MonitoringDashboardController', () => {
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

  describe('GET S3 Monitoring page', async () => {
    let response = null

    beforeAll(async () => {
      response = await server.inject({
        method: 'GET',
        url: '/s3-monitoring'
      })
    })

    test('Should show S3 Monitoring page', async () => {
      expect(response.result).toEqual(
        expect.stringContaining('S3 Monitoring |')
      )
      expect(response.statusCode).toBe(statusCodes.ok)
    })
  })
})
