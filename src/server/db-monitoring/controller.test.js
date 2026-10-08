import * as cheerio from 'cheerio'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import {
  credentials,
  ctsImportUser
} from '../../../tests/helpers/credentials.js'

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
      expect(response.result).toEqual(
        expect.stringContaining('DB Monitoring |')
      )
      expect(response.statusCode).toBe(statusCodes.ok)
    })
  })

  describe('CTS Parallel Import Monitoring link', () => {
    async function ctsLinks(creds) {
      const response = await server.inject({
        method: 'GET',
        url: '/db-monitoring',
        auth: { strategy: 'session', credentials: creds }
      })
      return cheerio.load(response.result)(
        'a[href="/db-monitoring/cts-import"]'
      )
    }

    test('Should show the link to a superuser with the admin.db.execute scope', async () => {
      const links = await ctsLinks(ctsImportUser)

      expect(links).toHaveLength(1)
      expect(links.text()).toContain('CTS Parallel Import Monitoring')
    })

    test.each([
      ['role', credentials({ scopes: ['admin.db.execute'] })],
      ['scope', credentials({ roles: ['cads-admin-superuser'] })]
    ])('Should hide the link without the required %s', async (_, creds) => {
      expect(await ctsLinks(creds)).toHaveLength(0)
    })
  })
})
