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

const fetch = stubFetch()

vi.mock('../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

function mockCommand(command, response) {
  const calls = []
  fetch.mockImplementation(async (_url, init) => {
    const body = JSON.parse(init?.body ?? '{}')
    calls.push(body)
    if (body.command !== command) {
      throw new Error(`Unexpected command: ${body.command}`)
    }
    return response()
  })
  return calls
}

describe('#postgresDetailController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  async function getPage(url, creds = dbMonitoringUser) {
    const response = await server.inject({
      method: 'GET',
      url,
      auth: { strategy: 'session', credentials: creds }
    })
    return { response, $: cheerio.load(response.result ?? '') }
  }

  test('Should redirect to the Unauthorised page without the scope', async () => {
    const { response } = await getPage(
      '/dashboard/monitoring/db/postgres-performance/active_queries',
      credentials()
    )

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/unauthorised')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('Should show every row of the command passed in the link', async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      pid: 1000 + index,
      usename: 'app',
      datname: 'cads',
      state: 'active',
      duration: `00:00:${String(index).padStart(2, '0')}`,
      query: 'SELECT secret FROM cads.animals'
    }))
    const calls = mockCommand('active_queries', () =>
      jsonResponse({ command: 'active_queries', result: rows })
    )

    const { response, $ } = await getPage(
      '/dashboard/monitoring/db/postgres-performance/active_queries'
    )

    expect(response.statusCode).toBe(statusCodes.ok)
    expect(calls).toEqual([{ command: 'active_queries' }])
    expect($('h1').text().trim()).toBe('Longest running queries')
    expect($('[data-testid="detail-table"] tbody tr')).toHaveLength(12)
    expect(response.result).not.toContain('SELECT secret')
    expect(
      $('[data-testid="sub-navigation"] a[aria-current="page"]').text()
    ).toBe('Postgres Performance Monitoring')
  })

  test('Should offer the cancel and terminate actions for a command listing processes', async () => {
    mockCommand('idle_in_transaction', () =>
      jsonResponse({
        command: 'idle_in_transaction',
        result: postgresResults.idle_in_transaction
      })
    )

    const { $ } = await getPage(
      '/dashboard/monitoring/db/postgres-performance/idle_in_transaction'
    )

    const forms = $('[data-testid="section-actions"] form')
    expect(forms.map((_, form) => $(form).attr('action')).get()).toEqual([
      '/dashboard/monitoring/db/postgres-performance/actions/cancel-query',
      '/dashboard/monitoring/db/postgres-performance/actions/terminate-query'
    ])
    expect(
      forms
        .find('input[name="returnTo"]')
        .map((_, input) => $(input).attr('value'))
        .get()
    ).toEqual(['idle_in_transaction', 'idle_in_transaction'])
  })

  test('Should be read-only for a command without processes', async () => {
    mockCommand('largest_tables', () =>
      jsonResponse({
        command: 'largest_tables',
        result: postgresResults.largest_tables
      })
    )

    const { $, response } = await getPage(
      '/dashboard/monitoring/db/postgres-performance/largest_tables'
    )

    expect($('form[method="post"]')).toHaveLength(0)
    expect($('[data-testid="detail-table"] tbody tr')).toHaveLength(2)
    for (const value of sensitiveValues) {
      expect(response.result).not.toContain(value)
    }
  })

  test('Should say when there is no data', async () => {
    mockCommand('prepared_transactions', () =>
      jsonResponse({ command: 'prepared_transactions', result: [] })
    )

    const { $ } = await getPage(
      '/dashboard/monitoring/db/postgres-performance/prepared_transactions'
    )

    expect($('[data-testid="detail-empty"]').text()).toBe(
      'There is no data to show.'
    )
  })

  test.each(['cancel_query', 'drop_database', 'actions'])(
    'Should show page not found for %s',
    async (command) => {
      const { response } = await getPage(
        `/dashboard/monitoring/db/postgres-performance/${command}`
      )

      expect(response.statusCode).toBe(statusCodes.notFound)
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  test('Should show a GOV.UK error summary without the backend detail when the command fails', async () => {
    mockCommand('slow_queries', () =>
      jsonResponse(
        {
          title: 'An error occurred',
          detail: 'pg_stat_statements extension is not installed'
        },
        500
      )
    )

    const { response, $ } = await getPage(
      '/dashboard/monitoring/db/postgres-performance/slow_queries'
    )

    expect(response.statusCode).toBe(statusCodes.badGateway)
    expect($('[data-testid="error-summary"]').text()).toContain(
      'The pg_stat_statements extension may not be installed'
    )
    expect(response.result).not.toContain('pg_stat_statements extension is')
    expect($('[data-testid="detail-table"]')).toHaveLength(0)
  })
})
