import * as cheerio from 'cheerio'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { parseViewerQuery } from './viewer-controller.js'
import {
  buckets,
  jsonResponse,
  mockStorageApi,
  storagePaths,
  stubFetch
} from '../../../tests/helpers/s3-api-mock.js'

vi.mock('../../auth/auth-required.js', () => ({
  authRequired: vi.fn((_req, h) => h.continue)
}))

vi.mock('../../auth/helpers/extract-scopes.js', () => ({
  hasScope: vi.fn(() => true)
}))

stubFetch()

const clientName = 'CadsExternalClient'
const viewerPath = `/s3-monitoring/buckets/${clientName}/object`

function objectAt(key, size = 4096) {
  return {
    key,
    size,
    lastModified: '2024-05-02T10:30:00Z',
    storageClass: 'STANDARD'
  }
}

/**
 * @param {object} object - the object the metadata lookup finds
 * @param {(query: URLSearchParams) => Response} [rows]
 */
function mockObject(object, rows) {
  return mockStorageApi({
    [storagePaths.buckets]: () => jsonResponse(buckets),
    [storagePaths.objects(clientName)]: () =>
      jsonResponse({
        folders: [],
        objects: object ? [object] : [],
        isTruncated: false,
        nextContinuationToken: null
      }),
    ...(rows && { [storagePaths.rows(clientName)]: rows })
  })
}

const rowsCall = (calls) =>
  calls.find((call) => call.pathname.endsWith('/object/rows'))

