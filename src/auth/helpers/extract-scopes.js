/**
 * Reads the delegated scopes from a JWT access token. Azure AD sends `scp`
 * (space-separated string). The local OIDC mock sends `scope` (an array,
 * or a space-separated string). Accept both.
 *
 * The token is only decoded, not verified: this is for UI gating, the
 * backend APIs validate the token themselves.
 *
 * @param {string | undefined} accessToken
 * @returns {string[]}
 */
export function extractScopes(accessToken) {
  const payload = accessToken?.split('.')[1]
  if (!payload) {
    return []
  }

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString())
    const raw = claims?.scp ?? claims?.scope ?? []
    return Array.isArray(raw) ? raw : String(raw).split(' ').filter(Boolean)
  } catch {
    return []
  }
}

/**
 * True when the signed-in user's CDS access token carries the given scope.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {string} scope
 */
export function hasScope(request, scope) {
  const accessToken = request?.auth?.credentials?.tokenSet?.access_token
  return extractScopes(accessToken).includes(scope)
}
