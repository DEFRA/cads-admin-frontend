import * as cheerio from 'cheerio'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { jsonResponse, stubFetch } from '../../../tests/helpers/s3-api-mock.js'
import {
  credentials,
  dbMonitoringUser
} from '../../../tests/helpers/credentials.js'
import { postgresResults } from '../../../tests/fixtures/db-admin/postgres-results.js'

const fetch = stubFetch()

vi.mock('../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

const actionCommands = [
  'cancel_query',
  'terminate_query',
  'reset_pg_stat_statements'
]

/**
 * Monitoring commands return the fixture results, action commands use the
 * given handler.
 *
 * @param {() => Response} [actionResponse]
 */
function mockCdsApi(actionResponse) {
  const calls = []
  fetch.mockImplementation(async (_url, init) => {
    const body = JSON.parse(init?.body ?? '{}')
    calls.push(body)
    if (actionCommands.includes(body.command)) {
      return actionResponse()
    }
    return jsonResponse({
      command: body.command,
      result: postgresResults[body.command] ?? []
    })
  })
  return calls
}

const actionCalls = (calls) =>
  calls.filter((call) => actionCommands.includes(call.command))

describe('#postgresActionController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  async function postAction(action, form, creds = dbMonitoringUser) {
    const response = await server.inject({
      method: 'POST',
      url: `/dashboard/monitoring/db/postgres-performance/actions/${action}`,
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      payload: new URLSearchParams(form).toString(),
      auth: { strategy: 'session', credentials: creds }
    })
    return { response, $: cheerio.load(response.result ?? '') }
  }

  test('Should redirect to the Unauthorised page without the scope', async () => {
    const { response } = await postAction(
      'cancel-query',
      { pid: '1' },
      credentials()
    )

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe('/unauthorised')
    expect(fetch).not.toHaveBeenCalled()
  })

  test.each([
    ['cancel-query', 'cancel_query'],
    ['terminate-query', 'terminate_query']
  ])(
    'Should %s with the PID and redirect with the outcome',
    async (action, command) => {
      const calls = mockCdsApi(() => jsonResponse({ command, result: true }))

      const { response } = await postAction(action, { pid: ' 45231 ' })

      expect(calls).toEqual([{ command, args: { pid: 45231 } }])
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toBe(
        `/dashboard/monitoring/db/postgres-performance?action=${action}&outcome=success&pid=45231`
      )
    }
  )

  test('Should reset query statistics without args', async () => {
    const calls = mockCdsApi(() =>
      jsonResponse({ command: 'reset_pg_stat_statements', result: true })
    )

    const { response } = await postAction('reset-query-statistics', {})

    expect(calls).toEqual([{ command: 'reset_pg_stat_statements' }])
    expect(response.headers.location).toBe(
      '/dashboard/monitoring/db/postgres-performance?action=reset-query-statistics&outcome=success'
    )
  })

  test('Should report that no process was found when Postgres returns false', async () => {
    mockCdsApi(() => jsonResponse({ command: 'cancel_query', result: false }))

    const { response } = await postAction('cancel-query', { pid: '7' })

    expect(response.headers.location).toBe(
      '/dashboard/monitoring/db/postgres-performance?action=cancel-query&outcome=not-found&pid=7'
    )
  })

  test('Should return to the detailed view the form was on', async () => {
    mockCdsApi(() => jsonResponse({ command: 'terminate_query', result: true }))

    const { response } = await postAction('terminate-query', {
      pid: '42112',
      returnTo: 'idle_in_transaction'
    })

    expect(response.headers.location).toBe(
      '/dashboard/monitoring/db/postgres-performance/idle_in_transaction?action=terminate-query&outcome=success&pid=42112'
    )
  })

  test.each(['sessions_by_state', 'https://example.com', '../../dashboard'])(
    'Should return to the dashboard rather than %s',
    async (returnTo) => {
      mockCdsApi(() => jsonResponse({ command: 'cancel_query', result: true }))

      const { response } = await postAction('cancel-query', {
        pid: '1',
        returnTo
      })

      expect(response.headers.location).toMatch(
        /^\/dashboard\/monitoring\/db\/postgres-performance\?/
      )
    }
  )

  test.each([
    [403, 'forbidden'],
    [401, 'forbidden'],
    [400, 'bad-request'],
    [500, 'unavailable']
  ])('Should redirect with the %d API error as %s', async (status, outcome) => {
    mockCdsApi(() =>
      jsonResponse({ title: 'Error', detail: 'database internals' }, status)
    )

    const { response } = await postAction('cancel-query', { pid: '5' })

    expect(response.headers.location).toBe(
      `/dashboard/monitoring/db/postgres-performance?action=cancel-query&outcome=${outcome}&pid=5`
    )
  })

  test.each(['', 'abc', '0', '-3', '12.5', '2147483648'])(
    'Should show a GOV.UK error for the PID %o and not run the action',
    async (pid) => {
      const calls = mockCdsApi(() => {
        throw new Error('The action should not run')
      })

      const { response, $ } = await postAction('terminate-query', { pid })

      expect(response.statusCode).toBe(statusCodes.badRequest)
      expect(actionCalls(calls)).toEqual([])
      expect(
        $('[data-testid="error-summary"] a[href="#terminate-query-pid"]').text()
      ).toBe('Enter a process ID as a whole number, like 12345')
      expect($('#terminate-query-pid').attr('value') ?? '').toBe(pid)
      expect($('#terminate-query-pid').hasClass('govuk-input--error')).toBe(
        true
      )
      expect($('#cancel-query-pid').hasClass('govuk-input--error')).toBe(false)
    }
  )

  test('Should show the PID error on the detailed view the form was on', async () => {
    mockCdsApi(() => {
      throw new Error('The action should not run')
    })

    const { response, $ } = await postAction('cancel-query', {
      pid: 'abc',
      returnTo: 'active_queries'
    })

    expect(response.statusCode).toBe(statusCodes.badRequest)
    expect($('h1').text().trim()).toBe('Longest running queries')
    expect($('[data-testid="error-summary"]').text()).toContain(
      'Enter a process ID as a whole number, like 12345'
    )
  })

  test('Should show page not found for an unknown action', async () => {
    const { response } = await postAction('drop-database', { pid: '1' })

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect(fetch).not.toHaveBeenCalled()
  })
})
