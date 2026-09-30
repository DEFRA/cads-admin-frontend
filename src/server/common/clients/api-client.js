import { getSession } from '../../../auth/session-store.js'
import { withTraceId } from '@defra/hapi-tracing'
import { getTracingHeaderName } from '../helpers/request-tracing.js'
import Boom from '@hapi/boom'

/*
  Usage:
  const cdsClient = createApiClient(request, config.get('cadsCdsBackendUrl'))
  const bridgeClient = createApiClient(request, config.get('cadsBridgeBackendUrl'))
*/
export function createApiClient(request, backendUrl) {
  return {
    /** @template T */
    get: (path) => callApi(request, backendUrl, path, { method: 'GET' }),

    /** @template T */
    post: (path, body, stream = false) =>
      callApi(
        request,
        backendUrl,
        path,
        {
          method: 'POST',
          body: JSON.stringify(body)
        },
        stream
      ),

    /** @template T */
    put: (path, body) =>
      callApi(request, backendUrl, path, {
        method: 'PUT',
        body: JSON.stringify(body)
      }),

    /** @template T */
    delete: (path) => callApi(request, backendUrl, path, { method: 'DELETE' })
  }
}

/**
 * @template T
 * @param {import('@hapi/hapi').Request} request
 * @param {string} backendUrl
 * @param {string} path
 * @param {RequestInit} options
 * @param {boolean} [stream=false]
 * @returns {Promise<T>}
 */
async function callApi(request, backendUrl, path, options, stream = false) {
  const url = new URL(path, backendUrl).href

  // Try to get session, but don't fail if missing
  const sid = request.state.sid?.sessionId
  let token = null

  if (sid) {
    const session = await getSession(sid)
    token = session?.tokenSet?.access_token || null
  }

  const headers = withTraceId(getTracingHeaderName(), {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  })

  // Perform fetch
  const response = await fetch(url, { ...options, headers })

  if (!response.ok) {
    const error = Boom.boomify(
      new Error(`Backend error: ${response.status} ${response.statusText}`),
      { statusCode: response.status }
    )

    if (response.headers.get('content-type')?.includes('application/json')) {
      error.output.payload = await response.json()
    }

    throw error
  }

  return stream ? response : response.json()
}