describe('#s3FileViewerController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  async function getPage(url) {
    const response = await server.inject({ method: 'GET', url })
    return { response, $: cheerio.load(response.result) }
  }

  test('Should show object metadata and the first lines of the file', async () => {
    const key = 'imports/holdings.csv'
    const calls = mockObject(objectAt(key), () =>
      jsonResponse({
        rows: ['cph,name\r', '12/345/6789,"Smith, J"\r'],
        reachedEnd: true
      })
    )

    const { response, $ } = await getPage(`${viewerPath}?key=${key}`)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect($('h1').text()).toBe('holdings.csv')

    const metadata = $('[data-testid="object-metadata"]').text()
    expect(metadata).toContain(key)
    expect(metadata).toContain('4 KB (4,096 bytes)')
    expect(metadata).toContain('2 May 2024')
    expect(metadata).toContain('STANDARD')

    const listCall = calls.find((call) => call.pathname.endsWith('/objects'))
    expect(listCall.query.get('prefix')).toBe(key)

    const rowsQuery = rowsCall(calls).query
    expect(rowsQuery.get('key')).toBe(key)
    expect(rowsQuery.get('startRow')).toBe('1')
    expect(rowsQuery.get('rowCount')).toBe('200')
    expect(rowsQuery.get('delimiter')).toBe('\n')

    const lines = $('[data-testid="file-contents"] tr')
    expect(lines).toHaveLength(2)
    expect(lines.eq(1).find('th').text()).toBe('2')
    // CRLF line endings are dropped, quoted delimiters stay in their column
    expect(lines.eq(1).find('td').text()).toBe('12/345/6789,"Smith, J"')
    expect(lines.eq(1).find('.app-code__col1').text()).toBe('"Smith, J"')
    expect($('[data-testid="end-of-file"]')).toHaveLength(1)
    expect($('.govuk-pagination')).toHaveLength(0)
  })

  test('Should show a requested line range with links either side', async () => {
    const key = 'data/events.json'
    const calls = mockObject(objectAt(key), () =>
      jsonResponse({ rows: ['{"a": 1}', '{"b": true}'], reachedEnd: false })
    )

    const { $ } = await getPage(
      `${viewerPath}?key=${key}&startLine=11&endLine=12`
    )

    const rowsQuery = rowsCall(calls).query
    expect(rowsQuery.get('startRow')).toBe('11')
    expect(rowsQuery.get('rowCount')).toBe('2')

    expect($('#preview-heading').text()).toContain('Lines 11 to 12')
    expect($('#preview-heading').text()).toContain('JSON')
    expect($('.app-code__key').first().text()).toBe('"a"')
    expect($('.app-code__literal').text()).toBe('true')

    expect($('.govuk-pagination__prev a').attr('href')).toBe(
      `${viewerPath}?key=data%2Fevents.json&startLine=9&endLine=10`
    )
    expect($('.govuk-pagination__next a').attr('href')).toBe(
      `${viewerPath}?key=data%2Fevents.json&startLine=13&endLine=14`
    )
  })

  test('Should escape file contents', async () => {
    const key = 'notes.txt'
    mockObject(objectAt(key), () =>
      jsonResponse({ rows: ['<script>alert(1)</script>'], reachedEnd: true })
    )

    const { response } = await getPage(`${viewerPath}?key=${key}`)

    expect(response.result).not.toContain('<script>alert(1)</script>')
    expect(response.result).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
  })

  test('Should show validation errors for an invalid line range', async () => {
    const key = 'notes.txt'
    const calls = mockObject(objectAt(key))

    const { response, $ } = await getPage(
      `${viewerPath}?key=${key}&startLine=50&endLine=10`
    )

    expect(response.statusCode).toBe(statusCodes.badRequest)
    expect(rowsCall(calls)).toBeUndefined()
    expect($('.govuk-error-summary a').attr('href')).toBe('#endLine')
    expect($('#endLine-error').text()).toContain(
      'End line must be the same as or after the start line'
    )
    expect($('#endLine').val()).toBe('10')
  })

  test('Should not request contents of a known binary file type', async () => {
    const key = 'exports/archive.zip'
    const calls = mockObject(objectAt(key))

    const { $ } = await getPage(`${viewerPath}?key=${key}`)

    expect(rowsCall(calls)).toBeUndefined()
    expect($('[data-testid="preview-unavailable"]').text()).toContain(
      'Preview not available'
    )
  })

  test('Should detect binary content', async () => {
    const key = 'exports/blob'
    mockObject(objectAt(key), () =>
      jsonResponse({ rows: ['PK\u0003\u0004\u0000\u0000'], reachedEnd: true })
    )

    const { $ } = await getPage(`${viewerPath}?key=${key}`)

    expect($('[data-testid="preview-unavailable"]').text()).toContain(
      'Preview not available'
    )
    expect($('[data-testid="file-contents"]')).toHaveLength(0)
  })

  test('Should explain when a file has no line breaks', async () => {
    const key = 'exports/minified.json'
    mockObject(objectAt(key), () =>
      jsonResponse('No delimiter found within 1,048,576 characters', 400)
    )

    const { response, $ } = await getPage(`${viewerPath}?key=${key}`)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect($('[data-testid="preview-unavailable"]').text()).toContain(
      'no line breaks'
    )
  })

  test('Should say when a file is empty', async () => {
    const key = 'empty.csv'
    const calls = mockObject(objectAt(key, 0))

    const { $ } = await getPage(`${viewerPath}?key=${key}`)

    expect(rowsCall(calls)).toBeUndefined()
    expect($('.govuk-inset-text').text()).toContain('This file is empty')
  })

  test('Should say when the range starts after the end of the file', async () => {
    const key = 'short.txt'
    mockObject(objectAt(key), () =>
      jsonResponse({ rows: [], reachedEnd: true })
    )

    const { $ } = await getPage(`${viewerPath}?key=${key}&startLine=500`)

    expect($('.govuk-inset-text').text()).toContain('fewer than 500 lines')
    expect($('.govuk-pagination__prev a')).toHaveLength(1)
  })

  test('Should show Object not found for a missing key', async () => {
    mockObject(null)

    const { response, $ } = await getPage(`${viewerPath}?key=missing.csv`)

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect($('.govuk-error-summary').text()).toContain('Object not found')
    expect($('.govuk-breadcrumbs').text()).toContain('cads-external')
  })

  test('Should show Object not found when the object disappears', async () => {
    const key = 'gone.csv'
    mockObject(objectAt(key), () => new Response(null, { status: 404 }))

    const { response, $ } = await getPage(`${viewerPath}?key=${key}`)

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect($('.govuk-error-summary').text()).toContain('Object not found')
  })

  test('Should show Bucket not found for an unknown bucket', async () => {
    mockStorageApi({
      [storagePaths.buckets]: () => jsonResponse(buckets),
      [storagePaths.objects('NoSuchClient')]: () =>
        new Response(null, { status: 404 })
    })

    const { response, $ } = await getPage(
      '/s3-monitoring/buckets/NoSuchClient/object?key=a.csv'
    )

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect($('.govuk-error-summary').text()).toContain('Bucket not found')
  })

  test('Should show an access message when the API refuses the token', async () => {
    mockStorageApi({
      [storagePaths.buckets]: () => new Response(null, { status: 401 }),
      [storagePaths.objects(clientName)]: () =>
        new Response(null, { status: 401 })
    })

    const { response, $ } = await getPage(`${viewerPath}?key=a.csv`)

    expect(response.statusCode).toBe(statusCodes.forbidden)
    expect($('.govuk-error-summary').text()).toContain(
      'You do not have access to this resource'
    )
  })
})

describe('#parseViewerQuery', () => {
  test('Should default to the first 200 lines with format detection', () => {
    expect(parseViewerQuery({ key: 'a.csv' })).toEqual(
      expect.objectContaining({
        key: 'a.csv',
        startLine: 1,
        endLine: 200,
        format: 'auto',
        errors: {}
      })
    )
  })

  test('Should default the end line from the start line', () => {
    expect(parseViewerQuery({ startLine: '301' })).toEqual(
      expect.objectContaining({ startLine: 301, endLine: 500 })
    )
  })

  test.each([
    [{ startLine: '0' }, 'startLine', 'Start line must be a whole number'],
    [{ startLine: 'abc' }, 'startLine', 'Start line must be a whole number'],
    [{ endLine: '1.5' }, 'endLine', 'End line must be a whole number'],
    [
      { startLine: '1', endLine: '1001' },
      'endLine',
      'You can view up to 1,000 lines at a time'
    ]
  ])('Should reject %o', (query, field, message) => {
    expect(parseViewerQuery(query).errors[field]).toContain(message)
  })

  test('Should ignore an unknown format', () => {
    expect(parseViewerQuery({ format: 'yaml' }).format).toBe('auto')
  })
})
