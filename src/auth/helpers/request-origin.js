/**
 * Resolves the externally-visible origin (scheme://host) for the
 * current request, honouring reverse-proxy headers used in CDP.
 * @param {import('@hapi/hapi').Request} request
 * @returns {string}
 */
export function getRequestOrigin(request) {
  const headers = request.headers
  const proto =
    headers['x-forwarded-proto']?.split(',')[0]?.trim() ||
    request.server.info.protocol
  const host =
    headers['x-forwarded-host']?.split(',')[0]?.trim() || headers.host
  return `${proto}://${host}`
}
