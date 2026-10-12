import * as cheerio from 'cheerio'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { parseExplorerQuery } from './explorer-controller.js'
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

const clientName = 'CadsInternalClient'
const explorerPath = `/s3-monitoring/buckets/${clientName}`

const listing = {
  folders: ['imports/2024/', 'imports/archive/'],
  objects: [
    {
      key: 'imports/',
      size: 0,
      lastModified: '2024-05-01T09:00:00Z',
      storageClass: 'STANDARD'
    },
    {
      key: 'imports/holdings.csv',
      size: 2048,
      lastModified: '2024-05-02T10:30:00Z',
      storageClass: 'STANDARD'
    },
    {
      key: 'imports/readme.txt',
      size: 12,
      lastModified: null,
      storageClass: null
    }
  ],
  isTruncated: false,
  nextContinuationToken: null
}

function mockListing(result = listing) {
  return mockStorageApi({
    [storagePaths.buckets]: () => jsonResponse(buckets),
    [storagePaths.objects(clientName)]: () => jsonResponse(result)
  })
}

describe('#s3ExplorerController', () => {
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
    return { response, $: cheerio.load(response.result ?? '') }
  }

  test('Should list folders and files at a prefix', async () => {
    const calls = mockListing()

    const { response, $ } = await getPage(`${explorerPath}?prefix=imports/`)

    expect(response.statusCode).toBe(statusCodes.ok)
    expect($('h1').text()).toBe('cads-internal')

    const listCall = calls.find((call) => call.pathname.endsWith('/objects'))
    expect(listCall.query.get('prefix')).toBe('imports/')
    expect(listCall.query.get('delimiter')).toBe('/')
    expect(listCall.query.get('maxKeys')).toBe('50')
    expect(listCall.query.has('continuationToken')).toBe(false)

    const folders = $('[data-testid="folder-row"]')
    expect(folders).toHaveLength(2)
    expect(folders.eq(0).find('th a').text()).toBe('2024/')
    expect(folders.eq(0).find('th a').attr('href')).toBe(
      `${explorerPath}?prefix=imports%2F2024%2F`
    )

    // The zero-byte folder marker object is not listed
    const objects = $('[data-testid="object-row"]')
    expect(objects).toHaveLength(2)

    const csv = objects.eq(0)
    expect(csv.find('th a').text()).toBe('holdings.csv')
    expect(csv.find('th a').attr('href')).toBe(
      `${explorerPath}/object?key=imports%2Fholdings.csv`
    )
    expect(csv.text()).toContain('2 KB')
    expect(csv.text()).toContain('2 May 2024')
    expect(csv.text()).toContain('STANDARD')
    expect(csv.text()).toContain('View contents')

    expect(objects.eq(1).text()).toContain('Not available')
  })

  test('Should show the prefix as breadcrumbs', async () => {
    mockListing()

    const { $ } = await getPage(`${explorerPath}?prefix=imports/2024/`)
    const crumbs = $('.govuk-breadcrumbs__list-item')

    expect(crumbs.map((_, el) => $(el).text().trim()).get()).toEqual([
      'Dashboard',
      'S3 Monitoring',
      'cads-internal',
      'imports',
      '2024'
    ])
    expect(crumbs.eq(2).find('a').attr('href')).toBe(explorerPath)
    expect(crumbs.eq(3).find('a').attr('href')).toBe(
      `${explorerPath}?prefix=imports%2F`
    )
    expect(crumbs.eq(4).attr('aria-current')).toBe('page')
  })

  test('Should filter folders by name', async () => {
    mockListing()

    const { $ } = await getPage(`${explorerPath}?prefix=imports/&folder=ARCH`)

    expect($('[data-testid="folder-row"]')).toHaveLength(1)
    expect($('[data-testid="folder-row"] th a').text()).toBe('archive/')
    expect($('[data-testid="object-row"]')).toHaveLength(0)
    expect($('.govuk-inset-text').text()).toContain('only apply to this page')
  })

  test('Should filter files by partial name', async () => {
    mockListing()

    const { $ } = await getPage(`${explorerPath}?prefix=imports/&name=hold`)

    expect($('[data-testid="folder-row"]')).toHaveLength(0)
    expect($('[data-testid="object-row"]')).toHaveLength(1)
    expect($('[data-testid="object-row"] th a').text()).toBe('holdings.csv')
  })

  test('Should say when nothing matches the filters', async () => {
    mockListing()

    const { $ } = await getPage(`${explorerPath}?name=missing`)

    expect($('[data-testid="no-objects"]').text()).toContain(
      'No folders or files on this page match the filters'
    )
  })

  test('Should page forwards and back using continuation tokens', async () => {
    const prefix = 'paging/'
    const calls = mockListing({
      ...listing,
      isTruncated: true,
      nextContinuationToken: 'token-page-2'
    })

    const { $: page1 } = await getPage(
      `${explorerPath}?prefix=${prefix}&pageSize=25`
    )
    const nextHref = page1('.govuk-pagination__next a').attr('href')
    expect(nextHref).toBe(`${explorerPath}?prefix=paging%2F&pageSize=25&page=2`)
    expect(page1('.govuk-pagination__prev')).toHaveLength(0)

    const { $: page2 } = await getPage(nextHref)
    const page2Call = calls.filter((call) =>
      call.pathname.endsWith('/objects')
    )[1]

    expect(page2Call.query.get('continuationToken')).toBe('token-page-2')
    expect(page2Call.query.get('maxKeys')).toBe('25')
    expect(page2('.govuk-pagination__prev a').attr('href')).toBe(
      `${explorerPath}?prefix=paging%2F&pageSize=25`
    )
  })

  test('Should return to page 1 when a page token is not known', async () => {
    mockListing()

    const { response } = await getPage(`${explorerPath}?prefix=unknown/&page=4`)

    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${explorerPath}?prefix=unknown%2F`)
  })

  test('Should show Bucket not found for an unknown bucket', async () => {
    mockStorageApi({
      [storagePaths.buckets]: () => jsonResponse(buckets),
      [storagePaths.objects('NoSuchClient')]: () =>
        jsonResponse("No storage client named 'NoSuchClient'", 404)
    })

    const { response, $ } = await getPage('/s3-monitoring/buckets/NoSuchClient')

    expect(response.statusCode).toBe(statusCodes.notFound)
    expect($('.govuk-error-summary').text()).toContain('Bucket not found')
  })

  test('Should show an error banner when the API fails', async () => {
    mockStorageApi({
      [storagePaths.buckets]: () => jsonResponse(buckets),
      [storagePaths.objects(clientName)]: () =>
        new Response(null, { status: 500 })
    })

    const { response, $ } = await getPage(explorerPath)

    expect(response.statusCode).toBe(statusCodes.badGateway)
    expect($('.govuk-error-summary').text()).toContain(
      'There was a problem contacting the S3 monitoring service'
    )
  })
})

describe('#parseExplorerQuery', () => {
  test('Should apply defaults', () => {
    expect(parseExplorerQuery({})).toEqual({
      prefix: '',
      folder: '',
      name: '',
      pageSize: 50,
      page: 1
    })
  })

  test('Should tidy and validate values', () => {
    expect(
      parseExplorerQuery({
        prefix: '/imports/',
        folder: ' 2024 ',
        name: ['a.csv', 'b.csv'],
        pageSize: '7',
        page: '-3'
      })
    ).toEqual({
      prefix: 'imports/',
      folder: '2024',
      name: 'a.csv',
      pageSize: 50,
      page: 1
    })
  })
})
