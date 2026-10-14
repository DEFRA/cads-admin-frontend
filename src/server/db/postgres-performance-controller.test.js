import * as cheerio from 'cheerio'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { jsonResponse, stubFetch } from '../../../tests/helpers/s3-api-mock.js'
import {
  credentials,
  dbMonitoringUser
} from '../../../tests/helpers/credentials.js'
import {
  postgresResults,
  sensitiveValues
} from '../../../tests/fixtures/db-admin/postgres-results.js'
import { postgresMetrics } from './helpers/postgres-metrics.js'

const fetch = stubFetch()

vi.mock('../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

const commandPath = '/api/v1/systemadmin/db-admin-execute-command'

/**
 * Routes the mocked fetch by the posted command. Commands without an
 * override return the fixture result.
 *
 * @param {Record<string, () => Response>} [overrides]
 */
function mockCdsApi(overrides = {}) {
  const calls = []
  fetch.mockImplementation(async (url, init) => {
    const { pathname } = new URL(url)
    const body = JSON.parse(init?.body ?? '{}')
    calls.push({ pathname, body })
    if (pathname !== commandPath) {
      throw new Error(`Unexpected backend call: ${url}`)
    }
    if (overrides[body.command]) {
      return overrides[body.command]()
    }
    if (!(body.command in postgresResults)) {
      throw new Error(`Unexpected command: ${body.command}`)
    }
    return jsonResponse({
      command: body.command,
      result: postgresResults[body.command]
    })
  })
  return calls
}

describe('#postgresPerformanceController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  async function getPage(
    url = '/dashboard/monitoring/db/postgres-performance',
    creds = dbMonitoringUser
  ) {
    const response = await server.inject({
      method: 'GET',
      url,
      auth: { strategy: 'session', credentials: creds }
    })
    return { response, $: cheerio.load(response.result ?? '') }
  }

  describe('access', () => {
    test.each([
      ['/dashboard/monitoring/db', 'the cads-admin-superuser role'],
      [
        '/dashboard/monitoring/db/postgres-performance',
        'the cads-admin-superuser role'
      ],
      ['/dashboard/monitoring/db', 'the admin.db.execute scope'],
      [
        '/dashboard/monitoring/db/postgres-performance',
        'the admin.db.execute scope'
      ]
    ])(
      'Should redirect %s to the Unauthorised page without %s',
      async (url, missing) => {
        const creds = missing.includes('role')
          ? credentials({ scopes: ['admin.db.execute'] })
          : credentials({ roles: ['cads-admin-superuser'] })

        const { response } = await getPage(url, creds)

        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe('/unauthorised')
        expect(fetch).not.toHaveBeenCalled()
      }
    )

    test('Should open the DB Monitoring tab on the Postgres page', async () => {
      const { response } = await getPage('/dashboard/monitoring/db')

      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        '/dashboard/monitoring/db/postgres-performance'
      )
    })
  })

  describe('summary dashboard', () => {
    test('Should call the execute command endpoint once for each metric', async () => {
      const calls = mockCdsApi()

      const { response } = await getPage()

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toContain('Postgres Performance Monitoring |')
      expect(calls.map((call) => call.body)).toEqual(
        postgresMetrics.map((metric) => ({ command: metric.command }))
      )
    })

    test('Should show the DB Monitoring sub-navigation with this page current', async () => {
      mockCdsApi()

      const { $ } = await getPage()

      const current = $('[data-testid="sub-navigation"] a[aria-current="page"]')
      expect(current.text()).toBe('Postgres Performance Monitoring')
      expect(current.attr('href')).toBe(
        '/dashboard/monitoring/db/postgres-performance'
      )
      expect(
        $(
          '[data-testid="sub-navigation"] a[href="/dashboard/monitoring/db/cts-import"]'
        )
      ).toHaveLength(1)
    })

    test('Should show the headline health figures', async () => {
      mockCdsApi()

      const { $ } = await getPage()

      expect($('[data-testid="figure-active-queries"]').text()).toBe('2')
      expect($('[data-testid="figure-blocked-sessions"]').text()).toBe('1')
      expect($('[data-testid="figure-idle-transactions"]').text()).toBe('1')
      expect($('[data-testid="figure-cache-hit"]').text()).toBe('99.25%')
    })

    test('Should show a card with a details link and data table for each metric', async () => {
      mockCdsApi()

      const { $ } = await getPage()

      const cards = $('[data-testid="metric-card"]')
      expect(
        cards.map((_, card) => $(card).attr('data-command')).get()
      ).toEqual(postgresMetrics.map((metric) => metric.command))

      cards.each((_, card) => {
        const command = $(card).attr('data-command')
        expect(
          $(card).find('[data-testid="metric-detail-link"]').attr('href')
        ).toBe(`/dashboard/monitoring/db/postgres-performance/${command}`)
      })

      const sessions = $('[data-command="sessions_by_state"]')
      const chart = JSON.parse(
        sessions.find('[data-testid="metric-chart"]').attr('data-chart')
      )
      expect(chart).toEqual(
        expect.objectContaining({
          type: 'bar',
          categories: ['active', 'idle', 'idle in transaction']
        })
      )
      expect(
        sessions.find('[data-testid="metric-table"] tbody tr')
      ).toHaveLength(3)
    })

    test('Should not chart the summary metrics', async () => {
      mockCdsApi()

      const { $ } = await getPage()

      const locks = $('[data-command="locks_and_blocking"]')
      expect(locks.find('[data-testid="metric-chart"]')).toHaveLength(0)
      expect(locks.find('[data-testid="metric-summary-value"]').text()).toBe(
        '1'
      )
      expect(
        $('[data-command="prepared_transactions"] [data-testid="metric-empty"]')
      ).toHaveLength(1)
    })

    test('Should offer the cancel, terminate and reset actions', async () => {
      mockCdsApi()

      const { $ } = await getPage()

      expect(
        $('[data-testid="section-actions"] form')
          .map((_, form) => $(form).attr('action'))
          .get()
      ).toEqual([
        '/dashboard/monitoring/db/postgres-performance/actions/cancel-query',
        '/dashboard/monitoring/db/postgres-performance/actions/terminate-query',
        '/dashboard/monitoring/db/postgres-performance/actions/reset-query-statistics'
      ])
      expect($('#cancel-query-pid')).toHaveLength(1)
      expect($('#terminate-query-pid')).toHaveLength(1)
    })

    test('Should load the chart script only on this page', async () => {
      mockCdsApi()

      const { response } = await getPage()

      expect(response.result).toMatch(
        /<script type="module" src="[^"]*db-monitoring[^"]*\.js"><\/script>/
      )
    })

    test('Should not expose SQL, client addresses or internal API details', async () => {
      mockCdsApi()

      const { response } = await getPage()

      for (const value of sensitiveValues) {
        expect(response.result).not.toContain(value)
      }
      expect(response.result).not.toContain('systemadmin')
      expect(response.result).not.toContain('db-admin-execute-command')
      expect(response.result).not.toContain('localhost:5555')
      expect(response.result).not.toContain('access_token')
    })
  })

  describe('API errors', () => {
    test('Should show an error in the failed card and still show the others', async () => {
      mockCdsApi({
        slow_queries: () =>
          jsonResponse(
            {
              title: 'An error occurred',
              detail: 'pg_stat_statements extension is not installed'
            },
            500
          ),
        transactions: () => jsonResponse({ title: 'Forbidden' }, 403)
      })

      const { response, $ } = await getPage()

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(
        $('[data-command="slow_queries"] [data-testid="metric-error"]').text()
      ).toContain('The pg_stat_statements extension may not be installed')
      expect(
        $('[data-command="transactions"] [data-testid="metric-error"]').text()
      ).toContain('You do not have access to Postgres performance monitoring')
      expect(
        $('[data-command="sessions_by_state"] [data-testid="metric-chart"]')
      ).toHaveLength(1)
      expect(response.result).not.toContain('pg_stat_statements extension is')
      expect($('[data-testid="error-summary"]')).toHaveLength(0)
    })

    test('Should say a headline figure is not available when its command fails', async () => {
      mockCdsApi({
        locks_and_blocking: () => new Response('boom', { status: 500 })
      })

      const { $ } = await getPage()

      expect($('[data-testid="figure-blocked-sessions"]').text()).toBe(
        'Not available'
      )
    })

    test('Should show a GOV.UK error summary when every command fails', async () => {
      fetch.mockImplementation(async () => {
        throw new TypeError('fetch failed')
      })

      const { response, $ } = await getPage()

      expect(response.statusCode).toBe(statusCodes.badGateway)
      expect($('[data-testid="error-summary"]').text()).toContain(
        'There was a problem contacting the database monitoring service. Try again later.'
      )
      expect($('[data-testid="metric-card"]')).toHaveLength(0)
      expect($('[data-testid="headline-figures"]')).toHaveLength(0)
    })

    test('Should respond 403 when the API refuses every command', async () => {
      fetch.mockImplementation(async () =>
        jsonResponse({ title: 'Forbidden' }, 403)
      )

      const { response, $ } = await getPage()

      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect($('[data-testid="error-summary"]').text()).toContain(
        'You do not have access to Postgres performance monitoring'
      )
    })
  })

  describe('action outcome', () => {
    test('Should show a success notification banner after an action', async () => {
      mockCdsApi()

      const { $ } = await getPage(
        '/dashboard/monitoring/db/postgres-performance?action=cancel-query&outcome=success&pid=45231'
      )

      const banner = $('[data-testid="action-banner"]')
      expect(banner.hasClass('govuk-notification-banner--success')).toBe(true)
      expect(banner.text()).toContain('Cancel request sent to process 45231')
    })

    test('Should ignore an outcome it does not recognise', async () => {
      mockCdsApi()

      const { $ } = await getPage(
        '/dashboard/monitoring/db/postgres-performance?action=cancel-query&outcome=%3Cb%3Ehi%3C%2Fb%3E&pid=1'
      )

      expect($('[data-testid="action-banner"]')).toHaveLength(0)
    })
  })
})
