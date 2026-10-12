import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'

vi.mock('../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

describe('#monitoringController', () => {
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

  describe('GET monitoring page', async () => {
    let response = null

    beforeAll(async () => {
      response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring'
      })
    })

    test('Should show monitoring dashboard page', async () => {
      expect(response.result).toEqual(
        expect.stringContaining('Dashboard | Monitoring')
      )
      expect(response.statusCode).toBe(statusCodes.ok)
    })
  })
})
