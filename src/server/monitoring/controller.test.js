import * as cheerio from 'cheerio'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import {
  credentials,
  dbMonitoringUser
} from '../../../tests/helpers/credentials.js'

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
        expect.stringContaining('Monitoring Dashboard |')
      )
      expect(response.statusCode).toBe(statusCodes.ok)
    })
  })

  describe('DB Monitoring card', () => {
    async function dbMonitoringCards(creds) {
      const response = await server.inject({
        method: 'GET',
        url: '/dashboard/monitoring',
        auth: { strategy: 'session', credentials: creds }
      })
      return cheerio.load(response.result)('a[href="monitoring/db"]')
    }

    test('Should show the card to a superuser with the admin.db.execute scope', async () => {
      expect(await dbMonitoringCards(dbMonitoringUser)).toHaveLength(1)
    })

    test.each([
      ['role', credentials({ scopes: ['admin.db.execute'] })],
      ['scope', credentials({ roles: ['cads-admin-superuser'] })]
    ])('Should hide the card without the required %s', async (_, creds) => {
      expect(await dbMonitoringCards(creds)).toHaveLength(0)
    })
  })
})
