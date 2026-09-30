import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'

vi.mock('../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

describe('#dbMonitoringDashboardController', () => {
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

  describe('GET DB Monitoring page', async () => {
    let response = null

    beforeAll(async () => {
      response = await server.inject({
        method: 'GET',
        url: '/db-monitoring'
      })
    })

    test('Should show DB Monitoring page', async () => {
      expect(response.result).toEqual(expect.stringContaining('DB Monitoring |'))
      expect(response.statusCode).toBe(statusCodes.ok)
    })
  })
})
