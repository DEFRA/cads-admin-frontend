import * as cheerio from 'cheerio'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { hasScope } from '../../auth/helpers/extract-scopes.js'
import {
  buckets,
  jsonResponse,
  mockStorageApi,
  storagePaths,
  stubFetch
} from '../../../tests/helpers/s3-api-mock.js'

const fetch = stubFetch()

vi.mock('../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

vi.mock('../../auth/helpers/extract-scopes.js', () => ({
  hasScope: vi.fn(() => true)
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

  async function getPage(url = '/s3-monitoring') {
    const response = await server.inject({ method: 'GET', url })
    return { response, $: cheerio.load(response.result) }
  }

  describe('GET S3 Monitoring page', () => {
    test('Should show S3 Monitoring page', async () => {
      mockStorageApi({ [storagePaths.buckets]: () => jsonResponse(buckets) })

      const { response } = await getPage()

      expect(response.result).toEqual(
        expect.stringContaining('S3 Monitoring |')
      )
      expect(response.statusCode).toBe(statusCodes.ok)
    })

    test('Should list buckets sorted by name with an Explore link', async () => {
      mockStorageApi({ [storagePaths.buckets]: () => jsonResponse(buckets) })

      const { $ } = await getPage()
      const rows = $('[data-testid="bucket-table"] tbody tr')

      expect(rows).toHaveLength(2)
      expect(rows.eq(0).find('th').text().trim()).toBe('cads-external')
      expect(rows.eq(1).find('th').text().trim()).toBe('cads-internal')
      expect(rows.eq(1).find('a').attr('href')).toBe(
        '/s3-monitoring/buckets/CadsInternalClient'
      )
      expect(rows.eq(1).find('a').text()).toContain('Explore')
    })

    test('Should sort buckets by name descending', async () => {
      mockStorageApi({ [storagePaths.buckets]: () => jsonResponse(buckets) })

      const { $ } = await getPage('/s3-monitoring?sort=desc')
      const header = $('[data-testid="bucket-table"] thead th').first()

      expect(header.attr('aria-sort')).toBe('descending')
      expect(header.find('a').attr('href')).toBe('/s3-monitoring?sort=asc')
      expect(
        $('[data-testid="bucket-table"] tbody th').first().text().trim()
      ).toBe('cads-internal')
    })

    test('Should only show region and object count columns when provided', async () => {
      mockStorageApi({ [storagePaths.buckets]: () => jsonResponse(buckets) })
      const { $: without } = await getPage()

      expect(without('thead').text()).not.toContain('Region')
      expect(without('thead').text()).not.toContain('Total objects')

      mockStorageApi({
        [storagePaths.buckets]: () =>
          jsonResponse([
            { ...buckets[0], region: 'eu-west-2', totalObjects: 12345 },
            buckets[1]
          ])
      })
      const { $: withExtras } = await getPage()

      expect(withExtras('thead').text()).toContain('Region')
      expect(withExtras('tbody').text()).toContain('eu-west-2')
      expect(withExtras('tbody').text()).toContain('12,345')
    })

    test('Should show a message when there are no buckets', async () => {
      mockStorageApi({ [storagePaths.buckets]: () => jsonResponse([]) })

      const { $ } = await getPage()

      expect($('[data-testid="no-buckets"]')).toHaveLength(1)
    })
  })

  describe('Error handling', () => {
    test('Should show an error banner when the API cannot be reached', async () => {
      fetch.mockRejectedValue(new TypeError('fetch failed'))

      const { response, $ } = await getPage()

      expect(response.statusCode).toBe(statusCodes.badGateway)
      expect($('.govuk-error-summary').text()).toContain(
        'There was a problem contacting the S3 monitoring service'
      )
    })

    test('Should show an access message when the API refuses the token', async () => {
      mockStorageApi({
        [storagePaths.buckets]: () => new Response(null, { status: 403 })
      })

      const { response, $ } = await getPage()

      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect($('.govuk-error-summary').text()).toContain(
        'You do not have access to this resource'
      )
    })

    test('Should refuse users without the admin.s3.manager scope', async () => {
      hasScope.mockReturnValue(false)

      const { response, $ } = await getPage()

      expect(fetch).not.toHaveBeenCalled()
      expect(response.statusCode).toBe(statusCodes.forbidden)
      expect($('h1').text()).toContain(
        'You do not have access to this resource'
      )
    })
  })
})
