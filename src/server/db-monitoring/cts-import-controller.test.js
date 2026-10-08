import * as cheerio from 'cheerio'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { jsonResponse, stubFetch } from '../../../tests/helpers/s3-api-mock.js'
import {
  credentials,
  ctsImportUser
} from '../../../tests/helpers/credentials.js'

const fetch = stubFetch()

vi.mock('../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

const runsPath = '/api/v1/systemadmin/db-admin-cts-import/runs'
const commandPath = '/api/v1/systemadmin/db-admin-cts-import'

const runs = [
  {
    runId: 2,
    status: 'processing bulk',
    createdAt: '2026-10-02T08:00:00Z',
    bulkCompletedAt: null,
    completedAt: null
  },
  {
    runId: 1,
    status: 'complete',
    createdAt: '2026-10-01T08:00:00Z',
    bulkCompletedAt: '2026-10-01T10:00:00Z',
    completedAt: '2026-10-01T11:00:00Z'
  }
]

/**
 * Routes the mocked fetch by backend path and records each call.
 *
 * @param {Record<string, (init: RequestInit) => Response>} routes
 */
function mockCdsApi(routes) {
  const calls = []
  fetch.mockImplementation(async (url, init) => {
    const { pathname } = new URL(url)
    calls.push({ pathname, init })
    const handler = routes[pathname]
    if (!handler) {
      throw new Error(`Unexpected backend call: ${url}`)
    }
    return handler(init)
  })
  return calls
}

describe('#ctsImportController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  async function getPage(
    url = '/db-monitoring/cts-import',
    creds = ctsImportUser
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
      [
        'the cads-admin-superuser role',
        credentials({ scopes: ['admin.db.execute'] })
      ],
      [
        'the admin.db.execute scope',
        credentials({ roles: ['cads-admin-superuser'] })
      ]
    ])(
      'Should redirect to the Unauthorised page without %s',
      async (_, creds) => {
        const { response } = await getPage(undefined, creds)

        expect(response.statusCode).toBe(302)
        expect(response.headers.location).toBe('/unauthorised')
        expect(fetch).not.toHaveBeenCalled()
      }
    )
  })

  describe('run selection', () => {
    test('Should list the runs and command types, latest run selected', async () => {
      const calls = mockCdsApi({ [runsPath]: () => jsonResponse({ runs }) })

      const { response, $ } = await getPage()

      expect(response.statusCode).toBe(statusCodes.ok)
      expect(response.result).toEqual(
        expect.stringContaining('CTS Parallel Import Monitoring |')
      )
      expect(calls.map((call) => call.pathname)).toEqual([runsPath])

      const options = $('#runId option')
      expect(options).toHaveLength(2)
      expect(options.eq(0).attr('value')).toBe('2')
      expect(options.eq(0).attr('selected')).toBeDefined()
      expect(options.eq(0).text()).toContain('Run 2: processing bulk')

      expect(
        $('input[name="command"]')
          .map((_, input) => $(input).attr('value'))
          .get()
      ).toEqual(['summary', 'plan', 'deferred_errors'])
      expect(
        $('input[name="command"][value="summary"]').attr('checked')
      ).toBeDefined()
      expect($('[data-testid="result-table"]')).toHaveLength(0)
    })

    test('Should say when there are no runs', async () => {
      mockCdsApi({ [runsPath]: () => jsonResponse({ runs: [] }) })

      const { $ } = await getPage()

      expect($('[data-testid="no-runs"]').text()).toContain(
        'There are no CTS parallel import runs.'
      )
      expect($('[data-testid="cts-import-form"]')).toHaveLength(0)
    })
  })

  describe('running a command', () => {
    test('Should post the command and show the result as a table', async () => {
      const calls = mockCdsApi({
        [runsPath]: () => jsonResponse({ runs }),
        [commandPath]: () =>
          jsonResponse({
            command: 'deferred_errors',
            result: [{ table_name: 'cts_animal', error: 'bad date', rows: 12 }]
          })
      })

      const { response, $ } = await getPage(
        '/db-monitoring/cts-import?runId=1&command=deferred_errors'
      )

      expect(response.statusCode).toBe(statusCodes.ok)

      const post = calls.find((call) => call.pathname === commandPath)
      expect(post.init.method).toBe('POST')
      expect(JSON.parse(post.init.body)).toEqual({
        command: 'deferred_errors',
        args: { run_id: 1 }
      })

      const table = $('[data-testid="result-table"]')
      expect(table.find('caption').text().trim()).toBe(
        'Deferred errors for run 1'
      )
      expect(
        table
          .find('thead th')
          .map((_, th) => $(th).text().trim())
          .get()
      ).toEqual(['Table', 'Error', 'Rows'])
      expect(
        table
          .find('tbody td')
          .map((_, td) => $(td).text().trim())
          .get()
      ).toEqual(['cts_animal', 'bad date', '12'])
      expect($('#runId option[value="1"]').attr('selected')).toBeDefined()
      expect(
        $('input[name="command"][value="deferred_errors"]').attr('checked')
      ).toBeDefined()
    })

    test('Should say when the run has no results', async () => {
      mockCdsApi({
        [runsPath]: () => jsonResponse({ runs }),
        [commandPath]: () => jsonResponse({ command: 'plan', result: {} })
      })

      const { $ } = await getPage(
        '/db-monitoring/cts-import?runId=2&command=plan'
      )

      expect($('[data-testid="no-results"]').text()).toContain(
        'There are no results for this run.'
      )
    })

    test('Should show field errors and not run a command for invalid input', async () => {
      const calls = mockCdsApi({ [runsPath]: () => jsonResponse({ runs }) })

      const { response, $ } = await getPage(
        '/db-monitoring/cts-import?runId=abc&command=drop_tables'
      )

      expect(response.statusCode).toBe(statusCodes.badRequest)
      expect(calls.map((call) => call.pathname)).toEqual([runsPath])

      const summary = $('[data-testid="error-summary"]')
      expect(summary.find('a[href="#runId"]').text()).toBe(
        'Select an import run'
      )
      expect(summary.find('a[href="#command"]').text()).toBe('Select a command')
    })
  })

  describe('API errors', () => {
    test('Should show a GOV.UK error summary when the runs cannot be loaded', async () => {
      mockCdsApi({
        [runsPath]: () => new Response('boom', { status: 500 })
      })

      const { response, $ } = await getPage()

      expect(response.statusCode).toBe(statusCodes.badGateway)
      expect($('[data-testid="error-summary"]').text()).toContain(
        'There was a problem contacting the CTS parallel import monitoring service. Try again later.'
      )
      expect($('[data-testid="cts-import-form"]')).toHaveLength(0)
    })

    test('Should keep the form and show an error when the command fails', async () => {
      mockCdsApi({
        [runsPath]: () => jsonResponse({ runs }),
        [commandPath]: () =>
          jsonResponse(
            { title: 'One or more validation errors occurred.' },
            400
          )
      })

      const { response, $ } = await getPage(
        '/db-monitoring/cts-import?runId=2&command=summary'
      )

      expect(response.statusCode).toBe(statusCodes.badRequest)
      expect($('[data-testid="error-summary"]').text()).toContain(
        'The CTS parallel import monitoring service could not process the request'
      )
      expect($('[data-testid="cts-import-form"]')).toHaveLength(1)
      expect($('[data-testid="result-table"]')).toHaveLength(0)
    })

    test('Should not expose the backend URL in the page', async () => {
      mockCdsApi({
        [runsPath]: () => {
          throw new TypeError('fetch failed')
        }
      })

      const { response } = await getPage()

      expect(response.result).not.toContain('db-admin-cts-import')
      expect(response.result).not.toContain('systemadmin')
    })
  })
})
