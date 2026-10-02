import { vi } from 'vitest'

/**
 * Replaces global fetch with a mock for the calling test file.
 * Call at module level, before the server is created.
 */
export function stubFetch() {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export const buckets = [
  { clientName: 'CadsInternalClient', bucketName: 'cads-internal' },
  { clientName: 'CadsExternalClient', bucketName: 'cads-external' }
]

export function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  })
}

/**
 * Routes the globally mocked fetch to handlers keyed by backend path.
 * Unhandled paths fail the test loudly.
 *
 * @param {Record<string, (query: URLSearchParams) => Response | Promise<Response>>} routes
 */
export function mockStorageApi(routes) {
  const calls = []

  fetch.mockImplementation(async (url) => {
    const { pathname, searchParams } = new URL(url)
    calls.push({ pathname, query: searchParams })

    const handler = routes[pathname]
    if (!handler) {
      throw new Error(`Unexpected backend call: ${url}`)
    }
    return handler(searchParams)
  })

  return calls
}

export const storagePaths = {
  buckets: '/api/v1/storage/s3/buckets',
  objects: (clientName) => `/api/v1/storage/s3/buckets/${clientName}/objects`,
  rows: (clientName) => `/api/v1/storage/s3/buckets/${clientName}/object/rows`
}
