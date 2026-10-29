import { getSafeRedirectPath } from './helpers/safe-redirect.js'

/**
 * Middleware to enforce authentication.
 * Redirects unauthenticated users to /login, preserving the page they
 * originally requested so they can be returned to it after signing in.
 *
 * @param {import('@hapi/hapi').Request} request
 * @param {import('@hapi/hapi').ResponseToolkit} h
 */
export function authRequired(request, h) {
  const isAuthenticated = Boolean(request.auth?.credentials)

  if (!isAuthenticated) {
    const pathname = request.url?.pathname ?? request.path
    const search = request.url?.search ?? ''
    const originalPath = getSafeRedirectPath(
      `${pathname}${search}`,
      request.path
    )

    // Kept for backwards compatibility within the same request lifecycle.
    request.app.redirectTo = originalPath

    // The redirect target is also passed as a query param so it survives the
    // browser redirect to /login (request.app does not persist across requests).
    const loginUrl = `/login?redirect=${encodeURIComponent(originalPath)}`
    return h.redirect(loginUrl).takeover()
  }

  return h.continue
}
