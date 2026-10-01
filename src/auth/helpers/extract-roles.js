/**
 * Azure AD sends `roles` (array). The local OIDC mock sends `role`
 * (string, or an array when there are several). Accept both.
 *
 * @param {Record<string, any>} [claims]
 * @returns {string[]}
 */
export function extractRoles(claims) {
  const raw = claims?.roles ?? claims?.role ?? []
  return Array.isArray(raw) ? raw : [raw]
}
