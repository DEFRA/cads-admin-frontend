import http from 'node:http'
import * as cheerio from 'cheerio'

import {
  appOrigin,
  oidcClient,
  oidcUsers,
  signIn,
  startOidcMock,
  startRedis
} from '../helpers/oidc-mock.js'
import { postgresResults } from '../../fixtures/db-admin/postgres-results.js'

// Signs in through the OIDC mock (cads-tools/oidc) and checks who can reach
// the DB Monitoring tab. Needs Docker: run with npm run test:integration.

const redisPassword = 'integration-test-password'

/** Stands in for cads-data-service, recording each call's bearer token. */
function startCdsStub() {
  const calls = []
  const stub = http.createServer((req, res) => {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      const { command } = JSON.parse(body || '{}')
      calls.push({ path: req.url, command, auth: req.headers.authorization })
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(
        JSON.stringify({ command, result: postgresResults[command] ?? [] })
      )
    })
  })
  return new Promise((resolve) => {
    stub.listen(0, '127.0.0.1', () =>
      resolve({
        url: `http://127.0.0.1:${stub.address().port}`,
        calls,
        stop: () => new Promise((resolve) => stub.close(resolve))
      })
    )
  })
}

function scopesOf(bearer) {
  const payload = bearer.replace('Bearer ', '').split('.')[1]
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
  return [claims.scope].flat()
}

describe('DB Monitoring access with the OIDC mock', () => {
  let oidc
  let redis
  let cds
  let server

  beforeAll(async () => {
    ;[oidc, redis, cds] = await Promise.all([
      startOidcMock(),
      startRedis(redisPassword),
      startCdsStub()
    ])

    Object.assign(process.env, {
      OIDC_CLIENT_ID: oidcClient.id,
      OIDC_CLIENT_SECRET: oidcClient.secret,
      OIDC_WELL_KNOWN_URL: `${oidc.url}/.well-known/openid-configuration`,
      OIDC_AUTHORIZATION_ENDPOINT: `${oidc.url}/connect/authorize`,
      OIDC_END_SESSION_ENDPOINT: `${oidc.url}/connect/endsession`,
      OIDC_ALLOWED_REDIRECT_ORIGINS: appOrigin,
      OIDC_POST_LOGIN_REDIRECT_URI: '/dashboard',
      USE_SIMPLE_SCOPES: 'true',
      SESSION_COOKIE_PASSWORD: 'integration-test-cookie-password-32-chars',
      REDIS_HOST: redis.host,
      REDIS_PORT: String(redis.port),
      REDIS_USERNAME: 'default',
      REDIS_PASSWORD: redisPassword,
      REDIS_TLS: 'false',
      USE_SINGLE_INSTANCE_CACHE: 'true',
      CADS_CDS_BACKEND_URL: cds.url
    })

    // Load the config and server after the environment points at the
    // containers
    vi.resetModules()
    const { createServer } = await import('../../../src/server/server.js')
    server = await createServer()
    await server.initialize()
  }, 300_000)

  afterAll(async () => {
    await server?.stop({ timeout: 0 })
    await Promise.all([oidc?.stop(), redis?.stop(), cds?.stop()])
  })

  beforeEach(() => {
    cds.calls.length = 0
  })

  const get = (url, cookie) =>
    server.inject({
      url,
      headers: { host: new URL(appOrigin).host, ...(cookie ? { cookie } : {}) }
    })

  async function dbMonitoringCards(cookie) {
    const response = await get('/dashboard/monitoring', cookie)
    return cheerio.load(response.result)('a[href="monitoring/db"]')
  }

  test('Should send an unauthenticated user to sign in', async () => {
    const response = await get('/dashboard/monitoring/db/postgres-performance')

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(
      '/login?redirect=%2Fdashboard%2Fmonitoring%2Fdb%2Fpostgres-performance'
    )
  })

  describe('with the admin.db.execute scope', () => {
    let cookie

    beforeAll(async () => {
      cookie = await signIn(server, oidcUsers.admin)
    })

    test('Should show the DB Monitoring card', async () => {
      expect(await dbMonitoringCards(cookie)).toHaveLength(1)
    })

    test('Should open the tab on the Postgres Performance Monitoring page', async () => {
      const tab = await get('/dashboard/monitoring/db', cookie)
      expect(tab.statusCode).toBe(302)
      expect(tab.headers.location).toBe(
        '/dashboard/monitoring/db/postgres-performance'
      )

      const page = await get(tab.headers.location, cookie)
      expect(page.statusCode).toBe(200)

      const $ = cheerio.load(page.result)
      expect($('h1').text().trim()).toBe('Postgres Performance Monitoring')
      expect($('[data-testid="metric-card"]').length).toBeGreaterThan(0)
    })

    test('Should call the backend with the signed-in user token', async () => {
      await get('/dashboard/monitoring/db/postgres-performance', cookie)

      expect(cds.calls.length).toBeGreaterThan(0)
      for (const call of cds.calls) {
        expect(call.path).toBe('/api/v1/systemadmin/db-admin-execute-command')
        expect(scopesOf(call.auth)).toContain('admin.db.execute')
      }
    })
  })

  describe('without the admin.db.execute scope', () => {
    let cookie

    beforeAll(async () => {
      cookie = await signIn(server, oidcUsers.admin, {
        removeScopes: ['admin.db.execute']
      })
    })

    test('Should hide the DB Monitoring card', async () => {
      expect(await dbMonitoringCards(cookie)).toHaveLength(0)
    })

    test.each([
      '/dashboard/monitoring/db',
      '/dashboard/monitoring/db/postgres-performance',
      '/dashboard/monitoring/db/postgres-performance/active_queries',
      '/dashboard/monitoring/db/cts-import'
    ])('Should redirect %s to the Unauthorised page', async (url) => {
      const response = await get(url, cookie)

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe('/unauthorised')
      expect(cds.calls).toEqual([])

      const unauthorised = await get(response.headers.location, cookie)
      expect(unauthorised.statusCode).toBe(403)
      expect(unauthorised.result).toContain(
        'Sorry, you do not have permission to view this page'
      )
    })

    test('Should not run an action', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/dashboard/monitoring/db/postgres-performance/actions/cancel-query',
        headers: {
          host: new URL(appOrigin).host,
          cookie,
          'content-type': 'application/x-www-form-urlencoded'
        },
        payload: 'pid=1'
      })

      expect(response.headers.location).toBe('/unauthorised')
      expect(cds.calls).toEqual([])
    })
  })
})
