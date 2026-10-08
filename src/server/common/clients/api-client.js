import { getConfig } from '../../../config/config.js'
import { getAccessToken } from '../../../auth/resource-tokens.js'
import { withTraceId } from '@defra/hapi-tracing'
import { getTracingHeaderName } from '../helpers/request-tracing.js'
import Boom from '@hapi/boom'

/*
  Usage:
  const cdsClient = createApiClient(request, config.get('cadsCdsBackendUrl'))
  const bridgeClient = createApiClient(request, config.get('cadsBridgeBackendUrl'), 'bridge')
*/
export function createApiClient(request, backendUrl, resource = 'cds') {
  return {
    /** @template T */
    get: (path) =>
      callApi(request, backendUrl, path, { method: 'GET' }, false, resource),

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
        stream,
        resource
      ),

    /** @template T */
    put: (path, body) =>
      callApi(
        request,
        backendUrl,
        path,
        {
          method: 'PUT',
          body: JSON.stringify(body)
        },
        false,
        resource
      ),

    /** @template T */
    delete: (path) =>
      callApi(request, backendUrl, path, { method: 'DELETE' }, false, resource)
  }
}

/**
 * @template T
 * @param {import('@hapi/hapi').Request} request
 * @param {string} backendUrl
 * @param {string} path
 * @param {RequestInit} options
 * @param {boolean} [stream=false]
 * @param {'cds' | 'bridge'} [resource='cds']
 * @returns {Promise<T>}
 */
async function callApi(
  request,
  backendUrl,
  path,
  options,
  stream = false,
  resource = 'cds'
) {
  const url = new URL(path, backendUrl).href

  // Try to get session, but don't fail if missing
  const sid = request.state.sid?.sessionId
  let token = null

  if (sid) {
    token = await getAccessToken(sid, resource)
  }

  const headers = withTraceId(getTracingHeaderName(), {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  })

  const timeoutMs = getConfig().get('cadsBackendTimeoutMs')

  try {
    // The signal bounds the whole call, including reading the response body.
    // For stream=true it stays active while the caller reads the stream.
    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(timeoutMs)
    })

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

    return stream ? response : await response.json()
  } catch (error) {
    if (error?.name === 'TimeoutError') {
      throw Boom.gatewayTimeout(
        `Backend request timed out after ${timeoutMs}ms`
      )
    }
    throw error
  }
}
